import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { getSuperAdminCookieName, verifySuperAdminToken } from '../../../../lib/superAdminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.cookies[getSuperAdminCookieName()];
  if (!verifySuperAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const logs = await prisma.errorLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
    const body = JSON.stringify(logs, null, 2);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pesttrace-error-logs.json"');
    return res.status(200).send(body);
  } catch {
    return res.status(500).json({
      error: 'Failed to export error logs — please try again.',
    });
  }
}
