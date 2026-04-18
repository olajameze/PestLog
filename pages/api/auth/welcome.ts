import type { NextApiRequest, NextApiResponse } from 'next';
import { sendWelcomeEmail } from '../../../lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, fullName, businessName } = req.body as {
    email: string;
    fullName?: string;
    businessName?: string;
  };

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    await sendWelcomeEmail(email, fullName, businessName);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Welcome email failed:', error);
    return res.status(500).json({ error: 'Failed to send welcome email' });
  }
}

