import type { NextApiRequest, NextApiResponse } from 'next';
import { sendVerificationReminderEmail } from '../../../lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email } = req.body as { email?: string };
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  try {
    await sendVerificationReminderEmail(email);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Verification email failure', error);
    return res.status(500).json({ error: 'Unable to send verification reminder email.' });
  }
}
