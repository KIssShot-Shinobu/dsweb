# DSWeb (DuelStandby Web)

Aplikasi web komunitas DuelStandby berbasis Next.js 16 + Prisma + MySQL.

## Ringkasan

Project ini punya 2 area utama:

- Public website (`/`) untuk branding komunitas + daftar tournament dari database.
- Dashboard (`/dashboard/*`) untuk manajemen member, tournament, treasury, audit, dan profile.

Auth menggunakan JWT HttpOnly cookie (`ds_auth`) dengan role hierarchy:
`USER < MEMBER < OFFICER < ADMIN < FOUNDER`.

## Fitur Utama

- Registrasi user + game profile (Duel Links / Master Duel).
- Login/logout + cek sesi user (`/api/auth/me`).
- Manajemen user approval/admin tools.
- CRUD tournament + register participant tournament.
- Dashboard tournament dengan opsi `Edit`, `Delete`, dan `Update Status`.
- Hapus tournament di dashboard memakai confirm modal + undo 5 detik (konsisten dengan members/treasury).
- Form tournament mendukung field `Image URL` + preview gambar pada create/edit.
- Form tournament juga mendukung upload file gambar langsung ke `/api/upload` (URL akan terisi otomatis).
- List tournament di dashboard menampilkan thumbnail image kecil per row.
- Form di dashboard `tournament`, `members`, dan `treasury` menggunakan custom dropdown konsisten (tidak lagi native select browser).
- Style form/button dashboard dipusatkan di `components/dashboard/form-styles.ts` agar konsisten lintas halaman.
- Aksi row list (`Edit/Hapus`) dipusatkan di `components/dashboard/row-actions.tsx` agar pola tabel konsisten.
- Manajemen members guild.
- Treasury transaksi + analytics ringkas.
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
- Public homepage tersinkron ke database (total member, total tournament, list tournament terbaru/aktif).
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
- `scripts/seed.mjs`: seed 50 member, 50 tournament, 50 treasury

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
- `JWT_SECRET`: secret signing JWT.
- `NEXT_PUBLIC_APP_URL`: base URL app (dipakai URL hasil upload).
- `UPLOAD_DIR`: lokasi simpan file upload (default `./public/uploads`).
- `MAX_FILE_SIZE`: batas upload byte (default 5MB).
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
node scripts/seed-admin.js
```

Default admin:

- Email: `admin@duelstandby.com`
- Password: `Admin123!`
- Role: `ADMIN`
- Status: `ACTIVE`

### 2) Seed data demo (50 records)

```bash
node scripts/seed.mjs
```

Isi:

- 50 members
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
- `POST /api/auth/verify-email`
- `POST /api/auth/verify-email/resend`
- `GET /api/profile/stats`

Tournament:

- `GET /api/tournaments`
- `POST /api/tournaments` (min role OFFICER)
- `GET /api/tournaments/:id`
- `PUT /api/tournaments/:id` (min role OFFICER, support update field tournament)
- `DELETE /api/tournaments/:id` (min role OFFICER)
- `POST /api/tournaments/:id/register`

Lainnya:

- `GET/POST /api/members`, `PUT/DELETE /api/members/:id`
- `GET/POST /api/treasury`, `PUT/DELETE /api/treasury/:id`
- `POST /api/upload`
- `POST /api/upload/public` (khusus upload screenshot saat registrasi sebelum login)
- `GET /api/audit-logs`
- `GET /api/health`

## Role Akses (UI Dashboard)

- `USER/MEMBER`: profile dan menu personal.
- `OFFICER`: fitur guild level menengah.
- `ADMIN/FOUNDER`: akses penuh dashboard admin (users, tournaments, treasury, audit).

Catatan: beberapa menu mengikuti pengecekan role di frontend dan backend; backend tetap sumber kebenaran.

## Standar Audit Log

Untuk endpoint penting (terutama operasi write `POST/PUT/DELETE`), audit log wajib ditulis.

- Member: create/update/delete sudah tercatat (`MEMBER_CREATED`, `MEMBER_UPDATED`, `MEMBER_DELETED`).
- Treasury: add/update/delete sudah tercatat (`TREASURY_ADDED`, `TREASURY_UPDATED`, `TREASURY_DELETED`).
- Tournament: create/update/delete sudah tercatat.
- Auth/Profile/Upload: event penting sudah tercatat.
- Session/Auth integrity: password reset request/success dan session refresh juga tercatat.

Aturan ke depan:

1. Setiap fitur penting baru harus menambahkan audit log.
2. Gunakan `userId` dari token (`ds_auth`) untuk actor log, bukan header manual.
3. Simpan `before/after` ringkas untuk operasi update jika relevan.
4. Jangan taruh data sensitif mentah di `details` audit.

## Security Notes

- Access token disimpan di cookie `ds_auth` (httpOnly), umur pendek 15 menit.
- Refresh token disimpan di cookie `ds_refresh` (httpOnly), umur 7 hari.
- Refresh token disimpan di tabel `Session` dan selalu dirotasi saat `POST /api/auth/refresh`.
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

### Error PowerShell `npm.ps1 cannot be loaded`

Alternatif cepat jalankan command via `cmd`:

```bash
cmd /c npm run dev
```

## Deploy Notes

- Pastikan `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `UPLOAD_DIR` terpasang di server.
- Pastikan folder upload persistent jika deploy container/panel.
- Jalankan `npx prisma generate` dan `npx prisma db push` di environment target.

## Aturan Update Dokumentasi

Mulai sekarang, setiap ada perubahan fitur/endpoint/role/alur setup:

1. Update `README.md` pada section terkait di commit yang sama.
2. Jika perubahan menyentuh API, update bagian `API Ringkas`.
3. Jika perubahan menyentuh auth/role/menu, update bagian `Role Akses`.
4. Jika perubahan menyentuh setup/env/db, update bagian `Konfigurasi Environment` dan `Instalasi`.
