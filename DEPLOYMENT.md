# Panduan Deploy Black Bear WebApp

Panduan lengkap untuk deploy aplikasi ke production menggunakan GitHub, Vercel, dan Neon (PostgreSQL).

---

## 📋 Prerequisites

Pastikan Anda memiliki akun berikut:
- [GitHub](https://github.com) - Untuk hosting kode
- [Vercel](https://vercel.com) - Untuk hosting aplikasi
- [Neon](https://neon.tech) - Untuk database PostgreSQL

---

## 🚀 Quick Deploy (3 Langkah)

### Langkah 1: Setup Neon Database
1. Buat akun di [neon.tech](https://neon.tech)
2. Buat project baru dengan nama `black-bear-webapp`
3. Pilih region **Singapore** (terdekat dengan Indonesia)
4. Salin **Connection String** yang diberikan

### Langkah 2: Push ke GitHub
```bash
git add .
git commit -m "Ready for production"
git remote add origin https://github.com/USERNAME/black-bear-webapp.git
git push -u origin main
```

### Langkah 3: Deploy ke Vercel
1. Buka [vercel.com](https://vercel.com) → Login dengan GitHub
2. Klik **Add New Project** → Import `black-bear-webapp`
3. **Environment Variables** (WAJIB):
   ```
   DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/db?sslmode=require
   NEXTAUTH_SECRET=random-32-char-string
   NEXTAUTH_URL=https://your-app.vercel.app
   ```
4. Klik **Deploy** dan tunggu proses selesai

✅ **Sekarang SEMUA otomatis:**
- ✅ Database tables tercreate
- ✅ Owner account terbuat
- ✅ Payment types terbuat
- ✅ Marketplaces terbuat

**Langsung login dengan:**
- Email: `owner@blackbear.id`
- Password: `owner123`

---

## 📖 Detail Panduan

## 1️⃣ Setup Neon Database

### Buat Project Neon
1. Login ke [neon.tech](https://neon.tech)
2. Klik "Create a project"
3. Isi:
   - **Project name**: `black-bear-webapp`
   - **Database name**: `blackbear` (atau default)
   - **Region**: **Singapore** (untuk Indonesia)
   - **Postgres version**: 17 (terbaru)
4. Klik "Create project"
5. **Salin Connection String** yang muncul

Format connection string:
```
postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/blackbear?sslmode=require
```

---

## 2️⃣ Push ke GitHub

```bash
# Inisialisasi git (jika belum)
git init

# Tambahkan semua file
git add .

# Commit
git commit -m "Initial commit: Black Bear WebApp"

# Tambahkan remote
git remote add origin https://github.com/USERNAME/black-bear-webapp.git

# Push
git branch -M main
git push -u origin main
```

---

## 3️⃣ Deploy ke Vercel

### Import Project
1. Login [Vercel](https://vercel.com) dengan GitHub
2. Klik **Add New...** → **Project**
3. Pilih repository `black-bear-webapp`
4. Klik **Import**

### Environment Variables (WAJIB!)

| Variable | Value | Contoh |
|----------|-------|--------|
| `DATABASE_URL` | Connection string Neon | `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require` |
| `NEXTAUTH_SECRET` | Random 32+ karakter | `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6` |
| `NEXTAUTH_URL` | URL production | `https://black-bear-webapp.vercel.app` |

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Deploy!
1. Klik **Deploy**
2. Tunggu 2-5 menit
3. Selesai! 🎉

---

## 4️⃣ Setelah Deploy

### Semua Sudah Otomatis! ✅

**Build process akan otomatis:**
1. Switch schema ke PostgreSQL
2. Generate Prisma Client
3. Push schema ke database (create tables)
4. Run seed (create default data)

**Default data yang terbuat:**
- 👤 Owner: `owner@blackbear.id` / `owner123`
- 💳 5 Payment Types (Kartu Kredit, GoPay Later, Shopee PayLater, Akulaku, Kredivo)
- 🛒 5 Marketplaces (Tokopedia, Shopee, Lazada, Bukalapak, Blibli)

### Langsung Login!
1. Buka URL production Anda
2. Login dengan owner@blackbear.id / owner123
3. **GANTI PASSWORD** di settings! 🔐

---

## 5️⃣ Environment Variables Reference

```env
# Database (WAJIB)
DATABASE_URL="postgresql://username:password@ep-xxx.neon.tech/db?sslmode=require"

# NextAuth (WAJIB)
NEXTAUTH_SECRET="your-random-32-character-secret-key"
NEXTAUTH_URL="https://your-app.vercel.app"

# Optional
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

---

## 🔧 Troubleshooting

### Build Failed: Prisma Error
```bash
# Cek format DATABASE_URL
# Pastikan: postgresql:// dan sslmode=require

# Contoh benar:
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require"
```

### Database Connection Error
```bash
# Neon free tier suspend setelah 5 menit idle
# Cukup buka Neon Console untuk wake up database
```

### Login Failed
```bash
# Pastikan seed sudah dijalankan (otomatis saat deploy)
# Cek di Vercel logs apakah ada error saat seed
```

### Manual Seed (jika perlu)
```bash
# Set DATABASE_URL di terminal lokal
export DATABASE_URL="postgresql://..."

# Run seed
bun run db:seed
```

---

## 🌐 Custom Domain

### Tambah Domain di Vercel
1. Project Settings → Domains
2. Masukkan domain (contoh: `app.yourcompany.com`)

### Update DNS
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

### Update NEXTAUTH_URL
```
NEXTAUTH_URL=https://app.yourcompany.com
```

---

## 🔒 Security Checklist

- [ ] `DATABASE_URL` disimpan dengan aman (jangan commit!)
- [ ] `NEXTAUTH_SECRET` minimal 32 karakter random
- [ ] `NEXTAUTH_URL` sesuai domain production
- [ ] **Ganti password owner** setelah login pertama
- [ ] Environment variables tidak di-commit ke Git

---

## 📊 Monitoring

- **Vercel Analytics**: Dashboard → Analytics
- **Vercel Logs**: Deployments → Function Logs
- **Neon Metrics**: Neon Console → Monitoring

---

## 📞 Support

- **Vercel**: [vercel.com/support](https://vercel.com/support)
- **Neon**: [neon.tech/docs](https://neon.tech/docs)
- **Prisma**: [prisma.io/docs](https://prisma.io/docs)

---

**Happy Deploying! 🚀**
