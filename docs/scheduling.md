# Penjadwalan Sinkronisasi Mekari & Deploy Otomatis

Dokumen ini menjelaskan dua opsi untuk menjadwalkan sinkronisasi Mekari Jurnal
pukul 00:01 WIB tanpa mengandalkan tab browser pengguna:

1. **GitHub Actions** dengan jadwal `cron` yang memanggil Supabase Edge Function
   `jurnal-pnl`.
2. **Supabase Scheduler** untuk memanggil fungsi yang sama langsung dari proyek
   Supabase (tidak perlu GitHub runner).

## 1) GitHub Actions: trigger harian 00:01 WIB

Repository kini menyertakan workflow `.github/workflows/mekari-sync.yml` yang
menjalankan permintaan HTTP ke Edge Function. **Workflow tidak akan berjalan
kalau secrets wajib belum diisi**. Cron `1 17 * * *` ekuivalen dengan 00:01 WIB
(UTC+7). Workflow juga bisa dijalankan manual via `workflow_dispatch`.

### Langkah cepat konfigurasi GitHub Actions
1. Buka **Settings → Secrets and variables → Actions** di repository GitHub
   Anda.
2. Tambahkan secrets berikut (wajib):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Jalankan tab **Actions** → pilih workflow *Scheduled Mekari Sync* → klik
   **Run workflow** sekali untuk memastikan secrets terbaca (optional tetapi
   disarankan). Setelah itu cron harian akan aktif otomatis.
4. Pastikan Supabase Edge Function `jurnal-pnl` sudah dideploy dan variabel
   `JURNAL_API_TOKEN` (serta opsi `JURNAL_API_BASE_URL` dan `JURNAL_API_PATH`)
   disetel di Supabase agar permintaan dari GitHub berhasil.

### Menyiapkan secrets GitHub
Tambahkan secrets berikut di **Settings → Secrets and variables → Actions**:

- `SUPABASE_URL`: URL proyek Supabase, misalnya `https://abccompany.supabase.co`.
- `SUPABASE_SERVICE_ROLE_KEY`: service role key agar Edge Function bisa melewati
  RLS ketika perlu akses penuh.
- `SUPABASE_FUNCTION_PATH` (opsional): path fungsi, default `/functions/v1/jurnal-pnl`.
- `JURNAL_SYNC_START_DATE` dan `JURNAL_SYNC_END_DATE` (opsional): tanggal `YYYY-MM-DD`
  jika ingin memaksa rentang tertentu; jika kosong, workflow memakai tanggal UTC hari ini.

Konfigurasi Edge Function `jurnal-pnl` tetap memakai variabel lingkungan
`JURNAL_API_TOKEN`, `JURNAL_API_BASE_URL`, dan `JURNAL_API_PATH` seperti dijelaskan
di `readme.md`.

### Apa yang dilakukan workflow
- Hanya berjalan jika secrets `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` ada.
- Mengirim `POST` ke `{SUPABASE_URL}{FUNCTION_PATH}` dengan payload:

```json
{"start_date":"<START>","end_date":"<END>"}
```

- Jika secret tanggal kosong, `<START>` dan `<END>` diisi tanggal UTC saat job
  berjalan.

Anda bisa memperluas workflow (mis. menambahkan langkah build/deploy GitHub Pages)
sebelum atau sesudah langkah pemanggilan API bila dibutuhkan.

## 2) Supabase Scheduler: panggil Edge Function tanpa GitHub

Supabase menyediakan Scheduler bawaan (beta) sehingga Anda dapat menjadwalkan
pemanggilan Edge Function langsung dari proyek Supabase.

1. **Pastikan Supabase CLI** terpasang dan login ke proyek Anda.
2. **Buat jadwal** harian pukul 00:01 WIB (17:01 UTC) yang memanggil fungsi
   `jurnal-pnl`:

   ```bash
   supabase functions schedule create jurnal-pnl-daily \
     --cron "1 17 * * *" \
     --invoke "jurnal-pnl" \
     --data '{"start_date":"$(date -u +"%Y-%m-%d")","end_date":"$(date -u +"%Y-%m-%d")"}'
   ```

   Ganti payload `start_date`/`end_date` jika ingin rentang lain. Scheduler
   memakai kredensial proyek Supabase sehingga Edge Function menerima konteks
   autentikasi bawaan.

3. **Cek jadwal** yang sudah dibuat:

   ```bash
   supabase functions schedule list
   ```

4. **Hapus atau ubah jadwal** jika diperlukan:

   ```bash
   supabase functions schedule delete jurnal-pnl-daily
   # atau
   supabase functions schedule update jurnal-pnl-daily --cron "1 17 * * *"
   ```

Dengan dua opsi di atas, sinkronisasi Mekari dapat berjalan otomatis tanpa
mengandalkan tab browser pengguna, sekaligus menjaga jam eksekusi 00:01 WIB.
