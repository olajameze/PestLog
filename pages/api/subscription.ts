import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Get company and return subscription status directly from Company model
    let company = await prisma.company.findUnique({
      where: { email: user.email! },
      select: {
        subscriptionStatus: true,
        trialEndsAt: true,
        stripeCustomerId: true,
      },
    });

    if (!company) {
      const technician = await prisma.technician.findFirst({
        where: { email: user.email! },
        include: { company: { select: { subscriptionStatus: true, trialEndsAt: true, stripeCustomerId: true } } },
      });

      if (!technician || !technician.company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      company = technician.company;
    }

    return res.status(200).json({
      status: company.subscriptionStatus,
      trialEndsAt: company.trialEndsAt,
      stripeCustomerId: company.stripeCustomerId,
    });
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}