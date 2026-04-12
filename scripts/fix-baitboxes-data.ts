import { prisma } from '../lib/prisma.js';

async function main() {
  try {
    const result = await prisma.$queryRaw`
      UPDATE "LogbookEntry" 
      SET "baitBoxesPlaced" = CASE 
        WHEN "baitBoxesPlaced" = false THEN ''
        WHEN "baitBoxesPlaced" = true THEN 'Yes'
        ELSE "baitBoxesPlaced"
      END,
      "poisonUsed" = CASE 
        WHEN "poisonUsed" = false THEN ''
        WHEN "poisonUsed" = true THEN 'Yes'
        ELSE "poisonUsed"
      END
    `;
    console.log('Migration result:', result);

    const remaining = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN "baitBoxesPlaced" = true OR "baitBoxesPlaced" = false THEN 1 END) as baitBoxes_boolean,
        COUNT(CASE WHEN "poisonUsed" = true OR "poisonUsed" = false THEN 1 END) as poison_boolean
      FROM "LogbookEntry"
    `;
    console.log('Remaining booleans:', remaining);

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

