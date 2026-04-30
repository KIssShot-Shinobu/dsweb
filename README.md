# DSWeb (Duel Standby Web)

Aplikasi komunitas Duel Standby berbasis **Next.js + Prisma + PostgreSQL**.

## Apa Ini?

Project ini punya 2 area utama:

- **Public site**: branding komunitas, daftar turnamen, bracket publik.
- **Dashboard**: manajemen user, team, turnamen, treasury, audit, dan workspace peserta.

## Fitur Inti

- Auth.js (credentials + Google + Discord).
- Role komunitas: `USER < MEMBER < OFFICER < ADMIN < FOUNDER`.
- Turnamen individual & team.
- Verifikasi pembayaran untuk turnamen berbayar.
- Bracket, match report, dispute, match chat.
- Notifikasi realtime (SSE).
- Upload file dengan dukungan Cloudflare R2.

## Quick Start (Local)

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

App jalan di `http://localhost:3000`.

## Dokumentasi Lanjutan

Semua detail teknis untuk developer, setup lanjutan, migrasi, seeding, API ringkas, deploy, troubleshooting, dan daftar variabel sensitif dipindahkan ke:

- `detail.md`

Runbook staging/production:

- `docs/runbook-staging-production.md`

## Catatan Keamanan

- Jangan commit file `.env`.
- Jangan taruh credential/token di kode atau README.
- Simpan semua secret via environment variables (lihat `detail.md`).
