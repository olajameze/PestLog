import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const hasEmail = Boolean(process.env.SUPER_ADMIN_EMAIL?.trim());
  const hasPassword = Boolean(process.env.SUPER_ADMIN_PASSWORD?.trim());
  const hasSessionSecret = Boolean(process.env.SUPER_ADMIN_SESSION_SECRET?.trim());
  const configured = hasEmail && hasPassword && hasSessionSecret;

  return res.status(200).json({
    configured,
    missing: {
      SUPER_ADMIN_EMAIL: !hasEmail,
      SUPER_ADMIN_PASSWORD: !hasPassword,
      SUPER_ADMIN_SESSION_SECRET: !hasSessionSecret,
    },
  });
}

