import type { NextApiRequest, NextApiResponse } from 'next';
import { mockDb } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing song ID' });
  }

  switch (method) {
    case 'PUT':
      try {
        const { title, artist, album, audioUrl, imageUrl, duration } = req.body;

        const updatedSong = await mockDb.updateSong(id, {
          title,
          artist,
          album: album !== undefined ? album : undefined,
          audioUrl,
          imageUrl: imageUrl !== undefined ? imageUrl : undefined,
          duration: duration !== undefined ? Number(duration) : undefined,
        });

        return res.status(200).json(updatedSong);
      } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to update song' });
      }

    case 'DELETE':
      try {
        await mockDb.deleteSong(id);
        return res.status(200).json({ success: true, message: 'Song deleted successfully' });
      } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to delete song' });
      }

    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
