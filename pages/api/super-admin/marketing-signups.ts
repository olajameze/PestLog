import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getSuperAdminCookieName, verifySuperAdminToken } from '../../../lib/superAdminAuth';

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
    const rows = await prisma.signupMarketingLead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        email: true,
        fullName: true,
        businessName: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      leads: rows.map((r) => ({
        email: r.email,
        fullName: r.fullName,
        businessName: r.businessName,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error('marketing-signups list failed', e);
    return res.status(500).json({ error: 'Unable to load marketing signups' });
  }
}
