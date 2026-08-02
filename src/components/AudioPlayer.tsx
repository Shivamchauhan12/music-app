import React, { Component, createRef } from 'react';
import { 
  BsPlayFill, 
  BsPauseFill, 
  BsSkipStartFill, 
  BsSkipEndFill, 
  BsVolumeUpFill, 
  BsVolumeMuteFill 
} from 'react-icons/bs';

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  audioUrl: string;
  imageUrl: string | null;
  duration: number;
}

interface AudioPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

interface AudioPlayerState {
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

export default class AudioPlayer extends Component<AudioPlayerProps, AudioPlayerState> {
  private audioRef = createRef<HTMLAudioElement>();
  private progressBarRef = createRef<HTMLDivElement>();

  state: AudioPlayerState = {
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isMuted: false,
  };

  componentDidMount() {
    this.setupAudio();
  }

  componentDidUpdate(prevProps: AudioPlayerProps, prevState: AudioPlayerState) {
    if (this.audioRef.current) {
      // Handle song change
      if (prevProps.currentSong?.id !== this.props.currentSong?.id) {
        this.audioRef.current.load();
        this.updateMediaSession();
        if (this.props.isPlaying) {
          this.playAudio();
        }
      }
      
      // Handle play/pause toggle
      if (prevProps.isPlaying !== this.props.isPlaying) {
        if (this.props.isPlaying) {
          this.playAudio();
        } else {
          this.audioRef.current.pause();
        }
      }
    }
  }

  updateMediaSession = () => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && this.props.currentSong) {
      const { title, artist, album, imageUrl } = this.props.currentSong;
      const artworkUrl = imageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60';

      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title,
          artist,
          album: album || 'VibeSync',
          artwork: [
            { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
            { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
          ],
        });

        navigator.mediaSession.setActionHandler('play', () => this.props.onPlayPause());
        navigator.mediaSession.setActionHandler('pause', () => this.props.onPlayPause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.props.onPrev());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.props.onNext());
      } catch (e) {
        console.warn('MediaSession initialization error:', e);
      }
    }
  };


  componentWillUnmount() {
    const audio = this.audioRef.current;
    if (audio) {
      audio.removeEventListener('timeupdate', this.onTimeUpdate);
      audio.removeEventListener('loadedmetadata', this.onLoadedMetadata);
      audio.removeEventListener('ended', this.props.onNext);
    }
  }

  setupAudio = () => {
    const audio = this.audioRef.current;
    if (audio) {
      audio.volume = this.state.volume;
      audio.addEventListener('timeupdate', this.onTimeUpdate);
      audio.addEventListener('loadedmetadata', this.onLoadedMetadata);
      audio.addEventListener('ended', this.props.onNext);
      
      this.updateMediaSession();

      if (this.props.isPlaying && this.props.currentSong) {
        this.playAudio();
      }
    }
  };


  playAudio = () => {
    if (this.audioRef.current) {
      this.audioRef.current.play().catch(err => {
        console.warn('Audio play failed/interrupted:', err);
      });
    }
  };

  onTimeUpdate = () => {
    if (this.audioRef.current) {
      this.setState({ currentTime: this.audioRef.current.currentTime });
    }
  };

  onLoadedMetadata = () => {
    if (this.audioRef.current) {
      this.setState({ duration: this.audioRef.current.duration });
    }
  };

  handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = this.progressBarRef.current;
    const audio = this.audioRef.current;
    if (bar && audio && this.state.duration) {
      const rect = bar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const percentage = clickX / width;
      const newTime = percentage * this.state.duration;
      audio.currentTime = newTime;
      this.setState({ currentTime: newTime });
    }
  };

  handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    let newVolume = clickX / width;
    
    if (newVolume < 0) newVolume = 0;
    if (newVolume > 1) newVolume = 1;
    
    const audio = this.audioRef.current;
    if (audio) {
      audio.volume = newVolume;
      audio.muted = false;
      this.setState({ volume: newVolume, isMuted: false });
    }
  };

  toggleMute = () => {
    const audio = this.audioRef.current;
    if (audio) {
      const nextMuted = !this.state.isMuted;
      audio.muted = nextMuted;
      this.setState({ isMuted: nextMuted });
    }
  };

  formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  render() {
    const { currentSong, isPlaying, onPlayPause, onNext, onPrev } = this.props;
    const { currentTime, duration, volume, isMuted } = this.state;
    
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    return (
      <div className="player-bar">
        {/* Audio element */}
        <audio 
          ref={this.audioRef} 
          src={currentSong?.audioUrl || undefined}
        />

        {/* Left Side: Song Info */}
        <div className="player-song-info">
          {currentSong ? (
            <>
              <img 
                className="player-song-img" 
                src={currentSong.imageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&auto=format&fit=crop&q=60'} 
                alt={currentSong.title}
              />
              <div className="player-song-details">
                <div className="player-song-title">{currentSong.title}</div>
                <div className="player-song-artist">{currentSong.artist}</div>
              </div>
            </>
          ) : (
            <div className="player-song-details">
              <div className="player-song-title" style={{ color: 'var(--text-muted)' }}>No song selected</div>
            </div>
          )}
        </div>

        {/* Middle: Controls */}
        <div className="player-controls">
          <div className="player-buttons">
            <button className="player-btn" onClick={onPrev} disabled={!currentSong}>
              <BsSkipStartFill />
            </button>
            <button className="player-btn play-pause" onClick={onPlayPause} disabled={!currentSong}>
              {isPlaying ? <BsPauseFill /> : <BsPlayFill />}
            </button>
            <button className="player-btn" onClick={onNext} disabled={!currentSong}>
              <BsSkipEndFill />
            </button>
          </div>

          <div className="player-progress-container">
            <span className="time-label">{this.formatTime(currentTime)}</span>
            <div 
              className="progress-bar-wrapper" 
              ref={this.progressBarRef} 
              onClick={this.handleProgressClick}
            >
              <div 
                className="progress-bar-fill" 
                style={{ width: `${progressPercent}%` }}
              >
                <div className="progress-bar-handle"></div>
              </div>
            </div>
            <span className="time-label">{this.formatTime(duration || currentSong?.duration || 0)}</span>
          </div>
        </div>

        {/* Right Side: Volume & Extra Controls */}
        <div className="player-extra-controls">
          <div className="volume-container">
            <button className="player-btn" onClick={this.toggleMute} disabled={!currentSong}>
              {isMuted ? <BsVolumeMuteFill /> : <BsVolumeUpFill />}
            </button>
            <div className="volume-slider" onClick={this.handleVolumeChange}>
              <div 
                className="volume-fill" 
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
