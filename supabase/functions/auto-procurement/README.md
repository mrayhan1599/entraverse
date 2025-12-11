# auto-procurement

Edge Function ini mengecek tanggal WIB hari ini, menghitung periode penjualan berikutnya (A dimulai setiap tanggal 1, B setiap tanggal 16) lalu memasukkan baris baru ke `procurement_needs` bila lead time produk jatuh tepat pada hari ini.

## Cara kerja singkat
1. Ambil tanggal WIB (tanpa jam) dan tentukan tanggal mulai periode berikutnya:
   - Jika hari <= 15: periode berikutnya mulai tanggal 16 (periode B bulan berjalan).
   - Jika hari > 15: periode berikutnya mulai tanggal 1 bulan berikutnya (periode A).
2. Ambil produk aktif dari tabel `procurement_catalog`.
3. Hitung tanggal pemesanan = `tanggal_mulai_periode - lead_time_days`.
4. Jika tanggal pemesanan sama dengan hari ini dan belum ada baris pada `procurement_needs` dengan SKU dan target_date hari ini, tulis entri baru.

## Menjalankan secara manual
```bash
supabase functions serve --env-file ./supabase/.env.local --no-verify-jwt --project-ref <your-project-ref>
```

Atau panggil endpoint produksi:
```bash
curl -X POST "https://<your-project-ref>.functions.supabase.co/auto-procurement" \
  -H "Authorization: Bearer <service_role_key>"
```

## Deploy
```bash
supabase functions deploy auto-procurement
```

Pastikan tabel `procurement_catalog` sudah dibuat (lihat `supabase/procurement_auto.sql`).
