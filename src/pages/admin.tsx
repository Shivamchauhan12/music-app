import React, { Component } from 'react';
import Head from 'next/head';
import { uploadToCloudinary, getAudioDuration } from '../lib/cloudinary';
import BulkUploadManager from '../components/BulkUploadManager';
import {
  FiUploadCloud,
  FiMusic,
  FiImage,
  FiCheckCircle,
  FiAlertCircle,
  FiEdit,
  FiTrash2,
  FiX,
  FiList,
  FiPlusCircle,
  FiFolderPlus,
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

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  songs: Song[];
}

interface AdminProps {
  songs: Song[];
  playlists: Playlist[];
  refreshData: () => Promise<void>;
}

interface AdminState {
  activeTab: 'add' | 'bulk-upload' | 'manage-songs' | 'manage-playlists';

  songForm: {
    title: string;
    artist: string;
    album: string;
    audioUrl: string;
    imageUrl: string;
    duration: string;
  };
  playlistForm: {
    name: string;
    description: string;
    imageUrl: string;
    selectedSongs: string[]; // song IDs
  };
  // Edit Song Modal State
  editingSong: Song | null;
  editSongForm: {
    title: string;
    artist: string;
    album: string;
    audioUrl: string;
    imageUrl: string;
    duration: string;
  };
  // Edit Playlist Modal State
  editingPlaylist: Playlist | null;
  editPlaylistForm: {
    name: string;
    description: string;
    imageUrl: string;
    selectedSongs: string[];
  };

  audioFileMode: 'file' | 'url';
  imageFileMode: 'file' | 'url';
  selectedAudioFile: File | null;
  selectedImageFile: File | null;
  isUploadingAudio: boolean;
  isUploadingImage: boolean;
  audioProgress: number;
  imageProgress: number;
  audioUploadedToCloudinary: boolean;
  imageUploadedToCloudinary: boolean;

  // Edit Audio/Image Upload State
  editSelectedAudioFile: File | null;
  editSelectedImageFile: File | null;
  isUploadingEditAudio: boolean;
  isUploadingEditImage: boolean;
  editAudioProgress: number;
  editImageProgress: number;

  songMessage: { type: 'success' | 'error'; text: string } | null;
  playlistMessage: { type: 'success' | 'error'; text: string } | null;
  actionLoadingId: string | null;
}

export default class Admin extends Component<AdminProps, AdminState> {
  state: AdminState = {
    activeTab: 'add',
    songForm: {
      title: '',
      artist: '',
      album: '',
      audioUrl: '',
      imageUrl: '',
      duration: '180',
    },
    playlistForm: {
      name: '',
      description: '',
      imageUrl: '',
      selectedSongs: [],
    },
    editingSong: null,
    editSongForm: {
      title: '',
      artist: '',
      album: '',
      audioUrl: '',
      imageUrl: '',
      duration: '180',
    },
    editingPlaylist: null,
    editPlaylistForm: {
      name: '',
      description: '',
      imageUrl: '',
      selectedSongs: [],
    },
    audioFileMode: 'file',
    imageFileMode: 'file',
    selectedAudioFile: null,
    selectedImageFile: null,
    isUploadingAudio: false,
    isUploadingImage: false,
    audioProgress: 0,
    imageProgress: 0,
    audioUploadedToCloudinary: false,
    imageUploadedToCloudinary: false,

    editSelectedAudioFile: null,
    editSelectedImageFile: null,
    isUploadingEditAudio: false,
    isUploadingEditImage: false,
    editAudioProgress: 0,
    editImageProgress: 0,

    songMessage: null,
    playlistMessage: null,
    actionLoadingId: null,
  };

  formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  handleSongInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    this.setState((prevState) => ({
      songForm: {
        ...prevState.songForm,
        [name]: value,
      },
    }));
  };

  handleEditSongInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    this.setState((prevState) => ({
      editSongForm: {
        ...prevState.editSongForm,
        [name]: value,
      },
    }));
  };

  handlePlaylistInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    this.setState((prevState) => ({
      playlistForm: {
        ...prevState.playlistForm,
        [name]: value,
      },
    }));
  };

  handleEditPlaylistInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    this.setState((prevState) => ({
      editPlaylistForm: {
        ...prevState.editPlaylistForm,
        [name]: value,
      },
    }));
  };

  handleSongCheckboxChange = (songId: string, isEdit = false) => {
    this.setState((prevState) => {
      const formKey = isEdit ? 'editPlaylistForm' : 'playlistForm';
      const { selectedSongs } = prevState[formKey];
      const isSelected = selectedSongs.includes(songId);

      const newSelectedSongs = isSelected
        ? selectedSongs.filter((id) => id !== songId)
        : [...selectedSongs, songId];

      return {
        [formKey]: {
          ...prevState[formKey],
          selectedSongs: newSelectedSongs,
        },
      } as any;
    });
  };

  // Audio File Selection for Create Song
  handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    this.setState({
      selectedAudioFile: file,
      audioUploadedToCloudinary: false,
      songMessage: null,
    });

    try {
      const duration = await getAudioDuration(file);
      this.setState((prevState) => ({
        songForm: {
          ...prevState.songForm,
          duration: String(duration),
        },
      }));
    } catch {
      // ignore duration error
    }

    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    if (fileNameWithoutExt.includes('-')) {
      const [artistPart, titlePart] = fileNameWithoutExt.split('-').map((s) => s.trim());
      this.setState((prevState) => ({
        songForm: {
          ...prevState.songForm,
          title: prevState.songForm.title || titlePart || fileNameWithoutExt,
          artist: prevState.songForm.artist || artistPart || '',
        },
      }));
    } else {
      this.setState((prevState) => ({
        songForm: {
          ...prevState.songForm,
          title: prevState.songForm.title || fileNameWithoutExt,
        },
      }));
    }
  };

  // Upload Create Song Audio to Cloudinary
  handleUploadAudioToCloudinary = async (): Promise<string | null> => {
    const { selectedAudioFile } = this.state;
    if (!selectedAudioFile) return null;

    this.setState({
      isUploadingAudio: true,
      audioProgress: 5,
      songMessage: null,
    });

    try {
      const result = await uploadToCloudinary(selectedAudioFile, {
        resourceType: 'video',
        folder: 'vibesync_songs/mp3',
        onProgress: (progress) => {
          this.setState({ audioProgress: progress });
        },
      });

      this.setState((prevState) => ({
        isUploadingAudio: false,
        audioProgress: 100,
        audioUploadedToCloudinary: true,
        songForm: {
          ...prevState.songForm,
          audioUrl: result.url,
          duration: result.duration ? String(result.duration) : prevState.songForm.duration,
        },
        songMessage: {
          type: 'success',
          text: 'MP3 file uploaded to Cloudinary successfully!',
        },
      }));

      return result.url;
    } catch (err: any) {
      this.setState({
        isUploadingAudio: false,
        audioProgress: 0,
        audioUploadedToCloudinary: false,
        songMessage: {
          type: 'error',
          text: err.isConfigError
            ? err.message
            : `Cloudinary Upload Error: ${err.message || 'Failed to upload audio file.'}`,
        },
      });
      return null;
    }
  };

  // Upload Edit Song Audio to Cloudinary
  handleUploadEditAudioToCloudinary = async (): Promise<string | null> => {
    const { editSelectedAudioFile } = this.state;
    if (!editSelectedAudioFile) return null;

    this.setState({
      isUploadingEditAudio: true,
      editAudioProgress: 5,
    });

    try {
      const result = await uploadToCloudinary(editSelectedAudioFile, {
        resourceType: 'video',
        folder: 'vibesync_songs/mp3',
        onProgress: (progress) => {
          this.setState({ editAudioProgress: progress });
        },
      });

      this.setState((prevState) => ({
        isUploadingEditAudio: false,
        editAudioProgress: 100,
        editSongForm: {
          ...prevState.editSongForm,
          audioUrl: result.url,
          duration: result.duration ? String(result.duration) : prevState.editSongForm.duration,
        },
      }));

      return result.url;
    } catch (err: any) {
      this.setState({
        isUploadingEditAudio: false,
        editAudioProgress: 0,
        songMessage: {
          type: 'error',
          text: `Cloudinary Upload Error: ${err.message || 'Failed to upload audio file.'}`,
        },
      });
      return null;
    }
  };

  // Image Upload handlers
  handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    this.setState({ selectedImageFile: files[0], imageUploadedToCloudinary: false });
  };

  handleUploadImageToCloudinary = async (): Promise<string | null> => {
    const { selectedImageFile } = this.state;
    if (!selectedImageFile) return null;

    this.setState({ isUploadingImage: true, imageProgress: 10 });
    try {
      const result = await uploadToCloudinary(selectedImageFile, {
        resourceType: 'image',
        folder: 'vibesync_songs/covers',
        onProgress: (progress) => this.setState({ imageProgress: progress }),
      });

      this.setState((prevState) => ({
        isUploadingImage: false,
        imageProgress: 100,
        imageUploadedToCloudinary: true,
        songForm: { ...prevState.songForm, imageUrl: result.url },
      }));

      return result.url;
    } catch (err: any) {
      this.setState({
        isUploadingImage: false,
        imageProgress: 0,
        songMessage: { type: 'error', text: `Image Upload Error: ${err.message}` },
      });
      return null;
    }
  };

  // Handle Add Song Form Submit
  handleSongSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    this.setState({ songMessage: null });
    const { songForm, audioFileMode, selectedAudioFile, audioUploadedToCloudinary, imageFileMode, selectedImageFile, imageUploadedToCloudinary } = this.state;

    let finalAudioUrl = songForm.audioUrl;
    let finalImageUrl = songForm.imageUrl;

    if (audioFileMode === 'file' && selectedAudioFile && !audioUploadedToCloudinary) {
      const uploadedUrl = await this.handleUploadAudioToCloudinary();
      if (!uploadedUrl) return;
      finalAudioUrl = uploadedUrl;
    }

    if (imageFileMode === 'file' && selectedImageFile && !imageUploadedToCloudinary) {
      const uploadedImageUrl = await this.handleUploadImageToCloudinary();
      if (uploadedImageUrl) finalImageUrl = uploadedImageUrl;
    }

    if (!songForm.title || !songForm.artist || !finalAudioUrl) {
      this.setState({
        songMessage: { type: 'error', text: 'Song Title, Artist, and Audio File/URL are required!' },
      });
      return;
    }

    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: songForm.title,
          artist: songForm.artist,
          album: songForm.album || null,
          audioUrl: finalAudioUrl,
          imageUrl: finalImageUrl || null,
          duration: parseInt(songForm.duration) || 180,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create song');
      }

      await this.props.refreshData();

      this.setState({
        songForm: {
          title: '',
          artist: '',
          album: '',
          audioUrl: '',
          imageUrl: '',
          duration: '180',
        },
        selectedAudioFile: null,
        selectedImageFile: null,
        audioUploadedToCloudinary: false,
        imageUploadedToCloudinary: false,
        audioProgress: 0,
        imageProgress: 0,
        songMessage: { type: 'success', text: 'Song added successfully!' },
      });
    } catch (err: any) {
      this.setState({
        songMessage: { type: 'error', text: err.message || 'An error occurred.' },
      });
    }
  };

  // Open Edit Song Modal
  openEditSongModal = (song: Song) => {
    this.setState({
      editingSong: song,
      editSongForm: {
        title: song.title,
        artist: song.artist,
        album: song.album || '',
        audioUrl: song.audioUrl,
        imageUrl: song.imageUrl || '',
        duration: String(song.duration),
      },
      editSelectedAudioFile: null,
      editSelectedImageFile: null,
    });
  };

  // Submit Update Song
  handleUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    const { editingSong, editSongForm, editSelectedAudioFile } = this.state;
    if (!editingSong) return;

    let finalAudioUrl = editSongForm.audioUrl;

    if (editSelectedAudioFile) {
      const uploadedUrl = await this.handleUploadEditAudioToCloudinary();
      if (uploadedUrl) finalAudioUrl = uploadedUrl;
    }

    try {
      this.setState({ actionLoadingId: editingSong.id });
      const response = await fetch(`/api/songs/${editingSong.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editSongForm.title,
          artist: editSongForm.artist,
          album: editSongForm.album || null,
          audioUrl: finalAudioUrl,
          imageUrl: editSongForm.imageUrl || null,
          duration: parseInt(editSongForm.duration) || 180,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update song');
      }

      await this.props.refreshData();
      this.setState({
        editingSong: null,
        actionLoadingId: null,
        songMessage: { type: 'success', text: `Song "${editSongForm.title}" updated successfully!` },
      });
    } catch (err: any) {
      this.setState({
        actionLoadingId: null,
        songMessage: { type: 'error', text: err.message || 'Failed to update song.' },
      });
    }
  };

  // Delete Song
  handleDeleteSong = async (song: Song) => {
    if (!window.confirm(`Are you sure you want to delete "${song.title}" by ${song.artist}?`)) {
      return;
    }

    try {
      this.setState({ actionLoadingId: song.id });
      const response = await fetch(`/api/songs/${song.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete song');
      }

      await this.props.refreshData();
      this.setState({
        actionLoadingId: null,
        songMessage: { type: 'success', text: `Song "${song.title}" deleted successfully!` },
      });
    } catch (err: any) {
      this.setState({
        actionLoadingId: null,
        songMessage: { type: 'error', text: err.message || 'Failed to delete song.' },
      });
    }
  };

  // Open Edit Playlist Modal
  openEditPlaylistModal = (playlist: Playlist) => {
    this.setState({
      editingPlaylist: playlist,
      editPlaylistForm: {
        name: playlist.name,
        description: playlist.description || '',
        imageUrl: playlist.imageUrl || '',
        selectedSongs: playlist.songs.map((s) => s.id),
      },
    });
  };

  // Submit Update Playlist
  handleUpdatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    const { editingPlaylist, editPlaylistForm } = this.state;
    if (!editingPlaylist) return;

    try {
      this.setState({ actionLoadingId: editingPlaylist.id });
      const response = await fetch(`/api/playlists/${editingPlaylist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editPlaylistForm.name,
          description: editPlaylistForm.description || null,
          imageUrl: editPlaylistForm.imageUrl || null,
          songIds: editPlaylistForm.selectedSongs,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update playlist');
      }

      await this.props.refreshData();
      this.setState({
        editingPlaylist: null,
        actionLoadingId: null,
        playlistMessage: { type: 'success', text: `Playlist "${editPlaylistForm.name}" updated successfully!` },
      });
    } catch (err: any) {
      this.setState({
        actionLoadingId: null,
        playlistMessage: { type: 'error', text: err.message || 'Failed to update playlist.' },
      });
    }
  };

  // Delete Playlist
  handleDeletePlaylist = async (playlist: Playlist) => {
    if (!window.confirm(`Are you sure you want to delete playlist "${playlist.name}"?`)) {
      return;
    }

    try {
      this.setState({ actionLoadingId: playlist.id });
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete playlist');
      }

      await this.props.refreshData();
      this.setState({
        actionLoadingId: null,
        playlistMessage: { type: 'success', text: `Playlist "${playlist.name}" deleted successfully!` },
      });
    } catch (err: any) {
      this.setState({
        actionLoadingId: null,
        playlistMessage: { type: 'error', text: err.message || 'Failed to delete playlist.' },
      });
    }
  };

  // Submit Create Playlist
  handlePlaylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    this.setState({ playlistMessage: null });
    const { playlistForm } = this.state;

    if (!playlistForm.name) {
      this.setState({
        playlistMessage: { type: 'error', text: 'Playlist name is required!' },
      });
      return;
    }

    try {
      const playlistRes = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playlistForm.name,
          description: playlistForm.description || null,
          imageUrl: playlistForm.imageUrl || null,
        }),
      });

      if (!playlistRes.ok) {
        throw new Error('Failed to create playlist');
      }

      const createdPlaylist = await playlistRes.json();

      if (playlistForm.selectedSongs.length > 0) {
        for (const songId of playlistForm.selectedSongs) {
          await fetch('/api/playlists/add-song', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playlistId: createdPlaylist.id,
              songId: songId,
            }),
          });
        }
      }

      await this.props.refreshData();

      this.setState({
        playlistForm: {
          name: '',
          description: '',
          imageUrl: '',
          selectedSongs: [],
        },
        playlistMessage: { type: 'success', text: 'Playlist created with songs successfully!' },
      });
    } catch (err: any) {
      this.setState({
        playlistMessage: { type: 'error', text: err.message || 'An error occurred.' },
      });
    }
  };

  render() {
    const { songs, playlists } = this.props;
    const {
      activeTab,
      songForm,
      playlistForm,
      editingSong,
      editSongForm,
      editingPlaylist,
      editPlaylistForm,
      audioFileMode,
      imageFileMode,
      selectedAudioFile,
      selectedImageFile,
      isUploadingAudio,
      isUploadingImage,
      audioProgress,
      audioUploadedToCloudinary,
      editSelectedAudioFile,
      isUploadingEditAudio,
      editAudioProgress,
      songMessage,
      playlistMessage,
      actionLoadingId,
    } = this.state;

    return (
      <>
        <Head>
          <title>Admin Control Panel | VibeSync</title>
          <meta name="description" content="Manage, edit, upload, and delete songs and playlists" />
        </Head>

        <div>
          <div className="section-title">
            <span>Admin Control Panel</span>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
              <button
                onClick={() => this.setState({ activeTab: 'add' })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  backgroundColor: activeTab === 'add' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'var(--transition-fast)',
                }}
              >
                <FiPlusCircle /> Add Single Song
              </button>
              <button
                onClick={() => this.setState({ activeTab: 'bulk-upload' })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  backgroundColor: activeTab === 'bulk-upload' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'var(--transition-fast)',
                }}
              >
                <FiFolderPlus /> Bulk Upload MP3s
              </button>
              <button
                onClick={() => this.setState({ activeTab: 'manage-songs' })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  backgroundColor: activeTab === 'manage-songs' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'var(--transition-fast)',
                }}
              >
                <FiMusic /> Manage Songs ({songs.length})
              </button>
              <button
                onClick={() => this.setState({ activeTab: 'manage-playlists' })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  backgroundColor: activeTab === 'manage-playlists' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'var(--transition-fast)',
                }}
              >
                <FiList /> Manage Playlists ({playlists.length})
              </button>
            </div>
          </div>

          {/* TAB: BULK MP3 UPLOAD */}
          {activeTab === 'bulk-upload' && (
            <BulkUploadManager refreshData={this.props.refreshData} />
          )}

          {/* TAB 1: ADD NEW SONG & PLAYLIST */}
          {activeTab === 'add' && (

            <div className="admin-grid">
              {/* Form 1: Add Song */}
              <div className="form-panel glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiMusic style={{ color: 'var(--accent)' }} /> Add New Song
                  </h2>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      backgroundColor: 'rgba(139, 92, 246, 0.15)',
                      color: '#a78bfa',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      fontWeight: 600,
                    }}
                  >
                    Cloudinary MP3
                  </span>
                </div>

                {songMessage && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      backgroundColor: songMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${songMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      color: songMessage.type === 'success' ? '#10b981' : '#ef4444',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    {songMessage.type === 'success' ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
                    <span>{songMessage.text}</span>
                  </div>
                )}

                <form onSubmit={this.handleSongSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className="form-group">
                    <label className="form-label">Song Title *</label>
                    <input
                      type="text"
                      name="title"
                      className="form-input"
                      placeholder="Enter song title"
                      value={songForm.title}
                      onChange={this.handleSongInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Artist *</label>
                    <input
                      type="text"
                      name="artist"
                      className="form-input"
                      placeholder="Enter artist name"
                      value={songForm.artist}
                      onChange={this.handleSongInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Album Name</label>
                    <input
                      type="text"
                      name="album"
                      className="form-input"
                      placeholder="Enter album name (optional)"
                      value={songForm.album}
                      onChange={this.handleSongInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label">Audio File (MP3) *</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => this.setState({ audioFileMode: 'file' })}
                          style={{
                            fontSize: '12px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: audioFileMode === 'file' ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                            color: '#fff',
                            fontWeight: 500,
                          }}
                        >
                          Upload MP3 File
                        </button>
                        <button
                          type="button"
                          onClick={() => this.setState({ audioFileMode: 'url' })}
                          style={{
                            fontSize: '12px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: audioFileMode === 'url' ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                            color: '#fff',
                            fontWeight: 500,
                          }}
                        >
                          Enter URL
                        </button>
                      </div>
                    </div>

                    {audioFileMode === 'file' ? (
                      <div
                        style={{
                          border: '2px dashed var(--border)',
                          borderRadius: '12px',
                          padding: '20px',
                          textAlign: 'center',
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <FiUploadCloud size={36} style={{ color: audioUploadedToCloudinary ? '#10b981' : 'var(--accent)' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>
                            {selectedAudioFile ? selectedAudioFile.name : 'Select or Drag & Drop MP3 Audio File'}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Supports .mp3, .wav, .m4a, .aac, .ogg (Max 30MB)
                          </span>
                        </div>

                        <input
                          type="file"
                          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                          id="audioFileInput"
                          style={{ display: 'none' }}
                          onChange={this.handleAudioFileChange}
                        />

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <label
                            htmlFor="audioFileInput"
                            style={{
                              padding: '8px 16px',
                              backgroundColor: 'rgba(255,255,255,0.08)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 500,
                              border: '1px solid var(--border)',
                            }}
                          >
                            {selectedAudioFile ? 'Choose Different File' : 'Browse Audio File'}
                          </label>

                          {selectedAudioFile && !audioUploadedToCloudinary && (
                            <button
                              type="button"
                              onClick={this.handleUploadAudioToCloudinary}
                              disabled={isUploadingAudio}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: 'var(--accent)',
                                borderRadius: '8px',
                                cursor: isUploadingAudio ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#fff',
                                opacity: isUploadingAudio ? 0.7 : 1,
                              }}
                            >
                              {isUploadingAudio ? `Uploading to Cloudinary (${audioProgress}%)...` : 'Upload to Cloudinary'}
                            </button>
                          )}
                        </div>

                        {isUploadingAudio && (
                          <div style={{ width: '100%', marginTop: '8px' }}>
                            <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${audioProgress}%`,
                                  backgroundColor: 'var(--accent)',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {audioUploadedToCloudinary && songForm.audioUrl && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
                            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FiCheckCircle size={14} /> Cloudinary URL Generated!
                            </span>
                            <audio controls src={songForm.audioUrl} style={{ width: '100%', maxHeight: '40px' }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="url"
                        name="audioUrl"
                        className="form-input"
                        placeholder="https://res.cloudinary.com/.../song.mp3"
                        value={songForm.audioUrl}
                        onChange={this.handleSongInputChange}
                        required={audioFileMode === 'url'}
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label">Cover Image</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => this.setState({ imageFileMode: 'file' })}
                          style={{
                            fontSize: '12px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: imageFileMode === 'file' ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                            color: '#fff',
                            fontWeight: 500,
                          }}
                        >
                          Upload Image
                        </button>
                        <button
                          type="button"
                          onClick={() => this.setState({ imageFileMode: 'url' })}
                          style={{
                            fontSize: '12px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: imageFileMode === 'url' ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                            color: '#fff',
                            fontWeight: 500,
                          }}
                        >
                          Enter Image URL
                        </button>
                      </div>
                    </div>

                    {imageFileMode === 'file' ? (
                      <div
                        style={{
                          border: '1px dashed var(--border)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          backgroundColor: 'rgba(0,0,0,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          <FiImage size={24} style={{ color: 'var(--text-secondary)' }} />
                          <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {selectedImageFile ? selectedImageFile.name : 'Select Cover Image File'}
                          </span>
                        </div>

                        <input
                          type="file"
                          accept="image/*"
                          id="imageFileInput"
                          style={{ display: 'none' }}
                          onChange={this.handleImageFileChange}
                        />

                        <label
                          htmlFor="imageFileInput"
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
                          Browse
                        </label>
                      </div>
                    ) : (
                      <input
                        type="url"
                        name="imageUrl"
                        className="form-input"
                        placeholder="https://example.com/cover.jpg (optional)"
                        value={songForm.imageUrl}
                        onChange={this.handleSongInputChange}
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Duration (seconds)</label>
                    <input
                      type="number"
                      name="duration"
                      className="form-input"
                      placeholder="180"
                      value={songForm.duration}
                      onChange={this.handleSongInputChange}
                    />
                  </div>

                  <button
                    type="submit"
                    className="submit-btn"
                    style={{ marginTop: '8px' }}
                    disabled={isUploadingAudio || isUploadingImage}
                  >
                    {isUploadingAudio ? `Uploading MP3... (${audioProgress}%)` : 'Add Song to Database'}
                  </button>
                </form>
              </div>

              {/* Form 2: Create Playlist */}
              <div className="form-panel glass-panel">
                <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Create Playlist</h2>

                {playlistMessage && (
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: playlistMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${playlistMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      color: playlistMessage.type === 'success' ? '#10b981' : '#ef4444',
                      fontSize: '14px',
                    }}
                  >
                    {playlistMessage.text}
                  </div>
                )}

                <form onSubmit={this.handlePlaylistSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Playlist Name *</label>
                    <input
                      type="text"
                      name="name"
                      className="form-input"
                      placeholder="Enter playlist name"
                      value={playlistForm.name}
                      onChange={this.handlePlaylistInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      name="description"
                      className="form-input"
                      rows={3}
                      placeholder="Add an optional description"
                      style={{ resize: 'none' }}
                      value={playlistForm.description}
                      onChange={this.handlePlaylistInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Playlist Cover Image URL</label>
                    <input
                      type="url"
                      name="imageUrl"
                      className="form-input"
                      placeholder="https://example.com/playlist-cover.jpg (optional)"
                      value={playlistForm.imageUrl}
                      onChange={this.handlePlaylistInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Select Tracks to Add</label>
                    <div className="songs-multiselect">
                      {songs.map((song) => {
                        const isChecked = playlistForm.selectedSongs.includes(song.id);
                        return (
                          <div
                            key={song.id}
                            className="songs-multiselect-item"
                            onClick={() => this.handleSongCheckboxChange(song.id)}
                          >
                            <input type="checkbox" checked={isChecked} onChange={() => {}} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '14px', fontWeight: '500' }}>{song.title}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{song.artist}</span>
                            </div>
                          </div>
                        );
                      })}
                      {songs.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                          No tracks available yet
                        </div>
                      )}
                    </div>
                  </div>

                  <button type="submit" className="submit-btn" style={{ marginTop: '8px' }}>
                    Create Playlist
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE SONGS (EDIT / DELETE) */}
          {activeTab === 'manage-songs' && (
            <div className="form-panel glass-panel">
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Manage Songs</h2>
              
              {songs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No songs available. Add songs to your library first!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {songs.map((song) => (
                    <div
                      key={song.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <img
                          src={song.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=60'}
                          alt={song.title}
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '15px' }}>{song.title}</span>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {song.artist} {song.album ? `• ${song.album}` : ''}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Duration: {this.formatDuration(song.duration)}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          onClick={() => this.openEditSongModal(song)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: 'rgba(139, 92, 246, 0.15)',
                            color: '#a78bfa',
                            borderRadius: '8px',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          <FiEdit size={14} /> Edit
                        </button>
                        <button
                          onClick={() => this.handleDeleteSong(song)}
                          disabled={actionLoadingId === song.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            fontSize: '13px',
                            fontWeight: 600,
                            opacity: actionLoadingId === song.id ? 0.5 : 1,
                          }}
                        >
                          <FiTrash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MANAGE PLAYLISTS (EDIT / DELETE) */}
          {activeTab === 'manage-playlists' && (
            <div className="form-panel glass-panel">
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Manage Playlists</h2>

              {playlists.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No playlists created yet. Create a playlist first!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <img
                          src={playlist.imageUrl || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100&auto=format&fit=crop&q=60'}
                          alt={playlist.name}
                          style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '16px' }}>{playlist.name}</span>
                          {playlist.description && (
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{playlist.description}</span>
                          )}
                          <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                            {playlist.songs.length} {playlist.songs.length === 1 ? 'track' : 'tracks'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          onClick={() => this.openEditPlaylistModal(playlist)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: 'rgba(139, 92, 246, 0.15)',
                            color: '#a78bfa',
                            borderRadius: '8px',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          <FiEdit size={14} /> Edit Playlist
                        </button>
                        <button
                          onClick={() => this.handleDeletePlaylist(playlist)}
                          disabled={actionLoadingId === playlist.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            fontSize: '13px',
                            fontWeight: 600,
                            opacity: actionLoadingId === playlist.id ? 0.5 : 1,
                          }}
                        >
                          <FiTrash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EDIT SONG MODAL */}
          {editingSong && (
            <div className="modal-overlay">
              <div className="modal-content glass-panel" style={{ maxWidth: '560px' }}>
                <div className="modal-header">
                  <h3 className="modal-title">Edit Song</h3>
                  <button onClick={() => this.setState({ editingSong: null })}>
                    <FiX size={20} />
                  </button>
                </div>

                <form onSubmit={this.handleUpdateSong} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Song Title</label>
                    <input
                      type="text"
                      name="title"
                      className="form-input"
                      value={editSongForm.title}
                      onChange={this.handleEditSongInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Artist</label>
                    <input
                      type="text"
                      name="artist"
                      className="form-input"
                      value={editSongForm.artist}
                      onChange={this.handleEditSongInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Album</label>
                    <input
                      type="text"
                      name="album"
                      className="form-input"
                      value={editSongForm.album}
                      onChange={this.handleEditSongInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Audio URL</label>
                    <input
                      type="url"
                      name="audioUrl"
                      className="form-input"
                      value={editSongForm.audioUrl}
                      onChange={this.handleEditSongInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Re-upload New MP3 to Cloudinary (Optional)</label>
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a"
                      className="form-input"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          this.setState({ editSelectedAudioFile: file });
                        }
                      }}
                    />
                    {editSelectedAudioFile && (
                      <button
                        type="button"
                        onClick={this.handleUploadEditAudioToCloudinary}
                        disabled={isUploadingEditAudio}
                        style={{
                          marginTop: '6px',
                          padding: '8px',
                          backgroundColor: 'var(--accent)',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '13px',
                        }}
                      >
                        {isUploadingEditAudio ? `Uploading (${editAudioProgress}%)...` : 'Upload New File to Cloudinary'}
                      </button>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cover Image URL</label>
                    <input
                      type="url"
                      name="imageUrl"
                      className="form-input"
                      value={editSongForm.imageUrl}
                      onChange={this.handleEditSongInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Duration (seconds)</label>
                    <input
                      type="number"
                      name="duration"
                      className="form-input"
                      value={editSongForm.duration}
                      onChange={this.handleEditSongInputChange}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button type="submit" className="submit-btn" style={{ flex: 1 }}>
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => this.setState({ editingSong: null })}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        fontWeight: 600,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* EDIT PLAYLIST MODAL */}
          {editingPlaylist && (
            <div className="modal-overlay">
              <div className="modal-content glass-panel" style={{ maxWidth: '560px' }}>
                <div className="modal-header">
                  <h3 className="modal-title">Edit Playlist</h3>
                  <button onClick={() => this.setState({ editingPlaylist: null })}>
                    <FiX size={20} />
                  </button>
                </div>

                <form onSubmit={this.handleUpdatePlaylist} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Playlist Name *</label>
                    <input
                      type="text"
                      name="name"
                      className="form-input"
                      value={editPlaylistForm.name}
                      onChange={this.handleEditPlaylistInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      name="description"
                      className="form-input"
                      rows={3}
                      style={{ resize: 'none' }}
                      value={editPlaylistForm.description}
                      onChange={this.handleEditPlaylistInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cover Image URL</label>
                    <input
                      type="url"
                      name="imageUrl"
                      className="form-input"
                      value={editPlaylistForm.imageUrl}
                      onChange={this.handleEditPlaylistInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Manage Tracks in Playlist</label>
                    <div className="songs-multiselect">
                      {songs.map((song) => {
                        const isChecked = editPlaylistForm.selectedSongs.includes(song.id);
                        return (
                          <div
                            key={song.id}
                            className="songs-multiselect-item"
                            onClick={() => this.handleSongCheckboxChange(song.id, true)}
                          >
                            <input type="checkbox" checked={isChecked} onChange={() => {}} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '14px', fontWeight: '500' }}>{song.title}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{song.artist}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button type="submit" className="submit-btn" style={{ flex: 1 }}>
                      Save Playlist
                    </button>
                    <button
                      type="button"
                      onClick={() => this.setState({ editingPlaylist: null })}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        fontWeight: 600,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
}
