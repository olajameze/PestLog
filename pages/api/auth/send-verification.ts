import type { NextApiRequest, NextApiResponse } from 'next';
import { sendVerificationReminderEmail } from '../../../lib/email';

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function resendSupabaseSignupEmail(email: string): Promise<{ ok: boolean; message?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, message: 'Auth service is not configured.' };
  }

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/resend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ type: 'signup', email }),
  });

  if (res.ok) {
    return { ok: true };
  }

  let message = 'Unable to resend verification email.';
  try {
    const body = (await res.json()) as { msg?: string; error_description?: string; error?: string };
    message = body.msg || body.error_description || body.error || message;
  } catch {
    // ignore
  }
  return { ok: false, message };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email } = req.body as { email?: string };
  const trimmed = typeof email === 'string' ? email.trim() : '';
  if (!trimmed || !validEmail(trimmed)) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  const supabaseResult = await resendSupabaseSignupEmail(trimmed);
  if (supabaseResult.ok) {
    return res.status(200).json({ success: true });
  }

  console.warn('Supabase resend failed, falling back to reminder-only email:', supabaseResult.message);

  try {
    await sendVerificationReminderEmail(trimmed);
    return res.status(200).json({
      success: true,
      warning: 'We could not reach the auth provider to resend automatically. A reminder email with next steps was sent instead.',
    });
  } catch (error) {
    console.error('Verification email failure', error);
    return res.status(500).json({
      error: supabaseResult.message || 'Unable to send verification email.',
    });
  }
}
