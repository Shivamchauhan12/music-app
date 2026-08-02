import type { NextApiRequest, NextApiResponse } from 'next';
import { mockDb } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const songs = await mockDb.getSongs();
        return res.status(200).json(songs);
      } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to fetch songs' });
      }

    case 'POST':
      try {
        const { title, artist, album, audioUrl, imageUrl, duration } = req.body;

        if (!title || !artist || !audioUrl) {
          return res.status(400).json({ error: 'Title, artist, and audioUrl are required' });
        }

        const newSong = await mockDb.createSong({
          title,
          artist,
          album: album || null,
          audioUrl,
          imageUrl: imageUrl || null,
          duration: Number(duration) || 180,
        });

        return res.status(201).json(newSong);
      } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to create song' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
