import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Try raw query to check if columns exist
  const result = await prisma.$queryRaw`PRAGMA table_info(locations);`;
  console.log('Table schema:');
  console.log(result);
  
  // Also try to get one location
  const loc = await prisma.location.findFirst();
  console.log('\nFirst location:', loc);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
