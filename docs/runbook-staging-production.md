# Runbook Deploy Staging -> Production (PostgreSQL)

Runbook ini dipakai setelah migration chain dirapikan ke baseline PostgreSQL:

- Active migration: `prisma/migrations/20260417000000_postgresql_baseline/migration.sql`
- Legacy MySQL migration: `prisma/migrations_legacy_mysql/` (arsip, tidak dieksekusi Prisma)

## 1) Pre-check wajib

1. Pastikan env terisi:
   - `DATABASE_URL`
   - `PRISMA_MIGRATE_STRATEGY=deploy`
   - `CRON_SECRET`
   - `AUTH_SECRET`
2. Jalankan:

```bash
npm run db:preflight
```

3. Jika preflight gagal, stop deploy dan perbaiki mismatch terlebih dahulu.

## 2) Backup sebelum perubahan

1. Buat backup DB staging.
2. Buat backup DB production.
3. Simpan metadata backup: timestamp, host, DB name, operator.

## 3) Alur Staging

1. Deploy build candidate ke staging.
2. Jalankan:

```bash
npx prisma generate
npx prisma migrate deploy
```

3. Smoke test:
   - login/logout
   - create/update tournament
   - match schedule/report/dispute
   - treasury create/filter/export
4. Jalankan test automation:

```bash
npm test
```

5. Jika semua lolos, tandai release candidate siap production.

## 4) Alur Production

1. Aktifkan maintenance window singkat.
2. Jalankan preflight:

```bash
npm run db:preflight
```

3. Deploy artifact yang sama dengan staging (immutable artifact).
4. Jalankan:

```bash
npx prisma generate
npx prisma migrate deploy
```

5. Restart app process.
6. Post-deploy smoke test cepat:
   - homepage/public tournament list
   - dashboard summary
   - tournament matches API
   - notifications API

## 5) Special case: existing DB sudah berisi schema tapi belum ada history baseline

Jika DB sudah berisi tabel lengkap (hasil `db push` lama), jangan paksa recreate.

1. Verifikasi schema sudah sinkron.
2. Mark baseline sebagai sudah applied:

```bash
npx prisma migrate resolve --applied 20260417000000_postgresql_baseline
```

3. Lanjut `npx prisma migrate deploy`.

## 6) Rollback strategy

1. Jika deploy gagal sebelum cutover penuh:
   - rollback aplikasi ke artifact sebelumnya.
2. Jika migration sudah ter-apply dan perlu rollback data:
   - restore dari backup terakhir.
3. Catat incident:
   - waktu
   - migrasi terakhir
   - error utama
   - tindakan pemulihan

## 7) Guardrails operasional

1. Jangan pakai `PRISMA_MIGRATE_STRATEGY=push` di production.
2. `PRISMA_ALLOW_UNSAFE_SCHEMA_SYNC=1` hanya untuk bootstrap terkontrol dan wajib dihapus setelah selesai.
3. `ALLOW_MIGRATION_PROVIDER_MISMATCH=1` hanya untuk jendela migrasi transisi; default harus off.
