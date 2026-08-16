# Black Bear — Arsitektur Lengkap

> Dokumentasi arsitektur, UI/UX, tema, dan keamanan aplikasi **Black Bear WebApp** (Gestun Management System).
> Disusun dari hasil scan menyeluruh terhadap codebase Next.js 16 + TypeScript + Prisma.

---

## Daftar Isi

1. [Ikhtisar Proyek](#1-ikhtisar-proyek)
2. [Stack Teknologi](#2-stack-teknologi)
3. [Struktur Direktori](#3-struktur-direktori)
4. [Konfigurasi & Build](#4-konfigurasi--build)
5. [Skema Database (Prisma)](#5-skema-database-prisma)
6. [Backend Library (src/lib)](#6-backend-library-srclib)
7. [API Routes (src/app/api)](#7-api-routes-srcappapi)
8. [Frontend Pages (src/app)](#8-frontend-pages-srcapp)
9. [Komponen (src/components)](#9-komponen-srccomponents)
10. [Hooks, Store, Types](#10-hooks-store-types)
11. [Sistem Tema & Visual Design](#11-sistem-tema--visual-design)
12. [UI/UX Patterns](#12-uiux-patterns)
13. [Keamanan (Security)](#13-keamanan-security)
14. [SEO & Performa](#14-seo--performa)
15. [Deployment](#15-deployment)
16. [Kerentanan & Rekomendasi](#16-kerentanan--rekomendasi)

---

## 1. Ikhtisar Proyek

**Black Bear** adalah platform manajemen **gestun** (gestun = *gede tunai* / penarikan tunai kartu kredit & paylater) untuk pasar Indonesia. Aplikasi ini menghubungkan **Owner** (pemilik bisnis) dengan **Partner** (mitra/agen) dan **Customer** (pelanggan publik).

### Aktor & Alur Bisnis

```
┌─────────┐   order   ┌──────────┐  kelola   ┌────────┐
│ Customer │ ────────► │ Partner  │ ◄────────► │ Owner  │
│ (publik) │           │ (agen)   │            │ (admin)│
└─────────┘           └──────────┘            └────────┘
     │                      │                      │
     │ track order          │ dashboard            │ full dashboard
     │ submit testimonial   │ transaksi sendiri    │ kelola partner, fee,
     │ contact via WA proxy │ customer             │ payment type, marketplace,
     │                      │ profil & password    │ SEO, broadcast, notif
```

### Tiga Jalur Akses

| Role | Route Prefix | Akses |
|------|-------------|-------|
| **Public** | `/`, `/order`, `/track`, `/blog`, `/faq`, `/lokasi` | Tanpa login |
| **Partner** | `/partner/dashboard/*` | Login partner |
| **Owner** | `/owner/dashboard/*` | Login owner |

### Kredensial Default (seeded)

| Role | Email | Password |
|------|-------|----------|
| Owner | `owner@blackbear.id` | `owner123` |
| Partner | `partner@blackbear.cc` | `partner123` |

---

## 2. Stack Teknologi

| Kategori | Teknologi | Versi |
|----------|-----------|-------|
| **Framework** | Next.js (App Router, Turbopack) | ^16.1.1 |
| **Bahasa** | TypeScript | ^5 (strict) |
| **Runtime** | Bun (dev), Node standalone (prod) | — |
| **Styling** | Tailwind CSS v4 | ^4 |
| **UI Library** | shadcn/ui (style: New York, base: neutral) | — |
| **Icon** | lucide-react | ^0.525.0 |
| **Primitif** | Radix UI (45+ komponen) | — |
| **Database** | Prisma ORM + SQLite (dev) / PostgreSQL (prod) | ^6.11.1 |
| **State Client** | Zustand (persisted) | ^5.0.6 |
| **Server State** | Fetch native + window-focus revalidation | — |
| **Form** | react-hook-form + zod | ^7.60.0 / ^4.0.2 |
| **Toast** | sonner (utama) + legacy shadcn toast | ^2.0.6 |
| **Rich Text** | TipTap (StarterKit + 6 ekstensi) | ^3.23.1 |
| **Maps** | MapLibre GL + CARTO Dark Matter tiles | ^5.23.0 |
| **Charts** | Recharts (via shadcn chart wrapper) | ^2.15.4 |
| **Auth** | Custom session (bcrypt + HttpOnly cookie) | bcryptjs ^3.0.3 |
| **Animasi** | CSS keyframes murni (framer-motion terpasang tapi **tidak dipakai**) | ^12.23.2 |
| **Font** | Google Inter (`--font-geist-sans`) | — |
| **Theme** | next-themes (class strategy, system default) | ^0.4.6 |

---

## 3. Struktur Direktori

```
/home/z/my-project/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # 50 route files, 12 resource groups
│   │   ├── layout.tsx            # Root layout (server component)
│   │   ├── page.tsx              # Landing (revalidate 60s)
│   │   ├── globals.css           # 2019 baris, sistem tema OKLCH
│   │   ├── robots.ts             # Multi-bot rules
│   │   ├── sitemap.ts            # Static + dynamic (blog, lokasi)
│   │   ├── not-found.tsx         # 404 dekoratif
│   │   ├── login/ register/      # Auth pages
│   │   ├── dashboard/            # Redirect router by role
│   │   ├── order/ track/         # Public order flow
│   │   ├── blog/ faq/ lokasi/    # Public content (SEO)
│   │   ├── maintenance/          # Maintenance mode page
│   │   ├── partner/dashboard/    # 4 sub-pages
│   │   └── owner/dashboard/      # 12 sub-pages
│   ├── components/
│   │   ├── ui/                   # 51 shadcn/ui + 2 custom
│   │   ├── shared/               # 11 shared components
│   │   ├── landing/              # 13 landing sections
│   │   ├── map/                  # 2 MapLibre components
│   │   └── seo/                  # JSON-LD components
│   ├── hooks/                    # 6 custom hooks
│   ├── lib/                      # 11 backend modules
│   ├── store/                    # Zustand auth store
│   └── types/                    # Domain types (236 baris)
├── prisma/
│   ├── schema.prisma             # Aktif (SQLite)
│   ├── schema.sqlite.prisma      # Dev
│   └── schema.postgres.prisma    # Prod
├── scripts/                      # 5 utility scripts
├── public/                       # Logo, manifest, robots.txt
├── db/custom.db                  # SQLite database
├── Caddyfile                     # Gateway :81 → :3000
├── prebuild.ts                   # Schema swap + seed otomatis
├── DEPLOYMENT.md                 # Panduan deploy Vercel+Neon
└── worklog.md                    # Log pengembangan
```

---

## 4. Konfigurasi & Build

### `next.config.ts`
```typescript
{
  output: "standalone",           // Bundle mandiri untuk produksi
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  allowedDevOrigins: ['localhost', '*.space.z.ai', '*.vercel.app'],
}
```

### `tsconfig.json`
- `target: ES2017`, `strict: true`, `noImplicitAny: false`
- Path alias: `@/*` → `./src/*`
- `jsx: react-jsx` (automatic runtime)

### `eslint.config.mjs`
Menggunakan `eslint-config-next` (core-web-vitals + typescript) dengan **hampir semua rule dimatikan** (no-explicit-any off, no-unused-vars off, exhaustive-deps off, dll). Ignores: `node_modules`, `.next`, `examples`, `skills`.

### `tailwind.config.ts`
- `darkMode: "class"`
- Content: `pages/`, `components/`, `app/`
- Colors: semua via `hsl(var(--token))` CSS variables
- Plugin: `tailwindcss-animate`

### `postcss.config.mjs`
```js
{ plugins: ["@tailwindcss/postcss"] }
```

### `components.json` (shadcn/ui)
- Style: **New York**
- Base color: **neutral**
- CSS variables: **on**
- Icon library: **lucide**
- RSC: **true**

### Scripts (`package.json`)
| Script | Fungsi |
|--------|--------|
| `dev` | `next dev -p 3000 >> dev.log 2>&1` |
| `prebuild` | `npx tsx prebuild.ts` (swap schema + seed) |
| `build` | prebuild → next build → copy static + public ke standalone |
| `start` | `bun .next/standalone/server.js` (NODE_ENV=production) |
| `lint` | `eslint .` |
| `db:push` / `db:generate` / `db:migrate` | Prisma commands |
| `postinstall` | `prisma generate` |

### `prebuild.ts` — Smart Schema Swap
1. Deteksi env: jika `DATABASE_URL` diawali `postgresql://` atau `VERCEL=1` → Postgres, else SQLite.
2. Backup `schema.prisma` → swap dengan `schema.sqlite.prisma` atau `schema.postgres.prisma`.
3. `prisma generate` → `prisma db push` → `tsx prisma/seed.ts`.

### `Caddyfile` (Gateway)
```caddy
:81 {
  @transform_port_query { query XTransformPort=* }
  handle @transform_port_query {
    reverse_proxy localhost:{query.XTransformPort}  # Mini-services via query param
  }
  handle {
    reverse_proxy localhost:3000  # Next.js app
  }
}
```

---

## 5. Skema Database (Prisma)

**16 model**, 428 baris. Provider: SQLite (dev) / PostgreSQL (prod). Semua ID pakai `cuid()`, timestamp `createdAt`/`updatedAt`.

### Entity Relationship Diagram

```
User ─┬─< Session
      └─< Partner ─┬─< Transaction >─── Customer
                   ├─< MonthlyRankingHistory
                   └─< Customer (partnerId)
                       
Transaction ─┬─< PaymentType
             ├─< Marketplace? (platformFee)
             ├─< Testimonial (1:1)
             └─< Customer

OwnerProfile ──< NotificationSettings
Notification (targetType: owner/partner/all)
SiteConfig (key-value)
BlogPost | FAQ | Location | Announcement | Promo
```

### Detail Model

#### User & Auth
| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | String (cuid) | PK |
| `email` | String @unique | Login email |
| `name` | String | Nama lengkap |
| `password` | String | bcrypt (12 rounds) atau legacy SHA-256 |
| `role` | String | `"owner"` \| `"partner"` |
| `avatar` | String? | URL avatar |

**Session**: `id` (32-byte hex), `userId`, `expiresAt` (7 hari), `createdAt`. Index pada `userId`.

#### Partner
Field bisnis lengkap: `commission` (default 30%), `target` (default 5jt), `tier` (Bronze→Platinum), `badge` (Newbie→Legend), `status` (active/suspended), `totalProfit`, `totalVolume`, `totalTransactions`, `notes` (catatan owner).

#### Customer
`label` (VIP/Regular/New/Blacklist), `addedBy` (owner/partner/public), `partnerId` nullable, index pada `phone`, `city`, `label`.

#### Transaction (inti bisnis)
Breakdown fee lengkap:
```
nominal (input user)
  → originalFee (sebelum diskon)
  → discountPercent / discountAmount
  → paymentFee (setelah diskon)
  → platformFee (potongan marketplace)
  → netMargin = paymentFee - platformFee
  → partnerProfit = netMargin × (commission/100)
  → ownerProfit = netMargin - partnerProfit
  → totalReceived = nominal - paymentFee
```
Status: `pending` → `verification` → `process` → `success` / `failed`. Method: `Online` / `COD`. Relasi ke `PaymentType`, `Marketplace` (opsional), `Customer`, `Partner` (opsional), `Testimonial` (1:1).

#### PaymentType
Konfigurasi fee per metode: `onlineFeePercent`/`onlineFeeFlat`, `codFeePercent`/`codFeeFlat`, `threshold` (batas percent vs flat), `discountPercent`/`discountNominal`, `minTransaction` (syarat diskon), `isActive`.

#### Marketplace
`feePercent`, `feeFlat` — potongan dari margin (bukan dari nominal).

#### Lainnya
- **OwnerProfile**: branding site (title, logo, favicon, meta, footer socials, maintenanceMode).
- **NotificationSettings**: konfigurasi Telegram (botToken, chatId, enabled) + preferensi notifikasi.
- **Notification**: `type` (new_partner/new_order/transaction_update/broadcast/partner_message), `targetType` (owner/partner/all), `targetUserId`, `partnerId`, `transactionId`.
- **BlogPost**, **FAQ**, **Location**: konten SEO dengan slug, meta fields, `isPublished`/`isActive`.
- **Testimonial**: 1 per transaction, `rating` 1-5, `isApproved`, `isFeatured`.
- **Announcement** (promo/broadcast/announcement) + **Promo** (legacy).
- **SiteConfig**: key-value store.
- **MonthlyRankingHistory**: snapshot bulanan profit/volume/transactions/rank/badge per partner.

---

## 6. Backend Library (src/lib)

### `auth/index.ts` — Sistem Autentikasi
- **Password hashing**: bcrypt 12 salt rounds.
- **Legacy migration**: `verifyPassword()` auto-deteksi format SHA-256 (`salt:hex`) → verifikasi (coba 2 urutan: `password+salt` & `salt+password`) → **auto-migrate ke bcrypt** pada login berhasil.
- **Session**: token 32-byte hex, HttpOnly cookie (`sameSite: 'lax'`, `secure` di prod, 7 hari), disimpan di tabel `Session`.
- **Helpers**: `getCurrentUser()` (baca cookie → join partner), `createSession`, `deleteSession`, `validateEmail/Password/Phone`, `generateOrderId` (`BB-<base36 timestamp>-<6 hex>`), `calculatePaymentFee`, `calculateMarginBreakdown`.
- Session kedaluwarsa otomatis dihapus saat diakses.

### `rate-limit.ts` — Rate Limiter In-Memory
- IP-based, `Map<string, RateLimitEntry>`. Cleanup setiap 10 menit, entri kedaluwarsa setelah 1 jam.
- `getClientIp()`: baca `x-forwarded-for` → `x-real-ip` → `cf-connecting-ip` → `'unknown'`.
- **Preset**:
  | Preset | Limit | Window | Block |
  |--------|-------|--------|-------|
  | `ORDER_CREATE` | 5 | 5 menit | 15 menit |
  | `PARTNER_REGISTER` | 3 | 10 menit | 30 menit |
  | `LOGIN` | 5 | 5 menit | 15 menit |
  | `CUSTOMER_LOOKUP` | 10 | 1 menit | 5 menit |
  | `GENERAL_API` | 30 | 1 menit | 1 menit |

### `sanitize.ts` — Sanitasi & Validasi Input
- `sanitizeString`: strip HTML tags + pola XSS (`javascript:`, `on*=`, `data:`, `vbscript:`, control chars).
- `sanitizeName` (huruf + unicode + `-` `'` `.`), `sanitizePhone` (digit + `+`), `sanitizeBankAccount` (digit saja), `sanitizeCity`, `sanitizeEmail`.
- `validateLength`, `validateNominal` (Rp 10.000–100.000.000, integer), `isValidCuid` (`/^[a-z][a-z0-9]{24}$/`), `isValidPhone` (Indonesia), `isValidEmail`, `isValidMethodTransaction`.
- **`isHoneypotTriggered()`**: anti-bot, true jika honeypot field terisi.
- `FIELD_LIMITS`: konstanta batasan panjang field.

### `customer-utils.ts`
- `normalizePhone`, `getPhoneVariations`: handle `08xxx` ↔ `62xxx` ↔ `+62xxx` ↔ digit polos.
- `findExistingCustomer` / `checkCustomerDuplicate`: query Prisma `OR` dengan semua variasi phone + case-insensitive name. Return `{isDuplicate, duplicateType, existingCustomer, message}`.
- `formatPhoneDisplay`, `formatPhoneWhatsApp`, `isValidIndonesianPhone` (`/^62\d{8,13}$/`).

### `telegram.ts`
- `sendTelegramMessage`, `testTelegramConnection` (`getMe` + kirim pesan test).
- Helper typed: `notifyNewTransaction`, `notifyTransactionStatus`, `notifyNewPartner`, `notifyNewCustomer`, `sendDailyReport`, `sendTelegramNotification` (generic dengan map emoji per type).
- `formatCurrency` (IDR).

### `indonesia-cities.ts` + `city-utils.ts`
- Dictionary kota Indonesia dengan `lat`/`lng`/`province`/`island`.
- `getCityData`: fuzzy match (case-insensitive, strip `kota`/`kabupaten`/`kab`).
- `generateLocationContent(city, province)`: generate SEO description, metaTitle, metaDescription, keywords, konten markdown panjang untuk landing page lokasi.

### `db.ts`
- Prisma singleton dengan `log: ['query']` di dev.
- `toNumber(value)`: konversi aman `Decimal | string | number` → number (penting untuk kompatibilitas Neon Postgres Decimal).

### `server-site-config.tsx`
- React Context provider membungkus `SiteConfig` (di-inject dari server di root layout untuk SSR).

### `utils.ts`
- `cn()` helper (clsx + tailwind-merge).
- Helper formatting lainnya.

---

## 7. API Routes (src/app/api)

**50 route files** di 12 resource group. Legenda: 🔒 auth required · 🌐 public · ⏱ rate-limited · 🛡️ sanitized · 🍯 honeypot.

### Ringkasan Per Group

#### `/api/auth/*` — Autentikasi
| Route | Method | Auth | Rate | Catatan |
|-------|--------|------|------|---------|
| `/login` | POST | 🌐 | ⏱ 5/15min | Verifikasi + auto-migrate SHA-256→bcrypt, set cookie |
| `/register` | POST | 🌐 | ⚠️ **NONE** | Buat User+Partner (commission 30, target 5jt, tier Bronze), auto-login, notif owner + Telegram |
| `/logout` | POST | 🔒 | — | Hapus session + cookie |
| `/me` | GET | 🔒 | — | Return user + partner |

#### `/api/orders/*` — Order Publik
| Route | Method | Auth | Rate | Catatan |
|-------|--------|------|------|---------|
| `/orders` | POST | 🌐 | ⏱ ORDER_CREATE + headers | 🛡️ full sanitization + 🍯 honeypot (`website`/`honeypot`/`url` — bot dapat fake success). Lookup payment type, hitung fee, dedup customer, buat Transaction (status: pending), notif owner + Telegram |
| `/orders/track` | GET | 🌐 | — | **Masking PII**: phone `0812-XXXX-7890`, bank account `XXXXXX7890`, bank holder (nama depan saja). Filter private notes (strip `[timestamp] Name: msg`) |
| `/orders/contact` | GET | 🌐 | ⏱ 10/1min | **Privacy proxy**: resolve WhatsApp target server-side (partner jika active, else owner), build `wa.me` URL — phone **tidak pernah sampai ke client** |

#### `/api/transactions/*` — CRUD Transaksi
| Route | Method | Auth | Catatan |
|-------|--------|------|---------|
| `/transactions` | GET | 🔒 owner/partner | Paginasi, **partner auto-filter** ke transaksi sendiri |
| `/transactions` | POST | 🔒 owner/partner | 🛡️ full sanitization, hitung fee/discount/margin. Status default: `process` (owner) / `pending` (partner) |
| `/transactions/[id]` | GET | 🔒 | Partner cek ownership via `partnerId` |
| `/transactions/[id]` | PATCH | 🔒 | Update status (incr/decr stats partner pada success↔non-success), notes, link, marketplace (recalc fee), nominal (recalc semua margin), diskon, reassign partner. **Partner dibatasi: nominal-only, status pending/verification** |
| `/transactions/[id]` | DELETE | 🔒 owner only | Reverse stats customer + partner |
| `/transactions/analytics` | GET | 🔒 owner | Forecast bulanan, fee analysis, tren 7-hari, breakdown payment type, peak hours |
| `/transactions/preview` | POST | 🔒 | Dry-run kalkulator fee, tidak persist |

#### `/api/customers/*` — Manajemen Customer
| Route | Method | Auth | Catatan |
|-------|--------|------|---------|
| `/customers` | GET | 🔒 | Partner scoped (created OR has transactions) |
| `/customers` | POST | 🔒 | Dedup via `checkCustomerDuplicate`, `addedBy` auto-set |
| `/customers/[id]` | GET/PATCH/DELETE | 🔒 | ⚠️ **Tidak ada ownership check** — partner bisa akses customer lain |
| `/customers/[id]/transactions` | GET | 🔒 | Partner scoped ke `partnerId` sendiri |
| `/customers/lookup` | GET | ⚠️ **PUBLIC** | ⚠️ **KRITIS**: return PII lengkap (name, phone, bank, city, volume) hanya dengan nomor telepon. Preset `CUSTOMER_LOOKUP` ada tapi **tidak dipasang** |
| `/customers/stats` | GET | 🔒 | Distribusi label, top cities, top customers |

#### `/api/partners/*` — Manajemen Partner
| Route | Method | Auth | Catatan |
|-------|--------|------|---------|
| `/partners` | GET | 🔒 owner | List + last session (last login) |
| `/partners` | POST | 🔒 owner | ⚠️ Hardcode password `'partner123'` (seharusnya pakai `generateRandomPassword()`) |
| `/partners/[id]` | GET/PATCH/DELETE | 🔒 owner | Detail, update, delete (refuse if has transactions) |
| `/partners/[id]/password` | PATCH | 🔒 owner | Set password + **hapus semua session** (force re-login) |
| `/partners/[id]/public` | GET | 🌐 | Return hanya `id, name, tier` — minim exposure |
| `/partners/stats` | GET | 🔒 owner | Distribusi tier, top by profit/volume, growth |
| `/partner/profile` | GET/PATCH | 🔒 partner | Self-profile. Password change butuh `verifyPassword(currentPassword)` dulu |

#### `/api/payment-types/*` & `/api/marketplaces/*`
- GET public (dengan `activeOnly`), POST/PATCH/DELETE owner-only.
- Refuse delete jika dipakai transaksi.
- `/stats` untuk usage analytics.

#### `/api/announcements/*`
- GET authed (filter `type`, `activeOnly`), POST/PATCH/DELETE owner.
- Validasi: promo butuh `link`, broadcast butuh `startDate`+`expireDate`, cek urutan tanggal.

#### `/api/testimonials/*`
| Route | Method | Auth | Catatan |
|-------|--------|------|---------|
| `/testimonials` | GET | 🌐 | ⚠️ Return customer name tidak di-mask |
| `/testimonials` | POST | 🌐 | Buat testimonial (auto-unapproved), notif owner + Telegram |
| `/testimonials/[id]` | PATCH/DELETE | ⚠️ **PUBLIC** | ⚠️ **KRITIS**: tidak ada auth check — siapa saja bisa approve/feature/delete |
| `/testimonials/public` | GET | 🌐 | Return ≤50 approved, **mask name** (`J***`) |
| `/testimonials/partner` | GET | 🔒 partner | Testimonial transaksi partner sendiri |

#### `/api/notifications/*`
- GET (owner: all + special modes `pending`/`messages`; partner: targeted), POST (tipe `partner_notification` auto-append ke transaction notes), PATCH (mark read / markAllRead).
- `/settings` GET/PATCH owner — **bot token di-mask** (`'••••••••' + last 4`), preserve existing token saat frontend kirim balik masked value.
- `/test-telegram` POST owner — test connection.
- `/partner-message` POST partner — verify `transaction.partnerId === partner.id`.

#### `/api/seo/*` — Konten SEO
- Blog, FAQ, Location: GET public (filter `?public=true`), POST/PUT/DELETE owner.
- `/seo/location/sync` POST owner — bulk sync dari kota partner aktif, lookup coords, generate SEO content, buat Location records.
- ⚠️ `/seo/faq/[id]` PUT & `/seo/location/[slug]` PUT menulis raw body tanpa allowlist field.

#### `/api/telegram/*` — Bot Integration
| Route | Method | Auth | Catatan |
|-------|--------|------|---------|
| `/telegram/webhook` | POST | 🌐 (Telegram) | Full command router: `/start`, `/help`, `/info <id>`, `/status <id> <status>`, `/nominal <id> <amount>`, `/catatan`, `/link`, `/mp`, `/today`, `/weekly`. Support reply-to-bot + inline keyboard. **Per-message chatId allowlist** |
| `/telegram/webhook` | GET | 🌐 | Health check |
| `/telegram/set-webhook` | POST/DELETE/GET | ⚠️ **PUBLIC** | ⚠️ **KRITIS**: tidak ada auth — siapa saja bisa re-register webhook ke URL attacker |

#### Top-Level
| Route | Method | Auth | Catatan |
|-------|--------|------|---------|
| `/api` | GET | 🌐 | Health check `"Hello, world!"` |
| `/api/dashboard` | GET | 🔒 | Owner: KPI + tren + top partners/customers + activity timeline + announcements + partner messages. Partner: stats sendiri + leaderboard + broadcasts |
| `/api/site-config` | GET | 🌐 | Return public site config dari OwnerProfile |
| `/api/owner/profile` | GET/PATCH | 🔒 owner | Auto-create default jika missing. Password change butuh verify current |

### Statistik API
- **Public endpoints**: 17
- **Owner-only**: 22
- **Partner-or-owner**: 19
- **Partner-only**: 4
- **Rate-limited**: 3 (orders POST, orders/contact, auth/login) — seharusnya 5
- **Full sanitization**: 2 (orders POST, transactions POST)
- **Honeypot**: 1 (orders POST)

---

## 8. Frontend Pages (src/app)

### Root Layout (`layout.tsx`)
- **Server component**, fetch `OwnerProfile` → build `SiteConfig` + dynamic `Metadata` (title, OG, Twitter, robots, icons, manifest, alternates).
- Provider stack: `ThemeProvider` → `ServerSiteConfigProvider` → `PageLoader` + `MaintenanceWrapper` (DesktopNavbar + main + ConditionalFooter + MobileBottomNav + DashboardMobileNav + ScrollToTop + WhatsAppFab + GlobalFloatingComponents + Toaster).
- `<html lang="id" suppressHydrationWarning>`, `<body class="inter antialiased bg-background text-foreground">`.
- `viewport`: `userScalable: false` (⚠️ aksesibilitas — lihat §16).

### Landing (`page.tsx`)
- Server component, `revalidate = 60s`. Fetch `paymentTypes`, `faqs`, `announcements` paralel. Render `<LandingPage/>` client.

### Public Pages

| Route | Deskripsi |
|-------|-----------|
| `/login`, `/register` | Split-screen: hero gradient panel (kiri) + form card (kanan). Floating particles. Role selector. Show/hide password. `CitySearch` + bank `Select` di register |
| `/order` | Multi-step form (3 langkah): payment type+nominal → customer+bank → review. Live fee preview via `/api/transactions/preview`. Suspense skeleton |
| `/track` | Tracking by ID (`BB-XXXXXX`). Timeline 5 status. Dialog Contact WhatsApp (proxy). Dialog Submit Testimonial |
| `/blog` | Listing dengan debounced search (300ms), filter kategori, featured post, grid 3-col, `SimplePagination`, `FadeInSection` |
| `/blog/[slug]` | SSG (`generateStaticParams` + `generateMetadata`). Prose content, related posts, share buttons |
| `/faq` | Server fetch → client group by kategori. Accordion. **2 JSON-LD**: FAQPage + BreadcrumbList |
| `/lokasi` | Interactive MapLibre map (dark) + search + grid. Hover sync marker↔card |
| `/lokasi/[slug]` | SSG. LocalBusiness JSON-LD dengan geo coords. Services grid, HTML content, keywords badges |
| `/maintenance` | Countdown simulasi. Animated background (orbs, particles, grid). Status cards. WhatsApp CTA |
| `/not-found` | 404 dekoratif: orbs, gradient "404", spinning ring, quick links |
| `/dashboard` | Redirect router by role (partner→/partner/dashboard, owner→/owner/dashboard, unauth→/login) |

### Owner Dashboard (12 sub-pages, semua `'use client'`)

| Page | Fitur Utama |
|------|-------------|
| `page.tsx` (2306 baris) | KPI, area chart 7-hari, perbandingan 14-hari, top partners, leaderboard, recent transactions, testimonials, notifications, partner messages, analytics forecast, fee analysis, peak hours, payment type breakdown, marketplace analysis, bubble map |
| `broadcast` | CRUD announcements, tab filter (promo/broadcast/announcement), date range, status indicators |
| `transactions` | Tabel + filter, dialog detail, analytics charts, dialog new transaction (live fee calc) |
| `customers` | CRUD, label badges, pie chart distribusi, bubble map top cities, partner assignment |
| `partners` | Manajemen tier/badge, ranking history, target progress, password reset, status toggle |
| `fees` | CRUD payment types + marketplaces, fee structure online/COD, threshold, discount |
| `notifications` | Feed dengan type icons, mark-as-read |
| `testimonials` | Approve/feature/delete, filter tabs |
| `seo/blog` | CRUD dengan TipTap editor, image upload, SEO fields, fullscreen edit |
| `seo/location` | CRUD dengan slug, content, meta, image |
| `seo/faq` | CRUD dengan kategori, order, drag-reorder |
| `settings` | Owner profile + site config (logo, favicon, title, meta, footer socials, maintenance toggle) |

**Pola Owner Dashboard**: `useAuthStore` + hydrate guard + redirect non-owner. `useAuthHydrated` (SSR-safe via `useSyncExternalStore`). Skeleton loading. `toast` (sonner). Window-focus revalidation. Glassmorphism `dash-card` + `dashboard-mesh` + `kpi-accent` + `chart-ambient` + `dash-section.d1..d12` staggered entrance.

### Partner Dashboard (4 sub-pages)

| Page | Fitur |
|------|-------|
| `page.tsx` (1100 baris) | KPI partner, target progress bar, leaderboard position, recent transactions, testimonials received, broadcasts modal, promo cards |
| `transactions` (1450 baris) | Transaksi partner, status tabs, new transaction dialog (live fee calc, customer lookup, marketplace select), analytics |
| `customers` (872 baris) | CRUD customer, city map visualization, phone validation |
| `settings` (820 baris) | Profile edit (avatar, password, city, bank), theme toggle, notification prefs, logout |

### File Pendukung
- `robots.ts`: multi-bot rules, disallow `/api/`, `/owner/`, `/partner/`, `/register`, `/dashboard/`, `/maintenance`, `/login`.
- `sitemap.ts`: static + dynamic (published blog + active locations) dengan image sitemap.

---

## 9. Komponen (src/components)

### `components/ui/` — 51 shadcn/ui + 2 Custom

**Standar (Radix-based)**: accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button (cva: default/destructive/outline/secondary/ghost/link × default/sm/lg/icon), calendar, card, carousel (embla), chart (recharts wrapper + `ChartContainer`/`ChartTooltip`/`ChartLegend`), checkbox, collapsible, command (cmdk), context-menu, dialog, drawer (vaul), dropdown-menu (with `DropdownMenuSub`), form (react-hook-form), hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch (custom: green+Check saat on, gray+Minus saat off, `ToggleField` wrapper), table, tabs, textarea, toast+toaster (legacy), toggle, toggle-group, tooltip.

**Custom**:
- `city-search.tsx`: autocomplete dari `INDONESIAN_CITIES`. Keyboard nav (Arrow/Enter/Esc), highlight current, badge provinsi+pulau. Cap 50 hasil.
- `pagination.tsx`: export `SimplePagination` (smart page numbers, ellipsis >5 halaman).

### `components/shared/` — 11 Komponen

| Komponen | Baris | Fungsi |
|----------|-------|--------|
| `desktop-navbar.tsx` | 514 | Sticky header, scroll-aware bg. 3 mode nav (public/owner/partner). Nested SEO dropdown. User dropdown (avatar+role badge+logout). Mobile drawer (260px). `ThemeToggle` dynamic import |
| `mobile-nav.tsx` | 105 | iOS-style bottom nav (h-70px), `ios-safe-bottom`, backdrop-blur. 3 mode. Active: `bg-primary/15`. Home indicator bar |
| `dashboard-mobile-nav.tsx` | 204 | Only `/owner/` & `/partner/`. 4 items + "Lainnya" (owner) → bottom Sheet grouped by category |
| `footer.tsx` | 235 | 3-col grid (brand+trust badges, quick links+hours, socials). 6 custom SVG icons (TikTok, Threads, IG, FB, YT) + WA. Hover color per platform. Gradient top border |
| `conditional-footer.tsx` | 20 | Hide footer di `/owner/`, `/partner/`, `/dashboard` |
| `theme-provider.tsx` | 11 | Wrapper `next-themes` |
| `theme-toggle.tsx` | 21 | Toggle light/dark, Sun/Moon icons |
| `maintenance-wrapper.tsx` | 137 | Read `maintenanceMode`. Always-accessible: `/maintenance`, `/login`, `/register`, `/api/`. Owner bisa akses `/owner/*`. 6s safety timeout. `useAuthHydrated` SSR-safe |
| `page-loader.tsx` | 106 | Fixed overlay z-100, fade-out. Logo glow + animated loading bar. Image-aware timing (3s wait + 1.2s display + 800ms no-image) |
| `rich-text-editor.tsx` | 417 | TipTap + sticky toolbar. Buttons: undo/redo, H1-H3, bold/italic/underline/strike/code/highlight, lists, alignment, blockquote, hr, link, image. Tooltip per button. Dialog untuk link+image. Character count. `immediatelyRender: false` |
| `global-floating-components.tsx` | 22 | Dynamic import `SocialProofToast` + `CookieConsent` (`ssr: false`) |

### `components/landing/` — 13 Sections

| Komponen | Baris | Fungsi |
|----------|-------|--------|
| `landing-page.tsx` | 1348 | Orchestrator. Dynamic import below-fold sections. 17 sections urut: scroll progress, announcement, hero (holographic 3D card), stats, live activity, rate calculator, payment types marquee, services, how-it-works, trust, why-choose, testimonials, FAQ, partner program, comparison table, CTA, cities, exit-intent |
| `rate-calculator.tsx` | 513 | Select/button pills. Rp prefix + thousand-separator. Preset (500rb/1jt/2jt/5jt). `requestAnimationFrame` reveal. Side-by-side Online/COD. Min-transaction banner. Savings summary |
| `testimonials-section.tsx` | 343 | Dual-row marquee (45s+50s opposite), pause on hover. Fade-edge. Mobile: swipe carousel + chevrons. `StarRatingBars` (IntersectionObserver, 120ms stagger). 4.9/5 header |
| `cities-section.tsx` | 182 | Fetch `/api/seo/location?public=true`, fallback 12 kota. Debounced search. 2×4 grid expandable |
| `live-activity-feed.tsx` | 73 | Dark band. 20 fake transactions ×2 loop. Marquee `scroll-left 60s`. "LIVE" badge + `animate-ping` |
| `announcement-bar.tsx` | 113 | Cross-fade rotation (4s). `announcement-shimmer` sweep. Type-coded icons. Dot indicators. Close button |
| `animated-counter.tsx` | 80 | `requestAnimationFrame` + `easeOutCubic`. `startOnView` via IntersectionObserver. Custom formatter |
| `fade-in-section.tsx` | 64 | Generic IntersectionObserver wrapper. `threshold`, `triggerOnce` |
| `exit-intent-banner.tsx` | 78 | Detect rapid upward scroll after 50% depth. Once per session. Fixed bottom, `animate-slide-up` |
| `social-proof-toast.tsx` | 265 | Fake "Transaksi Baru" every 17s. 4-phase state machine. Progress bar 5s. Avatar gradient by name hash. 2 layout (mobile 280px / desktop 320px). Cookie-banner-aware |
| `cookie-consent.tsx` | 168 | Only public pages. localStorage persist. `dispatchCookieBannerVisible` for cross-component. 2 layout (mobile bottom / desktop bottom-right). Glow halo |
| `scroll-to-top.tsx` | 124 | SVG circular progress ring (gradient stroke). Appear after 2% scroll. `requestAnimationFrame` throttled. Cookie-banner-aware |
| `whatsapp-fab.tsx` | 309 | Hidden di dashboard/auth/maintenance. 1.2s delay + 5s tooltip. Mobile: popover (WA-green gradient). Desktop: direct link. 2 `animate-ping` rings. Close on outside-click/scroll/Escape |

### `components/map/` — 2 Komponen

| Komponen | Baris | Fungsi |
|----------|-------|--------|
| `map-provider.tsx` | 196 | Public map. MapLibre + CARTO Dark Matter. Center Indonesia `[118, -2.5]` zoom 4.5. Orange dot markers + glow. Hover scale 1.4. `fitBounds` + `ResizeObserver` |
| `analytics-bubble-map.tsx` | 440 | Dashboard map. Fuzzy city→coords (4 strategi). Zoom-dependent bubble size (6-48px). 8-color palette. Pulsing glow (`bubble-pulse` 2.5s). Popup dark blur. Loading + legend + empty state |

### `components/seo/json-ld.tsx` — 4 Komponen
- `OrganizationJsonLd`: `FinancialService` schema (name, logo, geo, hours, `aggregateRating` 4.9/1250, `sameAs` socials, `hasOfferCatalog` 3 services, `areaServed: Indonesia`).
- `FAQJsonLd`: `FAQPage` 5 Q&A hardcoded.
- `BreadcrumbJsonLd`: generic `BreadcrumbList`.
- `LocalBusinessJsonLd`: generic local business.

---

## 10. Hooks, Store, Types

### Hooks (`src/hooks/`)

| Hook | Baris | Fungsi |
|------|-------|--------|
| `use-site-config.ts` | 124 | `{ config, loading, refreshConfig, getInitials, getWhatsAppLink }`. Context untuk instant initial, fetch background. 5-min module cache. `invalidateSiteConfigCache()` export |
| `use-scroll-fade-in.ts` | 48 | IntersectionObserver fade-in. `{ fadeRef, isVisible }` |
| `use-animated-counter.ts` | 85 | `requestAnimationFrame` + `easeOutCubic`. `{ counterRef, value }` |
| `use-mobile.ts` | 19 | `useIsMobile()` matchMedia 768px, SSR-safe |
| `use-cookie-banner-visible.ts` | 61 | Cross-component via `useSyncExternalStore` + custom event. Init synchronously dari localStorage |
| `use-toast.ts` | 193 | Legacy shadcn toast (TOAST_LIMIT=1). Jarang dipakai |

### Store (`src/store/auth-store.ts`)
- **Zustand + persist** (localStorage key `blackbear-auth`).
- State: `user`, `partner`, `isAuthenticated`, `isLoading`, `hasHydrated`.
- Actions: `setUser`, `updateUser`, `setPartner`, `logout` (call `/api/auth/logout`, redirect `/login`), `hydrate` (verify `/api/auth/me`), `clearAuth` (untuk 401).
- **Security pattern**: `onRehydrateStorage` reset `hasHydrated=false` + `isLoading=true` di setiap page load — **tidak pernah trust localStorage**, selalu re-verify ke server.
- `partialize`: persist hanya `user`, `partner`, `isAuthenticated` (bukan loading flags).

### Types (`src/types/index.ts`) — 236 baris
- **Unions**: `UserRole`, `CustomerLabel`, `TransactionStatus`, `MethodTransaction`, `PartnerTier`, `PartnerBadge`, `PartnerStatus`.
- **Interfaces**: `User`, `Session`, `Partner`, `Customer`, `Transaction` (dengan breakdown fee lengkap), `PaymentType`, `Marketplace`, `Announcement`, `Promo`, `SiteConfig`, `OwnerProfile`, `ApiResponse<T>`, `LoginCredentials`, `RegisterData`, `OrderInput`, `DashboardStats`, `MarginHealth`.

---

## 11. Sistem Tema & Visual Design

### Color System — OKLCH

Menggunakan **OKLCH color space** (perceptually uniform) untuk semua token. Primary hue **~295 (violet)** dengan aksen fuchsia/purple/cyan/emerald/amber.

**Light theme** (`:root`):
| Token | Value | Penggunaan |
|-------|-------|------------|
| `--background` | `oklch(0.99 0.005 300)` | Background utama |
| `--foreground` | `oklch(0.15 0.02 300)` | Text utama |
| `--card` | `oklch(1 0 0)` | Background card |
| `--primary` | `oklch(0.55 0.25 295)` | Violet — warna brand |
| `--primary-foreground` | `oklch(0.99 0.005 300)` | Text di atas primary |
| `--secondary` | `oklch(0.96 0.02 300)` | Secondary bg |
| `--muted` | `oklch(0.96 0.01 300)` | Muted bg |
| `--muted-foreground` | `oklch(0.5 0.03 300)` | Muted text |
| `--accent` | `oklch(0.92 0.04 300)` | Accent bg |
| `--destructive` | `oklch(0.55 0.22 25)` | Red — error/hapus |
| `--border` | `oklch(0.9 0.02 300)` | Border |
| `--ring` | `oklch(0.55 0.25 295)` | Focus ring |
| `--chart-1..5` | hue 295→340 | Palette chart |

**Dark theme** (`.dark`):
| Token | Value |
|-------|-------|
| `--background` | `oklch(0.12 0.02 295)` — deep violet-black |
| `--card` | `oklch(0.17 0.025 295)` |
| `--primary` | `oklch(0.7 0.22 295)` — brighter violet |
| `--foreground` | `oklch(0.95 0.01 300)` |
| `--border` | `oklch(0.28 0.02 300)` |

**Radius**: `--radius: 0.875rem` dengan sm/md/lg/xl variants.

**Theme color meta**: light `#ffffff`, dark `#1a1520`.

### Font
- Google **Inter** (`--font-geist-sans`), `display: swap`.
- `<html lang="id">`, locale `id_ID`, currency format `id-ID` (Intl).

### Dark Mode
- `next-themes` dengan `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`.
- `ThemeToggle` dynamic import (`ssr: false`) untuk hindari hydration mismatch.
- Semua custom utility punya variant `.dark` eksplisit.

### Glassmorphism & Gradient
- `.glass` / `.glass-card` / `.glass-card-light` / `.safe-card`: backdrop-blur + translucent bg (light: `rgba(255,255,255,0.75)`, dark: `rgba(30,20,40,0.75)`).
- `.gradient-primary` (135° primary→purple), `.gradient-accent`, `.gradient-hero` (dengan dark variant).
- Dashboard: `.dash-card`, `.dashboard-mesh`, `.kpi-accent.accent-{violet,emerald,amber,fuchsia,cyan,pink}`, `.chart-ambient.ambient-{cyan,pink}`, `.stat-strip`, `.dash-divider`.

### Custom Scrollbar
- Invisible by default, muncul saat hover (`html:hover::-webkit-scrollbar-thumb`). Thin (8px). Transisi smooth.

### iOS-Friendly Utilities
- `ios-safe-top/bottom/left/right` (`env(safe-area-inset-*)`).
- `tap-highlight` (purple tap color), `active-scale` (0.98 on `:active`).
- `mobile-btn` / `mobile-btn-primary` / `mobile-btn-outline` (h-12, rounded-xl).
- `section-mobile`, `title-mobile`, `subtitle-mobile`.
- `fab`, `pull-indicator`, `bottom-sheet` (drag handle pseudo-element).

### Animation Library (CSS Keyframes)
**40+ `@keyframes`** didefinisikan di `globals.css`:
- Entrance: `fadeIn`, `fadeInUp`, `slideUp`, `slideInRight`, `floatIn`, `cardFadeIn`, `sectionHeaderFadeIn`, `dashSectionIn`.
- Pulse/loop: `pulse-soft`, `bounce-soft`, `float`, `pulseGlow`/`pulseGlowDark`, `trustPulse`, `statIconPulse`, `stepGlow`.
- Shimmer: `shimmer`, `shimmerGradient`, `borderShimmer`, `ctaShimmerSweep`, `announcementSweep`, `underlineShimmer`, `heroCardShimmer`.
- Marquee: `scroll-left`, `scroll-right`, `marquee`.
- Hero card: `heroCardBorderRotate`, `heroCardGlow`, `heroCardParticle`, `heroCardFloat`, `heroGradientShift`.
- Specialized: `loadingBar`, `pageLoaderBar`, `ripple`, `checkmarkPop`, `typewriterBlink`, `resultReveal`, `flowingDots`, `flowingDotsVertical`, `ctaBorderRotate`, `ctaGradientShift`, `announcementFade`.

**Stagger**: `.stagger-1..5` (50-250ms), `.dash-section.d1..d12` (0-660ms).

**Component utilities**: `.hero-card-wrapper/border/inner/holographic/light-streak/grid/particle`, `.credit-card/inner/shine/chip`, `.section-divider`, `.section-header-underline` (animated underline grows on `.in-view`), `.stat-card-hover`, `.stat-card-divider`, `.step-circle-glow`, `.step-connector`/`-vertical`, `.step-done-*`, `.payment-card-hover/glow`, `.cta-shimmer-hover`, `.cta-section-border`, `.cta-animated-bg`, `.faq-card-hover`, `.compare-highlight-cell`, `.hero-gradient-text`, `.announcement-shimmer`, `.badge-gradient`, `.inner-glow`.

### Responsive Typography
- `.text-responsive-sm/base/lg/xl/2xl/3xl` menggunakan `clamp()`.

### Mobile Table-to-Card
- `.mobile-table` collapse `<table>` jadi stacked cards di `max-width: 640px` via `data-label` attribute.

### Accessibility — Reduced Motion
- `@media (prefers-reduced-motion: reduce)` disable ~25 animation classes (hero card, CTA, particles, shimmer, pulse, marquee, dll) tapi preserve essential UI transitions.

---

## 12. UI/UX Patterns

### Layout
- **Sticky footer**: `min-h-screen flex flex-col` + `main flex-1` + footer `mt-auto` (via ConditionalFooter).
- **Mobile bottom nav**: `pb-20 md:pb-0` di main untuk clear bottom nav.
- **Split-screen auth**: hero gradient panel kiri + form card kanan.

### Micro-interactions
- `hover:scale-[1.02] active:scale-[0.98]` di buttons.
- `tap-highlight active-scale` untuk touch feedback.
- Smooth transition di semua interactive elements (`transform 0.15s`, `box-shadow 0.2s`, `bg 0.2s`, `border 0.2s`).
- Mouse-following 3D tilt di hero card (rotateX/Y based on cursor).

### Loading & Feedback
- **Skeleton loaders** untuk semua async content.
- **Toast** (sonner, `position="top-center"`) untuk action feedback.
- **Page loader** (full-screen overlay, fade-out, logo glow + loading bar).
- **Window-focus revalidation** di dashboard untuk data freshness.

### Mobile-First Excellence
- Distinct mobile vs desktop layouts: nav (bottom bar vs top bar), cookie consent (bottom card vs right card), social proof toast (280px vs 320px), WhatsApp FAB (popover vs direct link), testimonials (swipe carousel vs marquee), how-it-works (vertical vs horizontal pipeline).
- iOS safe-area insets dihormati.
- Touch targets minimum (via `mobile-btn` h-12).

### Accessibility
- **Semantic HTML**: `<header>`, `<main>`, `<footer>`, `<nav>`, `<section>`, `<article>`.
- **ARIA**: `aria-label` di icon buttons (theme toggle, scroll-to-top, cookie close, WA button, pagination), `aria-current="page"` di active pagination, `aria-labelledby` di testimonials, `aria-hidden` di decorative.
- **Keyboard nav**: `CitySearch` (Arrow/Enter/Esc), WhatsApp popover (Escape close).
- 38 ARIA/role/reduced-motion references di 17 files.

### Performance Patterns
- `dynamic()` import dengan `ssr: false` untuk below-fold landing sections.
- Module-level cache di `useSiteConfig` (5-min TTL).
- `requestAnimationFrame` throttling untuk scroll listeners.
- `IntersectionObserver` (bukan scroll events) untuk visibility triggers.
- `contain: layout style` di below-fold sections.
- `will-change: transform` di hero card border.
- `generateStaticParams` untuk blog & location SSG.
- `revalidate = 60` di landing page.

---

## 13. Keamanan (Security)

### ✅ Pola Kuat (Strong Patterns)

| # | Pola | Lokasi |
|---|------|--------|
| 1 | **Honeypot anti-bot** (`website`/`honeypot`/`url` fields, fake success untuk bot) | orders POST |
| 2 | **Phone masking** (`0812-XXXX-7890`) | orders/track |
| 3 | **Bank account masking** (`XXXXXX7890`) | orders/track |
| 4 | **Bank holder truncation** (nama depan saja) | orders/track |
| 5 | **Private notes filtering** (strip `[timestamp] Name: msg`) | orders/track |
| 6 | **WhatsApp contact proxy** (phone tidak sampai client) | orders/contact |
| 7 | **Rate limiting** dengan `Retry-After` + `X-RateLimit-Remaining` headers | orders POST, orders/contact, auth/login |
| 8 | **HttpOnly + SameSite=Lax + Secure** session cookies | auth |
| 9 | **bcrypt 12 rounds** + auto-migrate legacy SHA-256 | auth |
| 10 | **Input sanitization suite** (XSS/injection stripping) | orders POST, transactions POST |
| 11 | **CUID format validation** untuk paymentTypeId/partnerId | orders, transactions |
| 12 | **Nominal range validation** (Rp 10K–100M, integer-only) | sanitize |
| 13 | **Partner-scoped queries** (auto-filter by `userId → partner.id`) | transactions, customer stats, testimonials |
| 14 | **Telegram bot token masking** (`'••••••••' + last 4`) | notifications/settings |
| 15 | **Session invalidation on password change** (hapus semua session) | partner password PATCH |
| 16 | **Partner nominal-only edit restriction** (status pending/verification) | transactions PATCH |
| 17 | **Stats reversal on transaction delete** (decr customer + partner counters) | transactions DELETE |
| 18 | **Testimonial maskName** untuk public display (`J***`) | testimonials/public |
| 19 | **Telegram webhook chatId allowlist** (silent drop unauthorized) | telegram/webhook |
| 20 | **Public partner endpoint** minim exposure (hanya `id/name/tier`) | partners/[id]/public |
| 21 | **Auth store tidak trust localStorage** (re-verify ke server setiap mount) | auth-store |
| 22 | **Maintenance mode** dengan always-accessible routes | maintenance-wrapper |

### ⚠️ Kerentanan Kritis (Critical Vulnerabilities)

| # | Kerentanan | Lokasi | Dampak |
|---|------------|--------|--------|
| 1 | **`/api/customers/lookup` PUBLIC** — return PII lengkap (name, phone, bank account, bank holder, city, volume, transaction count) hanya dengan nomor telepon. Preset `CUSTOMER_LOOKUP` ada tapi tidak dipasang | `/api/customers/lookup` | **Privacy leak**: siapa saja bisa enumerasi data customer via phone |
| 2 | **`/api/testimonials/[id]` PATCH/DELETE PUBLIC** — tidak ada auth check | `/api/testimonials/[id]` | Siapa saja bisa approve/feature/delete testimonial by ID |
| 3 | **`/api/telegram/set-webhook` POST/DELETE/GET PUBLIC** — tidak ada auth check | `/api/telegram/set-webhook` | Siapa saja bisa re-register webhook ke URL attacker, disrupt notifikasi |
| 4 | **`/api/auth/register` tanpa rate limit** — preset `PARTNER_REGISTER` ada tapi tidak dipasang | `/api/auth/register` | Brute-force/spam registrasi partner |

### ⚠️ Concern Moderat

| # | Issue | Lokasi |
|---|-------|--------|
| 1 | `/api/customers/[id]` GET/PATCH/DELETE **tanpa ownership check** — partner bisa akses customer partner lain | customers/[id] |
| 2 | `/api/customers/[id]` PATCH **tanpa sanitization** (raw body fields langsung ke DB) | customers/[id] |
| 3 | `/api/seo/faq/[id]` PUT & `/api/seo/location/[slug]` PUT **tanpa field allowlist** (raw body) | seo routes |
| 4 | `/api/partners` POST **hardcode password `'partner123'`** (seharusnya `generateRandomPassword()`) | partners POST |
| 5 | `/api/orders/track` **tanpa rate limit** (bisa brute-force order ID, meski ID punya random hex entropy) | orders/track |
| 6 | **In-memory rate limiter** reset saat server restart — tidak ideal untuk multi-instance | rate-limit.ts |
| 7 | **`viewport` `userScalable: false`** — melanggar WCAG 1.4.4 (text resize) | layout.tsx |
| 8 | **`lokasi/[slug]/client.tsx` pakai `dangerouslySetInnerHTML`** untuk `location.content` — sanitasi server-side harus diverifikasi | lokasi/[slug]/client.tsx |
| 9 | **WhatsApp number hardcode** fallback `628551110023` di multiple files | maintenance, whatsapp-fab, dll |
| 10 | **`framer-motion` terpasang tapi tidak dipakai** — dependency dead weight | package.json |

---

## 14. SEO & Performa

### SEO
- **Per-page `generateMetadata`** (server-side) untuk semua dynamic route.
- **Rich OpenGraph + Twitter cards** dengan locale `id_ID`, custom OG images.
- **Multiple JSON-LD blocks**: `FinancialService`, `FAQPage`, `BreadcrumbList`, `ItemList`, `LocalBusiness`, `BlogPosting`.
- **Comprehensive Indonesian keyword arrays**: gestun, tarik tunai, BCA, GoPay Paylater, Shopee Paylater, Akulaku Paylater, COD, + nama kota.
- **`robots.ts`** dengan bot-specific rules (Googlebot, Bingbot).
- **`sitemap.ts`** dengan image sitemap support, priority 0.7–1.0, changeFrequency per page type.
- **SSG** (`generateStaticParams`) untuk blog & lokasi.
- **`revalidate = 60`** di landing page.

### Performa
- Dynamic import (`ssr: false`) untuk below-fold sections.
- Module-level cache (5-min TTL) di `useSiteConfig`.
- `requestAnimationFrame` throttling.
- `IntersectionObserver` (bukan scroll events).
- `contain: layout style` di below-fold.
- `will-change: transform` di hero card.
- Window-focus revalidation di dashboard.
- Image sitemap untuk gambar blog/lokasi.

---

## 15. Deployment

### Target: Vercel + Neon (PostgreSQL)

**Alur deploy** (dari `DEPLOYMENT.md`):
1. Setup Neon database (region Singapore).
2. Push ke GitHub.
3. Import ke Vercel, set env vars:
   - `DATABASE_URL=postgresql://...?sslmode=require`
   - `NEXTAUTH_SECRET` (32 char random)
   - `NEXTAUTH_URL=https://your-app.vercel.app`
4. Klik Deploy — **prebuild.ts otomatis**: swap schema → Postgres, generate client, db push, seed.

**Sandbox/dev** (current):
- `DATABASE_URL=file:/home/z/my-project/db/custom.db` (SQLite)
- Gateway: Caddy `:81` → `:3000` (+ `XTransformPort` query untuk mini-services)
- `bun run dev` (Turbopack, port 3000)

### Build Output
- `output: "standalone"` → `.next/standalone/server.js` (Node production).
- Build script copy `.next/static` + `public/` ke standalone dir.

---

## 16. Kerentanan & Rekomendasi

### Prioritas KRITIS (segera)

1. **Tambah auth ke `/api/testimonials/[id]` PATCH/DELETE** (owner-only).
2. **Tambah auth ke `/api/telegram/set-webhook`** semua verb (owner-only).
3. **Tambah auth ke `/api/customers/lookup`** (owner/partner) ATAU batasi field yang direturn (non-PII). Pasang `RATE_LIMITS.CUSTOMER_LOOKUP`.

### Prioritas TINGGI

4. **Pasang `RATE_LIMITS.PARTNER_REGISTER`** di `/api/auth/register`.
5. **Tambah partner-ownership verification** di `/api/customers/[id]` GET/PATCH/DELETE.
6. **Tambah sanitasi** (`sanitizeName`/`sanitizePhone`/dll) di `/api/customers/[id]` PATCH.

### Prioritas SEDANG

7. **Gunakan `generateRandomPassword()`** di `/api/partners` POST alih-alih hardcode `'partner123'`.
8. **Tambah field allowlist** di `/api/seo/faq/[id]` PUT & `/api/seo/location/[slug]` PUT.
9. **Verifikasi sanitasi HTML** untuk `location.content` sebelum `dangerouslySetInnerHTML`.

### Prioritas RENDAH

10. **Tambah rate limit** di `/api/orders/track` (preset `GENERAL_API`).
11. **Pertimbangkan Redis** untuk rate-limit state (multi-instance).
12. **Re-enable user scaling** di viewport (hapus `userScalable: false`, `maximumScale: 1`) — WCAG 1.4.4.
13. **Hapus `framer-motion`** dari dependency (tidak dipakai).
14. **Selesaikan migrasi** dari legacy `useToast` ke `sonner`.
15. **Konsolidasi** 2 komponen map (`MapProvider` + `AnalyticsBubbleMap`).
16. **Pindahkan inline `<style jsx>`** keyframes ke `globals.css` untuk konsistensi.

---

## Lampiran A: Statistik Codebase

| Metrik | Nilai |
|--------|-------|
| Total route files | 50 |
| Total komponen | 67 (51 ui + 11 shared + 13 landing + 2 map + 4 seo) |
| Total hooks | 6 |
| Total lib modules | 11 |
| Total prisma models | 16 |
| globals.css | 2,019 baris |
| Landing page | 1,348 baris |
| Owner dashboard utama | 2,306 baris |
| Partner dashboard utama | 1,100 baris |
| Custom keyframes | 40+ |
| Public endpoints | 17 |
| Owner-only endpoints | 22 |
| Partner-or-owner endpoints | 19 |
| Partner-only endpoints | 4 |
| Rate-limited endpoints | 3 (target: 5+) |
| shadcn/ui components | 51 + 2 custom |
| Dependencies (prod) | ~40 |

---

## Lampiran B: Default Credentials & Config

| Item | Nilai |
|------|-------|
| Owner email | `owner@blackbear.id` |
| Owner password | `owner123` |
| Partner email | `partner@blackbear.cc` |
| Partner password | `partner123` |
| Default commission | 30% |
| Default target | Rp 5.000.000 |
| Default tier | Bronze |
| Default badge | Newbie |
| Default status | active |
| Session expiry | 7 hari |
| Password min length | 8 karakter |
| Nominal range | Rp 10.000 – 100.000.000 |
| WhatsApp fallback | `628551110023` |
| Site URL default | `https://blackbear.cc` |
| Telegram bot token | dari `NotificationSettings` (di-mask di API) |

---

*Dokumen ini dihasilkan dari scan otomatis terhadap codebase pada tanggal generate. Untuk detail terbaru, rujuk langsung ke source code.*
