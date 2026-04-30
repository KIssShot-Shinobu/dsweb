# DSWeb Developer Detail

Dokumen ini berisi detail untuk kebutuhan development dan operasional.

## 1) Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4 + DaisyUI
- Prisma 7
- PostgreSQL (`@prisma/adapter-pg` + `pg`)
- Auth.js
- Zod

## 2) Struktur Penting

- `app/` halaman + route API
- `app/dashboard/*` area dashboard
- `components/*` komponen UI
- `lib/prisma.ts` Prisma client tunggal
- `lib/auth.ts` auth helper
- `lib/validators.ts` validasi request
- `prisma/schema.prisma` skema database

## 3) Setup Dev

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Build/test:

```bash
npm run build
npm run test:unit
npm run test:integration
npm test
```

## 4) Variabel Sensitif (Wajib via `.env`)

Jangan isi nilai asli di dokumentasi/public channel.

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_DISCORD_ID`
- `AUTH_DISCORD_SECRET`
- `DATA_ENCRYPTION_KEY`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `SMTP_USER`
- `SMTP_PASS`
- `CRON_SECRET`
- `ADMIN_SEED_PASSWORD`

## 5) Variabel Konfigurasi Utama

- `NEXT_PUBLIC_APP_URL`
- `R2_ENABLED`
- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`
- `UPLOAD_DIR`
- `MAX_FILE_SIZE`
- `RATE_LIMIT_ENABLED`
- `RATE_LIMIT_TOURNAMENT_REGISTER_MAX`
- `RATE_LIMIT_TOURNAMENT_REGISTER_WINDOW_SECONDS`
- `RATE_LIMIT_MATCH_REPORT_MAX`
- `RATE_LIMIT_MATCH_REPORT_WINDOW_SECONDS`
- `PRISMA_MIGRATE_STRATEGY`

## 6) Seeding

Admin seed:

```bash
node scripts/seed-admin.js
```

Dev dataset (reset + sample data):

```bash
node scripts/seed.mjs
```

## 7) Migrasi Prisma

Default production:

```bash
npx prisma migrate deploy
```

Untuk local/dev cepat (hanya jika aman):

```bash
npx prisma db push
```

## 8) API Area (Ringkas)

- Auth: `/api/auth/*`
- Tournament: `/api/tournaments/*`
- Match: `/api/matches/*`
- Team: `/api/team/*`, `/api/teams/*`
- Notifications: `/api/notifications*`
- Treasury: `/api/treasury*`
- Upload: `/api/upload`, `/api/upload/public`

## 9) Deploy Singkat

- Pastikan semua env sudah terisi.
- Jalankan preflight: `npm run db:preflight`.
- Ikuti runbook: `docs/runbook-staging-production.md`.

## 10) Security Checklist

- Never hardcode credential/API key.
- Audit log aktif untuk operasi penting.
- Validasi input selalu via schema.
- Jangan tampilkan error internal mentah ke client.
