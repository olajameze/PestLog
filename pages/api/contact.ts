import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const supportEmail = process.env.SUPPORT_EMAIL || 'hello@jgdev.co.uk';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!resend) {
    return res.status(500).json({ error: 'Email service is not configured.' });
  }

  const { name, email, message } = req.body as { name?: string; email?: string; message?: string };
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedEmail = typeof email === 'string' ? email.trim() : '';
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!trimmedName || !trimmedEmail || !trimmedMessage) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }

  if (!validEmail(trimmedEmail)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  if (trimmedMessage.length < 20) {
    return res.status(400).json({ error: 'Message must be at least 20 characters long.' });
  }

  try {
    await resend.emails.send({
      from: `Pest Trace <${supportEmail}>`,
      to: [supportEmail],
      subject: `New Pest Trace contact request from ${trimmedName}`,
      html: `
        <h1>New contact request</h1>
        <p><strong>Name:</strong> ${trimmedName}</p>
        <p><strong>Email:</strong> ${trimmedEmail}</p>
        <p><strong>Message:</strong></p>
        <p>${trimmedMessage.replace(/\n/g, '<br/>')}</p>
      `,
      text: `New contact request\n\nName: ${trimmedName}\nEmail: ${trimmedEmail}\n\nMessage:\n${trimmedMessage}`,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Contact email failure', error);
    return res.status(500).json({ error: 'Unable to send contact message. Please try again later.' });
  }
}
