# procurement-scheduler

Edge Function untuk menjadwalkan tanggal pengadaan harian berdasarkan lead time dan periode A/B bulanan.

## Alur singkat
1. Ambil semua produk dari tabel `products` beserta `variant_pricing`-nya.
2. Hitung daftar periode A/B selama 6 bulan ke depan (WIB), misalnya:
   - Periode A: 1–15 setiap bulan (`procurement-YYYY-MM-a`).
   - Periode B: 16–akhir bulan (`procurement-YYYY-MM-b`).
3. Untuk setiap varian dengan `next_procurement > 0` dan `lead_time` valid, cari periode terdekat yang
   tanggal pengadaan-nya (start periode dikurangi lead time) jatuh **hari ini atau setelahnya**.
4. Tulis hasil terdekat ke kolom berikut di `variant_pricing`:
   - `nextProcurementDate` / `next_procurement_date` — tanggal pengadaan (ISO string).
   - `nextProcurementPeriod` / `next_procurement_period` — label periode, contoh `01 Januari 2026 – 15 Januari 2026`.
   - `nextProcurementSignature` / `next_procurement_signature` — signature unik, contoh `procurement-2026-01-a`.

## Deploy & jadwal
Deploy seperti biasa lalu sertakan jadwal cron supaya berjalan otomatis setiap hari pukul 12:00 WIB (05:00 UTC):

```bash
supabase functions deploy procurement-scheduler
supabase functions deploy --include-cron
```

Anda juga bisa invoke manual:

```bash
supabase functions invoke procurement-scheduler --project-ref <project-ref>
```

## Respons contoh
```json
{
  "scannedProducts": 120,
  "variantsUpdated": 42,
  "productsWritten": 18,
  "plannedPeriods": 14,
  "dueToday": 6
}
```

## Catatan
- Fungsi hanya menjadwalkan varian dengan `next_procurement` > 0 dan `lead_time` >= 0.
- Tanggal dihitung dengan zona waktu WIB, lalu disimpan sebagai ISO string (UTC) di Supabase.
