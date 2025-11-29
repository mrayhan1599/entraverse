# Pengujian Jurnal Sync Products: Tanggal Stok Habis

Panduan ini membantu mengecek apakah pembaruan tanggal stok habis (Periode A/B) sudah berjalan pada Supabase Edge Function `jurnal-sync-products`.

## Prasyarat
- Sudah memiliki proyek Supabase yang berisi tabel `products` dengan kolom `variant_pricing`.
- Kredensial Supabase (anon atau service role) dan URL proyek.
- Akses ke API Mekari Jurnal (atau bisa memakai payload dummy).
- Node.js terpasang untuk menjalankan skrip curl/HTTP.

## Menjalankan fungsi secara lokal
1. Export variabel lingkungan yang dibutuhkan oleh fungsi (mis. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `MEKARI_API_KEY`, `MEKARI_BASE_URL`).
2. Dari direktori repo, jalankan Supabase CLI:
   ```bash
   supabase functions serve --env-file supabase/.env.local --project-ref <project-ref> --no-verify-jwt
   ```
3. Catat URL fungsi lokal yang diberikan CLI (biasanya `http://localhost:54321/functions/v1/jurnal-sync-products`).

## Skenario uji utama

### 1) Stok turun menjadi 0 → tanggal stok habis terisi
1. Siapkan data produk di Supabase dengan `variant_pricing` yang memiliki stok awal > 0. Bila belum ada, buat manual melalui Supabase SQL atau insert JSON.
2. Kirim request POST ke fungsi dengan payload Mekari yang memuat stok baru 0 untuk varian tersebut, contoh:
   ```bash
   curl -X POST "http://localhost:54321/functions/v1/jurnal-sync-products" \
     -H "Content-Type: application/json" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -d '{"products": [{"id": "mekari-1", "name": "Tes", "available_stock": 0}]}'
   ```
3. Periksa tabel `products` → `variant_pricing` pada produk terkait. Field `stockOutDatePeriodA` atau `stockOutDatePeriodB` akan terisi ISO date sesuai tanggal hari ini (A bila tanggal ≤ 15, B bila > 15).

### 2) Stok yang sebelumnya 0 diisi kembali → tanggal stok habis dikosongkan
1. Pastikan varian yang sama kini memiliki `stockOutDatePeriodA/B` dan `stock` = 0.
2. Kirim payload dengan stok > 0, mis. `available_stock: 5`.
3. Pastikan kedua field `stockOutDatePeriodA` dan `stockOutDatePeriodB` menjadi `null` atau hilang di `variant_pricing`.

### 3) Validasi tidak ada perubahan lain
- Pastikan harga (`price`, `purchasePrice`, dll.) masih mengikuti aturan preserve yang sudah ada.
- Cek log Supabase CLI untuk memastikan tidak ada error selama fungsi dijalankan.

## Tips debugging
- Tambahkan `console.log` sementara pada bagian merge di `supabase/functions/jurnal-sync-products/index.ts` bila perlu melihat stok lama/baru.
- Gunakan `supabase functions logs` jika menjalankan di lingkungan deploy.
- Jika membutuhkan dummy produk, Anda bisa membuat satu baris di `products` dengan `variant_pricing` minimal berisi `id`, `stock`, `mekariProductId`, dan `sellerSku` untuk memudahkan pencocokan.
