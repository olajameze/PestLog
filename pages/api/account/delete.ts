import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { prisma } from '../../../lib/prisma';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { sendAccountDeletionEmail } from '../../../lib/email';
import { cancelAllSubscriptionsForStripeCustomer } from '../../../lib/stripe/cancelCustomerSubscriptions';
import { normalizeAuthEmail } from '../../../lib/auth/userSession';
import { technicianEmailWhere } from '../../../lib/auth/technicianGate';
import { isAccountDeletionReason } from '../../../lib/accountDeletionReasons';
import { logServerExceptionToDb } from '../../../lib/server/errorLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let reason: string;
  let comment: string | null = null;

  if (req.method === 'POST') {
    const body = req.body as { reason?: string; comment?: string };
    const rawReason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!rawReason || !isAccountDeletionReason(rawReason)) {
      return res.status(400).json({ error: 'Please select why you are leaving.' });
    }
    reason = rawReason;
    const rawComment = typeof body.comment === 'string' ? body.comment.trim() : '';
    comment = rawComment.length > 0 ? rawComment : null;
    if (reason === 'Other (please specify)' && (!comment || comment.length < 3)) {
      return res.status(400).json({ error: 'Please add a short note when you choose Other.' });
    }
  } else {
    reason = 'Not specified (legacy client)';
    comment = null;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user || !user.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const authEmail = normalizeAuthEmail(user.email);

  const company = await prisma.company.findUnique({
    where: { email: authEmail },
  });

  if (!company) {
    const technician = await prisma.technician.findFirst({
      where: technicianEmailWhere(authEmail),
      select: { id: true },
    });
    if (technician) {
      return res.status(403).json({
        error: 'Technician accounts cannot delete owner accounts or company data.',
        code: 'ROLE_TECHNICIAN',
      });
    }
  }

  if (!company) {
    return res.status(400).json({ error: 'Company not found' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'Account deletion is unavailable: Supabase service role is not configured.',
    });
  }

  try {
    try {
      await prisma.deletionFeedback.create({
        data: {
          userId: user.id,
          userEmail: user.email ?? null,
          reason,
          comment,
        },
      });
    } catch (feedbackErr) {
      await logServerExceptionToDb(
        'Deletion feedback insert failed',
        feedbackErr instanceof Error ? feedbackErr.stack : undefined,
        { userId: user.id },
      );
      return res.status(503).json({
        error: 'Unable to save feedback — deletion was cancelled. Please try again or contact support.',
      });
    }

    const techList = await prisma.technician.findMany({
      where: { companyId: company.id },
      select: { email: true },
    });
    const pushEmails = [
      company.email.trim().toLowerCase(),
      ...techList.map((t) => t.email.trim().toLowerCase()),
    ];
    await prisma.pushSubscription.deleteMany({
      where: { email: { in: [...new Set(pushEmails)] } },
    });

    if (company.stripeCustomerId) {
      const subResult = await cancelAllSubscriptionsForStripeCustomer(company.stripeCustomerId);
      if (!subResult.ok) {
        return res.status(500).json({
          error: `Failed to cancel subscription: ${subResult.error}`,
        });
      }
    }

    const technicianIds = await prisma.technician.findMany({
      where: { companyId: company.id },
      select: { id: true },
    });

    if (technicianIds.length > 0) {
      await prisma.logbookEntryTechnician.deleteMany({
        where: {
          technicianId: { in: technicianIds.map((tech) => tech.id) },
        },
      });
    }

    await prisma.company.delete({
      where: { id: company.id },
    });

    try {
      await sendAccountDeletionEmail(user.email, company.name ?? undefined);
    } catch (emailError) {
      console.error('Account deletion email failed (continuing with delete):', emailError);
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      console.error('Supabase auth delete error:', deleteAuthError);
      await logServerExceptionToDb(
        'Supabase auth delete failed after company removal',
        deleteAuthError instanceof Error ? deleteAuthError.stack : undefined,
        { userId: user.id },
      );
      return res.status(500).json({
        error: 'Unable to delete account, contact support',
        details: deleteAuthError.message ?? deleteAuthError.toString(),
      });
    }

    await supabase.auth.signOut();

    res.status(200).json({
      success: true,
      message: 'Account and subscription deleted successfully.',
    });
  } catch (error) {
    console.error('Delete error:', error);
    await logServerExceptionToDb(
      'Account delete handler failed',
      error instanceof Error ? error.stack : undefined,
      {},
    );
    res.status(500).json({ error: 'Failed to delete account. Contact support.' });
  }
}
