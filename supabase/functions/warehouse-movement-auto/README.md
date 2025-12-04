# warehouse-movement-auto

Edge Function untuk menarik laporan **Warehouse Items Stock Movement Summary** dari Mekari Jurnal secara otomatis, kemudian
menyimpannya ke tabel `warehouse_movements` di Supabase untuk dua periode per bulan:

- **Periode A:** tanggal 1–15 bulan berjalan.
- **Periode B:** tanggal 16–akhir bulan. Pada tanggal 1–15, periode B masih merujuk ke bulan sebelumnya; tanggal 16 ke atas
  menggunakan bulan berjalan.

## Alur kerja
1. Hitung rentang tanggal Periode A & B berdasarkan waktu WIB.
2. Ambil konfigurasi integrasi dari tabel `api_integrations` (fallback ke variabel lingkungan) untuk mendapatkan `baseUrl` dan
   `accessToken` Mekari.
3. Panggil endpoint `warehouse_items_stock_movement_summary` untuk masing-masing periode dengan `start_date` / `end_date` yang
   sudah dihitung.
4. Normalisasi payload (filter gudang target, hitung totals) lalu upsert ke `warehouse_movements` dengan `source = 'auto'` dan
   `period_signature` unik per periode/bulan (`auto-period-a-YYYY-MM`, `auto-period-b-YYYY-MM`).

## Konfigurasi lingkungan
Set variabel berikut pada project Supabase Anda sebelum deploy:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WAREHOUSE_API_TOKEN` — token API Mekari Jurnal jika tidak menggunakan kolom `access_token` pada `api_integrations`.
- `WAREHOUSE_API_BASE_URL` (opsional) — default `https://api.jurnal.id`.
- `WAREHOUSE_API_PATH` (opsional) — default `partner/core/api/v1/warehouse_items_stock_movement_summary`.
- `WAREHOUSE_TARGET_WAREHOUSE` (opsional) — nama gudang yang ingin difilter, default `Display`.
- `WAREHOUSE_INTEGRATION_NAME` (opsional) — nama integrasi pada tabel `api_integrations`, default `Mekari Jurnal`.

## Deploy & jadwal
Deploy seperti biasa lalu jadwalkan harian agar periode diperbarui otomatis:

```bash
supabase functions deploy warehouse-movement-auto
supabase functions schedule create warehouse-movement-auto --schedule "5 0 * * *" --url "/warehouse-movement-auto"
```

Anda juga bisa invoke manual:

```bash
supabase functions invoke warehouse-movement-auto --project-ref <project-ref>
```
