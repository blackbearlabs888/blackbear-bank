import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Black Bear Bank database...\n');

  // ==================== OWNER USER ====================
  const ownerPassword = await hashPassword('owner123');
  const owner = await prisma.user.upsert({
    where: { email: 'owner@blackbear.id' },
    update: {}, // NEVER update password — protects changed passwords
    create: {
      email: 'owner@blackbear.id',
      name: 'Black Bear Admin',
      password: ownerPassword,
      role: 'owner',
    },
  });
  console.log(`✅ Owner user created: ${owner.email} (password: owner123)`);

  // ==================== TEST PARTNER USER ====================
  const partnerPassword = await hashPassword('partner123');
  const partnerUser = await prisma.user.upsert({
    where: { email: 'partner@blackbear.cc' },
    update: {}, // NEVER update password — protects changed passwords
    create: {
      email: 'partner@blackbear.cc',
      name: 'Test Partner',
      password: partnerPassword,
      role: 'partner',
    },
  });
  console.log(`✅ Partner user created: ${partnerUser.email} (password: partner123)`);

  // ==================== PARTNER PROFILE ====================
  const partner = await prisma.partner.upsert({
    where: { userId: partnerUser.id },
    update: {},
    create: {
      userId: partnerUser.id,
      name: 'Test Partner',
      email: 'partner@blackbear.cc',
      phone: '081234567890',
      bankName: 'BCA',
      bankAccount: '1234567890',
      bankHolder: 'Test Partner',
      city: 'Jakarta',
      commission: 30,
      target: 5000000,
      tier: 'Silver',
      badge: 'Rising Star',
      status: 'active',
      totalProfit: 2500000,
      totalVolume: 50000000,
      totalTransactions: 45,
    },
  });
  console.log(`✅ Partner profile created: ${partner.name}`);

  // ==================== OWNER PROFILE ====================
  const ownerProfile = await prisma.ownerProfile.upsert({
    where: { id: 'bb-owner-profile' },
    update: {},
    create: {
      id: 'bb-owner-profile',
      name: 'Black Bear',
      email: 'owner@blackbear.id',
      websiteTitle: 'Black Bear',
      metaTitle: 'Black Bear - Jasa Gestun & Tarik Tunai Kartu Kredit Terpercaya',
      metaDescription: 'Layanan gestun dan tarik tunai kartu kredit terpercaya di Indonesia. Proses cepat, aman, dan rate terbaik.',
      footerEmail: 'info@blackbear.id',
      footerWhatsapp: '6281234567890',
      footerInstagram: 'blackbear.id',
    },
  });
  console.log(`✅ Owner profile created`);

  // ==================== NOTIFICATION SETTINGS ====================
  await prisma.notificationSettings.upsert({
    where: { ownerProfileId: ownerProfile.id },
    update: {},
    create: {
      ownerProfileId: ownerProfile.id,
      telegramEnabled: false,
    },
  });
  console.log(`✅ Notification settings created`);

  // ==================== PAYMENT TYPES ====================
  const paymentTypes = [
    { name: 'Kartu Kredit BCA', onlineFeePercent: 2.5, onlineFeeFlat: 15000, codFeePercent: 2.8, codFeeFlat: 20000, threshold: 1000000, discountPercent: 0, discountNominal: 0, minTransaction: 0 },
    { name: 'Kartu Kredit Mandiri', onlineFeePercent: 2.5, onlineFeeFlat: 15000, codFeePercent: 2.8, codFeeFlat: 20000, threshold: 1000000, discountPercent: 0, discountNominal: 0, minTransaction: 0 },
    { name: 'Kartu Kredit BNI', onlineFeePercent: 2.5, onlineFeeFlat: 15000, codFeePercent: 2.8, codFeeFlat: 20000, threshold: 1000000, discountPercent: 0, discountNominal: 0, minTransaction: 0 },
    { name: 'Kartu Kredit BRI', onlineFeePercent: 2.5, onlineFeeFlat: 15000, codFeePercent: 2.8, codFeeFlat: 20000, threshold: 1000000, discountPercent: 0, discountNominal: 0, minTransaction: 0 },
    { name: 'Kartu Kredit Permata', onlineFeePercent: 2.5, onlineFeeFlat: 15000, codFeePercent: 2.8, codFeeFlat: 20000, threshold: 1000000, discountPercent: 0, discountNominal: 0, minTransaction: 0 },
    { name: 'Kartu Kredit CIMB', onlineFeePercent: 2.5, onlineFeeFlat: 15000, codFeePercent: 2.8, codFeeFlat: 20000, threshold: 1000000, discountPercent: 0, discountNominal: 0, minTransaction: 0 },
    { name: 'Kartu Kredit Panin', onlineFeePercent: 2.5, onlineFeeFlat: 15000, codFeePercent: 2.8, codFeeFlat: 20000, threshold: 1000000, discountPercent: 0, discountNominal: 0, minTransaction: 0 },
    { name: 'Shopee Paylater', onlineFeePercent: 3.0, onlineFeeFlat: 20000, codFeePercent: 3.5, codFeeFlat: 25000, threshold: 1000000, discountPercent: 0, discountNominal: 0, minTransaction: 0 },
  ];

  for (const pt of paymentTypes) {
    await prisma.paymentType.upsert({
      where: { name: pt.name },
      update: {},
      create: pt,
    });
  }
  console.log(`✅ ${paymentTypes.length} payment types created`);

  // ==================== MARKETPLACES ====================
  const marketplaces = [
    { name: 'Tokopedia', feePercent: 2, feeFlat: 0, description: 'Marketplace terbesar di Indonesia' },
    { name: 'Shopee', feePercent: 2.5, feeFlat: 0, description: 'Marketplace populer' },
    { name: 'Bukalapak', feePercent: 1, feeFlat: 0, description: 'Marketplace lokal Indonesia' },
    { name: 'Lazada', feePercent: 2, feeFlat: 0, description: 'Marketplace internasional' },
    { name: 'Blibli', feePercent: 1.5, feeFlat: 0, description: 'Marketplace e-commerce Indonesia' },
  ];

  for (const mp of marketplaces) {
    await prisma.marketplace.upsert({
      where: { name: mp.name },
      update: {},
      create: mp,
    });
  }
  console.log(`✅ ${marketplaces.length} marketplaces created`);

  // ==================== FAQS ====================
  const faqs = [
    { question: 'Apa itu gestun kartu kredit?', answer: 'Gestun (gesek tunai) adalah layanan penarikan tunai dari limit kartu kredit Anda. Proses dilakukan melalui transaksi fiktif di mesin EDC, dan dana akan ditransfer ke rekening Anda dalam waktu cepat.', category: 'layanan', order: 1 },
    { question: 'Berapa lama proses gestun?', answer: 'Proses gestun biasanya memakan waktu 10-30 menit setelah data terverifikasi. Untuk nominal besar mungkin memerlukan waktu sedikit lebih lama karena proses verifikasi tambahan dari pihak bank.', category: 'layanan', order: 2 },
    { question: 'Apakah gestun aman?', answer: 'Ya, layanan gestun kami sangat aman. Seluruh transaksi dilakukan dengan prosedur standar keamanan. Data pribadi Anda dijamin kerahasiaannya dan tidak akan dibagikan kepada pihak ketiga.', category: 'keamanan', order: 3 },
    { question: 'Berapa fee atau biaya gestun?', answer: 'Biaya gestun bervariasi tergantung jenis kartu kredit dan nominal transaksi. Umumnya berkisar antara 2-3% dari nominal gestun. Hubungi kami untuk mendapatkan rate terbaik.', category: 'pembayaran', order: 4 },
    { question: 'Kartu kredit apa saja yang bisa digestun?', answer: 'Kami menerima gestun untuk semua jenis kartu kredit dari berbagai bank seperti BCA, Mandiri, BNI, BRI, Permata, CIMB, Panin, dan bank lainnya.', category: 'layanan', order: 5 },
    { question: 'Bagaimana cara menjadi partner Black Bear?', answer: 'Untuk menjadi partner, Anda dapat mendaftar melalui halaman registrasi di website kami. Setelah mendaftar, tim kami akan melakukan verifikasi data dan menghubungi Anda untuk proses onboarding.', category: 'mitra', order: 6 },
    { question: 'Apakah ada minimum nominal gestun?', answer: 'Minimum nominal gestun adalah Rp 500.000. Untuk nominal di atas Rp 1.000.000, Anda akan mendapatkan rate yang lebih kompetitif.', category: 'pembayaran', order: 7 },
    { question: 'Apa perbedaan gestun Online dan COD?', answer: 'Gestun Online dilakukan sepenuhnya secara digital tanpa perlu bertemu langsung. Gestun COD (Cash on Delivery) memerlukan pertemuan langsung untuk proses gesek kartu. Kedua metode sama amannya.', category: 'layanan', order: 8 },
    { question: 'Bagaimana jika transaksi gagal?', answer: 'Jika transaksi gagal, Anda tidak akan dikenakan biaya apapun. Tim kami akan membantu mengatasi masalah dan mencoba kembali jika Anda menghendaki.', category: 'umum', order: 9 },
    { question: 'Jam operasional Black Bear?', answer: 'Kami beroperasi setiap hari dari pukul 08:00 - 22:00 WIB. Untuk transaksi darurat, silakan hubungi kami via WhatsApp dan kami akan berusaha melayani Anda.', category: 'umum', order: 10 },
  ];

  // Upsert FAQs (never delete existing — protects user-added FAQs)
  for (const faq of faqs) {
    await prisma.fAQ.upsert({
      where: { question: faq.question },
      update: {}, // never overwrite edits
      create: faq,
    });
  }
  console.log(`✅ ${faqs.length} FAQs created/skipped`);

  // ==================== LOCATIONS ====================
  const locations = [
    { name: 'Jakarta', slug: 'jakarta', description: 'Layanan gestun terpercaya di Jakarta dan sekitarnya. Tersedia gestun online dan COD untuk seluruh wilayah DKI Jakarta.', content: 'Black Bear menyediakan layanan gestun kartu kredit di seluruh wilayah Jakarta. Dengan tim profesional yang berpengalaman, kami siap melayani kebutuhan tarik tunai kartu kredit Anda dengan cepat dan aman.', latitude: -6.2088, longitude: 106.8456 },
    { name: 'Bandung', slug: 'bandung', description: 'Layanan gestun kartu kredit di Bandung. Proses cepat dengan rate terbaik untuk warga Bandung dan Jawa Barat.', content: 'Black Bear hadir di Bandung untuk melayani kebutuhan gestun kartu kredit Anda. Kami menyediakan layanan gestun online dan COD untuk seluruh wilayah Bandung.', latitude: -6.9175, longitude: 107.6191 },
    { name: 'Surabaya', slug: 'surabaya', description: 'Gestun kartu kredit Surabaya. Layanan terpercaya dengan proses cepat dan aman di kota Pahlawan.', content: 'Black Bear melayani gestun kartu kredit di Surabaya. Nikmati layanan gestun dengan rate kompetitif dan proses yang cepat.', latitude: -7.2575, longitude: 112.7521 },
    { name: 'Semarang', slug: 'semarang', description: 'Gestun kartu kredit Semarang. Tersedia layanan online dan COD untuk wilayah Semarang dan Jawa Tengah.', content: 'Layanan gestun kartu kredit Black Bear telah hadir di Semarang. Kami siap melayani kebutuhan tarik tunai Anda.', latitude: -6.9666, longitude: 110.4196 },
    { name: 'Medan', slug: 'medan', description: 'Jasa gestun kartu kredit Medan. Proses cepat dan aman untuk wilayah Sumatera Utara.', content: 'Black Bear hadir di Medan untuk melayani kebutuhan gestun kartu kredit Anda di Sumatera Utara.', latitude: 3.5952, longitude: 98.6722 },
    { name: 'Bekasi', slug: 'bekasi', description: 'Gestun kartu kredit Bekasi. Layanan cepat dengan coverage area luas di Bekasi dan sekitarnya.', content: 'Black Bear melayani gestun kartu kredit di Bekasi. Proses cepat, aman, dan terpercaya.', latitude: -6.2349, longitude: 106.9896 },
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { slug: loc.slug },
      update: {},
      create: loc,
    });
  }
  console.log(`✅ ${locations.length} locations created/skipped`);

  // ==================== BLOG POSTS ====================
  const blogPosts = [
    {
      title: 'Panduan Lengkap Gestun Kartu Kredit untuk Pemula',
      slug: 'panduan-lengkap-gestun-kartu-kredit',
      content: '# Panduan Lengkap Gestun Kartu Kredit untuk Pemula\n\n## Apa itu Gestun?\n\nGestun (gesek tunai) adalah layanan penarikan tunai dari limit kartu kredit Anda melalui proses transaksi fiktif.\n\n## Cara Kerja Gestun\n\n1. Anda memberikan data kartu kredit\n2. Proses gesek dilakukan melalui mesin EDC\n3. Dana ditransfer ke rekening Anda\n4. Tagihan muncul di statement kartu kredit\n\n## Keuntungan Gestun di Black Bear\n\n- Proses cepat (10-30 menit)\n- Rate kompetitif\n- Aman dan terpercaya\n- Customer service 24/7\n\n## Tips Aman Gestun\n\nSelalu pastikan Anda menggunakan layanan gestun dari penyedia terpercaya. Jangan pernah memberikan data kartu kredit kepada pihak yang tidak dikenal.',
      excerpt: 'Panduan lengkap untuk pemula yang ingin memahami cara kerja gestun kartu kredit, termasuk tips keamanan dan prosedur.',
      metaTitle: 'Panduan Lengkap Gestun Kartu Kredit untuk Pemula | Black Bear',
      metaDescription: 'Pelajari cara kerja gestun kartu kredit, prosedur, dan tips keamanan. Panduan lengkap untuk pemula dari Black Bear.',
      keywords: 'gestun kartu kredit, panduan gestun, cara gestun, tarik tunai kartu kredit',
      category: 'tutorial',
      tags: 'gestun, kartu kredit, tutorial, pemula',
      author: 'Black Bear Team',
      isPublished: true,
      publishedAt: new Date('2025-01-15'),
    },
    {
      title: '5 Tips Mengelola Kartu Kredit dengan Bijak',
      slug: 'tips-mengelola-kartu-kredit',
      content: '# 5 Tips Mengelola Kartu Kredit dengan Bijak\n\n## 1. Bayar Tagihan Tepat Waktu\n\nSelalu bayar tagihan kartu kredit sebelum jatuh tempo untuk menghindari bunga dan denda keterlambatan.\n\n## 2. Gunakan Maksimal 30% dari Limit\n\nDisarankan untuk tidak menggunakan lebih dari 30% dari total limit kartu kredit Anda.\n\n## 3. Pantau Pengeluaran\n\nCatat semua transaksi kartu kredit Anda dan review secara berkala.\n\n## 4. Manfaatkan Reward dan Cashback\n\nPilih kartu kredit yang sesuai dengan kebutuhan Anda untuk mendapatkan reward maksimal.\n\n## 5. Hindari Menarik Tunai di ATM\n\nTarik tunai di ATM biasanya dikenakan biaya yang lebih tinggi. Pertimbangkan alternatif lain seperti gestun.',
      excerpt: 'Pelajari 5 tips penting untuk mengelola kartu kredit Anda dengan bijak dan menghindari masalah keuangan.',
      metaTitle: '5 Tips Mengelola Kartu Kredit dengan Bijak | Black Bear',
      metaDescription: 'Kumpulan tips praktis untuk mengelola kartu kredit Anda. Hindari penyalahgunaan dan kelola keuangan dengan bijak.',
      keywords: 'tips kartu kredit, mengelola kartu kredit, keuangan, kartu kredit bijak',
      category: 'tips',
      tags: 'kartu kredit, tips, keuangan, managing',
      author: 'Black Bear Team',
      isPublished: true,
      publishedAt: new Date('2025-02-10'),
    },
    {
      title: 'Gestun Online vs COD: Mana yang Lebih Baik?',
      slug: 'gestun-online-vs-cod',
      content: '# Gestun Online vs COD: Mana yang Lebih Baik?\n\n## Gestun Online\n\n### Kelebihan:\n- Tidak perlu bertemu langsung\n- Proses bisa dilakukan dari mana saja\n- Lebih privasi\n\n### Kekurangan:\n- Memerlukan transfer data kartu secara digital\n- Tidak bisa melakukan secara langsung\n\n## Gestun COD\n\n### Kelebihan:\n- Proses dilakukan di tempat\n- Lebih personal\n- Bisa langsung verifikasi\n\n### Kekurangan:\n- Perlu waktu untuk pertemuan\n- Terbatas pada area tertentu\n\n## Kesimpulan\n\nKedua metode memiliki kelebihan masing-masing. Pilih yang paling sesuai dengan kebutuhan dan preferensi Anda.',
      excerpt: 'Perbandingan lengkap antara gestun online dan COD. Temukan metode yang paling sesuai untuk kebutuhan Anda.',
      metaTitle: 'Gestun Online vs COD: Mana yang Lebih Baik? | Black Bear',
      metaDescription: 'Perbandingan lengkap gestun online dan COD. Kelebihan dan kekurangan masing-masing metode gestun kartu kredit.',
      keywords: 'gestun online, gestun COD, perbandingan gestun, cara gestun',
      category: 'artikel',
      tags: 'gestun, online, COD, perbandingan',
      author: 'Black Bear Team',
      isPublished: true,
      publishedAt: new Date('2025-03-05'),
    },
    {
      title: 'Cara Daftar dan Menjadi Partner Black Bear',
      slug: 'cara-daftar-partner-blackbear',
      content: '# Cara Daftar dan Menjadi Partner Black Bear\n\n## Persyaratan\n\n- Warga Negara Indonesia\n- Berusia minimal 21 tahun\n- Memiliki rekening bank aktif\n- Memiliki KTP yang masih berlaku\n\n## Cara Daftar\n\n1. Kunjungi halaman registrasi di website Black Bear\n2. Isi formulir pendaftaran dengan data yang lengkap\n3. Upload dokumen yang diperlukan\n4. Tunggu proses verifikasi (1-2 hari kerja)\n5. Mulai transaksi setelah disetujui\n\n## Keuntungan Menjadi Partner\n\n- Komisi hingga 30% dari margin\n- Dashboard transaksi real-time\n- Support 24/7\n- Bonus target bulanan\n\nHubungi kami via WhatsApp untuk informasi lebih lanjut.',
      excerpt: 'Panduan lengkap cara mendaftar dan menjadi partner Black Bear. Dapatkan komisi menarik dari setiap transaksi.',
      metaTitle: 'Cara Daftar Partner Black Bear - Komisi Menarik | Black Bear',
      metaDescription: 'Pelajari cara menjadi partner Black Bear dan dapatkan komisi hingga 30%. Panduan lengkap persyaratan dan proses pendaftaran.',
      keywords: 'daftar partner, menjadi partner, komisi gestun, mitra gestun',
      category: 'artikel',
      tags: 'partner, komisi, daftar, bisnis',
      author: 'Black Bear Team',
      isPublished: true,
      publishedAt: new Date('2025-03-20'),
    },
  ];

  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: post,
    });
  }
  console.log(`✅ ${blogPosts.length} blog posts created/skipped`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('   Owner:  owner@blackbear.id / owner123');
  console.log('   Partner: partner@blackbear.cc / partner123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
