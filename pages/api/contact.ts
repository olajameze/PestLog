import type { NextApiRequest, NextApiResponse } from 'next';
import { sendContactFormNotification } from '../../lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is missing');
    return res.status(500).json({ error: 'Email service not configured.' });
  }

  try {
    const data = await sendContactFormNotification({
      submitterName: name,
      submitterEmail: email,
      message,
    });
    return res.status(200).json({ id: data?.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('RESEND_API_KEY') || msg.includes('not configured')) {
      console.error('Contact API:', msg);
      return res.status(500).json({ error: 'Email service not configured.' });
    }
    console.error('Contact API / Resend:', err);
    return res.status(502).json({ error: 'Failed to send message. Please try again or email support directly.' });
  }
}
