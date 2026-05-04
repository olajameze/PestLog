import type { NextApiRequest, NextApiResponse } from 'next';
import { authCallbackUrl } from '../../../lib/authRedirect';
import { sendVerificationActionEmail, sendVerificationReminderEmail } from '../../../lib/email';

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

async function generateSupabaseSignupLink(email: string): Promise<{ ok: boolean; actionLink?: string; message?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(
    /\/$/,
    ''
  );
  const redirectTo = baseUrl ? authCallbackUrl(baseUrl, '/dashboard') : undefined;
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, message: 'Auth service is not configured.' };
  }

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      type: 'signup',
      email,
      ...(redirectTo ? { redirect_to: redirectTo } : {}),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    action_link?: string;
    msg?: string;
    error_description?: string;
    error?: string;
  };

  if (res.ok && data.action_link) {
    return { ok: true, actionLink: data.action_link };
  }

  return {
    ok: false,
    message: data.msg || data.error_description || data.error || 'Unable to generate verification link.',
  };
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

  const generated = await generateSupabaseSignupLink(trimmed);
  if (generated.ok && generated.actionLink) {
    try {
      await sendVerificationActionEmail(trimmed, generated.actionLink);
      return res.status(200).json({
        success: true,
        warning: 'Auth provider resend failed, but we sent a direct verification link instead.',
      });
    } catch (emailError) {
      console.error('Generated verification link email failed', emailError);
    }
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
