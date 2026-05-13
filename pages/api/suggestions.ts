import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { logServerExceptionToDb } from '../../lib/server/errorLogger';
import { sendSuggestionNotification } from '../../lib/email';

const CATEGORIES = new Set([
  'Chemical tracking',
  'Reporting',
  'Certifications',
  'Mobile app',
  'Other',
]);

function testDebug(payload: Record<string, unknown>) {
  return process.env.PLAYWRIGHT_TEST === '1' ? payload : {};
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

function clientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const raw =
    typeof xf === 'string'
      ? xf.split(',')[0]?.trim()
      : Array.isArray(xf)
        ? xf[0]?.trim()
        : '';
  return raw || req.socket.remoteAddress || 'unknown';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(503).json({ error: 'Suggestions are temporarily unavailable.' });
  }

  const body = req.body as { name?: string; email?: string; suggestion?: string; category?: string };
  const suggestion = typeof body.suggestion === 'string' ? body.suggestion.trim() : '';
  if (!suggestion || suggestion.length < 10) {
    return res.status(400).json({ error: 'Suggestion must be at least 10 characters.' });
  }

  let email: string | null = null;
  if (body.email && typeof body.email === 'string' && body.email.trim()) {
    const trimmed = body.email.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!emailOk) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    email = trimmed;
  }

  const category =
    body.category && typeof body.category === 'string' && CATEGORIES.has(body.category)
      ? body.category
      : 'Other';

  const ipHash = hashIp(clientIp(req));
  const hourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  try {
    const { data: recentRows, error: recentError } = await admin
      .from('suggestions')
      .select('id')
      .eq('ip_hash', ipHash)
      .gte('created_at', hourAgoIso)
      .limit(4);

    if (recentError) {
      await logServerExceptionToDb(
        'Suggestion rate-limit query failed',
        undefined,
        { message: recentError.message },
      );
      return res.status(500).json({
        error: 'Please try again later',
        ...testDebug({ _debug: recentError.message }),
      });
    }

    if ((recentRows?.length ?? 0) >= 3) {
      return res.status(429).json({ error: 'Too many requests, please wait an hour' });
    }

    const { error: insertError } = await admin.from('suggestions').insert({
      name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null,
      email,
      suggestion,
      category,
      ip_hash: ipHash,
    });

    if (insertError) {
      await logServerExceptionToDb(
        'Suggestion insert failed',
        undefined,
        { message: insertError.message },
      );
      return res.status(500).json({
        error: 'Please try again later',
        ...testDebug({ _debug: insertError.message }),
      });
    }

    if (process.env.RESEND_API_KEY) {
      try {
        await sendSuggestionNotification({
          name: typeof body.name === 'string' ? body.name.trim() || null : null,
          submitterEmail: email,
          suggestion,
          category,
        });
      } catch (notifyErr) {
        console.error('[suggestions] notify email failed', notifyErr);
        await logServerExceptionToDb(
          'Suggestion saved but notify email failed',
          notifyErr instanceof Error ? notifyErr.stack : undefined,
          { message: notifyErr instanceof Error ? notifyErr.message : String(notifyErr) },
        );
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    await logServerExceptionToDb(
      'Suggestion handler failed',
      e instanceof Error ? e.stack : undefined,
      {},
    );
    return res.status(500).json({
      error: 'Please try again later',
      ...testDebug({ _debug: e instanceof Error ? e.message : String(e) }),
    });
  }
}
