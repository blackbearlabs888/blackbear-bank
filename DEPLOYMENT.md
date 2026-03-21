# Panduan Deploy Black Bear WebApp

Panduan lengkap untuk deploy aplikasi ke production menggunakan GitHub, Vercel, dan Neon (PostgreSQL).

---

## 📋 Prerequisites

Pastikan Anda memiliki akun berikut:
- [GitHub](https://github.com) - Untuk hosting kode
- [Vercel](https://vercel.com) - Untuk hosting aplikasi
- [Neon](https://neon.tech) - Untuk database PostgreSQL

---

## 1️⃣ Setup Neon Database

### Langkah 1: Buat Akun Neon
1. Kunjungi [neon.tech](https://neon.tech)
2. Klik "Sign Up" dan pilih metode pendaftaran (Google, GitHub, atau Email)
3. Ikuti proses pendaftaran hingga selesai

### Langkah 2: Buat Project Database
1. Setelah login, klik "Create a project"
2. Isi form:
   - **Project name**: `black-bear-webapp` (atau nama pilihan Anda)
   - **Database name**: `blackbear` (atau biarkan default)
   - **Region**: Pilih region terdekat dengan target user (Singapore untuk Indonesia)
   - **Postgres version**: Pilih versi terbaru (17)
3. Klik "Create project"

### Langkah 3: Salin Connection String
1. Setelah project dibuat, Anda akan melihat connection string
2. Salin connection string yang formatnya seperti ini:
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/blackbear?sslmode=require
   ```
3. Simpan string ini dengan aman - akan digunakan sebagai `DATABASE_URL`

### Langkah 4: Buat Database Schema (Optional)
Jika Anda ingin membuat branch development terpisah:
1. Klik "Branches" di sidebar
2. Klik "Create branch"
3. Beri nama branch (misal: `development`)

---

## 2️⃣ Push ke GitHub

### Langkah 1: Buat Repository GitHub
1. Login ke [GitHub](https://github.com)
2. Klik tombol "+" di pojok kanan atas → "New repository"
3. Isi form:
   - **Repository name**: `black-bear-webapp`
   - **Description**: Gestun Management System
   - **Visibility**: Private (recommended) atau Public
   - ⚠️ **JANGAN** centang "Add a README file", "Add .gitignore", atau "Choose a license"
4. Klik "Create repository"

### Langkah 2: Inisialisasi Git di Project Lokal
Buka terminal di folder project dan jalankan:

```bash
# Inisialisasi git (jika belum)
git init

# Tambahkan semua file
git add .

# Buat commit pertama
git commit -m "Initial commit: Black Bear WebApp"

# Tambahkan remote repository
git remote add origin https://github.com/USERNAME/black-bear-webapp.git

# Push ke GitHub
git push -u origin main
```

### Langkah 3: Verifikasi Push
1. Refresh halaman repository GitHub
2. Pastikan semua file sudah ter-upload

---

## 3️⃣ Deploy ke Vercel

### Langkah 1: Buat Akun Vercel
1. Kunjungi [vercel.com](https://vercel.com)
2. Klik "Sign Up" dan pilih "Continue with GitHub"
3. Authorize Vercel untuk mengakses GitHub Anda

### Langkah 2: Import Project
1. Setelah login, klik "Add New..." → "Project"
2. Pilih repository `black-bear-webapp` dari list
3. Klik "Import"

### Langkah 3: Konfigurasi Project
1. **Framework Preset**: Next.js (auto-detected)
2. **Root Directory**: `./` (default)
3. **Build Command**: `bun run build` atau `npm run build`
4. **Output Directory**: `.next` (default)
5. **Install Command**: `bun install` atau `npm install`

### Langkah 4: Set Environment Variables
Klik "Environment Variables" dan tambahkan variabel berikut:

```env
# Database
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/blackbear?sslmode=require

# Authentication
NEXTAUTH_SECRET=your-random-secret-key-min-32-characters
NEXTAUTH_URL=https://your-app-name.vercel.app

# App Config (Optional)
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
```

**Cara generate NEXTAUTH_SECRET:**
```bash
# Di terminal (Linux/Mac)
openssl rand -base64 32

# Atau gunakan online generator
# https://generate-secret.vercel.app/32
```

### Langkah 5: Deploy
1. Klik "Deploy"
2. Tunggu proses build selesai (2-5 menit)
3. Setelah selesai, Anda akan melihat URL production

---

## 4️⃣ Post-Deployment Setup

### Langkah 1: Jalankan Database Migration
Setelah deploy pertama kali, Anda perlu menjalankan migration untuk membuat tabel:

**Option A: Via Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Login ke Vercel
vercel login

# Link project
vercel link

# Jalankan migration (connect ke production database)
DATABASE_URL="your-neon-connection-string" npx prisma migrate deploy
```

**Option B: Via Prisma Studio Locally**
```bash
# Set DATABASE_URL ke Neon di .env.local
DATABASE_URL="your-neon-connection-string"

# Generate Prisma Client
npx prisma generate

# Push schema ke database
npx prisma db push

# Atau jalankan migration
npx prisma migrate deploy
```

**Option C: Via Neon SQL Editor**
1. Buka Neon Console
2. Pilih project
3. Klik "SQL Editor"
4. Copy paste schema dari `prisma/schema.prisma`
5. Jalankan query

### Langkah 2: Buat Owner Account
Jalankan seeder untuk membuat akun owner pertama:

```bash
# Via Vercel CLI atau lokal dengan DATABASE_URL production
npx prisma db seed
```

Atau buat manual via Prisma Studio:
```bash
npx prisma studio
```

### Langkah 3: Update NEXTAUTH_URL
Jika Anda menggunakan custom domain:
1. Buka Vercel Dashboard → Settings → Environment Variables
2. Update `NEXTAUTH_URL` dengan domain production Anda
3. Redeploy project

---

## 5️⃣ Environment Variables Reference

Buat file `.env` atau `.env.local` dengan variabel berikut:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/blackbear?sslmode=require"

# NextAuth.js
NEXTAUTH_SECRET="your-random-secret-key-min-32-characters-long"
NEXTAUTH_URL="https://your-app-name.vercel.app"

# Optional: Custom Domain
NEXT_PUBLIC_APP_URL="https://your-custom-domain.com"

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID="your-analytics-id"

# Optional: Image Storage (if using external)
# CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"
```

---

## 6️⃣ Custom Domain Setup

### Langkah 1: Tambah Domain di Vercel
1. Buka Vercel Dashboard → Project Settings → Domains
2. Masukkan domain Anda (contoh: `blackbear.yourcompany.com`)
3. Pilih tipe:
   - **Apex Domain**: `yourcompany.com`
   - **Subdomain**: `app.yourcompany.com`

### Langkah 2: Update DNS Records
Di provider domain Anda, tambahkan DNS record:

**Untuk Subdomain:**
```
Type: CNAME
Name: app (atau nama subdomain)
Value: cname.vercel-dns.com
```

**Untuk Apex Domain:**
```
Type: A
Name: @
Value: 76.76.21.21
```

### Langkah 3: Update Environment Variables
1. Update `NEXTAUTH_URL` dengan custom domain
2. Update `NEXT_PUBLIC_APP_URL` jika ada
3. Redeploy project

---

## 7️⃣ Automatic Deployment Setup

### Konfigurasi Auto-Deploy
Vercel otomatis mendeploy setiap ada push ke branch `main`.

### Branch Preview
1. Setiap pull request akan mendapat preview URL
2. Berguna untuk testing sebelum merge ke production

### Production Branch
1. Default: `main` branch
2. Bisa diubah di Settings → Git

---

## 8️⃣ Troubleshooting

### Error: Database Connection Failed
```bash
# Cek koneksi database
npx prisma db pull

# Jika error, cek DATABASE_URL format
# Pastikan sslmode=require ada
```

### Error: NextAuth Session Invalid
```bash
# Generate ulang NEXTAUTH_SECRET
openssl rand -base64 32

# Update di Vercel Environment Variables
# Redeploy project
```

### Error: Prisma Client Not Found
```bash
# Generate Prisma Client
npx prisma generate

# Redeploy di Vercel
```

### Error: Build Failed
1. Cek log build di Vercel Dashboard
2. Pastikan semua dependencies ada di `package.json`
3. Pastikan `prisma generate` dijalankan di build script

### Database Migration di Production
```bash
# Option 1: Via Prisma CLI dengan database URL production
DATABASE_URL="production-url" npx prisma migrate deploy

# Option 2: Via Vercel CLI
vercel env pull .env.production
npx prisma migrate deploy
```

---

## 9️⃣ Backup & Monitoring

### Backup Database
Neon otomatis membuat backup, tapi Anda juga bisa:
1. Neon Console → Backups
2. Atau export manual:
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Monitoring
1. **Vercel Analytics**: Dashboard → Analytics
2. **Vercel Logs**: Dashboard → Deployments → Function Logs
3. **Neon Monitoring**: Neon Console → Monitoring

---

## 🔒 Security Checklist

- [ ] `DATABASE_URL` disimpan dengan aman
- [ ] `NEXTAUTH_SECRET` minimal 32 karakter random
- [ ] `NEXTAUTH_URL` sesuai dengan domain production
- [ ] Database access dibatasi (Neon default: secure)
- [ ] HTTPS enabled (Vercel default)
- [ ] Environment variables tidak di-commit ke Git
- [ ] `.env` ada di `.gitignore`

---

## 📞 Support

Jika mengalami masalah:
1. **Vercel**: [vercel.com/support](https://vercel.com/support)
2. **Neon**: [neon.tech/docs](https://neon.tech/docs)
3. **Prisma**: [prisma.io/docs](https://prisma.io/docs)

---

## Quick Reference Commands

```bash
# Generate Prisma Client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Run migrations
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Create new migration
npx prisma migrate dev --name description

# Reset database (DEVELOPMENT ONLY!)
npx prisma migrate reset

# Check database connection
npx prisma db pull
```

---

**Happy Deploying! 🚀**
