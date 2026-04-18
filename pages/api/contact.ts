import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message } = req.body;

  // Basic server-side validation
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is missing from .env.local');
      return res.status(500).json({ error: 'Email service not configured.' });
    }

    const { data, error } = await resend.emails.send({
      // You MUST use onboarding@resend.dev as the sender on the free/testing tier.
      // Using pesttrace@gmail.com here will cause a 400 error.
      from: 'PestTrace <onboarding@resend.dev>', 
      to: ['pesttrace@gmail.com'],
      subject: `New Contact Form Submission from ${name}`,
      replyTo: email,
      html: `
        <h2>New Inquiry from PestTrace Landing Page</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${message}</p>
      `,
    });

    if (error) {
      // Specifically handle invalid API keys for better logging
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 401) {
        console.error('CRITICAL: Resend API Key is invalid. Check your .env.local file.');
        return res.status(500).json({ error: 'Mail server configuration error.' });
      }
      console.error('Resend API error:', error); // Log the actual error from Resend
      return res.status(400).json({ error: error.message || 'Failed to send email via Resend.' });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error('Contact API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
