import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  // Create owner user
  const ownerPassword = await hashPassword('owner123');
  const owner = await prisma.user.upsert({
    where: { email: 'owner@blackbear.id' },
    update: {},
    create: {
      email: 'owner@blackbear.id',
      name: 'Black Bear Owner',
      password: ownerPassword,
      role: 'owner',
    },
  });

  console.log('Created owner:', owner.email);

  // Create owner profile
  await prisma.ownerProfile.upsert({
    where: { id: 'default' },
    update: {
      name: 'Black Bear Owner',
      email: 'owner@blackbear.id',
    },
    create: {
      id: 'default',
      name: 'Black Bear Owner',
      email: 'owner@blackbear.id',
      websiteTitle: 'Black Bear',
      footerWhatsapp: '628551110023',
      footerInstagram: 'https://instagram.com/blackbear_bank',
      footerFacebook: 'https://facebook.com/blackbear.bank',
      maintenanceMode: false,
    },
  });

  // Create payment types
  const paymentTypes = [
    {
      name: 'Kartu Kredit',
      onlineFeePercent: 10,
      onlineFeeFlat: 100000,
      codFeePercent: 15,
      codFeeFlat: 150000,
      threshold: 1000000,
    },
    {
      name: 'GoPay Later',
      onlineFeePercent: 15,
      onlineFeeFlat: 100000,
      codFeePercent: 18,
      codFeeFlat: 120000,
      threshold: 1000000,
    },
    {
      name: 'Shopee PayLater',
      onlineFeePercent: 9,
      onlineFeeFlat: 90000,
      codFeePercent: 13,
      codFeeFlat: 130000,
      threshold: 1000000,
    },
    {
      name: 'Akulaku',
      onlineFeePercent: 10,
      onlineFeeFlat: 100000,
      codFeePercent: 15,
      codFeeFlat: 140000,
      threshold: 1000000,
    },
    {
      name: 'Kredivo',
      onlineFeePercent: 13,
      onlineFeeFlat: 100000,
      codFeePercent: 18,
      codFeeFlat: 100000,
      threshold: 1000000,
    },
  ];

  for (const pt of paymentTypes) {
    await prisma.paymentType.upsert({
      where: { name: pt.name },
      update: pt,
      create: pt,
    });
  }

  console.log('Created payment types:', paymentTypes.length);

  // Create marketplaces
  const marketplaces = [
    { name: 'Tokopedia', feePercent: 9 },
    { name: 'Shopee', feePercent: 0 },
    { name: 'Lazada', feePercent: 5 },
    { name: 'Bukalapak', feePercent: 5 },
    { name: 'Blibli', feePercent: 5 },
  ];

  for (const mp of marketplaces) {
    await prisma.marketplace.upsert({
      where: { name: mp.name },
      update: mp,
      create: mp,
    });
  }

  console.log('Created marketplaces:', marketplaces.length);

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
