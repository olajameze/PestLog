import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Fix boolean false to empty string; preserve other strings/null
    const result = await prisma.$queryRaw`
      UPDATE "LogbookEntry" 
      SET "baitBoxesPlaced" = '' 
      WHERE "baitBoxesPlaced" = false
    `;
    console.log('Data migration result:', result);

    // Verify no booleans remain
    const remaining = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "LogbookEntry" 
      WHERE "baitBoxesPlaced" = true OR "baitBoxesPlaced" = false
    `;
    console.log('Remaining boolean records:', remaining);

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

