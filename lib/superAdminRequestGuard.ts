import type { NextApiRequest } from 'next';
import { getSuperAdminCookieName, verifySuperAdminToken } from './superAdminAuth';

export function isSuperAdminRequest(req: NextApiRequest): boolean {
  const token = req.cookies[getSuperAdminCookieName()];
  return verifySuperAdminToken(token);
}
