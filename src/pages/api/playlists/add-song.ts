import type { NextApiRequest, NextApiResponse } from 'next';
import { mockDb } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const { playlistId, songId } = req.body;

    if (!playlistId || !songId) {
      return res.status(400).json({ error: 'playlistId and songId are required' });
    }

    const updatedPlaylist = await mockDb.addSongToPlaylist(playlistId, songId);
    return res.status(200).json(updatedPlaylist);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to add song to playlist' });
  }
}
