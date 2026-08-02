import type { NextApiRequest, NextApiResponse } from 'next';
import { mockDb } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing playlist ID' });
  }

  switch (method) {
    case 'PUT':
      try {
        const { name, description, imageUrl, songIds } = req.body;

        const updatedPlaylist = await mockDb.updatePlaylist(id, {
          name,
          description: description !== undefined ? description : undefined,
          imageUrl: imageUrl !== undefined ? imageUrl : undefined,
          songIds: Array.isArray(songIds) ? songIds : undefined,
        });

        return res.status(200).json(updatedPlaylist);
      } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to update playlist' });
      }

    case 'DELETE':
      try {
        await mockDb.deletePlaylist(id);
        return res.status(200).json({ success: true, message: 'Playlist deleted successfully' });
      } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to delete playlist' });
      }

    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
