import React, { Component } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { BsMusicNoteBeamed, BsPlayFill, BsPauseFill, BsCollectionPlayFill } from 'react-icons/bs';
import { FiTrash2 } from 'react-icons/fi';

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

interface PlaylistsPageProps {
  playlists: Playlist[];
  currentSong: Song | null;
  isPlaying: boolean;
  playSong: (song: Song, queue: Song[]) => void;
  refreshData: () => Promise<void>;
  router: any;
}

class PlaylistsPageClass extends Component<PlaylistsPageProps> {
  formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  handleRemoveSong = async (playlistId: string, songId: string) => {
    try {
      const res = await fetch('/api/playlists/remove-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId, songId }),
      });

      if (!res.ok) throw new Error('Failed to remove song');
      await this.props.refreshData();
    } catch (err: any) {
      alert(err.message || 'Error removing song from playlist');
    }
  };

  handleDeletePlaylist = async (playlistId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete playlist "${name}"?`)) return;

    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete playlist');
      await this.props.refreshData();
      this.props.router.push('/playlists');
    } catch (err: any) {
      alert(err.message || 'Error deleting playlist');
    }
  };

  render() {
    const { playlists, currentSong, isPlaying, playSong, router } = this.props;
    const selectedPlaylistId = router.query.id;

    const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId) || null;

    return (
      <>
        <Head>
          <title>Playlists | VibeSync</title>
          <meta name="description" content="View and listen to your custom playlists" />
        </Head>

        <div>
          {activePlaylist ? (
            /* Playlist Detail View */
            <div>
              {/* Back Button & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <button
                  onClick={() => router.push('/playlists')}
                  style={{
                    color: 'var(--text-secondary)',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                  }}
                >
                  &larr; Back to Playlists
                </button>

                <button
                  onClick={() => this.handleDeletePlaylist(activePlaylist.id, activePlaylist.name)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FiTrash2 /> Delete Playlist
                </button>
              </div>

              <div className="playlist-header-banner">
                <img
                  className="playlist-banner-img"
                  src={activePlaylist.imageUrl || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=60'}
                  alt={activePlaylist.name}
                />
                <div className="playlist-banner-info">
                  <span className="playlist-banner-type">Playlist</span>
                  <h1 className="playlist-banner-title">{activePlaylist.name}</h1>
                  {activePlaylist.description && (
                    <p className="playlist-banner-desc">{activePlaylist.description}</p>
                  )}
                  <span className="playlist-banner-stats">
                    {activePlaylist.songs.length} {activePlaylist.songs.length === 1 ? 'song' : 'songs'}
                  </span>
                </div>
              </div>

              {activePlaylist.songs.length === 0 ? (
                <div className="empty-state">
                  <BsMusicNoteBeamed />
                  <h3>Playlist is empty</h3>
                  <p>Go to the Admin Panel to add songs to this playlist.</p>
                </div>
              ) : (
                <div className="song-list-container">
                  {activePlaylist.songs.map((song, index) => {
                    const isCurrent = currentSong?.id === song.id;
                    return (
                      <div
                        key={song.id}
                        className={`song-row ${isCurrent ? 'active' : ''}`}
                        onClick={() => playSong(song, activePlaylist.songs)}
                      >
                        <div className="song-row-num">
                          {isCurrent && isPlaying ? (
                            <div
                              style={{
                                display: 'flex',
                                gap: '3px',
                                alignItems: 'flex-end',
                                height: '14px',
                                justifyContent: 'center',
                                width: '14px',
                              }}
                            >
                              <span className="bar-anim-1"></span>
                              <span className="bar-anim-2"></span>
                              <span className="bar-anim-3"></span>
                              <style jsx>{`
                                span {
                                  display: inline-block;
                                  width: 3px;
                                  background-color: var(--accent);
                                  animation: bounce 0.8s ease-in-out infinite alternate;
                                }
                                .bar-anim-1 { height: 100%; animation-delay: 0.1s; }
                                .bar-anim-2 { height: 60%; animation-delay: 0.3s; }
                                .bar-anim-3 { height: 80%; animation-delay: 0.5s; }
                                @keyframes bounce {
                                  0% { transform: scaleY(0.3); }
                                  100% { transform: scaleY(1.1); }
                                }
                              `}</style>
                            </div>
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div className="song-row-details">
                          <img
                            className="song-row-img"
                            src={song.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=60'}
                            alt={song.title}
                          />
                          <div className="song-row-title-artist">
                            <div className="song-row-title">{song.title}</div>
                            <div className="song-row-artist">{song.artist}</div>
                          </div>
                        </div>
                        <div className="song-row-album">{song.album || 'Single'}</div>
                        <div className="song-row-duration">{this.formatDuration(song.duration)}</div>
                        <div className="song-row-actions" style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              playSong(song, activePlaylist.songs);
                            }}
                            title={isCurrent && isPlaying ? 'Pause' : 'Play'}
                          >
                            {isCurrent && isPlaying ? <BsPauseFill style={{ fontSize: '18px' }} /> : <BsPlayFill style={{ fontSize: '18px' }} />}
                          </button>
                          <button
                            className="icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              this.handleRemoveSong(activePlaylist.id, song.id);
                            }}
                            title="Remove track from playlist"
                          >
                            <FiTrash2 style={{ fontSize: '16px', color: '#ef4444' }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Playlists Grid Overview */
            <div>
              <div className="section-title">
                <span>Playlists</span>
              </div>

              {playlists.length === 0 ? (
                <div className="empty-state">
                  <BsCollectionPlayFill />
                  <h3>No playlists created yet</h3>
                  <p>Head to the Admin Panel to create your first music playlist!</p>
                </div>
              ) : (
                <div className="grid-layout">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="media-card"
                      onClick={() => router.push(`/playlists?id=${playlist.id}`)}
                    >
                      <div className="card-img-container">
                        <img
                          className="card-img"
                          src={playlist.imageUrl || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&auto=format&fit=crop&q=60'}
                          alt={playlist.name}
                        />
                        <button className="play-hover-btn">
                          <BsPlayFill />
                        </button>
                      </div>
                      <div className="card-info">
                        <div className="card-title">{playlist.name}</div>
                        <div className="card-subtitle">
                          {playlist.songs.length} {playlist.songs.length === 1 ? 'track' : 'tracks'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }
}

export default function PlaylistsPage(props: Omit<PlaylistsPageProps, 'router'>) {
  const router = useRouter();
  return <PlaylistsPageClass {...props} router={router} />;
}
