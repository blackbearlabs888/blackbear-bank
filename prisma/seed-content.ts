import { db } from '../src/lib/db';

async function seedContent() {
  console.log('Starting seed...');
  
  // Create sample FAQs
  const faqs = [
    {
      question: 'Apa itu layanan gesek tunai / gestun?',
      answer: 'Gesek tunai atau gestun adalah layanan pencairan dana dari kartu kredit menjadi uang tunai. Proses ini dilakukan dengan cara transaksi pembayaran ke merchant kami, kemudian dana ditransfer ke rekening Anda setelah dipotong biaya layanan.',
      category: 'umum',
      order: 1,
      isActive: true,
    },
    {
      question: 'Berapa biaya layanan gestun?',
      answer: 'Biaya layanan kami bervariasi tergantung metode pembayaran:\n- Kartu Kredit: Mulai dari 3%\n- GoPay Paylater: Mulai dari 5%\n- Shopee Paylater: Mulai dari 5%\n- Akulaku: Mulai dari 6%\n\nBiaya dapat berubah sewaktu-waktu, hubungi kami untuk info terbaru.',
      category: 'pembayaran',
      order: 2,
      isActive: true,
    },
    {
      question: 'Berapa lama proses pencairan dana?',
      answer: 'Proses pencairan dana sangat cepat! Setelah transaksi diverifikasi:\n- Transfer ke bank besar (BCA, Mandiri, BRI, BNI): 5-15 menit\n- Transfer ke bank lain: 15-30 menit\n- Maximum 1x24 jam untuk kasus khusus',
      category: 'layanan',
      order: 3,
      isActive: true,
    },
    {
      question: 'Apakah layanan ini aman dan legal?',
      answer: 'Ya, layanan kami 100% aman dan legal. Kami beroperasi sebagai merchant terdaftar dengan proses transparan. Setiap transaksi tercatat dan dapat dilacak melalui sistem kami. Kami juga menjaga kerahasiaan data pelanggan.',
      category: 'umum',
      order: 4,
      isActive: true,
    },
    {
      question: 'Apa saja metode pembayaran yang diterima?',
      answer: 'Kami menerima berbagai metode pembayaran:\n1. Kartu Kredit (Semua bank)\n2. GoPay Paylater\n3. Shopee Paylater\n4. TikTok Paylater\n5. Akulaku\n6. Kredivo\n7. Indodana\n\nHubungi kami untuk metode pembayaran lainnya.',
      category: 'pembayaran',
      order: 5,
      isActive: true,
    },
    {
      question: 'Bagaimana cara menjadi mitra Black Bear?',
      answer: 'Untuk menjadi mitra, ikuti langkah berikut:\n1. Daftar melalui website atau WhatsApp kami\n2. Lengkapi data diri dan rekening bank\n3. Tim kami akan menghubungi untuk verifikasi\n4. Setelah disetujui, Anda mendapat akses ke dashboard mitra\n\nBenefit mitra: Komisi hingga 30%, badge & tier system, bonus target bulanan!',
      category: 'mitra',
      order: 6,
      isActive: true,
    },
    {
      question: 'Bagaimana cara tracking order saya?',
      answer: 'Anda dapat melacak status order melalui:\n1. Halaman "Track Order" di website kami\n2. Masukkan Order ID yang diberikan saat transaksi\n3. Status akan ditampilkan secara real-time\n\nAnda juga akan menerima notifikasi via WhatsApp untuk setiap update status.',
      category: 'layanan',
      order: 7,
      isActive: true,
    },
    {
      question: 'Apa saja status order dan artinya?',
      answer: 'Berikut penjelasan status order:\n- **Pending**: Order baru masuk, menunggu pembayaran\n- **Verification**: Pembayaran diterima, sedang diverifikasi\n- **Process**: Pembayaran valid, sedang diproses\n- **Success**: Dana berhasil ditransfer ke rekening Anda\n- **Failed**: Transaksi gagal dengan alasan tertentu',
      category: 'layanan',
      order: 8,
      isActive: true,
    },
    {
      question: 'Apakah ada batas minimal dan maksimal transaksi?',
      answer: 'Ya, batas transaksi kami:\n- **Minimal**: Rp 100.000\n- **Maksimal**: Tergantung limit kartu kredit/paylater Anda\n\nUntuk transaksi di atas Rp 50.000.000, mohon hubungi kami terlebih dahulu untuk pengaturan khusus.',
      category: 'pembayaran',
      order: 9,
      isActive: true,
    },
    {
      question: 'Bagaimana sistem komisi untuk mitra?',
      answer: 'Sistem komisi mitra Black Bear:\n- **Tier Bronze**: Komisi 20%\n- **Tier Silver**: Komisi 25%\n- **Tier Gold**: Komisi 28%\n- **Tier Platinum**: Komisi 30%\n\nTier ditentukan berdasarkan volume transaksi bulanan. Semakin tinggi volume, semakin tinggi tier dan komisi!',
      category: 'mitra',
      order: 10,
      isActive: true,
    },
  ];

  console.log('Creating FAQs...');
  for (const faq of faqs) {
    try {
      const existing = await db.fAQ.findFirst({ where: { question: faq.question } });
      if (existing) {
        await db.fAQ.update({ where: { id: existing.id }, data: faq });
        console.log(`  Updated: ${faq.question.substring(0, 50)}...`);
      } else {
        await db.fAQ.create({ data: faq });
        console.log(`  Created: ${faq.question.substring(0, 50)}...`);
      }
    } catch (e) {
      console.log(`  Error: ${faq.question.substring(0, 50)}...`, e);
    }
  }
  console.log('✅ FAQs done');

  // Create sample Blog Posts
  const blogs = [
    {
      title: 'Panduan Lengkap Gesek Tunai Kartu Kredit untuk Pemula',
      slug: 'panduan-lengkap-gesek-tunai-kartu-kredit-pemula',
      excerpt: 'Pelajari cara aman dan efisien melakukan gesek tunai kartu kredit. Panduan lengkap untuk pemula dengan tips dan trik terbaik.',
      content: `# Panduan Lengkap Gesek Tunai Kartu Kredit untuk Pemula

Gesek tunai atau yang sering disebut "gestun" adalah salah satu cara untuk mendapatkan dana tunai dari kartu kredit. Meskipun terdengar sederhana, ada beberapa hal penting yang perlu Anda pahami sebelum melakukan transaksi ini.

## Apa itu Gesek Tunai?

Gesek tunai adalah proses pencairan limit kartu kredit menjadi uang tunai. Berbeda dengan tarik tunai di ATM yang memiliki batasan dan bunga tinggi, gesek tunai melalui merchant seperti kami memberikan fleksibilitas lebih dengan biaya yang kompetitif.

## Keuntungan Gesek Tunai di Black Bear

1. **Biaya Kompetitif** - Mulai dari 3% saja
2. **Proses Cepat** - Dana cair dalam 5-30 menit
3. **Aman & Legal** - Transaksi tercatat dan transparan
4. **24/7 Service** - Kami melayani kapan saja

## Cara Melakukan Transaksi

1. Hubungi kami via WhatsApp atau website
2. Informasikan nominal yang diinginkan
3. Lakukan pembayaran sesuai instruksi
4. Tunggu verifikasi (5-15 menit)
5. Dana ditransfer ke rekening Anda

## Tips Aman Gesek Tunai

- Selalu gunakan merchant terpercaya
- Simpan bukti transaksi
- Cek reputasi merchant sebelum transaksi
- Hindari transaksi dengan biaya terlalu murah (mungkin scam)

## Kesimpulan

Gesek tunai bisa menjadi solusi kebutuhan dana cepat jika dilakukan dengan cara yang benar dan melalui merchant terpercaya. Black Bear siap membantu Anda dengan layanan profesional dan aman.`,
      category: 'tutorial',
      tags: 'gestun, kartu kredit, tutorial, pemula',
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      title: '5 Keuntungan GoPay Paylater yang Wajib Anda Tahu',
      slug: 'keuntungan-gopay-paylater',
      excerpt: 'GoPay Paylater menawarkan berbagai keuntungan. Simak 5 keuntungan utama dan cara memanfaatkannya secara optimal.',
      content: `# 5 Keuntungan GoPay Paylater yang Wajib Anda Tahu

GoPay Paylater menjadi salah satu produk pinjaman digital paling populer di Indonesia. Dengan limit yang bisa mencapai jutaan rupiah, banyak orang memanfaatkannya untuk berbagai kebutuhan.

## 1. Proses Pengajuan Mudah

Tidak perlu dokumen rumit, cukup:
- KTP
- Akun GoJek aktif
- Verifikasi wajah

Limit bisa didapatkan dalam hitungan menit!

## 2. Bunga 0% untuk Cicilan

Untuk pembelian di merchant tertentu, Anda bisa mendapatkan cicilan 0%. Ini sangat menguntungkan untuk pembelian gadget, elektronik, atau kebutuhan besar lainnya.

## 3. Limit yang Tinggi

GoPay Paylater memberikan limit hingga Rp 15.000.000 tergantung skor kredit Anda. Limit ini bisa dinaikkan seiring dengan riwayat pembayaran yang baik.

## 4. Fleksibilitas Pembayaran

Pilih tenor sesuai kemampuan:
- 1 bulan
- 3 bulan
- 6 bulan
- 12 bulan

## 5. Bisa Dicairkan ke Rekening

Inilah yang membuat GoPay Paylater semakin menarik. Anda bisa mencairkan limit paylater ke rekening bank melalui layanan seperti Black Bear dengan proses yang cepat dan mudah.

## Kesimpulan

GoPay Paylater memberikan fleksibilitas finansial yang sangat membantu. Gunakan dengan bijak dan manfaatkan promo-promo menarik yang tersedia.`,
      category: 'paylater',
      tags: 'gopay, paylater, pinjaman, tips',
      isPublished: true,
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Cara Meningkatkan Limit Shopee Paylater dengan Cepat',
      slug: 'cara-meningkatkan-limit-shopee-paylater',
      excerpt: 'Ingin limit Shopee Paylater Anda naik? Simak tips dan trik terbukti ampuh untuk meningkatkan limit paylater Anda.',
      content: `# Cara Meningkatkan Limit Shopee Paylater dengan Cepat

Shopee Paylater adalah salah satu fitur pembayaran yang paling diminati di Indonesia. Dengan limit yang memadai, Anda bisa berbelanja lebih leluasa atau bahkan mencairkan limit tersebut ke rekening bank.

## Faktor yang Mempengaruhi Limit

1. **Riwayat Pembayaran** - Bayar tepat waktu, setiap saat
2. **Frekuensi Penggunaan** - Semakin sering, semakin baik
3. **Verifikasi Data** - Lengkapi semua data diri
4. **Aktivitas di Shopee** - Belanja, review, dan interaksi lainnya

## Tips Meningkatkan Limit

### 1. Bayar Tepat Waktu
Ini adalah faktor paling penting. Jangan pernah telat bayar tagihan, karena akan mempengaruhi skor kredit Anda.

### 2. Gunakan Secara Rutin
Gunakan Shopee Paylater untuk transaksi rutin seperti belanja bulanan, pembelian pulsa/data, dan pembayaran tagihan.

### 3. Naikkan Level Akun
Shopee memiliki sistem level akun: Star, Gold Star, Platinum. Semakin tinggi level, semakin besar potensi limit Anda.

### 4. Ikuti Program Kenaikan Limit
Shopee secara berkala mengadakan program kenaikan limit. Ikuti dan manfaatkan kesempatan ini.

## Kesimpulan

Meningkatkan limit Shopee Paylater membutuhkan konsistensi dan kesabaran. Ikuti tips di atas dan lihat peningkatan limit Anda dalam beberapa bulan.`,
      category: 'paylater',
      tags: 'shopee, paylater, limit, tips',
      isPublished: true,
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Perbedaan Gestun dan Tarik Tunai ATM Kartu Kredit',
      slug: 'perbedaan-gestun-dan-tarik-tunai-atm',
      excerpt: 'Masih bingung bedanya gesek tunai dan tarik tunai di ATM? Simak penjelasan lengkap plus rekomendasi terbaik untuk Anda.',
      content: `# Perbedaan Gestun dan Tarik Tunai ATM Kartu Kredit

Banyak orang masih keliru memahami perbedaan antara gesek tunai (gestun) dan tarik tunai kartu kredit di ATM. Padahal, keduanya sangat berbeda dari segi biaya, proses, dan keuntungannya.

## Tarik Tunai di ATM

### Karakteristik:
- **Bunga**: Mulai berjalan saat transaksi (tidak ada grace period)
- **Biaya**: 4% dari nominal atau minimal Rp 50.000
- **Limit**: Biasanya 30-40% dari limit kartu kredit
- **Proses**: Langsung dari ATM

### Kekurangan:
❌ Bunga tinggi (2-4% per bulan)
❌ Limit terbatas
❌ Tidak ada grace period

## Gesek Tunai (Gestun)

### Karakteristik:
- **Biaya**: Mulai dari 3% (lebih murah!)
- **Limit**: Hingga 100% limit kartu kredit
- **Grace Period**: Masih bisa bayar di akhir bulan
- **Proses**: Melalui merchant terpercaya

### Kelebihan:
✅ Biaya lebih kompetitif
✅ Limit lebih besar
✅ Masih ada grace period
✅ Proses cepat dan aman

## Kesimpulan

Untuk kebutuhan dana tunai dari kartu kredit, gesek tunai melalui merchant terpercaya seperti Black Bear adalah pilihan yang lebih menguntungkan. Biaya lebih murah, limit lebih besar, dan proses tetap cepat.`,
      category: 'tutorial',
      tags: 'gestun, kartu kredit, atm, perbandingan',
      isPublished: true,
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Panduan Menjadi Mitra Black Bear dan Dapatkan Penghasilan Passive',
      slug: 'panduan-menjadi-mitra-black-bear',
      excerpt: 'Ingin penghasilan tambahan dengan modal minimal? Jadi mitra Black Bear bisa jadi solusi. Simak panduan lengkapnya di sini.',
      content: `# Panduan Menjadi Mitra Black Bear

Black Bear membuka kesempatan bagi Anda yang ingin mendapatkan penghasilan tambahan dengan menjadi mitra. Sistemnya sederhana: Anda mencari customer, kami proses transaksi, Anda dapat komisi!

## Keuntungan Menjadi Mitra

### 💰 Komisi Menarik
- Bronze: 20%
- Silver: 25%
- Gold: 28%
- Platinum: 30%

### 🎯 Target & Bonus
- Target bulanan dengan bonus menarik
- Badge dan tier system
- Reward untuk top performer

### 📱 Dashboard Lengkap
- Monitor transaksi real-time
- Lacak profit dan komisi
- Kelola customer

### 🤝 Support Tim
- Tim support profesional
- Training dan materi
- Komunitas mitra aktif

## Cara Mendaftar

1. **Daftar** melalui website atau WhatsApp
2. **Isi Data** diri lengkap
3. **Verifikasi** oleh tim kami
4. **Mulai** cari customer dan dapat komisi!

## Kesimpulan

Menjadi mitra Black Bear adalah peluang bagus untuk mendapatkan penghasilan tambahan dengan modal minimal. Daftar sekarang dan mulai perjalanan Anda sebagai mitra kami!`,
      category: 'mitra',
      tags: 'mitra, penghasilan, bisnis, komisi',
      isPublished: true,
      publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  ];

  console.log('Creating Blogs...');
  for (const blog of blogs) {
    try {
      const existing = await db.blogPost.findFirst({ where: { slug: blog.slug } });
      if (existing) {
        await db.blogPost.update({ where: { id: existing.id }, data: blog });
        console.log(`  Updated: ${blog.title.substring(0, 50)}...`);
      } else {
        await db.blogPost.create({ data: blog });
        console.log(`  Created: ${blog.title.substring(0, 50)}...`);
      }
    } catch (e) {
      console.log(`  Error: ${blog.title.substring(0, 50)}...`, e);
    }
  }
  console.log('✅ Blogs done');

  console.log('\n🎉 All sample content created successfully!');
}

seedContent().catch(console.error);
