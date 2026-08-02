import '../styles/globals.css';
import React, { Component } from 'react';
import type { AppProps } from 'next/app';
import Layout from '../components/Layout';

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

interface AppState {
  songs: Song[];
  playlists: Playlist[];
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  loading: boolean;
}

export default class MyApp extends Component<AppProps, AppState> {
  state: AppState = {
    songs: [],
    playlists: [],
    currentSong: null,
    queue: [],
    isPlaying: false,
    loading: true,
  };

  componentDidMount() {
    this.refreshData();
  }

  refreshData = async () => {
    try {
      this.setState({ loading: true });
      const [songsRes, playlistsRes] = await Promise.all([
        fetch('/api/songs'),
        fetch('/api/playlists')
      ]);

      const songs = await songsRes.json();
      const playlists = await playlistsRes.json();

      this.setState({
        songs: Array.isArray(songs) ? songs : [],
        playlists: Array.isArray(playlists) ? playlists : [],
        loading: false
      });
    } catch (error) {
      console.error('Error fetching initial data:', error);
      this.setState({ loading: false });
    }
  };

  playSong = (song: Song, customQueue?: Song[]) => {
    const playQueue = customQueue || this.state.songs;
    this.setState({
      currentSong: song,
      queue: playQueue,
      isPlaying: true
    });
  };

  onPlayPause = () => {
    if (!this.state.currentSong && this.state.songs.length > 0) {
      // Play first song in list if none is selected
      this.playSong(this.state.songs[0]);
      return;
    }
    this.setState((prevState) => ({ isPlaying: !prevState.isPlaying }));
  };

  onNext = () => {
    const { currentSong, queue } = this.state;
    if (!currentSong || queue.length === 0) return;

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % queue.length;
    this.setState({ currentSong: queue[nextIndex], isPlaying: true });
  };

  onPrev = () => {
    const { currentSong, queue } = this.state;
    if (!currentSong || queue.length === 0) return;

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    if (currentIndex === -1) return;

    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    this.setState({ currentSong: queue[prevIndex], isPlaying: true });
  };

  render() {
    const { Component, pageProps } = this.props;
    const { currentSong, isPlaying, playlists, songs, loading } = this.state;

    return (
      <Layout
        currentSong={currentSong}
        isPlaying={isPlaying}
        onPlayPause={this.onPlayPause}
        onNext={this.onNext}
        onPrev={this.onPrev}
        playlists={playlists}
      >
        <Component
          {...pageProps}
          songs={songs}
          playlists={playlists}
          currentSong={currentSong}
          isPlaying={isPlaying}
          loading={loading}
          playSong={this.playSong}
          refreshData={this.refreshData}
        />
      </Layout>
    );
  }
}
