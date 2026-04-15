import { NextApiRequest, NextApiResponse } from 'next';
import { createSignedPhotoUrl } from '../../../lib/supabase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const path = req.query.path;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing path query parameter' });
  }

  try {
    const signedUrl = await createSignedPhotoUrl(path);
    if (!signedUrl) {
      return res.status(404).json({ error: 'Unable to generate signed URL' });
    }

    return res.redirect(signedUrl);
  } catch (error) {
    console.error('Signed URL redirect error:', error);
    return res.status(500).json({ error: 'Failed to generate signed URL', details: String(error) });
  }
}
