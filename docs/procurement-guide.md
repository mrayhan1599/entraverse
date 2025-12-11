# Panduan Proses Pengadaan

## Alur perhitungan jadwal
- **Periode bulanan**
  - Periode A: tanggal 1–15 setiap bulan.
  - Periode B: tanggal 16–akhir bulan (28/29/30/31 sesuai kalender).
- **Lead time**
  - Untuk setiap varian produk, lead time dibaca dari `variant_pricing.lead_time` (atau `leadTime`).
  - Tanggal pengadaan dihitung **H-lead time** dari tanggal mulai periode (contoh lead time 15 hari → pengadaan untuk Periode A bulan depan jatuh pada 16 hari sebelum 1 tanggal tersebut dalam WIB).
- **Kebutuhan pengadaan**
  - Sistem memakai nilai `next_procurement` per varian sebagai jumlah yang harus disiapkan untuk periode tersebut.
- **Harga**
  - Harga pembelian per varian diambil dari `purchase_price_idr` (fallback ke `purchase_price` atau harga inventori) dan ditampilkan pada tab Pengadaan.
- **Filter jadwal**
  - Hanya jadwal yang tanggal pengadaannya masih di depan (>= hari ini WIB) yang ditampilkan, diurutkan dari yang paling dekat.

## Otomasi harian (Supabase Edge Function)
- Fungsi `procurement-scheduler` membaca tabel `products` dan menghitung jadwal untuk beberapa bulan ke depan.
- Hasil terdekat per varian disimpan kembali ke `variant_pricing` dengan kolom:
  - `nextProcurementDate`: ISO datetime pengadaan berikutnya.
  - `nextProcurementPeriod`: label periode (mis. "01 Januari 2026 – 15 Januari 2026").
  - `nextProcurementSignature`: tanda unik periode (mis. `procurement-2026-01-a`).
- Cron Supabase menjalankan fungsi ini setiap hari pukul **12:00 WIB (05:00 UTC)** via entri `daily-procurement-scheduler` di `supabase/cron.json`.

## Cara mengecek di antarmuka
1. Buka halaman **Pembelian** (`purchases.html`).
2. Pilih tab **Pengadaan** (tab paling kiri). Tabel akan otomatis memuat jadwal dari cache produk atau Supabase jika tersedia.
3. Kolom yang terlihat:
   - *Periode*: rentang tanggal periode A/B.
   - *Tanggal Pengadaan*: tanggal H-lead time ketika pembelian perlu dibuat.
   - *SKU*, *Barang & Varian*, *Kebutuhan*, *Harga*.
4. Jika data kosong, pastikan produk memiliki `next_procurement` dan `lead_time` terisi.

## Cara mengetes sistem berjalan
### Uji otomatis Edge Function secara lokal (Supabase CLI)
1. Pastikan Supabase CLI terpasang dan environment `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` terset.
2. Dari root repo, jalankan fungsi secara lokal:
   ```bash
   supabase functions serve procurement-scheduler --env-file ./supabase/.env.local
   ```
3. Panggil endpoint (mis. lewat curl) untuk memicu perhitungan:
   ```bash
   curl -i "http://localhost:54321/functions/v1/procurement-scheduler"
   ```
4. Periksa respons JSON:
   - `plannedProcurements` > 0 jika jadwal terhitung.
   - `productsWritten` menunjukkan berapa produk yang diperbarui.
   - `dueToday` untuk memastikan deteksi yang jatuh tempo hari ini.

### Uji cron terjadwal di Supabase
1. Deploy fungsi dan cron config: `supabase functions deploy procurement-scheduler` lalu `supabase functions deploy --include-cron` atau gunakan dashboard Supabase.
2. Di dashboard Supabase → Edge Functions → Logs, cek log eksekusi sekitar pukul 12:00 WIB (atau gunakan tombol *Run now* untuk menjalankan manual).
3. Verifikasi tabel `products.variant_pricing` terisi kolom `nextProcurementDate`, `nextProcurementPeriod`, dan `nextProcurementSignature` setelah cron berjalan.

### Uji tampilan tab Pengadaan
1. Siapkan contoh produk pada cache lokal (localStorage) atau isi tabel `products` di Supabase dengan `variant_pricing` berisi `lead_time` dan `next_procurement`.
2. Buka `purchases.html` di browser.
3. Pastikan baris tabel muncul sesuai jadwal yang dihitung (urut dari terdekat). Jika ada kesalahan parsing, pesan error akan muncul di area tabel.

### Pemeriksaan manual perhitungan lead time
1. Ambil satu varian dengan `lead_time` tertentu, mis. 15 hari, dan pilih periode target (A atau B).
2. Hitung manual tanggal mulai periode (mis. Periode B Januari 2026 mulai 16 Jan 2026).
3. Mundurkan sesuai lead time (16 Jan 2026 minus 15 hari = 1 Jan 2026). Tanggal ini harus sama dengan kolom *Tanggal Pengadaan* di tab Pengadaan maupun pada `nextProcurementDate` yang disimpan.
