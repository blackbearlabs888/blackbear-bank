import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const locations = await prisma.location.findMany({
    select: {
      name: true,
      slug: true,
      latitude: true,
      longitude: true,
    },
  });
  
  console.log('Locations with coordinates:');
  locations.forEach(loc => {
    console.log(`${loc.name}: lat=${loc.latitude}, lng=${loc.longitude}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
