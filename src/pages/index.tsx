import React, { Component } from 'react';
import Head from 'next/head';
import { BsPlayFill, BsPauseFill, BsMusicNoteBeamed } from 'react-icons/bs';

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

interface HomeProps {
  songs: Song[];
  playlists: Playlist[];
  currentSong: Song | null;
  isPlaying: boolean;
  loading: boolean;
  playSong: (song: Song, queue?: Song[]) => void;
}

export default class Home extends Component<HomeProps> {
  formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  render() {
    const { songs, currentSong, isPlaying, loading, playSong } = this.props;

    return (
      <>
        <Head>
          <title>Explore Music | VibeSync</title>
          <meta name="description" content="Explore and stream your favorite songs on VibeSync" />
        </Head>

        <div>
          {/* Welcome Banner */}
          <div className="glass-panel" style={{
            padding: '40px',
            borderRadius: '24px',
            marginBottom: '40px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.05) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <span style={{ 
                color: 'var(--accent)', 
                fontSize: '14px', 
                fontWeight: '700', 
                textTransform: 'uppercase',
                letterSpacing: '2px',
                display: 'block',
                marginBottom: '8px'
              }}>Welcome to VibeSync</span>
              <h1 style={{ fontSize: '40px', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.5px' }}>
                Your Ultimate <span className="gradient-text">Soundtrack</span> Awaits
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '500px', lineHeight: '1.6' }}>
                Stream high-quality audio files, curate custom playlists, and manage your library from our intuitive interface.
              </p>
            </div>
            <div style={{
              position: 'absolute',
              right: '-40px',
              bottom: '-40px',
              fontSize: '240px',
              color: 'rgba(139, 92, 246, 0.05)',
              zIndex: 1,
              pointerEvents: 'none'
            }}>
              <BsMusicNoteBeamed />
            </div>
          </div>

          {/* Section: Featured Tracks Grid */}
          <div className="section-title">
            <span>Featured Tracks</span>
          </div>

          {loading ? (
            <div className="empty-state">
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <style jsx>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
              <p>Loading your tracks...</p>
            </div>
          ) : songs.length === 0 ? (
            <div className="empty-state">
              <BsMusicNoteBeamed />
              <h3>No songs available</h3>
              <p>Head over to the Admin Panel to add your first song!</p>
            </div>
          ) : (
            <>
              <div className="grid-layout">
                {songs.slice(0, 4).map((song) => {
                  const isCurrent = currentSong?.id === song.id;
                  return (
                    <div 
                      key={song.id} 
                      className="media-card"
                      onClick={() => playSong(song, songs)}
                    >
                      <div className="card-img-container">
                        <img 
                          className="card-img" 
                          src={song.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=60'} 
                          alt={song.title} 
                        />
                        <button className="play-hover-btn">
                          {isCurrent && isPlaying ? <BsPauseFill /> : <BsPlayFill />}
                        </button>
                      </div>
                      <div className="card-info">
                        <div className="card-title">{song.title}</div>
                        <div className="card-subtitle">{song.artist}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Section: All Songs Table */}
              <div className="section-title" style={{ marginTop: '20px' }}>
                <span>All Tracks</span>
              </div>

              <div className="song-list-container">
                {songs.map((song, index) => {
                  const isCurrent = currentSong?.id === song.id;
                  return (
                    <div 
                      key={song.id} 
                      className={`song-row ${isCurrent ? 'active' : ''}`}
                      onClick={() => playSong(song, songs)}
                    >
                      <div className="song-row-num">
                        {isCurrent && isPlaying ? (
                          <div style={{
                            display: 'flex',
                            gap: '3px',
                            alignItems: 'flex-end',
                            height: '14px',
                            justifyContent: 'center',
                            width: '14px'
                          }}>
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
                      <div className="song-row-album">
                        {song.album || 'Single'}
                      </div>
                      <div className="song-row-duration">
                        {this.formatDuration(song.duration)}
                      </div>
                      <div className="song-row-actions">
                        <button className="icon-btn" onClick={(e) => {
                          e.stopPropagation();
                          playSong(song, songs);
                        }}>
                          {isCurrent && isPlaying ? <BsPauseFill style={{ fontSize: '18px' }} /> : <BsPlayFill style={{ fontSize: '18px' }} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </>
    );
  }
}
