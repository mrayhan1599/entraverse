# Mekari sync tanpa membuka dashboard

Edge Function `mekari-sync` memungkinkan stok Mekari diperbarui langsung ke tabel `products` tanpa perlu membuka dashboard pada pukul 00:01. Fungsi ini mencocokkan SKU varian di Supabase dengan SKU produk Mekari, lalu menulis ulang nilai `stock` pada setiap varian yang cocok.

## Deploy
1. Pastikan Supabase CLI sudah terpasang dan Anda login ke proyek yang benar.
2. Set environment berikut pada fungsi:
   - `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` (otomatis diisi oleh `supabase functions deploy`).
   - `MEKARI_TOKEN`: token API Mekari (nilai yang sama dengan yang dipakai di frontend).
   - Opsional `MEKARI_BASE_URL`: basis URL API Mekari, default `https://api.jurnal.id`.
3. Deploy fungsi:
   ```bash
   supabase functions deploy mekari-sync
   ```

## Penjadwalan cron di Supabase
Tambahkan job di Supabase dengan jadwal harian 00:01 WIB (17:01 UTC):
```sql
select cron.schedule(
  'mekari-sync-daily',
  '1 17 * * *',
  $$
    select
      net.http_post(
        url => 'https://<YOUR-PROJECT>.functions.supabase.co/mekari-sync',
        headers => '{"Content-Type":"application/json"}',
        body => ''
      );
  $$
);
```
Ganti `<YOUR-PROJECT>` dengan subdomain Supabase Anda.

## Catatan perilaku
- Fungsi hanya memperbarui stok varian yang memiliki SKU cocok; varian tanpa SKU atau produk baru Mekari tidak dibuat otomatis.
- Sinkronisasi menggunakan `service_role` sehingga jalankan hanya dari backend/cron, bukan dari browser.
