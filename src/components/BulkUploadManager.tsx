import React, { useState } from 'react';
import { uploadToCloudinary, getAudioDuration } from '../lib/cloudinary';
import {
  FiUploadCloud,
  FiMusic,
  FiCheckCircle,
  FiAlertCircle,
  FiTrash2,
  FiPlay,
  FiLayers,
  FiPlus,
} from 'react-icons/fi';

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  audioUrl: string;
  imageUrl: string | null;
  duration: number;
}

interface BulkUploadManagerProps {
  refreshData: () => Promise<void>;
}

interface BatchItem {
  id: string;
  file: File;
  title: string;
  artist: string;
  album: string;
  duration: number;
  progress: number;
  status: 'pending' | 'uploading' | 'saving' | 'completed' | 'error';
  error?: string;
  audioUrl?: string;
}

export default function BulkUploadManager({ refreshData }: BulkUploadManagerProps) {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [commonAlbum, setCommonAlbum] = useState<string>('');
  const [commonArtist, setCommonArtist] = useState<string>('');
  const [createPlaylist, setCreatePlaylist] = useState<boolean>(true);
  const [playlistName, setPlaylistName] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [currentUploadingIndex, setCurrentUploadingIndex] = useState<number>(-1);
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle Multi-file Selection
  const handleFilesSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setMessage(null);
    const newItems: BatchItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.includes('audio') && !file.name.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)) {
        continue;
      }

      let duration = 180;
      try {
        duration = await getAudioDuration(file);
      } catch {
        duration = 180;
      }

      // Auto-parse filename e.g. "Alan Walker - Faded.mp3"
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      let title = fileNameWithoutExt;
      let artist = commonArtist || 'Unknown Artist';

      if (fileNameWithoutExt.includes('-')) {
        const parts = fileNameWithoutExt.split('-');
        artist = commonArtist || parts[0].trim();
        title = parts.slice(1).join('-').trim();
      }

      newItems.push({
        id: `batch-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        title: title || fileNameWithoutExt,
        artist,
        album: commonAlbum || '',
        duration,
        progress: 0,
        status: 'pending',
      });
    }

    if (newItems.length === 0) {
      setMessage({ type: 'error', text: 'No valid audio files selected. Please select .mp3 or audio files.' });
      return;
    }

    setBatchItems((prev) => [...prev, ...newItems]);
    if (!playlistName) {
      setPlaylistName(`Batch Album (${new Date().toLocaleDateString()})`);
    }
  };

  // Update item field in queue
  const updateBatchItem = (id: string, field: keyof BatchItem, value: any) => {
    setBatchItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Remove item from queue
  const removeBatchItem = (id: string) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Apply Common Album / Artist to all items in batch
  const handleApplyCommonDetails = () => {
    setBatchItems((prev) =>
      prev.map((item) => ({
        ...item,
        album: commonAlbum || item.album,
        artist: commonArtist || item.artist,
      }))
    );
  };

  // Start Batch Upload Process
  const handleStartBatchUpload = async () => {
    if (batchItems.length === 0) {
      setMessage({ type: 'error', text: 'No songs in queue to upload.' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);
    setOverallProgress(0);

    const createdSongIds: string[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      if (item.status === 'completed') {
        successCount++;
        continue;
      }

      setCurrentUploadingIndex(i);

      // Update status to uploading
      setBatchItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'uploading', progress: 5 } : it))
      );

      try {
        // 1. Upload MP3 to Cloudinary
        const cloudRes = await uploadToCloudinary(item.file, {
          resourceType: 'video',
          folder: 'vibesync_songs/batch_mp3',
          onProgress: (percent) => {
            setBatchItems((prev) =>
              prev.map((it, idx) => (idx === i ? { ...it, progress: percent } : it))
            );
          },
        });

        // Update status to saving to DB
        setBatchItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: 'saving', progress: 90, audioUrl: cloudRes.url } : it
          )
        );

        // 2. Save Song to Database
        const songRes = await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            artist: item.artist,
            album: item.album || null,
            audioUrl: cloudRes.url,
            imageUrl: null,
            duration: item.duration || cloudRes.duration || 180,
          }),
        });

        if (!songRes.ok) {
          const errData = await songRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to save song to database');
        }

        const savedSong: Song = await songRes.json();
        createdSongIds.push(savedSong.id);
        successCount++;

        setBatchItems((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: 'completed', progress: 100 } : it))
        );
      } catch (err: any) {
        console.error(`Error uploading song #${i + 1}:`, err);
        failCount++;
        setBatchItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? { ...it, status: 'error', error: err.message || 'Upload failed' }
              : it
          )
        );
      }

      setOverallProgress(Math.round(((i + 1) / batchItems.length) * 100));
    }

    // 3. Create Playlist if option checked and songs were uploaded
    if (createPlaylist && createdSongIds.length > 0 && playlistName) {
      try {
        const playlistRes = await fetch('/api/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: playlistName,
            description: `Batch playlist created automatically with ${createdSongIds.length} tracks.`,
            imageUrl: null,
          }),
        });

        if (playlistRes.ok) {
          const createdPlaylist = await playlistRes.json();
          for (const sId of createdSongIds) {
            await fetch('/api/playlists/add-song', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ playlistId: createdPlaylist.id, songId: sId }),
            });
          }
        }
      } catch (e) {
        console.error('Failed to create batch playlist:', e);
      }
    }

    await refreshData();
    setIsProcessing(false);
    setCurrentUploadingIndex(-1);

    if (failCount === 0) {
      setMessage({
        type: 'success',
        text: `Successfully uploaded all ${successCount} songs to Cloudinary and database!${
          createPlaylist ? ` Created playlist "${playlistName}".` : ''
        }`,
      });
    } else {
      setMessage({
        type: 'error',
        text: `Uploaded ${successCount} songs, but ${failCount} failed. Check error messages below.`,
      });
    }
  };

  return (
    <div className="form-panel glass-panel" style={{ gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiUploadCloud style={{ color: 'var(--accent)' }} /> Bulk MP3 Upload Manager
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Upload multiple MP3 files simultaneously to Cloudinary, auto-parse duration & titles, and optionally bundle them into a playlist.
          </p>
        </div>
        <span
          style={{
            fontSize: '12px',
            padding: '6px 12px',
            borderRadius: '20px',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            color: '#a78bfa',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            fontWeight: 600,
          }}
        >
          Cloudinary Batch Mode
        </span>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {message.type === 'success' ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Batch Setup Form */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '16px',
          backgroundColor: 'rgba(0,0,0,0.2)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        <div className="form-group">
          <label className="form-label">Default Artist Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Various Artists"
            value={commonArtist}
            onChange={(e) => setCommonArtist(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Default Album Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Summer Album 2026"
            value={commonAlbum}
            onChange={(e) => setCommonAlbum(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleApplyCommonDetails}
            disabled={batchItems.length === 0}
            style={{
              padding: '12px',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: batchItems.length === 0 ? 'not-allowed' : 'pointer',
              opacity: batchItems.length === 0 ? 0.5 : 1,
            }}
          >
            Apply to Queued Songs
          </button>
        </div>
      </div>

      {/* Drag & Drop Multi-file Box */}
      <div
        style={{
          border: '2px dashed var(--border)',
          borderRadius: '14px',
          padding: '32px 24px',
          textAlign: 'center',
          backgroundColor: 'rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <FiUploadCloud size={48} style={{ color: 'var(--accent)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>
            Select Multiple MP3 Files for Batch Upload
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Choose 5, 10, or 20 MP3 files at once. Auto-calculates duration & parses filenames.
          </span>
        </div>

        <input
          type="file"
          multiple
          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
          id="bulkFileInput"
          style={{ display: 'none' }}
          onChange={(e) => handleFilesSelect(e.target.files)}
          disabled={isProcessing}
        />

        <label
          htmlFor="bulkFileInput"
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--accent)',
            color: '#fff',
            borderRadius: '10px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            opacity: isProcessing ? 0.6 : 1,
          }}
        >
          Select Multiple MP3 Files
        </label>
      </div>

      {/* Playlist Creation Option */}
      {batchItems.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '14px 18px',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(139, 92, 246, 0.2)',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={createPlaylist}
              onChange={(e) => setCreatePlaylist(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
            />
            <span>Create a new Playlist with these batch songs</span>
          </label>

          {createPlaylist && (
            <input
              type="text"
              className="form-input"
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
              placeholder="Playlist Name"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
            />
          )}
        </div>
      )}

      {/* Batch Items Queue Table */}
      {batchItems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 700 }}>
              Batch Queue ({batchItems.length} {batchItems.length === 1 ? 'song' : 'songs'})
            </span>
            <button
              type="button"
              onClick={() => setBatchItems([])}
              disabled={isProcessing}
              style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}
            >
              Clear Queue
            </button>
          </div>

          {/* Overall Progress Bar */}
          {isProcessing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span>Uploading Batch to Cloudinary...</span>
                <span>{overallProgress}% Complete</span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${overallProgress}%`,
                    backgroundColor: 'var(--accent)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )}

          <div
            style={{
              maxHeight: '350px',
              overflowY: 'auto',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}
          >
            {batchItems.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 2fr 1.5fr 1.2fr 80px 140px 40px',
                  alignItems: 'center',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '13px',
                  backgroundColor: currentUploadingIndex === idx ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</span>

                {/* Title Input */}
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '6px 8px', fontSize: '13px' }}
                  value={item.title}
                  onChange={(e) => updateBatchItem(item.id, 'title', e.target.value)}
                  disabled={isProcessing}
                />

                {/* Artist Input */}
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '6px 8px', fontSize: '13px' }}
                  placeholder="Artist"
                  value={item.artist}
                  onChange={(e) => updateBatchItem(item.id, 'artist', e.target.value)}
                  disabled={isProcessing}
                />

                {/* Album Input */}
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '6px 8px', fontSize: '13px' }}
                  placeholder="Album"
                  value={item.album}
                  onChange={(e) => updateBatchItem(item.id, 'album', e.target.value)}
                  disabled={isProcessing}
                />

                {/* Duration */}
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
                  {formatDuration(item.duration)}
                </span>

                {/* Status Tag */}
                <div>
                  {item.status === 'pending' && (
                    <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>
                      Queued
                    </span>
                  )}
                  {item.status === 'uploading' && (
                    <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa', fontSize: '11px', fontWeight: 600 }}>
                      Cloudinary ({item.progress}%)
                    </span>
                  )}
                  {item.status === 'saving' && (
                    <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontSize: '11px', fontWeight: 600 }}>
                      Saving DB...
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <FiCheckCircle size={12} /> Done
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '11px', fontWeight: 600 }}>
                      Failed
                    </span>
                  )}
                </div>

                {/* Remove item */}
                <button
                  type="button"
                  onClick={() => removeBatchItem(item.id)}
                  disabled={isProcessing}
                  style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleStartBatchUpload}
            disabled={isProcessing || batchItems.length === 0}
            className="submit-btn"
            style={{ marginTop: '12px' }}
          >
            {isProcessing
              ? `Processing Batch Upload... (${overallProgress}%)`
              : `Upload All ${batchItems.length} Songs to Cloudinary & Save`}
          </button>
        </div>
      )}
    </div>
  );
}
