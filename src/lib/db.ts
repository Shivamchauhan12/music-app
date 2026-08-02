import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let prismaClient: PrismaClient | null = null;
let useMock = false;

if (typeof window === 'undefined') {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString && !connectionString.startsWith('prisma+postgres://localhost')) {
      const pool = new Pool({
        connectionString: connectionString,
      });
      const adapter = new PrismaPg(pool);
      prismaClient = globalForPrisma.prisma ?? new PrismaClient({ adapter });
      
      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = prismaClient;
      }
      console.log('Database initialized successfully with PostgreSQL.');
    } else {
      console.log('No valid DATABASE_URL provided. Falling back to in-memory mock data.');
      useMock = true;
    }
  } catch (error) {
    console.error('Failed to initialize database client:', error);
    useMock = true;
  }
}

export const prisma = prismaClient;

// Mock database store for fallback
interface MockSong {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  audioUrl: string;
  imageUrl: string | null;
  duration: number;
  createdAt: Date;
}

interface MockPlaylist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: Date;
  songs: MockSong[];
}

// Global variable to persist mock data during dev hot reloads
const globalForMock = globalThis as unknown as {
  mockSongs?: MockSong[];
  mockPlaylists?: MockPlaylist[];
};

if (!globalForMock.mockSongs) {
  globalForMock.mockSongs = [
    {
      id: 'song-1',
      title: 'SoundHelix Song 1',
      artist: 'SoundHelix',
      album: 'SoundHelix Releases',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60',
      duration: 372,
      createdAt: new Date(),
    },
    {
      id: 'song-2',
      title: 'SoundHelix Song 2',
      artist: 'SoundHelix',
      album: 'SoundHelix Releases',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60',
      duration: 423,
      createdAt: new Date(),
    },
    {
      id: 'song-3',
      title: 'SoundHelix Song 3',
      artist: 'SoundHelix',
      album: 'SoundHelix Releases',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60',
      duration: 302,
      createdAt: new Date(),
    },
  ];
}

if (!globalForMock.mockPlaylists) {
  globalForMock.mockPlaylists = [
    {
      id: 'playlist-1',
      name: 'Chill Coding Vibes',
      description: 'The perfect background playlist for late-night coding sessions.',
      imageUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=60',
      songs: [...globalForMock.mockSongs],
      createdAt: new Date(),
    },
  ];
}

export const mockDb = {
  isMock: () => useMock,
  
  async getSongs() {
    if (!useMock && prisma) {
      try {
        return await prisma.song.findMany({
          orderBy: { createdAt: 'desc' },
        });
      } catch (err) {
        console.warn('Prisma getSongs failed, falling back to mock database', err);
      }
    }
    return globalForMock.mockSongs || [];
  },

  async createSong(data: Omit<MockSong, 'id' | 'createdAt'>) {
    if (!useMock && prisma) {
      try {
        return await prisma.song.create({
          data: {
            title: data.title,
            artist: data.artist,
            album: data.album,
            audioUrl: data.audioUrl,
            imageUrl: data.imageUrl,
            duration: data.duration,
          },
        });
      } catch (err) {
        console.warn('Prisma createSong failed, falling back to mock database', err);
      }
    }
    const newSong: MockSong = {
      ...data,
      id: `song-${Date.now()}`,
      createdAt: new Date(),
    };
    globalForMock.mockSongs = [newSong, ...(globalForMock.mockSongs || [])];
    return newSong;
  },

  async getPlaylists() {
    if (!useMock && prisma) {
      try {
        return await prisma.playlist.findMany({
          include: { songs: true },
          orderBy: { createdAt: 'desc' },
        });
      } catch (err) {
        console.warn('Prisma getPlaylists failed, falling back to mock database', err);
      }
    }
    return globalForMock.mockPlaylists || [];
  },

  async createPlaylist(data: { name: string; description: string | null; imageUrl: string | null }) {
    if (!useMock && prisma) {
      try {
        return await prisma.playlist.create({
          data: {
            name: data.name,
            description: data.description,
            imageUrl: data.imageUrl,
          },
          include: { songs: true },
        });
      } catch (err) {
        console.warn('Prisma createPlaylist failed, falling back to mock database', err);
      }
    }
    const newPlaylist: MockPlaylist = {
      ...data,
      id: `playlist-${Date.now()}`,
      songs: [],
      createdAt: new Date(),
    };
    globalForMock.mockPlaylists = [newPlaylist, ...(globalForMock.mockPlaylists || [])];
    return newPlaylist;
  },

  async addSongToPlaylist(playlistId: string, songId: string) {
    if (!useMock && prisma) {
      try {
        return await prisma.playlist.update({
          where: { id: playlistId },
          data: {
            songs: {
              connect: { id: songId },
            },
          },
          include: { songs: true },
        });
      } catch (err) {
        console.warn('Prisma addSongToPlaylist failed, falling back to mock database', err);
      }
    }
    const playlist = globalForMock.mockPlaylists?.find((p) => p.id === playlistId);
    const song = globalForMock.mockSongs?.find((s) => s.id === songId);
    if (playlist && song) {
      if (!playlist.songs.some((s) => s.id === songId)) {
        playlist.songs.push(song);
      }
      return playlist;
    }
    throw new Error('Playlist or Song not found');
  },

  async updateSong(id: string, data: Partial<Omit<MockSong, 'id' | 'createdAt'>>) {
    if (!useMock && prisma) {
      try {
        return await prisma.song.update({
          where: { id },
          data,
        });
      } catch (err) {
        console.warn('Prisma updateSong failed, falling back to mock database', err);
      }
    }
    const index = globalForMock.mockSongs?.findIndex((s) => s.id === id) ?? -1;
    if (index !== -1 && globalForMock.mockSongs) {
      const updated = { ...globalForMock.mockSongs[index], ...data };
      globalForMock.mockSongs[index] = updated;

      // Update in any playlists containing this song
      globalForMock.mockPlaylists?.forEach((playlist) => {
        const songIdx = playlist.songs.findIndex((s) => s.id === id);
        if (songIdx !== -1) {
          playlist.songs[songIdx] = updated;
        }
      });

      return updated;
    }
    throw new Error('Song not found');
  },

  async deleteSong(id: string) {
    if (!useMock && prisma) {
      try {
        return await prisma.song.delete({
          where: { id },
        });
      } catch (err) {
        console.warn('Prisma deleteSong failed, falling back to mock database', err);
      }
    }
    if (globalForMock.mockSongs) {
      globalForMock.mockSongs = globalForMock.mockSongs.filter((s) => s.id !== id);
    }
    if (globalForMock.mockPlaylists) {
      globalForMock.mockPlaylists.forEach((playlist) => {
        playlist.songs = playlist.songs.filter((s) => s.id !== id);
      });
    }
    return { success: true, id };
  },

  async updatePlaylist(
    id: string,
    data: { name?: string; description?: string | null; imageUrl?: string | null; songIds?: string[] }
  ) {
    if (!useMock && prisma) {
      try {
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
        if (data.songIds !== undefined) {
          updateData.songs = {
            set: data.songIds.map((songId) => ({ id: songId })),
          };
        }

        return await prisma.playlist.update({
          where: { id },
          data: updateData,
          include: { songs: true },
        });
      } catch (err) {
        console.warn('Prisma updatePlaylist failed, falling back to mock database', err);
      }
    }
    const playlist = globalForMock.mockPlaylists?.find((p) => p.id === id);
    if (playlist) {
      if (data.name !== undefined) playlist.name = data.name;
      if (data.description !== undefined) playlist.description = data.description;
      if (data.imageUrl !== undefined) playlist.imageUrl = data.imageUrl;
      if (data.songIds !== undefined) {
        const newSongs = (globalForMock.mockSongs || []).filter((s) => data.songIds!.includes(s.id));
        playlist.songs = newSongs;
      }
      return playlist;
    }
    throw new Error('Playlist not found');
  },

  async deletePlaylist(id: string) {
    if (!useMock && prisma) {
      try {
        return await prisma.playlist.delete({
          where: { id },
        });
      } catch (err) {
        console.warn('Prisma deletePlaylist failed, falling back to mock database', err);
      }
    }
    if (globalForMock.mockPlaylists) {
      globalForMock.mockPlaylists = globalForMock.mockPlaylists.filter((p) => p.id !== id);
    }
    return { success: true, id };
  },

  async removeSongFromPlaylist(playlistId: string, songId: string) {
    if (!useMock && prisma) {
      try {
        return await prisma.playlist.update({
          where: { id: playlistId },
          data: {
            songs: {
              disconnect: { id: songId },
            },
          },
          include: { songs: true },
        });
      } catch (err) {
        console.warn('Prisma removeSongFromPlaylist failed, falling back to mock database', err);
      }
    }
    const playlist = globalForMock.mockPlaylists?.find((p) => p.id === playlistId);
    if (playlist) {
      playlist.songs = playlist.songs.filter((s) => s.id !== songId);
      return playlist;
    }
    throw new Error('Playlist not found');
  },
};

