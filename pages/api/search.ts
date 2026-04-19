import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { searchAll } from '../../lib/search/fullText';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const q = typeof req.query.q === 'string' ? req.query.q : '';
  if (!q.trim()) return res.status(200).json([]);

  const company = await prisma.company.findUnique({
    where: { email: user.email },
    select: { id: true },
  });

  if (!company) return res.status(404).json({ error: 'Company not found' });

  const hits = await searchAll(prisma, company.id, q);
  return res.status(200).json(hits);
}

