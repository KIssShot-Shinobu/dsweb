# DSWeb (DuelStandby Web)

Aplikasi web komunitas DuelStandby berbasis Next.js 16 + Prisma + MySQL.

## Ringkasan

Project ini punya 2 area utama:

- Public website (`/`) untuk branding komunitas + daftar tournament dari database.
- Dashboard (`/dashboard/*`) untuk manajemen users, tournament, treasury, audit, profile, dan ringkasan operasional.

Auth menggunakan JWT HttpOnly cookie (`ds_auth`) dengan role hierarchy:
`USER < MEMBER < OFFICER < ADMIN < FOUNDER`.

## Fitur Utama

- Registrasi user + game profile (Duel Links / Master Duel).
- Login/logout + cek sesi user (`/api/auth/me`).
- Manajemen role dan status akun user.
- CRUD tournament + register participant tournament.
- Dashboard tournament dengan opsi `Edit`, `Delete`, dan `Update Status`.
- Panel operasional disatukan ke halaman `/dashboard`, termasuk summary users, tournament, treasury, dan quick actions.
- Hapus tournament di dashboard memakai confirm modal + undo 5 detik.
- Form tournament hanya menerima gambar lokal hasil upload internal (`/uploads/...`) dan preview gambar pada create/edit.
- Form tournament mendukung upload file gambar langsung ke `/api/upload` (path lokal akan terisi otomatis).
- List tournament di dashboard menampilkan thumbnail image kecil per row.
- Form di dashboard `tournament`, `users`, dan `treasury` menggunakan custom dropdown konsisten (tidak lagi native select browser).
- Style form/button dashboard dipusatkan di `components/dashboard/form-styles.ts` agar konsisten lintas halaman.
- Aksi row list (`Edit/Hapus`) dipusatkan di `components/dashboard/row-actions.tsx` agar pola tabel konsisten.
- Halaman `Users` (`/dashboard/users`) menjadi pusat tunggal untuk registrasi user, akun aktif, role, dan status akun.
- Treasury transaksi + analytics ringkas dengan filter server-side; halaman treasury sekarang default ke semua periode agar sinkron dengan total data dashboard.
- Dashboard summary memakai endpoint terpusat `/api/dashboard/summary`.
- Upload file gambar (screenshot/profile) via API.
- Audit log aktivitas user/admin.
- Theme switch `Light/Dark` yang berlaku di dashboard dan public page.
- Native form controls (`select`, `date`, `datetime-local`) sudah di-hardening agar teks dropdown tetap terbaca di light/dark.
- Password reset flow berbasis token dengan expiry 15 menit.
- Refresh token rotation berbasis tabel session untuk manajemen sesi yang lebih aman.
- Email verification status tampil di `Profile` dan `Settings`.
- `Settings` menyediakan aksi kirim ulang link verifikasi email untuk user yang belum verifikasi.
- Enhanced user profile fields (bio, timezone, language, discord/social handle, date of birth, gender).
- Sistem badge dan reputasi user (`Badge`, `UserBadge`, `ReputationLog`).
- Endpoint stats profil terhitung untuk progress user.
- Public homepage tersinkron ke database (total user aktif, total tournament, list tournament terbaru/aktif).
- Navbar public:
- Belum login: `Sign In` + `Sign Up`.
- Sudah login admin/founder: profile menu -> `Dashboard`, `Logout`.
- Sudah login user/member/officer: profile menu -> `Profile`, `Logout`.

## Stack Teknis

- Next.js 16 (App Router, Turbopack dev)
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 7
- MariaDB/MySQL driver adapter: `@prisma/adapter-mariadb` + `mariadb`
- JWT (`jose`) + password hashing (`bcryptjs`)
- Zod untuk validasi request
- OpenAPI spec manual di `docs/openapi.yaml`

## Struktur Penting

- `app/`: halaman dan route API
- `app/api/*`: endpoint backend internal Next.js
- `app/dashboard/*`: UI dashboard
- `components/*`: komponen UI/section
- `lib/prisma.ts`: inisialisasi Prisma client + adapter MariaDB
- `lib/auth.ts`: JWT, cookie auth, role guard helper
- `lib/validators.ts`: schema validasi (register/login/tournament/dll)
- `context/ThemeContext.tsx`: state tema global + sinkronisasi `localStorage` (`ds-theme`)
- `prisma/schema.prisma`: skema database
- `scripts/seed-admin.js`: seed admin utama
- `scripts/seed.mjs`: clean break dataset dev lalu seed 20 users, 20 tournaments, 20 treasury, dan 12 audit logs demo

## Prasyarat

- Node.js 20+ (disarankan LTS)
- MySQL/MariaDB server aktif
- npm

## Konfigurasi Environment

Salin `.env.example` menjadi `.env`, lalu isi nilainya.

Contoh `DATABASE_URL`:

```env
DATABASE_URL="mysql://USERNAME:PASSWORD@141.11.25.48:3306/DATABASE_NAME?connection_limit=1"
```

Variabel penting:

- `DATABASE_URL`: koneksi utama Prisma ke MySQL.
- `JWT_SECRET`: secret signing JWT. Wajib diisi; app tidak lagi memakai fallback default.
- `DATA_ENCRYPTION_KEY`: kunci enkripsi data sensitif at-rest (`phoneWhatsapp`, `accountNumber`, `twoFactorSecret`).
- `NEXT_PUBLIC_APP_URL`: base URL app (dipakai URL hasil upload).
- `UPLOAD_DIR`: lokasi simpan file upload permanen (default `./public/uploads`). `APP_ROOT` ditetapkan otomatis oleh `start.js` agar runtime build lokal dan standalone memakai root upload yang sama. Asset `/uploads/*` juga dilayani oleh route server agar gambar tetap tampil meski static copy berbeda antar runtime.
- `MAX_FILE_SIZE`: batas upload byte (default 5MB).
- `ALLOW_DEV_SEED_ENDPOINT`: aktifkan `/api/seed` hanya untuk dev lokal yang memang membutuhkan seed admin cepat.
- `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`: kredensial seed admin untuk script dan endpoint seed.
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS`: kredensial SMTP provider email.
- `EMAIL_FROM`: alamat pengirim email untuk verifikasi/reset password.
- `RESETPASSCONSOLE` (atau `resetpassconsole`): mode pengiriman email (`true` = `console.info`, `false` = SMTP/provider email).

## Instalasi & Menjalankan Lokal

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

App berjalan di `http://localhost:3000`.

## Seeding Data

### 1) Seed akun admin

```bash
set ADMIN_SEED_EMAIL=admin@example.com
set ADMIN_SEED_PASSWORD=change-me
node scripts/seed-admin.js
```

Variabel `ADMIN_SEED_EMAIL` dan `ADMIN_SEED_PASSWORD` wajib diisi sebelum menjalankan script.
Field tambahan opsional: `ADMIN_SEED_NAME`, `ADMIN_SEED_PHONE`, `ADMIN_SEED_CITY`.

### 2) Seed data dev (reset + 20 records per area)

```bash
node scripts/seed.mjs
```

Isi:

- 50 users
- 50 tournaments
- 50 treasury transactions

## API Ringkas

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/password/forgot`
- `POST /api/auth/password/reset`
- `POST /api/auth/password/change`
- `POST /api/auth/verify-email`
- `POST /api/auth/verify-email/resend`
- `GET /api/profile/stats`
- `GET /api/dashboard/summary`

Tournament:

- `GET /api/tournaments` (`search`, `status`, `gameType`, `page`, `limit`)
- `POST /api/tournaments` (min role OFFICER)
- `GET /api/tournaments/:id`
- `PUT /api/tournaments/:id` (min role OFFICER, support update field tournament)
- `DELETE /api/tournaments/:id` (min role OFFICER)
- `POST /api/tournaments/:id/register`

Lainnya:

- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id/status`
- `GET /api/admin/users` dan `PUT /api/admin/users/:id/status` tetap tersedia sebagai alias kompatibilitas
- `GET/POST /api/treasury`, `GET/PUT/DELETE /api/treasury/:id`
- `GET /api/treasury` mendukung `page`, `limit`, `month`, `year`, `type`, `userId`
- `POST /api/upload`
- `POST /api/upload/public` (membuat temp upload screenshot registrasi, rate limit 5/jam/IP)
- `GET /api/upload/public/:id` (preview temp upload milik IP yang sama)
- `GET /api/audit-logs`
- `GET /api/audit-logs/export`
- `GET /api/health`

## Role Akses (UI Dashboard)

- `USER/MEMBER`: profile dan menu personal.
- `OFFICER`: fitur guild level menengah.
- `ADMIN/FOUNDER`: akses penuh dashboard operasional (users, tournaments, treasury, audit).

Catatan: beberapa menu mengikuti pengecekan role di frontend dan backend; backend tetap sumber kebenaran.
Catatan tambahan: pendaftaran tournament publik memakai status akun `ACTIVE`; role `MEMBER` tidak lagi menjadi syarat khusus untuk register. Sistem tidak lagi memakai status `PENDING` atau `REJECTED`; registrasi baru langsung dibuat `ACTIVE` dan status user kini hanya `ACTIVE` atau `BANNED`.

## Standar Audit Log

Untuk endpoint penting (terutama operasi write `POST/PUT/DELETE`), audit log wajib ditulis.

- Perubahan status user dan role change sudah tercatat (`USER_APPROVED`, `USER_BANNED`, `ROLE_CHANGED`).
- Treasury: add/update/delete sudah tercatat (`TREASURY_ADDED`, `TREASURY_UPDATED`, `TREASURY_DELETED`).
- Tournament: create/update/delete/register sudah tercatat.
- Auth/Profile/Upload: event penting sudah tercatat.
- Session/Auth integrity: password reset request/success, session refresh, dan perubahan field sensitif juga tercatat.

Aturan ke depan:

1. Setiap fitur penting baru harus menambahkan audit log.
2. Gunakan `userId` dari token (`ds_auth`) untuk actor log, bukan header manual.
3. Simpan `before/after` ringkas untuk operasi update jika relevan.
4. Jangan taruh data sensitif mentah di `details` audit.

## Security Notes

- Access token disimpan di cookie `ds_auth` (httpOnly), umur pendek 15 menit.
- Refresh token disimpan di cookie `ds_refresh` (httpOnly), umur 7 hari.
- Refresh token disimpan di tabel `Session` dan selalu dirotasi saat `POST /api/auth/refresh`.
- Field sensitif `phoneWhatsapp`, `accountNumber`, dan `twoFactorSecret` dienkripsi sebelum disimpan ke database; lookup unik memakai hash field.
- Prisma extension juga menyentuh `lastActiveAt` saat auth/session flow berjalan dan menulis audit log untuk perubahan field sensitif.
- Saat password berhasil direset, semua session user direvoke (force logout di semua device).
- Model `User` menyimpan field keamanan tambahan: `emailVerifiedAt`, `phoneVerifiedAt`, `twoFactorEnabled`, `twoFactorSecret`, `lastActiveAt`, dan `privacySettings`.
- Model `User` juga menyimpan kelengkapan profil: `bio`, `timezone`, `language`, `discordId`, `instagramHandle`, `twitterHandle`, `dateOfBirth`, `gender`.
- Opsi pengiriman email:
- `RESETPASSCONSOLE=true`: email dicetak via `console.info` (dev/testing).
- `RESETPASSCONSOLE=false`: email dikirim via SMTP/provider (wajib isi env SMTP).
- Saat SMTP/provider sudah aktif, nonaktifkan mode console dengan set `RESETPASSCONSOLE=false`.

## Troubleshooting

### PrismaClientInitializationError saat `new PrismaClient()`

Pastikan inisialisasi Prisma pakai adapter MariaDB (Prisma 7) dan `DATABASE_URL` valid.
Referensi implementasi: `lib/prisma.ts`.

### `api/upload` 401 saat registrasi

Form registrasi sekarang memakai endpoint publik `POST /api/upload/public` untuk upload screenshot sebelum user login.
Endpoint ini tidak lagi langsung memberi URL permanen. Response-nya berisi `uploadId`, `previewUrl`, dan `expiresAt`, lalu file akan di-claim ke user saat registrasi berhasil.
Endpoint `POST /api/upload` tetap dipakai untuk area yang membutuhkan user terautentikasi.

### `api/auth/register` 409 (Conflict)

`409` berarti data bentrok (email/nomor WhatsApp/gameId sudah terdaftar).  
Jika sebelumnya sempat muncul `500` lalu percobaan berikutnya `409`, biasanya akun sudah sempat tersimpan di percobaan awal.

### Login/Register 500 setelah update fitur session/token

Jika baru pull update security (Session/EmailVerificationToken/PasswordResetToken), pastikan schema DB sudah disinkronkan:

```bash
npx prisma generate
npx prisma db push
```

Lalu restart dev server.

### `prisma db push` gagal di Pterodactyl karena `datasource.url` tidak ada

Ini berarti `DATABASE_URL` tidak terbaca saat container start.

- Pastikan variable `DATABASE_URL` benar-benar diisi di panel Pterodactyl atau tersedia di file `.env`.
- Jika password MySQL mengandung karakter khusus seperti `@`, `:`, `/`, `?`, atau `#`, password wajib di-URL-encode sebelum dimasukkan ke connection string.
- Format yang benar:

```env
DATABASE_URL="mysql://USERNAME:ENCODED_PASSWORD@HOST:3306/DATABASE_NAME?connection_limit=1"
```

### Error PowerShell `npm.ps1 cannot be loaded`

Alternatif cepat jalankan command via `cmd`:

```bash
cmd /c npm run dev
```

## Deploy Notes

- Pastikan `DATABASE_URL`, `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`, `UPLOAD_DIR` terpasang di server.
- Untuk Pterodactyl, isi `DATABASE_URL` di server variables. Jangan mengandalkan `prisma db push` tanpa env ini.
- Jika password DB memakai karakter khusus, gunakan versi URL-encoded pada `DATABASE_URL`.
- Pastikan folder upload persistent jika deploy container/panel.
- Jalankan `npx prisma generate` dan `npx prisma db push` di environment target.

## Testing

- Unit test service layer + proteksi data: `npm run test:unit`
- Integration test auth flow: `npm run test:integration`
- Full suite: `npm test`

## Migration Notes

- Setiap perubahan schema wajib disertai migration script dan rollback plan.
- Untuk update ini, gunakan:
- `prisma/migrations_manual/20260307_sensitive_user_fields.sql`
- `prisma/migrations_manual/20260307_sensitive_user_fields.rollback.sql`

## Aturan Update Dokumentasi

Mulai sekarang, setiap ada perubahan fitur/endpoint/role/alur setup:

1. Update `README.md` pada section terkait di commit yang sama.
2. Jika perubahan menyentuh API, update bagian `API Ringkas`.
3. Jika perubahan menyentuh auth/role/menu, update bagian `Role Akses`.
4. Jika perubahan menyentuh setup/env/db, update bagian `Konfigurasi Environment` dan `Instalasi`.








