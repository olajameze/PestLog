import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/supabase'; // Adjust import as needed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, operation, tableName, data } = req.body as any;

    // Route to table-specific handlers
    switch (tableName) {
      case 'logbook_entries':
        return handleLogbookEntry(prisma, session.user.id, operation, data, res);
      case 'chemical_logs':
        return handleChemicalLog(prisma, session.user.id, operation, data, res);
      default:
        return res.status(400).json({ error: 'Unsupported table' });
    }
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: 'Sync failed' });
  }
}

async function handleLogbookEntry(
  prisma: any,
  userId: string,
  operation: string,
  data: any,
  res: NextApiResponse
) {
  try {
    switch (operation) {
      case 'CREATE':
        const created = await prisma.logbookEntry.create({
          data: {
            ...data,
            companyId: data.companyId, // Validate from session/company
          },
        });
        return res.status(200).json(created);
      
      case 'UPDATE':
        const updated = await prisma.logbookEntry.update({
          where: { id: data.id },
          data,
        });
        return res.status(200).json(updated);
      
      case 'DELETE':
        await prisma.logbookEntry.delete({ where: { id: data.id } });
        return res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('Logbook sync error:', error);
    // Increment retry in client
    return res.status(500).json({ error: 'Sync failed' });
  }
}

async function handleChemicalLog(
  prisma: any,
  userId: string,
  operation: string,
  data: any,
  res: NextApiResponse
) {
  // Similar handler for chemical_logs when table exists
  return res.status(501).json({ error: 'Chemical logs table pending migration' });
}

// Helper to get user session (adapt to your auth)
async function getSession({ req }: { req: NextApiRequest }) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  // Implement token verification against Supabase
  // Return { user: { id: string } } or null
  return { user: { id: 'temp-user-id' } }; // Placeholder
}

