import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const locations = [
  {
    name: 'Jakarta',
    slug: 'jakarta',
    description: 'Layanan gestun dan tarik tunai terpercaya di Jakarta. Melayani seluruh area Jabodetabek dengan proses cepat dan aman.',
    latitude: -6.2088,
    longitude: 106.8456,
    isActive: true,
  },
  {
    name: 'Bandung',
    slug: 'bandung',
    description: 'Layanan gestun Bandung dengan proses mudah dan cepat. Melayani area Bandung dan sekitarnya.',
    latitude: -6.9175,
    longitude: 107.6191,
    isActive: true,
  },
  {
    name: 'Surabaya',
    slug: 'surabaya',
    description: 'Gestun Surabaya terpercaya dengan rate terbaik. Proses instan dan aman untuk seluruh area Jawa Timur.',
    latitude: -7.2575,
    longitude: 112.7521,
    isActive: true,
  },
  {
    name: 'Semarang',
    slug: 'semarang',
    description: 'Layanan tarik tunai dan gestun di Semarang. Melayani area Jawa Tengah dengan kepercayaan tinggi.',
    latitude: -6.9666,
    longitude: 110.4196,
    isActive: true,
  },
  {
    name: 'Yogyakarta',
    slug: 'yogyakarta',
    description: 'Gestun Yogyakarta dengan pelayanan ramah dan proses cepat. Melayani DIY dan sekitarnya.',
    latitude: -7.7956,
    longitude: 110.3695,
    isActive: true,
  },
  {
    name: 'Medan',
    slug: 'medan',
    description: 'Layanan gestun Medan terpercaya. Melayani seluruh Sumatera Utara dengan proses aman dan cepat.',
    latitude: 3.5952,
    longitude: 98.6722,
    isActive: true,
  },
  {
    name: 'Makassar',
    slug: 'makassar',
    description: 'Gestun Makassar dengan rate kompetitif. Melayani area Sulawesi Selatan dan sekitarnya.',
    latitude: -5.1477,
    longitude: 119.4327,
    isActive: true,
  },
  {
    name: 'Denpasar',
    slug: 'denpasar',
    description: 'Layanan gestun Bali terpercaya di Denpasar. Melayani seluruh pulau Dewata dengan proses mudah.',
    latitude: -8.6705,
    longitude: 115.2126,
    isActive: true,
  },
  {
    name: 'Palembang',
    slug: 'palembang',
    description: 'Gestun Palembang dengan layanan profesional. Melayani Sumatera Selatan dan sekitarnya.',
    latitude: -2.9909,
    longitude: 104.7566,
    isActive: true,
  },
  {
    name: 'Balikpapan',
    slug: 'balikpapan',
    description: 'Layanan tarik tunai Balikpapan terpercaya. Melayani Kalimantan Timur dengan proses cepat.',
    latitude: -1.2654,
    longitude: 116.8312,
    isActive: true,
  },
];

async function main() {
  console.log('Seeding locations...');
  
  for (const location of locations) {
    const existing = await prisma.location.findUnique({
      where: { slug: location.slug },
    });
    
    if (!existing) {
      await prisma.location.create({
        data: location,
      });
      console.log(`Created location: ${location.name}`);
    } else {
      console.log(`Location already exists: ${location.name}`);
    }
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
