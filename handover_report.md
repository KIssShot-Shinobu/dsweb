# Laporan Status Proyek Duel Standby - 6 Maret 2026

## 1. Tech Stack (Teknologi yang Digunakan)
- **Framework Utama:** Next.js 16.1.6 (App Router & Turbopack)
- **Frontend / View:** React 19.2.3, React DOM 19.2.3
- **Styling & Animasi:** Tailwind CSS v4, Framer Motion, Lucide React (Icons)
- **Database & ORM:** SQLite (`better-sqlite3`), Prisma ORM (`@prisma/client` 7.3.0)
- **Autentikasi & Keamanan:** Custom JWT (`jose`), Hashing Password (`bcryptjs`)
- **Validasi Data:** TypeScript, Zod

## 2. Struktur Folder Utama
```text
dsweb/
├── app/                  # Next.js App Router (Halaman & API)
│   ├── api/              # Endpoint Backend (REST API)
│   ├── dashboard/        # Halaman Private Admin & User Panel
│   ├── login/            # Halaman Autentikasi
│   └── register/         # Sistem Registrasi Multi-step
├── components/           # Reusable UI Components
│   └── dashboard/        # Komponen khusus dashboard (Sidebar, Navbar, Cards)
├── lib/                  # Utility Functions Backend & Frontend
│   ├── audit-logger.ts   # Sistem sentralisasi audit activities
│   ├── audit-utils.ts    # Helper untuk filtering JSON Log
│   ├── auth.ts           # Konfigurasi JWT & Role Checker
│   ├── prisma.ts         # Singleton instance Prisma Database
│   └── validators.ts     # Zod Schemas
├── prisma/               # Konfigurasi Database
│   ├── schema.prisma     # Definisi Skema Database & Enum
│   └── dev.db            # Database SQLite lokal
└── scripts/              # Script maintenance/migrasi (misal migrasi Log)
```

## 3. Fitur yang Sudah Selesai
- **Sistem Registrasi Kompleks:** Multi-step form, validasi Zod ekstensif, dan dukungan multi-game profile (Duel Links & Master Duel). 
- **Sistem Autentikasi JWT:** Sign Up, Login, Logout, dan perlindungan route API/Private Page (Verifikasi Token).
- **Role-Based Access Control (RBAC):** Sistem berbasis tingkatan (USER -> MEMBER -> OFFICER -> ADMIN -> FOUNDER) dengan strict middleware authorization.
- **Admin Panel - Member Management:** Fitur *Approve, Reject, Ban* dengan UI interaktif beserta filter data.
- **Audit Logs / Activity Tracking:** Rekaman tersentralisasi untuk semua aktivitas penting (Autentikasi, Admin Actions) yang mencatat IP, Method, Route, dan filter JSON sensitif. Dilengkapi fitur *Export CSV*.
- **Dynamic Dashboard Sidebar:** Sidebar UI berbasis role yang hanya menampilkan menu yang dapat diakses level user bersangkutan. (Bug state aktif sidebar teratasi).

## 4. Fitur yang Sedang Dikerjakan / Pending
- **Treasury (Kas Guild) & Tournaments:** Model database dan kerangka API sudah di-generate/tersedia, namun secara presentasi UI (Dashboard View) mungkin memerlukan pemolesan atau wiring lanjutan.
- **Notifikasi Bot WhatsApp:** Pengembangan integrasi notifikasi approval registrasi lintas platform ke WhatsApp (diketahui berada dalam scope codebase WhatsApp Bot terpisah sebelumnya).

## 5. Skema Database (Prisma)
- [User](file:///g:/Nextjs/nextds/dsweb/lib/auth.ts#22-23): Model pusat data user. Berelasi 1-to-many ke `GameProfile`, 1-to-to `RegistrationLog`, dan [AuditLog](file:///g:/Nextjs/nextds/dsweb/app/dashboard/audit-logs/page.tsx#5-24). Menyimpan status dan level *Role*.
- `GameProfile`: Menyimpan info in-game (IGN, Game ID) spesifik milik tiap User (ex. DUEL_LINKS / MASTER_DUEL).
- `RegistrationLog`: Data meta registrasi seperti prevGuild, socialMedia, form responses dll.
- [AuditLog](file:///g:/Nextjs/nextds/dsweb/app/dashboard/audit-logs/page.tsx#5-24): Sistem tracking aksi. Relasional ke [User](file:///g:/Nextjs/nextds/dsweb/lib/auth.ts#22-23), berisi target aksi, reason, request route, status response, dan payload (details JSON bersih).
- [Member](file:///g:/Nextjs/nextds/dsweb/app/generated/prisma/index.d.ts#20-21), [Tournament](file:///g:/Nextjs/nextds/dsweb/app/generated/prisma/index.d.ts#25-26), [Treasury](file:///g:/Nextjs/nextds/dsweb/app/generated/prisma/index.d.ts#30-31): Koleksi internal administrasi aktivitas komunitas.

*(Catatan: Schema telah mengadopsi ENUM strict secara penuh untuk tipe data terstruktur ([UserRole](file:///g:/Nextjs/nextds/dsweb/lib/auth.ts#22-23), [UserStatus](file:///g:/Nextjs/nextds/dsweb/app/generated/prisma/enums.ts#19-20), [GameType](file:///g:/Nextjs/nextds/dsweb/app/generated/prisma/enums.ts#47-48), [GuildStatus](file:///g:/Nextjs/nextds/dsweb/app/generated/prisma/enums.ts#39-40))).*

## 6. API & Integrasi (Endpoints)
*Sebagian list endpoint yang telah tersedia (Authentication dan RBAC Protected):*
- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **Admin Users:** `GET /api/admin/users`, `GET /api/admin/users/:id`, `PUT /api/admin/users/:id/status`
- **Auditing:** `GET /api/audit-logs`, `GET /api/audit-logs/export`
- **Utility:** `POST /api/upload` (Handling gambar/screenshot)
- **Komunitas:** `GET|POST /api/members`, `GET|POST /api/tournaments`, `GET|POST /api/treasury`

## 7. Styling & UI Design
- Menggunakan **Tailwind CSS v4** dengan tema eksklusif *Dark Mode* (`#0a0a0a` sentral).
- Sistem accent warna bertumpu pada konfigurasi palet emas kustom (seperti `ds-amber` atau `text-yellow-500`).
- Efek glassmorphism dan grid transparan minimalis digunakan pada card log dan formulir input.
- Desain *mobile-responsive* terintegrasi pada navigasi dan tabel dinamis.

## 8. Masalah / Bug Known
- **Next.js 16 Deprecation Warning:** Muncul peringatan `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.` saat proses dev/build akibat Next 16 Turbopack requirements. Fungsi keamanan tetap jalan, namun konvensi file [middleware.ts](file:///g:/Nextjs/nextds/dsweb/middleware.ts) harus segera dimigrasi.
- **Cache Turbopack Prisma:** Adanya kecenderungan `.next` caching menyimpan referensi lama ketika schema database SQLite dan type Prisma baru digenerate secara agresif. (Workaround: Hapus folder `.next` secara manual jika TServer crash / invalid type error).

## 9. Konfigurasi Penting (.env Requirements)
Untuk menjalankan proyek ini di Environment baru, dibutuhkan file [.env](file:///g:/Nextjs/nextds/dsweb/.env) berisi:
```env
# Koneksi Database SQLite Lokal
DATABASE_URL="file:./dev.db"

# Secret Key JWT (Panjang dan Aman)
JWT_SECRET="YOUR_SUPER_SECRET_KEY"

# Base URL Aplikasi
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 10. Rencana Selanjutnya (Next Steps)
1. **Migrasi Middleware:** Mengubah atau merestrukturisasi nama dan posisi [middleware.ts](file:///g:/Nextjs/nextds/dsweb/middleware.ts) mengikuti spesifikasi Next.js 16 (`proxy`).
2. **Kembangkan Treasury & Tourtament UI:** Wiring endpoint data turnamen ke panel UI Frontend secara penuh oleh Admin.
3. **Persiapan Production DB:** Karena SQLite terbatas pada konkurensi skala kecil, sebelum proyek launch publik direkomendasikan mengganti `provider = "sqlite"` di [schema.prisma](file:///g:/Nextjs/nextds/dsweb/prisma/schema.prisma) menjadi PostgreSQL (ex: Supabase / Neon) atau LibSQL (Turso).
4. **Integrasi Media Penyimpanan:** Sambungkan endpoint `Upload` menggunakan Cloud Provider (AWS S3, Cloudinary) karena SQLite di Vercel/Cloud Serverless tidak akan meyimpan persistensi File Lokal Uploaders.
