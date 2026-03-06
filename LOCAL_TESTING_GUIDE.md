# PANDUAN LOCAL TESTING & MIGRASI MYSQL (PHASE 3)

Sebelum Anda melakukan upload repository ini ke server Pterodactyl (Local-to-Remote Deployment), Anda **DIWAJIBKAN** untuk melakukan test pipeline DB MySQL lokal terlebih dahulu.

Ikuti arahan berikut berurutan secara ketat:

## 1. Backup Dev Database (SQLite)
File `dev.db` yang ada di folder `prisma/` merupakan database lokal lama Anda yang mengandung data penting. Harap simpan / backup file tersebut agar sewaktu-waktu data tidak hilang. File ini tidak di-push ke Server.

## 2. Setting Kredensial Environment
Buat file baru di root project bernama `.env.local` (File ini sudah kami pastikan *Git Ignored* untuk keamanan privasi Anda). \
Isikan *connection URL* sesuai format MySQL Remote Server Anda (bisa copypaste struktur dari `.env.example`). \
**Note**: Pastikan Password Database di *URL-Encode* (misal: `@` jadi `%40`).
**Note 2**: Ekstensi `?connection_limit=1` Wajib ada di ujung string URL Anda.

## 3. Eksekusi Script Migrasi Data
Jika database MySQL baru Anda masih kosong, lakukan injeksi data lama (Users, Treasury, Tournaments, AuditLogs) dari `dev.db` ke Database MySQL Anda menggunakan command:

```bash
npm run migrate:local
```

*Jika berhasil, log terminal akan menunjukkan berapa baris row yang berpindah untuk setiap tabelnya.*

## 4. Run Development Local Test
Setelah database sinkron, jalankan perintah dev reguler untuk memastikan UI Aplikasi bekerja harmonis dengan Database Remote yang baru.

```bash
npm run dev
```

Cek Fungsi Minimum berikut:
1.  **Akses Web**: Coba login ke akun Anda kembali.
2.  **Health Check Module**: Tembak Endpoint `localhost:3000/api/health` via Postman/Browser. Status wajib `ok` dan Database wajib merespon `connected`.
3.  **Treasury / Tournament Module**: Buat turnamen baru dan pastikan record memantul di tabel MySQL eksternal.

## 5. Deployment Cuel
Bila Point 4 lulus dengan mulus 100%, Anda baru kami izinkan untuk men-_zip_ repository ini, dan mensetup `startup.sh` panel Pterodactyl Anda!
