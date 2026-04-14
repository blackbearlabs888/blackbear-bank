import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const locationCoords = [
  { slug: 'jakarta', latitude: -6.2088, longitude: 106.8456 },
  { slug: 'bandung', latitude: -6.9175, longitude: 107.6191 },
  { slug: 'surabaya', latitude: -7.2575, longitude: 112.7521 },
  { slug: 'semarang', latitude: -6.9666, longitude: 110.4196 },
  { slug: 'yogyakarta', latitude: -7.7956, longitude: 110.3695 },
  { slug: 'medan', latitude: 3.5952, longitude: 98.6722 },
  { slug: 'makassar', latitude: -5.1477, longitude: 119.4327 },
  { slug: 'denpasar', latitude: -8.6705, longitude: 115.2126 },
  { slug: 'palembang', latitude: -2.9909, longitude: 104.7566 },
  { slug: 'balikpapan', latitude: -1.2654, longitude: 116.8312 },
];

async function main() {
  console.log('Updating location coordinates...');
  
  for (const loc of locationCoords) {
    const result = await prisma.location.update({
      where: { slug: loc.slug },
      data: {
        latitude: loc.latitude,
        longitude: loc.longitude,
      },
    });
    console.log(`Updated ${result.name}: lat ${loc.latitude}, lng ${loc.longitude}`);
  }
  
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
