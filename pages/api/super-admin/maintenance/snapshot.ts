import type { NextApiRequest, NextApiResponse } from 'next';
import { buildMaintenanceSnapshot } from '../../../../lib/maintenance/buildMaintenanceSnapshot';
import { getSuperAdminCookieName, verifySuperAdminToken } from '../../../../lib/superAdminAuth';
import { logServerExceptionToDb } from '../../../../lib/server/errorLogger';

function originFromRequest(req: NextApiRequest): string {
  const xfProto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim();
  const proto = xfProto || 'http';
  const host =
    (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() ||
    req.headers.host ||
    `127.0.0.1:${process.env.PORT || '3000'}`;
  return `${proto}://${host}`;
}

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
    const snapshot = await buildMaintenanceSnapshot(originFromRequest(req));
    return res.status(200).json(snapshot);
  } catch (e) {
    await logServerExceptionToDb(
      'Maintenance snapshot failed',
      e instanceof Error ? e.stack : undefined,
      { route: '/api/super-admin/maintenance/snapshot' },
    );
    return res.status(500).json({
      error: 'Failed to load maintenance snapshot — please try again.',
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}
