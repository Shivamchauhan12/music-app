import React, { Component } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BsMusicNoteBeamed, BsHouseDoorFill, BsFileMusicFill, BsShieldLockFill } from 'react-icons/bs';
import AudioPlayer from './AudioPlayer';

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

interface LayoutProps {
  children: React.ReactNode;
  currentSong: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  playlists: Playlist[];
  router: any; // Next.js router instance
}

class LayoutClass extends Component<LayoutProps> {
  render() {
    const { children, currentSong, isPlaying, onPlayPause, onNext, onPrev, playlists, router } = this.props;
    const currentPath = router.pathname;

    return (
      <div className="app-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="logo">
            <BsMusicNoteBeamed />
            <span className="gradient-text">VibeSync</span>
          </div>

          <nav className="nav-menu">
            <Link href="/" className={`nav-item ${currentPath === '/' ? 'active' : ''}`}>
              <BsHouseDoorFill />
              <span>Explore</span>
            </Link>
            <Link href="/playlists" className={`nav-item ${currentPath.startsWith('/playlists') ? 'active' : ''}`}>
              <BsFileMusicFill />
              <span>Playlists</span>
            </Link>
            <Link href="/admin" className={`nav-item ${currentPath === '/admin' ? 'active' : ''}`}>
              <BsShieldLockFill />
              <span>Admin Panel</span>
            </Link>
          </nav>

          <div className="sidebar-playlists">
            <div className="sidebar-title">Playlists</div>
            <div className="playlist-links">
              {playlists && playlists.map((playlist) => (
                <Link 
                  key={playlist.id} 
                  href={`/playlists?id=${playlist.id}`} 
                  className="playlist-link"
                >
                  {playlist.name}
                </Link>
              ))}
              {(!playlists || playlists.length === 0) && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No playlists yet</div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          {children}
        </main>

        {/* Floating Player */}
        <AudioPlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlayPause={onPlayPause}
          onNext={onNext}
          onPrev={onPrev}
        />
      </div>
    );
  }
}

// Wrap with router hook helper
export default function Layout(props: Omit<LayoutProps, 'router'>) {
  const router = useRouter();
  return <LayoutClass {...props} router={router} />;
}
