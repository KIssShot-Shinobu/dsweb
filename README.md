# DSWeb (DuelStandby Web)

Aplikasi web komunitas DuelStandby berbasis Next.js 16 + Prisma + PostgreSQL.

## Ringkasan

Project ini punya 2 area utama:

- Public website (`/`) untuk branding komunitas + daftar tournament dari database.
- Dashboard (`/dashboard/*`) untuk manajemen users, teams, tournament, treasury, audit, profile, dan ringkasan operasional. Proteksi dashboard kini ditangani oleh server layout/page guard, bukan file `proxy.ts`.

Auth utama kini menggunakan Auth.js untuk login dan pembacaan sesi server, dengan role hierarchy internal:
`USER < MEMBER < OFFICER < ADMIN < FOUNDER`.

## Fitur Utama

- Registrasi akun publik disederhanakan: hanya `nama`, `email`, dan `password`. Data lain (game profile, wilayah, sosial) dilengkapi setelah login lewat dashboard profile/settings.
- Login/logout + cek sesi user (`/api/auth/me`), termasuk payload role komunitas dan team aktif jika ada. Login Google, Discord, dan login username/email+password kini sama-sama melewati Auth.js, lalu difinalisasi ke state internal aplikasi untuk audit, role, dan sinkronisasi profil.
- Manajemen role dan status akun user.
- CRUD tournament + register participant tournament.
- Tournament kini mendukung mode **Team** (TEAM_BOARD / TEAM_KOTH). Pendaftaran team hanya untuk captain/vice/manager.
- Bracket tournament dapat diakses publik (tanpa login) untuk halaman public.
- Tournament sekarang punya `maxPlayers` untuk batas kapasitas (input angka bebas). Bracket otomatis menyesuaikan ke power‑of‑two terdekat. Registrasi publik/admin akan menolak jika slot penuh.
- Tournament kini menyimpan `startAt` serta window pendaftaran (`registrationOpen`/`registrationClose`), toggle `checkinRequired`, dan pengaturan auto-forfeit per event (toggle + grace + mode).
- Untuk turnamen berbayar (entry fee > 0), registrasi wajib upload **bukti pembayaran**. Peserta masuk status **PENDING** sampai admin verifikasi (**VERIFIED/REJECTED**). Hanya peserta VERIFIED yang tampil di roster publik dan masuk bracket. Notifikasi + email dikirim saat verifikasi.
- Waitlist otomatis saat slot penuh, dan auto-promote ketika ada slot kosong.
- Dashboard tournament dengan opsi `Edit`, `Delete`, dan `Update Status`.
- Panel operasional disatukan ke halaman `/dashboard`, termasuk summary users, teams, tournament, treasury, dan quick actions.
- Hapus tournament di dashboard memakai confirm modal + undo 5 detik.
- Form tournament hanya menerima gambar lokal hasil upload internal (`/uploads/...`) dan preview gambar pada create/edit.
- Form tournament mendukung upload file gambar langsung ke `/api/upload` (path lokal akan terisi otomatis).
- List tournament di dashboard menampilkan thumbnail image kecil per row.
- Form di dashboard `tournament`, `users`, dan `treasury` menggunakan custom dropdown konsisten (tidak lagi native select browser).
- Style form/button dashboard dipusatkan di `components/dashboard/form-styles.ts` agar konsisten lintas halaman.
- Aksi row list (`Edit/Hapus`) dipusatkan di `components/dashboard/row-actions.tsx` agar pola tabel konsisten.
- Team management kini memakai model membership relasional (`TeamMember`, `TeamInvite`, `TeamJoinRequest`). Direktori publik (`/teams`, `/teams/[slug]`) hanya untuk browse + request join, sementara pengelolaan roster dilakukan di dashboard oleh captain dan pengurus team. Pembuatan team hanya dilakukan oleh admin melalui dashboard.
- User dapat mengirim request pembuatan team dari dashboard; admin memproses approve/reject di panel `Teams`.
- User menerima notifikasi in-app saat request team disetujui atau ditolak.
- UI publik team (`/teams` dan `/teams/[slug]`) kini lebih ringan: fokus ke pencarian team, ringkasan role, dan aksi request join tanpa kontrol manage.
- Slug team kini otomatis dibuat dari nama team; form create/edit tidak lagi meminta input slug manual.
- Aksi manajemen team kini diarahkan dari dashboard; halaman publik tidak lagi menampilkan tombol manage agar lebih ringan.
- Captain bisa menghapus team dari halaman manage ketika roster sudah kosong (hanya captain tersisa).
- Halaman `Users` (`/dashboard/users`) tetap fokus ke moderasi global akun, role komunitas, dan status user. Admin tidak lagi assign/unassign roster team dari dashboard users.
- Treasury profesional: kategori/method/status, CSV export, monthly summary, dan filter server-side; halaman treasury default ke semua periode agar sinkron dengan total data dashboard.
- Dashboard summary memakai endpoint terpusat `/api/dashboard/summary`, termasuk ringkasan guild members, assigned team, dan total team aktif.
- Upload file gambar (screenshot/profile) via API. Dashboard kini hanya menampilkan avatar user aktif di header agar layout tidak boros.
- Audit log aktivitas user/admin.
- Notification system in-app dengan realtime SSE untuk invite, join request, dan alert penting.
- Penugasan referee per tournament + dispute queue agar sengketa match bisa diselesaikan lebih cepat (referee dapat confirm result & resolve dispute tanpa override skor).
- Sengketa match mendukung upload bukti (screenshot) saat report/dispute untuk mempercepat verifikasi.
- Match chat/notes per match untuk koordinasi jadwal/hasil (pemain + referee + admin + pengurus team), lampiran otomatis dihapus saat match selesai.
- Match availability: pemain mengusulkan 1-3 slot jadwal, lawan memilih (tercatat audit + notifikasi).
- Team lineup submission per match (kapten submit lineup; terkunci saat match ONGOING; lawan melihat setelah match dimulai).
- Tournament timezone + export kalender (ICS) untuk match terjadwal dan jadwal start event.
- Diskualifikasi peserta dari dashboard dengan auto-advance match aktif + audit log.
  - Penjadwalan match + reminder otomatis 30 menit sebelum match dimulai (notifikasi in-app).
  - Auto-confirm hasil match setelah 24 jam jika lawan tidak merespons.
  - Forfeit otomatis untuk match terjadwal yang peserta-nya tidak check-in tepat waktu (cron), configurable per tournament (toggle + grace + mode) dan hanya berjalan jika check-in aktif.
- Roster lock otomatis saat turnamen ONGOING (lineup freeze untuk team roster).
- Theme switch `Light/Dark` yang berlaku di dashboard dan public page.
- Native form controls (`select`, `date`, `datetime-local`) sudah di-hardening agar teks dropdown tetap terbaca di light/dark.
- Password reset flow berbasis token dengan expiry 15 menit.
- Session aplikasi kini sepenuhnya ditangani oleh Auth.js (JWT strategy) dengan invalidasi lintas-device berbasis `authVersion` pada tabel `User`.
- Email verification status tampil di `Profile` dan `Settings`.
- `Settings` menyediakan aksi kirim ulang link verifikasi email untuk user yang belum verifikasi.
- Halaman `Profile` kini lebih minimal: data akun tampil lebih dulu, lalu ringkasan Duel Links dan Master Duel diletakkan tepat di bawahnya. Form edit/tambah profile game hanya muncul lewat modal saat dibutuhkan.
- Card `Profile Game` di halaman `Profile` kini memakai judul dan copy yang lebih singkat agar nama game dan data inti lebih mudah dipindai.
- Game ID untuk Duel Links dan Master Duel kini distandardkan ke format `XXX-XXX-XXX` dengan tepat 9 digit (profil game).
- Data akun utama di halaman `Profile` juga kini tampil sebagai ringkasan saja. Edit `username`, `email`, `WhatsApp`, `provinsi`, dan `kabupaten/kota` dilakukan lewat satu modal agar halaman tidak ramai card/form terbuka sekaligus.
- Susunan halaman `Profile` kini lebih ringkas: data akun diikuti profile game dalam panel yang sama, sementara aktivitas terbaru ditampilkan sebagai daftar kecil yang lebih tenang agar tidak mengambil fokus utama.
- Surface `Data Akun` dan `Profile Game` di halaman `Profile` kini disatukan dalam satu kelompok visual agar halaman terasa lebih tenang dan tidak penuh card yang saling bersaing.
- Enhanced user profile fields (bio, timezone, language, discord/social handle, date of birth, gender).
- Sistem badge dan reputasi user (`Badge`, `UserBadge`, `ReputationLog`).
- Endpoint stats profil terhitung untuk progress user.
- Public homepage tersinkron ke database (total user aktif, total tournament, list tournament terbaru/aktif).
- Halaman public tournament list/detail kini memakai token warna light/dark yang konsisten agar card, hero, dan CTA tetap terbaca di kedua tema.
- Homepage public (hero, about, tournament section, socials, navbar, footer) juga sudah diselaraskan agar visual light/dark mode konsisten di seluruh area publik.
- Area public juga mendapat pass mobile spacing dan interaction states: CTA full-width di mobile, card spacing lebih rapat, serta state hover/active/focus lebih konsisten.
- Dark theme public juga dipoles lagi agar depth, contrast, hierarki surface, dan atmosfer visual lebih matang di homepage dan page tournament.
- Surface card public di dark mode kini memakai dark panel solid yang konsisten agar tidak muncul panel putih atau teks yang kehilangan kontras.
- Navbar public kini memakai icon toggle light/dark dengan animasi transisi, dan social icons di footer kembali memakai hover glow/lift agar terasa hidup.
- Landing page memakai reveal animation ringan berbasis `framer-motion` pada hero, heading section, dan card penting; dashboard sengaja tidak diberi animasi scroll agar tetap ringan dipakai admin.
- Copywriting public dirapikan menjadi lebih singkat, elegan, dan konsisten dalam Bahasa Indonesia pada homepage, card tournament, footer, serta halaman tournament publik.`r`n- Halaman auth publik kini memakai panel tunggal yang lebih minimal, tanpa hero samping atau kartu penjelasan tambahan agar fokus user tetap ke form login/registrasi. Tombol Google/Discord juga dipoles dengan tampilan yang lebih premium dan spacing mobile dibuat lebih rapat.
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
- PostgreSQL driver adapter: `@prisma/adapter-pg` + `pg`
- Auth.js + password hashing (`bcryptjs`)
- Zod untuk validasi request
- OpenAPI spec manual di `docs/openapi.yaml`

## Struktur Penting

- `app/`: halaman dan route API
- `app/api/*`: endpoint backend internal Next.js
- `app/dashboard/*`: UI dashboard
- `components/*`: komponen UI/section
- `lib/prisma.ts`: inisialisasi Prisma client + adapter PostgreSQL
- `lib/auth.ts`: helper password, role guard, dan invalidasi session version
- `lib/validators.ts`: schema validasi (register/login/tournament/dll)
- `context/ThemeContext.tsx`: state tema global + sinkronisasi `localStorage` (`ds-theme`)
- `prisma/schema.prisma`: skema database
- `scripts/seed-admin.js`: seed admin utama
- `scripts/seed.mjs`: clean break dataset dev lalu seed 4 teams, 20 users, 20 tournaments, 20 treasury, dan 12 audit logs demo

## Workflow Next.js

- Untuk versi Next.js yang terpasang saat ini, cek implementasi dan type surface di `node_modules/next/dist/` terlebih dahulu saat mengubah flow framework.
- Jika bundled docs lokal belum tersedia di versi yang dipakai, gunakan dokumentasi resmi Next.js sebagai sumber kebenaran tambahan.

## Prasyarat

- Node.js 20+ (disarankan LTS)
- PostgreSQL server aktif
- npm

## Konfigurasi Environment

Salin `.env.example` menjadi `.env`, lalu isi nilainya.

Variabel penting:

- `DATABASE_URL`: koneksi utama Prisma ke PostgreSQL.
- `AUTH_SECRET`: secret utama Auth.js untuk sesi aplikasi.
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: kredensial Google OAuth untuk Auth.js.
- `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET`: kredensial Discord OAuth untuk Auth.js.
- `DATA_ENCRYPTION_KEY`: kunci enkripsi data sensitif at-rest (`phoneWhatsapp`, `accountNumber`, `twoFactorSecret`).
- `NEXT_PUBLIC_APP_URL`: base URL app (dipakai URL hasil upload).
- `NEXT_PUBLIC_SOCIAL_DISCORD` / `NEXT_PUBLIC_SOCIAL_YOUTUBE` / `NEXT_PUBLIC_SOCIAL_INSTAGRAM`: link sosial publik untuk footer + landing page (opsional).
- `R2_ENABLED`: aktifkan storage upload permanen ke Cloudflare R2 (`true`/`false`).
- `R2_ACCOUNT_ID`: Account ID Cloudflare untuk endpoint S3 R2.
- `R2_BUCKET`: nama bucket R2 untuk upload permanen.
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`: kredensial API token R2 (S3 compatible).
- `R2_PUBLIC_BASE_URL`: custom domain publik untuk akses object R2 (contoh `https://assets.example.com`).
- `UPLOAD_DIR`: lokasi upload lokal. Dipakai untuk flow upload sementara/public preview dan kompatibilitas route `/uploads/*`.
- `MAX_FILE_SIZE`: batas upload byte (default 5MB).
- `REGION_CACHE_DIR`: lokasi cache lokal dataset wilayah Indonesia (default `./data/regions-cache`).
- `REGION_CACHE_TTL_HOURS`: TTL cache wilayah lokal dalam jam (default 720 / 30 hari).
- `EMSIFA_API_BASE_URL`: base URL dataset wilayah Indonesia Emsifa.
- `CRON_SECRET`: secret untuk endpoint cron internal (contoh: `x-cron-secret`).
- `RATE_LIMIT_ENABLED`: aktif/nonaktif rate limit API (default `true`).
- `RATE_LIMIT_TOURNAMENT_REGISTER_MAX`: batas request register turnamen per window (default `5`).
- `RATE_LIMIT_TOURNAMENT_REGISTER_WINDOW_SECONDS`: window rate limit register turnamen dalam detik (default `600`).
- `RATE_LIMIT_MATCH_REPORT_MAX`: batas request report match per window (default `10`).
- `RATE_LIMIT_MATCH_REPORT_WINDOW_SECONDS`: window rate limit report match dalam detik (default `300`).
- `ALLOW_DEV_SEED_ENDPOINT`: aktifkan `/api/seed` hanya untuk dev lokal yang memang membutuhkan seed admin cepat.
- `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`: kredensial seed admin untuk script dan endpoint seed.
  - `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS`: kredensial SMTP provider email.
  - `EMAIL_FROM`: alamat pengirim email untuk verifikasi/reset password.
  - `RESETPASSCONSOLE` (atau `resetpassconsole`): mode pengiriman email (`true` = `console.info`, `false` = SMTP/provider email).
  - `PRISMA_POOL_LIMIT`: batas koneksi pool PostgreSQL (default 10, naikkan jika query paralel).
  - `PRISMA_POOL_ACQUIRE_TIMEOUT_MS`: timeout mendapatkan koneksi pool (default 10000ms).

## Auth.js Migration (Phase 4)

- Auth.js kini menjadi satu-satunya jalur login utama: Google OAuth, Discord OAuth, dan credentials (`username/email + password`).
- Halaman login menampilkan helper copy singkat agar user paham role komunitas, team, dan akses dashboard tetap mengikuti akun internal Duel Standby.
- Route `POST /api/auth/finalize` kini menyelesaikan finalisasi akun internal setelah login Auth.js sukses: update jejak login, sentuh `lastActiveAt`, tulis audit log, serta membuat notifikasi in-app jika email belum terverifikasi.
- Default redirect login tanpa parameter kini bersifat role-aware: email belum verifikasi diarahkan ke `/dashboard/settings`, Admin/Founder ke `/dashboard`, dan user biasa ke `/dashboard/profile`.
- Route `GET /api/auth/finalize` tidak lagi melakukan side effect. Route ini hanya mengalihkan browser ke halaman transisi `/oauth-finalize`, lalu finalisasi aktual dilakukan lewat `POST` dari client.
- Pembacaan sesi server kini murni mengutamakan Auth.js melalui helper server-side yang memuat user internal berdasarkan `session.user.id` (fallback ke email sesi bila perlu).
- Invalidasi sesi aplikasi kini memakai `authVersion` pada model `User`, sehingga reset/ganti password bisa memutus sesi Auth.js lama tanpa refresh token legacy.
- Linking akun dilakukan berdasarkan email. Jika email sudah ada, akun lama akan di-link ke `googleId` atau `discordId`. Jika belum ada, user publik baru dibuat dengan `role=USER` dan `status=ACTIVE`.
- Jalur Google lama `/api/auth/oauth/finalize` tetap hidup sebagai alias kompatibilitas ke route transisi finalisasi yang baru.
- Endpoint `POST /api/auth/login` dan `POST /api/auth/refresh` sudah dipensiunkan; UI login utama sepenuhnya memakai Auth.js Credentials provider.
- Logout client kini membersihkan sesi Auth.js, dan route logout hanya melakukan audit + best-effort cleanup cookie legacy yang tersisa. Audit log dashboard juga sudah punya filter khusus untuk event OAuth Google/Discord.
## Instalasi & Menjalankan Lokal

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

App berjalan di `http://localhost:3000`.

## Migrasi Team Membership

Sistem team baru menghapus kolom `User.teamId` dan `User.teamJoinedAt`, lalu menggantinya dengan:

- `TeamMember`
- `TeamInvite`
- `TeamJoinRequest`
- enum `TeamRole`, `TeamInviteStatus`, `TeamJoinRequestStatus`

Langkah migrasi lokal:

```bash
npx prisma generate
```

Lalu jalankan SQL manual:

1. `prisma/migrations_manual/20260310_team_membership_system.sql`
2. Jika perlu rollback: `prisma/migrations_manual/20260310_team_membership_system.rollback.sql`
3. `prisma/migrations_manual/20260311_team_creation_requests.sql`
4. Jika perlu rollback: `prisma/migrations_manual/20260311_team_creation_requests.rollback.sql`

Catatan:

- Data team lama di `User.teamId` akan dibackfill ke `TeamMember` dengan role default `PLAYER`.
- Constraint "hanya satu captain per team" saat ini ditegakkan di service layer, bukan partial unique index database.
- Aplikasi juga menegakkan satu active team membership per user pada flow service.

## Migrasi Notification System

Model notifikasi in-app menambah tabel berikut:

- `Notification`
- `NotificationPreference`
- enum `NotificationType`

Langkah migrasi lokal:

```bash
npx prisma generate
```

Lalu jalankan SQL manual:

1. `prisma/migrations_manual/20260310_notifications.sql`
2. Jika perlu rollback: `prisma/migrations_manual/20260310_notifications.rollback.sql`


## Domain Users & Teams

- `USER`: akun publik. Boleh ikut tournament publik, tetapi belum menjadi bagian dari Duel Standby. Registrasi baru default ke role ini.
- `MEMBER`: anggota resmi Duel Standby.
- `OFFICER`, `ADMIN`, `FOUNDER`: anggota internal dengan hak akses dashboard lebih tinggi.
- Keanggotaan team kini berbasis membership aktif. Seorang user hanya boleh punya satu active membership pada satu waktu, tetapi histori keanggotaan tetap tersimpan melalui `leftAt`.
- Role komunitas (`USER`, `MEMBER`, `OFFICER`, `ADMIN`, `FOUNDER`) tetap terpisah dari role team (`CAPTAIN`, `VICE_CAPTAIN`, `PLAYER`, `COACH`, `MANAGER`).
- Team dikelola pemain sendiri:
  - `CAPTAIN`: full management
  - `VICE_CAPTAIN`: invite, remove non-captain, edit team
  - `MANAGER`: invite, edit team
  - `COACH`: lihat roster, manage lineup
  - `PLAYER`: lihat team, leave team
- Admin hanya melakukan moderasi global user dan tidak lagi memindahkan roster team dari dashboard admin.

## Seeding Data

### Auto seed saat startup

Jika menjalankan lewat `start.js`, kamu bisa mengaktifkan seed otomatis dengan env:

```bash
set RUN_SEED=1
set SEED_STRATEGY=admin
```

`SEED_STRATEGY=admin` akan menjalankan `npm run seed:admin` (aman untuk data existing).
Gunakan `SEED_STRATEGY=dev` hanya untuk database kosong/dev karena akan menghapus data.

### Skip build saat startup (untuk resource kecil)

Jika panel punya RAM kecil dan build sering hang, kamu bisa build di lokal lalu upload hasilnya, kemudian set:

```bash
set SKIP_BUILD=1
```

Saat `SKIP_BUILD=1`, `start.js` tidak menjalankan `npm run build` dan langsung memakai `.next/standalone`.

### Strategi migrasi Prisma saat startup

Default `start.js` menjalankan `prisma migrate deploy`. Kamu bisa mengubah strategi lewat env:

```bash
set PRISMA_MIGRATE_STRATEGY=deploy
```

Opsi:

- `deploy` (default): apply migrations
- `push`: `prisma db push` (hanya untuk database kosong/dev)
- `deploy_then_push`: deploy lalu push (dev/empty DB)
- `bootstrap`: `prisma db push` only, untuk controlled bootstrap window
- `none`: skip migrations

Jalankan preflight sebelum deploy/startup untuk memastikan provider dan strategy konsisten:

```bash
npm run db:preflight
```

Jika strategy memakai schema sync (`push`, `deploy_then_push`, `bootstrap`) di production, wajib explicit opt-in:

```bash
set PRISMA_ALLOW_UNSAFE_SCHEMA_SYNC=1
```

Jika `migration_lock.toml` masih provider lama (mis. mysql) sementara schema sudah postgresql, gunakan flag berikut hanya saat bootstrap:

```bash
set ALLOW_MIGRATION_PROVIDER_MISMATCH=1
```

Jika memilih `push` dan ada perubahan destruktif, set:

```bash
set PRISMA_DB_PUSH_ACCEPT_DATA_LOSS=1
```

### 1) Seed akun admin

```bash
set ADMIN_SEED_EMAIL=admin@example.com
set ADMIN_SEED_PASSWORD=change-me
node scripts/seed-admin.js
```

Variabel `ADMIN_SEED_EMAIL` dan `ADMIN_SEED_PASSWORD` wajib diisi sebelum menjalankan script.
Field tambahan opsional: `ADMIN_SEED_NAME`, `ADMIN_SEED_USERNAME`, `ADMIN_SEED_PHONE`, `ADMIN_SEED_CITY`, `ADMIN_SEED_PROVINCE_CODE`, `ADMIN_SEED_PROVINCE_NAME`, `ADMIN_SEED_CITY_CODE`, `ADMIN_SEED_CITY_NAME`.

### 2) Seed data dev (reset + teams/users/tournament/treasury demo)

```bash
node scripts/seed.mjs
```

Isi:

- 4 teams dev
- 20 users dev
- 20 tournaments
- 20 treasury transactions
- 12 audit logs demo

## API Ringkas

Auth:

- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET/POST /api/auth/finalize` (`GET` hanya redirect aman ke halaman transisi, `POST` menyelesaikan finalisasi login Auth.js + audit)
- `GET/POST /api/auth/oauth/finalize` (alias kompatibilitas ke finalisasi Auth.js)
- `POST /api/auth/password/forgot`
- `POST /api/auth/password/reset`
- `POST /api/auth/password/change`
- `POST /api/auth/verify-email`
- `POST /api/auth/verify-email/resend`
- `GET /api/profile/stats` (statistik profil user)
- `GET /api/dashboard/summary`

  Tournament:
  
  - `GET /api/tournaments` (`search`, `status`, `gameType`, `page`, `limit`)
  - `POST /api/tournaments` (min role OFFICER, support `forfeitEnabled`, `forfeitGraceMinutes`, `forfeitMode`)
  - `GET /api/tournaments/:id`
  - `GET /api/tournaments/:id/bracket` (public, tanpa login)
  - `PUT /api/tournaments/:id` (min role OFFICER, support update field tournament + forfeit settings)
  - `DELETE /api/tournaments/:id` (min role OFFICER)
  - `GET /api/tournaments/:id/staff`
  - `POST /api/tournaments/:id/staff`
  - `DELETE /api/tournaments/:id/staff/:staffId`
    - `GET /api/tournaments/:id/staff/candidates`
    - `POST /api/tournaments/:id/register`
    - `POST /api/tournaments/:id/participants/:participantId/disqualify`
    - `GET /api/tournaments/:id/matches`
  - `POST /api/matches/:id/report` (rate limit per user)
  - `POST /api/matches/:id/confirm`
  - `POST /api/matches/:id/schedule`
    - `POST /api/matches/:id/resolve-dispute`
    - `POST /api/matches/:id/admin-resolve`
    - `POST /api/cron/match-reminders` (scheduler)
    - `POST /api/cron/match-forfeits` (scheduler)

Lainnya:

- `GET /api/users` (`status`, `role`, `teamId`, `search`, `page`, `perPage`)
- `GET /api/users/:id`
- `PUT /api/users/:id/status` (status, role)
- `GET /api/teams`, `POST /api/teams`, `GET/PUT/DELETE /api/teams/:id`, `POST/DELETE /api/teams/:id/roster`
- `GET /api/team-requests` (admin), `POST /api/team-requests` (user request), `POST /api/team-requests/:id/approve`, `POST /api/team-requests/:id/reject`
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/read`
- `POST /api/notifications/read-all`
- `DELETE /api/notifications/:id`
- `GET /api/notifications/stream` (SSE realtime)
- `POST /api/team/invite`
- `POST /api/team/invite/accept`
- `POST /api/team/invite/decline`
- `POST /api/team/request-join`
- `POST /api/team/request-join/accept`
- `POST /api/team/request-join/reject`
- `POST /api/team/member/remove`
- `POST /api/team/member/promote`
- `POST /api/team/member/transfer-captain`
- `POST /api/team/delete`
- `POST /api/team/leave`
- `PATCH /api/team/update`
- `GET/POST /api/treasury`, `GET/PUT/DELETE /api/treasury/:id`, `GET /api/treasury/export`
- `GET /api/admin/users` dan `PUT /api/admin/users/:id/status` tetap tersedia sebagai alias kompatibilitas
- `GET /api/treasury` mendukung `page`, `limit`, `month`, `year`, `type`, `userId`, `category`, `method`, `status`, `search`, `includeSummary`, `summaryYear`, `public`
- `POST /api/upload`
- `POST /api/upload/public` (membuat temp upload publik non-auth, rate limit 5/jam/IP)
- `GET /api/upload/public/:id` (preview temp upload publik milik IP yang sama)
- `GET /api/audit-logs`
- `GET /api/audit-logs/export`
- `GET /api/regions/provinces`
- `GET /api/regions/regencies?provinceCode=...`
- `GET /api/health`

## Role Akses (UI Dashboard)

- `USER/MEMBER`: profile dan menu personal.
- `MEMBER+` dengan role team pengurus: akses `Team Saya` untuk mengelola roster/invite/role team.
- `OFFICER`: fitur guild level menengah, termasuk melihat roster team, detail team, dan users.
- `REFEREE (per tournament)`: akses Dispute Queue dan konfirmasi hasil match pada turnamen yang ditugaskan.
- `ADMIN/FOUNDER`: akses penuh dashboard operasional (users, teams, tournaments, treasury, audit).

Catatan: beberapa menu mengikuti pengecekan role di frontend dan backend; backend tetap sumber kebenaran.
Catatan tambahan: pendaftaran tournament publik memakai status akun `ACTIVE`; role `MEMBER` tidak lagi menjadi syarat khusus untuk register. Sistem tidak lagi memakai status `PENDING` atau `REJECTED`; registrasi baru langsung dibuat `ACTIVE` dan status user kini hanya `ACTIVE` atau `BANNED`.

## Standar Audit Log

Untuk endpoint penting (terutama operasi write `POST/PUT/DELETE`), audit log wajib ditulis.

- Perubahan status user dan role tetap tercatat (`USER_APPROVED`, `USER_BANNED`, `ROLE_CHANGED`).
- Flow team self-managed juga tercatat (`TEAM_CREATED`, `TEAM_UPDATED`, `TEAM_INVITED`, `TEAM_INVITE_ACCEPTED`, `TEAM_INVITE_DECLINED`, `TEAM_JOIN_REQUESTED`, `TEAM_JOIN_REQUEST_ACCEPTED`, `TEAM_JOIN_REQUEST_REJECTED`, `TEAM_MEMBER_REMOVED`, `TEAM_ROLE_CHANGED`, `TEAM_CAPTAIN_TRANSFERRED`, `TEAM_LEFT`).
- Treasury: add/update/delete sudah tercatat (`TREASURY_ADDED`, `TREASURY_UPDATED`, `TREASURY_DELETED`).
- Tournament: create/update/delete/register sudah tercatat.
- Auth/Profile/Upload: event penting sudah tercatat.
- Session/Auth integrity: password reset request/success, invalidasi sesi Auth.js, dan perubahan field sensitif juga tercatat.

Aturan ke depan:

1. Setiap fitur penting baru harus menambahkan audit log.
2. Gunakan userId dari sesi server/Auth.js sebagai actor log; jangan mengandalkan header manual.
3. Mutasi team self-managed juga wajib tercatat di audit log.
4. Simpan `before/after` ringkas untuk operasi update jika relevan.
5. Jangan taruh data sensitif mentah di `details` audit.

## Security Notes

- Sesi utama aplikasi dibaca dari Auth.js.
- Logout dan invalidasi sesi kini mengandalkan Auth.js + `authVersion` di tabel `User`.
- Cookie legacy `ds_auth` dan `ds_refresh` hanya dibersihkan secara best-effort untuk sisa browser state lama; keduanya bukan lagi bagian dari strategi auth aktif.
- Finalisasi login Auth.js kini dilakukan lewat `POST` dari halaman transisi `/oauth-finalize`, bukan side effect di `GET /api/auth/finalize`.
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

Pastikan inisialisasi Prisma pakai adapter PostgreSQL (Prisma 7) dan `DATABASE_URL` valid.
Referensi implementasi: `lib/prisma.ts`.

### `api/upload` 401 saat registrasi

Registrasi sekarang hanya membutuhkan nama, email, dan password. Jika Anda masih memanggil `/api/upload` dari form registrasi lama, pindahkan kebutuhan upload ke area dashboard (auth) atau gunakan endpoint publik jika benar-benar dibutuhkan.

### `api/auth/register` 409 (Conflict)

`409` berarti data bentrok (email sudah terdaftar).  
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
- Jika password PostgreSQL mengandung karakter khusus seperti `@`, `:`, `/`, `?`, atau `#`, password wajib di-URL-encode sebelum dimasukkan ke connection string.
- Format yang benar:

```env
DATABASE_URL="postgresql://USERNAME:ENCODED_PASSWORD@HOST:5432/DATABASE_NAME?sslmode=require&uselibpqcompat=true"
```

### Error PowerShell `npm.ps1 cannot be loaded`

Alternatif cepat jalankan command via `cmd`:

```bash
cmd /c npm run dev
```

## Deploy Notes

- Pastikan `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, `DATA_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`, `R2_ENABLED`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL` terpasang di server.
- Ikuti runbook deploy bertahap di `docs/runbook-staging-production.md`.
- Untuk production, gunakan nilai `AUTH_SECRET` acak yang panjang dan jangan pernah reuse secret dari environment lain.
- Di Google/Discord Console, daftarkan callback URL Auth.js yang tepat:
  - Dev lokal: `http://localhost:3000/api/auth/callback/google` dan `http://localhost:3000/api/auth/callback/discord`
  - Production: `https://YOUR_DOMAIN/api/auth/callback/google` dan `https://YOUR_DOMAIN/api/auth/callback/discord`
- Pastikan `NEXT_PUBLIC_APP_URL` memakai HTTPS domain production yang sama dengan callback Google dan link email.
- Untuk Pterodactyl, isi `DATABASE_URL` di server variables. Jangan mengandalkan `prisma db push` tanpa env ini.
- Jika password DB memakai karakter khusus, gunakan versi URL-encoded pada `DATABASE_URL`.
- Jika masih memakai flow upload lokal sementara/public preview, pastikan folder upload persistent untuk `UPLOAD_DIR`.
- Jalankan preflight sebelum startup/deploy: `npm run db:preflight`.
- Gunakan `PRISMA_MIGRATE_STRATEGY=deploy` sebagai default production.
- Untuk bootstrap terkontrol, gunakan `PRISMA_MIGRATE_STRATEGY=bootstrap`, `ALLOW_MIGRATION_PROVIDER_MISMATCH=1` (jika perlu), dan `PRISMA_ALLOW_UNSAFE_SCHEMA_SYNC=1` hanya sementara.

### Checklist Deploy Auth.js Production

1. Pastikan `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, dan `NEXT_PUBLIC_APP_URL` sudah terisi benar.
2. Verifikasi callback Google/Discord production menunjuk ke `/api/auth/callback/google` dan `/api/auth/callback/discord`.
3. Pastikan login Google, login Discord, login credentials, logout, forgot password, reset password, dan change password lolos smoke test.
4. Pastikan akun `BANNED` tetap ditolak di credentials login maupun Google/Discord login.
5. Pastikan email verifikasi dan reset password memakai domain production yang benar.
6. Pastikan cookie/session diuji di HTTPS production, bukan hanya lokal.

## Testing

- Unit test service layer + proteksi data: `npm run test:unit`
- Integration test auth flow: `npm run test:integration`
- Full suite: `npm test`

## Migration Notes

- Setiap perubahan schema wajib disertai migration script dan rollback plan.
- Migration chain aktif sekarang memakai baseline PostgreSQL:
  - `prisma/migrations/20260417000000_postgresql_baseline`
- Legacy chain MySQL dipindahkan ke arsip:
  - `prisma/migrations_legacy_mysql/`
- Untuk update ini, gunakan:
  - `prisma/migrations_manual/20260307_sensitive_user_fields.sql`
  - `prisma/migrations_manual/20260307_sensitive_user_fields.rollback.sql`
  - `prisma/migrations_manual/20260309_authjs_full_session_migration.sql`
  - `prisma/migrations_manual/20260309_authjs_full_session_migration.rollback.sql`
  - `prisma/migrations_manual/20260317_tournament_staff.sql`
  - `prisma/migrations_manual/20260317_tournament_staff.rollback.sql`
  - `prisma/migrations_manual/20260318_tournament_waitlist.sql`
  - `prisma/migrations_manual/20260318_tournament_waitlist.rollback.sql`
  - `prisma/migrations_manual/20260318_match_reminder_sent_at.sql`
  - `prisma/migrations_manual/20260318_match_reminder_sent_at.rollback.sql`
  - `prisma/migrations_manual/20260319_match_dispute_evidence.sql`
  - `prisma/migrations_manual/20260319_match_dispute_evidence.rollback.sql`
  - `prisma/migrations_manual/20260319_tournament_forfeit_settings.sql`
  - `prisma/migrations_manual/20260319_tournament_forfeit_settings.rollback.sql`
  - `prisma/migrations_manual/20260320_tournament_timezone.sql`
  - `prisma/migrations_manual/20260320_tournament_timezone.rollback.sql`
  - `prisma/migrations_manual/20260324_treasury_professional.sql`
  - `prisma/migrations_manual/20260324_treasury_professional.rollback.sql`
  - `prisma/migrations_manual/20260320_match_messages.sql`
  - `prisma/migrations_manual/20260320_match_messages.rollback.sql`
  - `prisma/migrations_manual/20260320_match_availability.sql`
  - `prisma/migrations_manual/20260320_match_availability.rollback.sql`
  - `prisma/migrations_manual/20260320_match_lineup.sql`
  - `prisma/migrations_manual/20260320_match_lineup.rollback.sql`

## Aturan Update Dokumentasi

Mulai sekarang, setiap ada perubahan fitur/endpoint/role/alur setup:

1. Update `README.md` pada section terkait di commit yang sama.
2. Jika perubahan menyentuh API, update bagian `API Ringkas`.
3. Jika perubahan menyentuh auth/role/menu, update bagian `Role Akses`.
4. Jika perubahan menyentuh setup/env/db, update bagian `Konfigurasi Environment` dan `Instalasi`.









