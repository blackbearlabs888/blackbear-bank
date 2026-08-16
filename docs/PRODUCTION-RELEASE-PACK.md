# BLACK BEAR — PRODUCTION RELEASE PACK

> Siapkan Black Bear agar dapat dirilis manual ke Vercel + Neon PostgreSQL.
> Tugas ini BUKAN audit dan BUKAN feature development. Tidak ada deploy, tidak
> ada akses database production, tidak ada `db push` / `migrate` / `seed`.

---

## 0. RELEASE STATUS

| Item | Status |
|------|--------|
| Phase 1–5 selesai | ✅ 208/208 tests PASS (807 expect() calls, 8 files) |
| ESLint | ✅ 0 errors, 0 warnings |
| Prisma schema SQLite (`schema.sqlite.prisma`) | ✅ valid |
| Prisma schema PostgreSQL (`schema.postgres.prisma`) | ✅ valid + generate client sukses |
| Non-mutating production build | ✅ exit 0, 0 db mutation |
| Schema sync Phase 2 + Phase 5 (SQLite ↔ PostgreSQL) | ✅ sinkron (hanya beda tipe Float/Decimal + 3 index tambahan di PG) |
| Aplikasi render (SSR + endpoint) | ✅ health/ready/robots/sitemap 200, landing HTML ter-render |
| Migration history (`prisma/migrations/`) | ❌ TIDAK ADA — repo menggunakan `db push` sejak awal |
| PostgreSQL runtime (live connection) | ⚠ Belum diuji oleh GLM (hanya static validate + generate) |

**Final verdict: `MIGRATION BASELINE REQUIRED`**

Aplikasi, schema, build pipeline, environment manifest, smoke tests, dan rollback
procedure SUDAH siap. Satu-satunya blocker: **tidak ada migration history**.
Repositori selalu menggunakan `prisma db push` untuk SQLite development, sehingga
`prisma/migrations/` tidak pernah dibuat. Sebelum `prisma migrate deploy` dapat
berjalan terhadap Neon PostgreSQL, sebuah **migration baseline** harus dibuat
terlebih dahulu terhadap database production — operasi yang TIDAK boleh
dijalankan oleh GLM (tidak ada akses DB production, tidak boleh mendeploy).

---

## 1. MIGRATION PACKAGE

### 1.1 Temuan

```
prisma/
├── schema.prisma           ← active (SQLite, repo default; di-swap oleh prebuild)
├── schema.prisma.bak       ← backup dari prebuild sebelumnya
├── schema.sqlite.prisma    ← sumber untuk development (SQLite)
└── schema.postgres.prisma  ← sumber untuk production (PostgreSQL/Neon)
```

- **Tidak ada direktori `prisma/migrations/`.**
- **Tidak ada satu pun file `.sql`** di seluruh repo (di luar `node_modules`).
- Tidak ada `migration_lock.toml`.
- Konsekuensi: `prisma migrate deploy` akan menganggap tidak ada migration untuk
  diaplikasikan dan TIDAK membuat schema apa pun. Database Neon yang kosong akan
  tetap kosong; database Neon yang sudah berisi tabel (dari `db push` masa lalu)
  akan dibiarkan apa adanya — tanpa rekam jejak migration yang terverifikasi.

### 1.2 Cakupan yang HARUS dimiliki migration PostgreSQL (setelah baseline dibuat)

Verifikasi statis terhadap `schema.postgres.prisma` mengonfirmasi field/model
berikut sudah ada dan siap untuk di-migrate:

**Phase 2 — Transaction Snapshot + Idempotency** (model `Transaction` / tabel `transactions`):
- `partnerCommissionPercent  Decimal?` — snapshot komisi partner
- `paymentTypeName           String?`  — snapshot nama PaymentType
- `marketplaceName           String?`  — snapshot nama Marketplace
- `feeConfigSnapshot         String?`  — JSON config fee saat kalkulasi
- `calculationVersion        Int  @default(0)` — 0=legacy, 1=Phase 2 (default aman untuk legacy)
- `idempotencyKey            String? @unique` — replay key (UNIQUE constraint)
- `idempotencyHash           String?`  — SHA-256 payload

**Phase 5 — Anti-Fraud & Commission Protection** (model `Transaction`):
- `fraudRiskScore            Int      @default(0)`
- `fraudRiskLevel            String   @default("low")`
- `fraudStatus               String   @default("clear")`
- `fraudReasons              String?`
- `commissionStatus          String   @default("pending")`
- `commissionApprovedAmount  Decimal  @default(0)`
- `fraudReviewedAt           DateTime?`
- `fraudReviewedBy           String?`
- `fraudReviewNote           String?`
- `@@index([fraudStatus])`
- `@@index([commissionStatus])`

**Phase 5 — FraudReviewEvent** (model baru, tabel `fraud_review_events`):
- Field: `id, transactionId, partnerId?, action, previousStatus?, newStatus,
  riskScore, reasons?, actorType, actorId?, note?, createdAt`
- Relasi: `transaction Transaction @relation(...) onDelete: Cascade`
- Index: `@@index([transactionId])`, `@@index([partnerId])`, `@@index([action])`, `@@index([createdAt])`

**Index tambahan khusus PostgreSQL** (tidak ada di SQLite, additive):
- `Partner: @@index([status])`, `@@index([tier])`
- `Transaction: @@index([createdAt])`

### 1.3 Sifat additive — VERIFIED

Semua perubahan schema bersifat **murni additive**:
- `ADD COLUMN` (dengan `@default` atau nullable → legacy row aman)
- `CREATE TABLE` (`fraud_review_events`)
- `CREATE INDEX` / `CREATE UNIQUE INDEX` (`idempotencyKey`, `fraudStatus`, `commissionStatus`, dll)
- `ADD FOREIGN KEY` (`fraud_review_events.transactionId → transactions.id`)

**Tidak ada operasi destruktif**: tidak ada `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`,
`DELETE`/`UPDATE` massal, destructive type conversion, default credential, seed,
atau perubahan data transaksi lama. Legacy rows default-safe
(`fraudStatus='clear'`, `commissionStatus='pending'`, `calculationVersion=0`).

### 1.4 Kewajiban baseline — `MIGRATION BASELINE REQUIRED`

Karena repo tidak memiliki migration history yang valid (selalu `db push`):

> **Jangan mengarang baseline.** GLM TIDAK membuat file migration fiktif.
> GLM TIDAK menjalankan `prisma migrate dev` / `migrate deploy` / `db push`
> terhadap database apa pun. Instruksi berikut bersifat manual untuk dieksekusi
> oleh owner/DBA terhadap Neon production.

#### Prosedur manual baseline (pilih salah satu sesuai kondisi Neon)

**Pra-syarat** (di mesin lokal owner, BUKAN oleh GLM):
```bash
# 1. Clone repo, install deps
git clone <repo> blackbear && cd blackbear
bun install                       # postinstall menjalankan `prisma generate`

# 2. Set DATABASE_URL Neon production (dengan sslmode=require)
export DATABASE_URL="postgresql://USER:PASS@ep-XXX.neon.tech/blackbear?sslmode=require"
```

**Skenario A — Neon KOSONG (belum ada tabel sama sekali):**
```bash
# Buat migration pertama dari schema PostgreSQL, lalu apply.
# `migrate dev` membutuhkan shadow database (Neon free tier menyediakannya).
npx prisma migrate dev --schema=prisma/schema.postgres.prisma --name init
# Ini membuat prisma/migrations/<timestamp>_init/migration.sql DAN mengaplikasikannya.
```

**Skenario B — Neon SUDAH berisi tabel (dari `db push` masa lalu):**
```bash
# 1. Buat migration SQL dari diff antara DB Neon saat ini vs schema PostgreSQL.
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.postgres.prisma \
  --to-schema-datamodel prisma/schema.postgres.prisma \
  --script > /tmp/drift.sql
# Tinjau /tmp/drift.sql. Jika kosong/kecil → schema sudah sinkron.
# Jika ada perbedaan → review manual sebelum lanjut.

# 2. Buat baseline migration kosong dan tandai sebagai "sudah teraplikasi".
mkdir -p prisma/migrations/0_init
echo "-- Baseline: schema already applied via db push. Migration history starts here." \
  > prisma/migrations/0_init/migration.sql
npx prisma migrate resolve --schema=prisma/schema.postgres.prisma --applied 0_init

# 3. (Opsional) Jika drift.sql menunjukkan kolom/index yang belum ada,
#    buat migration tambahan dan apply:
#    npx prisma migrate dev --schema=prisma/schema.postgres.prisma --name add_fraud_fields
```

> Catatan: `prisma migrate diff --from-schema-datasource` MEMERLUKAN koneksi ke
> Neon (read-only, tidak mutate). Ini diizinkan untuk owner/DBA, BUKAN untuk GLM.

#### Verifikasi migration setelah baseline

Setelah baseline selesai, jalankan (oleh owner):
```bash
npx prisma migrate status --schema=prisma/schema.postgres.prisma
# Harus menampilkan: "Database schema is up to date" (atau daftar migration applied).
```

---

## 2. POSTGRESQL STATIC RELEASE CHECK

Dijalankan oleh GLM **tanpa koneksi database** (dummy URL):

| Check | Hasil |
|-------|-------|
| `prisma validate --schema=prisma/schema.postgres.prisma` (dummy `postgresql://` URL) | ✅ valid (exit 0, no error) |
| `prisma generate --schema=prisma/schema.postgres.prisma` (dummy URL) | ✅ "✔ Generated Prisma Client (v6.19.2) to ./node_modules/@prisma/client" |
| Client SQLite di-restore setelahnya (`prisma generate` default) | ✅ dev state utuh, 208/208 tests pass |
| `prebuild.ts` memilih PostgreSQL saat `VERCEL=1` | ✅ code-verified (lihat 2.1) |
| Non-mutating production build (`bun run build`, config SQLite) | ✅ exit 0, prebuild log "no database mutation performed", 0 occurrence db push/migrate/seed/DROP/TRUNCATE |
| Schema sync Phase 2 + Phase 5 (SQLite ↔ PostgreSQL) | ✅ sinkron (lihat 2.2) |

### 2.1 VERCEL=1 → PostgreSQL schema (code-verified)

`prebuild.ts` baris 57–64:
```ts
function isProductionPostgres(): boolean {
  const dbUrl = process.env.DATABASE_URL || '';
  return (
    dbUrl.startsWith('postgresql://') ||
    dbUrl.startsWith('postgres://') ||
    process.env.VERCEL === '1'
  );
}
```
Saat `VERCEL=1` (atau `DATABASE_URL` berawalan `postgresql://`), prebuild:
1. Membackup `schema.prisma` → `schema.prisma.bak`
2. Meng-copy `schema.postgres.prisma` → `schema.prisma`
3. Menjalankan `npx prisma generate` (regenerate client sebagai PostgreSQL)
4. **TIDAK** menjalankan `db push` / `migrate` / `seed`

Pada Vercel, urutan eksekusi build:
1. `install` → `postinstall` script `prisma generate` (dari committed `schema.prisma` = SQLite; hasil ini kemudian ditimpa)
2. `build` → `prebuild` (swap ke PostgreSQL + regenerate) → `next build` (menggunakan client PostgreSQL) → `cp` static/public ke standalone
3. Hasil: standalone build mengandung Prisma Client PostgreSQL. ✅

### 2.2 Schema sync (semantic diff)

Satu-satunya perbedaan semantik antara `schema.sqlite.prisma` dan `schema.postgres.prisma`:
1. `provider`: `sqlite` vs `postgresql` (expected)
2. Tipe monetary: `Float` (SQLite) vs `Decimal` (PostgreSQL) — intentional; runtime dinormalisasi via `toNumber()` di `src/lib/db.ts`
3. Tiga index tambahan di PostgreSQL: `Partner.@@index([status])`, `Partner.@@index([tier])`, `Transaction.@@index([createdAt])` — additive, positif untuk production

Semua field Phase 2 (snapshot + idempotency), field Phase 5 (fraud + commission),
model `FraudReviewEvent`, relasi `fraudEvents`, `idempotencyKey @unique`, dan
`calculationVersion @default(0)` hadir identik di kedua schema. ✅

---

## 3. ENVIRONMENT MANIFEST

Diturunkan dari grep `process.env.*` terhadap seluruh `src/`. **Tidak ada nilai
secret yang ditampilkan.** Variabel dokumentasi yang ternyata tidak digunakan
source telah dihapus dari manifest ini.

### 3.1 Production (wajib di-set di Vercel Project → Settings → Environment Variables)

| Variable | Required | Set by | Digunakan oleh source | Catatan |
|----------|----------|--------|----------------------|---------|
| `DATABASE_URL` | **REQUIRED** | Owner (Neon) | `prisma/schema.prisma` datasource, `prebuild.ts` detection | `postgresql://USER:PASS@ep-XXX.neon.tech/blackbear?sslmode=require`. WAJIB `sslmode=require`. |
| `NODE_ENV` | auto | Vercel (= `production`) | `middleware.ts`, `lib/auth`, `lib/db`, `telegram/*` routes | Jangan set manual; Vercel set otomatis. |
| `VERCEL` | auto | Vercel (= `1`) | `prebuild.ts` (pemilih schema PostgreSQL) | Jangan set manual; Vercel set otomatis. |
| `TELEGRAM_WEBHOOK_SECRET` | **REQUIRED** | Owner (generate) | `api/telegram/set-webhook/route.ts`, `api/telegram/webhook/route.ts | Random string ≥ 32 char. Divalidasi via header `X-Telegram-Bot-Api-Secret-Token`. Tanpa ini, webhook production menolak SEMUA request. |
| `NEXT_PUBLIC_SITE_URL` | optional | Owner | ~30 file (canonical URL, sitemap, JSON-LD, OG) | Default `https://blackbear.cc`. **Direkomendasikan set** ke `https://blackbear.cc`. |

### 3.2 Production (opsional, fitur tambahan)

| Variable | Required | Digunakan oleh source | Catatan |
|----------|----------|----------------------|---------|
| `NEXT_PUBLIC_WA_NUMBER` | optional | `app/faq/client.tsx` | Nomor WhatsApp tampil di FAQ. Default `6281234567890` (placeholder). Set ke nomor WhatsApp Black Bear yang sebenarnya. |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | optional | `app/layout.tsx` | Meta verification Google Search Console. Kosongkan jika tidak dipakai. |

### 3.3 DILARANG di production

| Variable | Alasan |
|----------|--------|
| `TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV` | Flag dev-only. Jika di-set `=true` di production, webhook Telegram menerima request TANPA secret — **bypass keamanan**. Hanya boleh di `.env` development. |

### 3.4 Variabel dokumentasi yang TIDAK digunakan source (dihapus dari manifest)

Berikut muncul di `DEPLOYMENT.md` lama tetapi **tidak direferensikan** oleh kode
sumber mana pun (diverifikasi via grep `next-auth`/`nextauth`/`getServerSession` →
0 hit; package `next-auth` tidak ada di `package.json`):

- `NEXTAUTH_SECRET` — tidak digunakan (autentikasi memakai bcrypt + session tabel custom, bukan NextAuth)
- `NEXTAUTH_URL` — tidak digunakan (source memakai `NEXT_PUBLIC_SITE_URL`)
- `NEXT_PUBLIC_APP_URL` — tidak digunakan (source memakai `NEXT_PUBLIC_SITE_URL`)

> ⚠ `DEPLOYMENT.md` di repo sudah **outdated** sejak Phase 1.2. Dokumen itu
> mengklaim build otomatis menjalankan `db push` + seed + membuat default owner
> `owner@blackbear.id`/`owner123` — semua itu **SALAH** (build sudah non-mutating
> sejak Phase 1.2; tidak ada seed di build; tidak ada default owner yang
> terbuat). **Rilis ini berpedoman pada `PRODUCTION-RELEASE-PACK.md`, bukan
> `DEPLOYMENT.md`.** `DEPLOYMENT.md` sebaiknya diperbarui/dihapus di luar scope
> release pack ini.

---

## 4. RELEASE ORDER (checklist manual)

Migration dijalankan **sebelum** code karena perubahan bersifat additive dan code
baru membutuhkan kolom baru (fraud/commission fields) agar tidak error saat baca
`Transaction` row baru.

```
[ ] A. Backup Neon production.
        - Neon Console → Project → Branches → Create branch "pre-release-backup-<date>"
        - ATAU: Neon Console → Restore → create restore point
        - Catat timestamp backup.

[ ] B. Simpan current Vercel deployment sebagai rollback point.
        - Vercel Dashboard → Project → Deployments → tandai deployment saat ini
          (paling recent Production) → "Promote to Production" sudah dicatat.
        - Salin URL deployment lama (mis. blackbear-xxx.vercel.app) sebagai
          rollback target.

[ ] C. Verifikasi migration SQL (setelah baseline dari §1.4 selesai).
        - Baca setiap file di prisma/migrations/*/migration.sql.
        - Pastikan hanya: ADD COLUMN / CREATE TABLE / CREATE [UNIQUE] INDEX / ADD FOREIGN KEY.
        - Pastikan TIDAK ada: DROP / TRUNCATE / DELETE / UPDATE / seed.

[ ] D. Apply migration dengan prisma migrate deploy.
        export DATABASE_URL="postgresql://...@ep-XXX.neon.tech/blackbear?sslmode=require"
        npx prisma migrate deploy --schema=prisma/schema.postgres.prisma
        (JANGAN gunakan `migrate dev` di production — butuh shadow DB & bisa reset.)

[ ] E. Verifikasi migration berhasil.
        npx prisma migrate status --schema=prisma/schema.postgres.prisma
        - Harus: "Database schema is up to date".
        - Neon Console → Tables → pastikan tabel `fraud_review_events` ada,
          kolom `fraudStatus`/`commissionStatus`/`calculationVersion` ada di `transactions`.

[ ] F. Deploy application code.
        - Push commit ke branch `main` (atau trigger Vercel redeploy).
        - Vercel build: prebuild swap ke PostgreSQL schema → prisma generate → next build.
        - Pastikan Vercel Project Settings → Environment Variables sesuai §3.
        - Tunggu hingga status deployment "Ready".

[ ] G. Jalankan smoke tests (§5).

[ ] H. Re-register Telegram webhook dengan secret.
        - Set TELEGRAM_WEBHOOK_SECRET di Vercel env (jika belum).
        - Owner login → Dashboard → Settings → (atau panggil API set-webhook)
          re-register webhook URL: https://blackbear.cc/api/telegram/webhook
          dengan header secret.
        - Konfirmasi: Telegram getWebhookInfo → secret_token ter-set.

[ ] I. Pantau logs dan readiness.
        - Vercel Dashboard → Functions Logs → pantau 15–30 menit pertama.
        - curl https://blackbear.cc/api/health → 200
        - curl https://blackbear.cc/api/ready → 200
        - Neon Console → Metrics → pantau connection / query.

[ ] J. Rollback jika blocker ditemukan (§7).
```

---

## 5. SMOKE TEST CHECKLIST

Dijalankan oleh user **setelah** deploy manual ke `https://blackbear.cc`.

### 5.1 Public

- [ ] `GET https://blackbear.cc/` → 200, landing page render (hero, calculator, cities)
- [ ] `GET /api/health` → 200, `{ "status": "alive" }`
- [ ] `GET /api/ready` → 200, `{ "status": "ready" }`
- [ ] Buat order publik (form order) → sukses, dapat order ID
- [ ] Idempotency retry: ulang request order dengan `Idempotency-Key` sama → menghasilkan transaksi yang sama (transactionId identik, bukan duplikat)
- [ ] Order tracking (`/track?orderId=...`) → status transaksi tampil
- [ ] Customer data tidak bocor: response order/track tidak mengandung phone/rekening customer lain

### 5.2 Owner

- [ ] Login owner → dashboard render
- [ ] Dashboard: stats, grafik, activity feed tampil
- [ ] Create transaction (sebagai owner, assign partner) → sukses, fraud field ter-isi
- [ ] Update transaction (status, nominal, marketplace) → sukses, stats ter-update
- [ ] Fraud Review page (`/owner/dashboard/fraud-review`) → list flagged transactions, risk badge, masked PII
- [ ] Approve fraud case → commission jadi "approved", stats partner naik
- [ ] Reject fraud case → commission jadi "rejected", stats partner (jika sebelumnya approved) turun
- [ ] Partner management (`/owner/dashboard/partners`) → list, create, edit, suspend/activate
- [ ] Reconciliation endpoint `GET /api/admin/reconcile` → 200, daftar MATCH/DRIFT per partner

### 5.3 Partner

- [ ] Login partner → dashboard render
- [ ] Create transaction (sebagai partner) → sukses
- [ ] Partner HANYA melihat customer/transaksi miliknya (403/empty untuk milik partner lain)
- [ ] Commission status tampil: kartu "Status Komisi Saya" menampilkan 4 status (Diproses/Disetujui/Ditahan/Ditolak) dengan count + amount benar
- [ ] Partner TIDAK melihat fraud score / rule codes (hanya commission status)

### 5.4 Telegram

- [ ] Request ke `/api/telegram/webhook` TANPA header `X-Telegram-Bot-Api-Secret-Token` → 401 (ditolak)
- [ ] Set webhook (`POST /api/telegram/set-webhook` atau via owner UI) → 200, webhook ter-register di Telegram
- [ ] Notifikasi transaksi baru terkirim ke chat owner
- [ ] Bot command `/status` → membalas status transaksi terbaru
- [ ] Bot command `/nominal` → mengubah nominal transaksi
- [ ] Bot command `/mp` → mengubah marketplace transaksi
- [ ] Bot command `/catatan` → APPEND catatan (tidak overwrite), dengan timestamp + marker [Owner]
- [ ] Telegram failure (mis. chat id salah) TIDAK rollback transaksi (fail-after-commit pattern)

---

## 6. DATA SAFETY

DILARANG selama dan setelah release:

- ❌ Mengubah transaksi legacy (field fraud/snapshot dibiarkan default; tidak ada backfill)
- ❌ Backfill `fraudRiskScore` / `fraudStatus` / `fraudReasons` pada row lama
- ❌ Backfill `feeConfigSnapshot` / `calculationVersion` pada row lama
- ❌ Approve pending commission secara massal (hanya via owner review manual per-case)
- ❌ Menjalankan reconciliation auto-fix (endpoint `/api/admin/reconcile` bersifat READ-ONLY)
- ❌ Membuat owner/default password via seed atau script
- ❌ Menjalankan development seed (`db:seed:dev`) terhadap production
- ❌ Menjalankan `prisma db push` terhadap Neon production (gunakan `migrate deploy` saja)

Legacy rows aman secara default:
- `fraudStatus = 'clear'`, `commissionStatus = 'pending'`, `calculationVersion = 0`,
  `idempotencyKey = NULL`, semua snapshot field = NULL.

---

## 7. ROLLBACK

Dua lapis rollback, **database TIDAK di-rollback otomatis**.

### 7.1 Application rollback (lapis 1 — selalu aman)

```
Jika code baru bermasalah setelah deploy:
1. Vercel Dashboard → Deployments → pilih deployment STABLE sebelumnya (rollback point §4.B)
2. "..." → "Redeploy" / "Promote to Production"
3. Aplikasi kembali ke code lama dalam < 2 menit.
4. Kolom baru (fraud/commission) tetap ada di DB tetapi TIDAK dibaca oleh code lama → aman.
```

### 7.2 Database rollback (lapis 2 — HANYA manual, setelah backup + review)

```
Karena migration bersifat ADDITIVE:
- Default: JANGAN drop column/table baru. Biarkan saja.
  Code lama mengabaikan kolom fraud/commission → tidak ada dampak.

- Jika (dan hanya jika) kolom baru menyebabkan konflik nyata yang terbukti:
  1. Backup Neon (full dump) terlebih dahulu.
  2. Review manual: kolom mana yang harus di-drop.
  3. Buat migration DOWN eksplisit (DROP COLUMN ...) — JANGAN auto-generate.
  4. Apply secara manual dengan review DBA.

- TRUNCATE / DROP TABLE tidak pernah dibenarkan untuk rollback.
```

### 7.3 Telegram webhook rollback

```
Jika webhook baru bermasalah:
1. Telegram Bot API → deleteWebhook (bot berhenti menerima update via webhook)
2. Atau re-point webhook ke deployment lama.
3. Transaksi yang sudah commit TIDAK di-rollback (fail-after-commit).
```

---

## 8. KNOWN LIMITATIONS

1. **PostgreSQL runtime belum diuji oleh GLM.** GLM hanya melakukan static
   validation (`prisma validate`) + client generation (`prisma generate`) dengan
   dummy URL. Tidak ada live koneksi ke PostgreSQL/Neon. Query runtime, Decimal
   precision, dan connection pooling belum diuji secara empiris oleh GLM. Smoke
   test §5 (oleh user pasca-deploy) merupakan verifikasi runtime pertama.

2. **MIGRATION BASELINE REQUIRED.** Repo tidak memiliki `prisma/migrations/`.
   Baseline harus dibuat owner/DBA terhadap Neon sebelum `migrate deploy`
   berfungsi (§1.4). GLM tidak menjalankannya.

3. **`DEPLOYMENT.md` outdated.** Mengklaim auto `db push` + seed + default owner
   — semua salah sejak Phase 1.2. Release pack ini menggantikan pedoman tersebut.
   `DEPLOYMENT.md` sebaiknya diperbarui/dihapus di luar scope.

4. **`next.config.ts` mengaktifkan `typescript.ignoreBuildErrors: true`.** Build
   tidak gagal pada type error. (Tidak ditemukan type error blocking saat
   verifikasi; ESLint clean. Namun ini melemahkan gate type-safety pada build
   Vercel.)

5. **`prebuild` berjalan dua kali** saat `bun run build` (lifecycle hook
   `prebuild` + pemanggilan eksplisit di script `build`). Harmless — keduanya
   non-mutating. Redundansi saja.

6. **`prebuild` tidak me-restore `schema.prisma`** setelah build `VERCEL=1`
   lokal. Developer yang menjalankan `VERCEL=1 bun run build` di mesin lokal
   harus me-restore `schema.prisma` ke versi SQLite sebelum commit (atau jangan
   commit `schema.prisma` yang tertinggal sebagai PostgreSQL). Pada Vercel ini
   tidak menjadi masalah (setiap build fresh dari repo).

7. **Test hygiene gap (non-blocking, backlog):** `tests/transaction/phase5-fraud.test.ts`
   test D4 membuat partner2 tetapi tidak membersihkan user/partner-nya di
   `afterAll`. Menjalankan test file berulang kali terhadap dev DB yang sama
   menyebabkan unique-constraint failure pada run ke-2+. Bukan regression kode;
   hanya berdampak pada eksekusi test berulang. 208/208 pass tercapai setelah
   orphan di-clean.

8. **Pre-existing `customer-utils.ts:139`** menggunakan `mode: "insensitive"`
   yang tidak didukung SQLite (ditangkap try/catch, fallback ke create new
   customer). Ada sejak Phase 2, non-blocking, di backlog. Pada PostgreSQL
   (production) `mode: "insensitive"` didukung secara native → tidak menjadi
   masalah di production.

---

## VERIFICATION EVIDENCE (GLM, non-mutating)

| Verification | Command | Result |
|--------------|---------|--------|
| PostgreSQL schema valid | `DATABASE_URL=postgresql://dummy:dummy@ep-dummy.neon.tech/dummy?sslmode=require npx prisma validate --schema=prisma/schema.postgres.prisma` | exit 0, no error |
| PostgreSQL client generates | `... npx prisma generate --schema=prisma/schema.postgres.prisma` | "✔ Generated Prisma Client (v6.19.2)" |
| SQLite client restored | `npx prisma generate` (default schema.prisma) | active client = SQLite engine |
| Non-mutating build | `bun run build` (SQLite .env) | exit 0; prebuild log "no database mutation performed"; 0 hit `db push\|migrate\|seed\|DROP\|TRUNCATE` |
| Schema sync | `diff -w` SQLite vs PostgreSQL (strip comments) | hanya provider + Float/Decimal + 3 index PG tambahan |
| Test suite | `bun test tests/` | 208 pass / 0 fail / 807 expect() / 8 files |
| ESLint | `bun run lint` | 0 errors, 0 warnings |
| App render | `curl /` + `curl /api/health` + `/api/ready` + `/robots.txt` + `/sitemap.xml` | 200; SSR contains "Black Bear", "Gestun", "Order Sekarang", "Tarik Tunai"; `/login` noindex,nofollow |

---

## FINAL VERDICT

# `MIGRATION BASELINE REQUIRED`

- ✅ Application code, schemas (SQLite + PostgreSQL), build pipeline, environment
  manifest, smoke test checklist, dan rollback procedure: **READY**.
- ⚠ Satu blocker: **migration history tidak ada**. Baseline harus dibuat oleh
  owner/DBA terhadap Neon PostgreSQL (§1.4) sebelum `prisma migrate deploy`
  dapat berfungsi. GLM tidak menjalankannya (tidak ada akses DB production).
- ⚠ PostgreSQL runtime belum diuji secara empiris oleh GLM (limitation §1).

Setelah baseline migration dibuat dan di-apply (§1.4 → §4.D), lanjutkan urutan
release §4.E–§4.J, kemudian smoke tests §5.

Tidak ada phase remediation baru. Tidak ada audit tambahan.
