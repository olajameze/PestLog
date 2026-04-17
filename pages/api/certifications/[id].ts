import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end('Method Not Allowed');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const certId = typeof req.query.id === 'string' ? req.query.id : null;
  if (!certId) {
    return res.status(400).json({ error: 'Missing certification ID' });
  }

  const certification = await prisma.certification.findUnique({
    where: { id: certId },
    include: {
      technician: {
        include: {
          company: {
            select: { email: true },
          },
        },
      },
    },
  });

  if (!certification) {
    return res.status(404).json({ error: 'Certification not found' });
  }

  if (certification.technician.company.email !== user.email) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const storagePath = certification.fileUrl;
  if (storagePath) {
    const { error: storageError } = await supabaseAdmin.storage.from('logbook-photos').remove([storagePath]);
    if (storageError && storageError.status !== 404) {
      console.error('Failed to remove certification file from storage:', storageError);
    }
  }

  await prisma.certification.delete({ where: { id: certId } });

  return res.status(200).json({ success: true });
}
