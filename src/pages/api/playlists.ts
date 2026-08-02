import type { NextApiRequest, NextApiResponse } from 'next';
import { mockDb } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const playlists = await mockDb.getPlaylists();
        return res.status(200).json(playlists);
      } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to fetch playlists' });
      }

    case 'POST':
      try {
        const { name, description, imageUrl } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Playlist name is required' });
        }

        const newPlaylist = await mockDb.createPlaylist({
          name,
          description: description || null,
          imageUrl: imageUrl || null,
        });

        return res.status(201).json(newPlaylist);
      } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to create playlist' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
