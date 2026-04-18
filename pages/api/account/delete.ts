import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabase';
import { prisma } from '../../../lib/prisma';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { sendAccountDeletionEmail } from '../../../lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).end('Method Not Allowed');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || !user.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let company = await prisma.company.findUnique({
    where: { email: user.email },
  });

  if (!company) {
    const technician = await prisma.technician.findFirst({
      where: { email: user.email },
      include: { company: true },
    });
    company = technician?.company ?? null;
  }

  if (!company) {
    return res.status(400).json({ error: 'Company not found' });
  }

  try {
    // Cancel Stripe subscription
    if (company.stripeCustomerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: company.stripeCustomerId,
        status: 'active',
      });
      for (const sub of subscriptions.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }

    // Remove any technician assignment records before deleting the company.
    // Technicians cascade from company deletion, but LogbookEntryTechnician must be cleared explicitly.
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

    // Delete company (cascade techs, logbooks, certs, etc.)
    await prisma.company.delete({
      where: { id: company.id },
    });

    // Delete Supabase user
    try {
      await sendAccountDeletionEmail(user.email, company.name ?? undefined);
    } catch (emailError) {
      console.error('Account deletion email failed (continuing with delete):', emailError);
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      console.error('Supabase auth delete error:', deleteAuthError);
      return res.status(500).json({
        error: 'Failed to delete authentication account.',
        details: deleteAuthError.message ?? deleteAuthError.toString(),
      });
    }

    // Sign out
    await supabase.auth.signOut();

    res.status(200).json({ success: true, message: 'Account and subscription deleted successfully.' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete account. Contact support.' });
  }
}

