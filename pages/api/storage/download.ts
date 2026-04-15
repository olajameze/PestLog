import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const path = req.query.path;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing path query parameter' });
  }

  const sanitizedPath = path.replace(/^\//, '');
  const fileName = sanitizedPath.split('/').pop() || 'certificate';

  const { data, error } = await supabaseAdmin.storage.from('logbook-photos').download(sanitizedPath);
  if (error || !data) {
    console.error('Certificate download failed:', error, 'path:', sanitizedPath);
    return res.status(404).json({ error: 'Certificate not found', details: error?.message });
  }

  try {
    const buffer = await data.arrayBuffer();
    res.setHeader('Content-Type', data.type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Certificate download streaming failed:', err);
    return res.status(500).json({ error: 'Failed to download certificate', details: String(err) });
  }
}
