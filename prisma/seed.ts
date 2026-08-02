import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  console.log('Seeding database...');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL is not set in environment variables. Cannot seed database.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Clean up existing data
  await prisma.playlist.deleteMany({});
  await prisma.song.deleteMany({});

  // Create mock songs
  const song1 = await prisma.song.create({
    data: {
      title: 'SoundHelix Song 1',
      artist: 'SoundHelix',
      album: 'SoundHelix Releases',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60',
      duration: 372,
    },
  });

  const song2 = await prisma.song.create({
    data: {
      title: 'SoundHelix Song 2',
      artist: 'SoundHelix',
      album: 'SoundHelix Releases',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60',
      duration: 423,
    },
  });

  const song3 = await prisma.song.create({
    data: {
      title: 'SoundHelix Song 3',
      artist: 'SoundHelix',
      album: 'SoundHelix Releases',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60',
      duration: 302,
    },
  });

  console.log('Songs seeded!');

  // Create mock playlists
  await prisma.playlist.create({
    data: {
      name: 'Chill Coding Vibes',
      description: 'The perfect background playlist for late-night coding sessions.',
      imageUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=60',
      songs: {
        connect: [
          { id: song1.id },
          { id: song2.id },
          { id: song3.id },
        ],
      },
    },
  });

  console.log('Playlists seeded!');
  console.log('Database seeding complete!');
  
  await pool.end();
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  });
