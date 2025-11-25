# Langkah Lanjutan Setelah Edge Function `jurnal-sync-products` Terpasang

Panduan ini menjawab pertanyaan "setelah fungsi dimasukkan ke Edge Functions, apa selanjutnya?" untuk memastikan sinkronisasi produk Mekari Jurnal berjalan otomatis dan dapat dipantau.

> **Apa saja yang disalin?**
> - Data produk + variasi, berikut metadata harga/stock.
> - **Gambar produk**: fungsi otomatis menarik URL gambar dari Mekari (field `photos`/`images`/`image_url`/`thumbnail`, termasuk yang bersarang di objek `product`) dan mengisi kolom `photos` di tabel `products`.

## 1) Set Environment Variable di Supabase Dashboard
Masuk ke **Project Settings → Configuration → Secrets** lalu tambahkan key berikut:
- `JURNAL_API_TOKEN` – bearer token Mekari Jurnal (format: `Bearer <token>`).
- `SUPABASE_URL` – URL proyek Supabase Anda.
- `SUPABASE_SERVICE_ROLE_KEY` – service role key Supabase (dibutuhkan untuk upsert ke tabel `products`).
- Opsional:
  - `JURNAL_API_BASE_URL` – ubah jika endpoint Mekari berbeda (default: `https://api.jurnal.id`).
  - `MEKARI_INCLUDE_ARCHIVE` – set `true` jika ingin ikut menarik produk yang diarsipkan.

Simpan perubahan, lalu redeploy fungsi jika diperlukan.

## 2) Uji Invoke Manual dari Dashboard
1. Buka **Edge Functions → jurnal-sync-products → Testing**.
2. Kirim request `POST` tanpa body (atau `{}`) dan pastikan respons `{"ok": true, "synced": ...}`.
3. Jika gagal, cek **Edge Function Logs** untuk pesan error (env var, auth token, atau format respons Mekari).

## 3) Jadwalkan Eksekusi Otomatis (00:01 WIB)
Anda punya dua opsi:

**a. Supabase Cron (Integrations → Cron) tanpa perlu server luar**
1. Pastikan extension **`pg_net`** aktif di **Database → Extensions** (dibutuhkan untuk HTTP POST).
2. Simpan token Mekari di **Vault → Secrets** dengan nama `JURNAL_API_TOKEN` agar tidak menulis hardcoded di Cron.
3. Buka **Integrations → Cron → Create job**.
4. Isi form:
   - **Name**: `jurnal-sync-products`
   - **Schedule**: `1 17 * * *` (17:01 UTC = 00:01 WIB)
   - **Command** (panggil Edge Function lewat `net.http_post`):
     ```sql
     -- Simpan dua secret di Vault: SUPABASE_SERVICE_ROLE_KEY dan SUPABASE_ANON_KEY
     select net.http_post(
       url := 'https://<PROJECT>.supabase.co/functions/v1/jurnal-sync-products',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         -- Wajib: JWT Supabase, bukan token Mekari. Tanpa ini akan 401 di Edge Function logs.
         'Authorization', 'Bearer ' || vault.get_secret('SUPABASE_SERVICE_ROLE_KEY'),
         'apikey', vault.get_secret('SUPABASE_ANON_KEY')
       ),
       body := '{}'::jsonb
     );
     ```
    **Jika mengisi via UI Cron (seperti contoh screenshot):**
    - Tambah dua header dan pastikan jenisnya benar (nama header ditulis tanpa backtick, backtick hanya dipakai di dokumentasi):
      - Authorization → pilih tipe **JWT**, lalu isi `Bearer <SUPABASE_SERVICE_ROLE_KEY>` (ambil dari Vault, **jangan** pakai token Mekari).
      - apikey → pilih tipe **Custom header**, isi `<SUPABASE_ANON_KEY>` dari Vault.
     - Biarkan HTTP Request Body kosong atau `{}`.
     - Pastikan tidak ada header lain yang memakai token Mekari, karena itu akan memicu 401 di Edge Function logs.
5. Simpan. Anda bisa klik **Run now** untuk uji coba, atau jalankan manual via SQL:
   ```sql
   select cron.run_job(<JOB_ID>);
   ```
6. Pantau di **Logs → Cron** untuk status sukses/gagal. Jika token kedaluwarsa, perbarui di Vault tanpa mengubah job.

**b. Supabase Scheduled Functions (jika tersedia di plan Anda)**
- Buka **Edge Functions → Schedule**.
- Tambah job baru, pilih fungsi `jurnal-sync-products`.
- Cron: `1 17 * * *` (17:01 UTC = 00:01 WIB). Sesuaikan zona waktu jika perlu.
- Method: `POST`, tanpa body. Tambahkan header `Authorization: Bearer <JURNAL_API_TOKEN>` bila fungsi mengharuskannya.

**c. GitHub Actions (cron) memanggil endpoint fungsi**
1. Tambahkan workflow di repo Anda (mis. `.github/workflows/cron-jurnal-sync.yml`):
   ```yaml
   name: Daily Mekari Sync

   on:
     schedule:
       - cron: "1 17 * * *"  # 00:01 WIB (UTC+7)
     workflow_dispatch: {}

   jobs:
     call-supabase-function:
       runs-on: ubuntu-latest
       steps:
         - name: Call jurnal-sync-products
           run: |
             curl -X POST \
               -H "Content-Type: application/json" \
               -H "Authorization: ${{ secrets.JURNAL_API_TOKEN }}" \
               https://<PROJECT>.supabase.co/functions/v1/jurnal-sync-products \
               -d '{}'
   ```
2. Set secrets di GitHub: `JURNAL_API_TOKEN` dan, jika fungsi di-protect, header tambahan sesuai kebutuhan.

## 4) Monitoring & Logging
- Gunakan `supabase functions logs --project-ref <REF>` (atau tab Logs di dashboard) untuk memantau kegagalan.
- Tambahkan alert di GitHub Actions (on-failure email) jika memakai opsi cron GitHub.
- Cek tabel `products` untuk memastikan kolom `mekari_status` dan `variant_pricing` terisi.

## 5) Troubleshooting Cepat
- **401/403**: token Supabase yang dikirim ke fungsi salah (mis. memakai token Mekari sebagai Authorization) atau JWT kedaluwarsa.
- **500 Supabase**: pastikan service role key benar dan tabel `products` ada dengan kolom yang sesuai payload fungsi.
- **Tidak ada data baru**: periksa cron (waktu UTC), log fungsi, atau atur `MEKARI_INCLUDE_ARCHIVE=true` jika perlu menarik produk lama.

Dengan langkah di atas, fungsi akan berjalan otomatis tiap 00:01 WIB dan bisa dipantau lewat dashboard/logs.
