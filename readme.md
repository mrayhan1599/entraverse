## Entraverse Admin

Halaman admin Entraverse kini menggunakan Supabase sebagai basis data untuk autentikasi, produk, dan kategori.

### Konfigurasi Supabase

1. Buat proyek baru di [Supabase](https://supabase.com/).
2. Buka **SQL Editor** dan jalankan skrip berikut untuk menyiapkan tabel yang dibutuhkan:

   ```sql
   create table if not exists public.users (
     id uuid primary key,
     name text not null,
     company text not null,
     email text not null unique,
     password_hash text not null,
     created_at timestamptz not null default timezone('utc', now()),
     updated_at timestamptz
   );

   create table if not exists public.categories (
     id text primary key,
     name text not null,
     note text,
     fees jsonb default '{}'::jsonb,
     margin jsonb default '{}'::jsonb,
     created_at timestamptz not null default timezone('utc', now()),
     updated_at timestamptz
   );

   create table if not exists public.products (
     id uuid primary key,
     name text not null,
     category text not null,
     brand text,
     description text,
     trade_in boolean default false,
     inventory jsonb,
     photos text[] default '{}',
     variants jsonb default '[]'::jsonb,
     variant_pricing jsonb default '[]'::jsonb,
     created_at timestamptz not null default timezone('utc', now()),
     updated_at timestamptz
   );

   create table if not exists public.shipping_vendors (
     id uuid primary key,
     name text not null,
     services text,
     coverage text,
     pic text,
     email text,
     phone text,
     detail_url text,
     air_rate numeric,
     sea_rate numeric,
     note text,
     created_at timestamptz not null default timezone('utc', now()),
     updated_at timestamptz
   );
   ```

3. Aktifkan Row Level Security (RLS) sesuai kebutuhan dan pastikan aturan mengizinkan akses dari `anon` key untuk operasi yang diperlukan selama pengembangan.
4. Salin **Project URL** dan **Anon public key** dari menu **Project Settings → API**.

### Konfigurasi aplikasi

1. Buka salah satu berkas HTML (`index.html`, `login.html`, `register.html`, `dashboard.html`, `add-product.html`, atau `categories.html`).
2. Ubah nilai pada blok konfigurasi berikut agar sesuai dengan kredensial Supabase Anda:

   ```html
   <script>
     window.entraverseConfig = window.entraverseConfig || {};
     window.entraverseConfig.supabase = window.entraverseConfig.supabase || {
       url: 'https://your-project.supabase.co',
       anonKey: 'public-anon-key'
     };
   </script>
   ```

   Aplikasi kini menyertakan bundel lokal `assets/vendor/supabase-js-2.43.4.js` sehingga dependensi Supabase dapat dimuat tanpa akses CDN. Pastikan skrip tersebut dimuat sebelum `assets/js/app.js` apabila Anda memisahkan konfigurasi ke file lain.

3. Setelah konfigurasi benar, aplikasi akan otomatis melakukan seeding data awal (produk dan kategori contoh) saat pertama kali dijalankan.

### Pengembangan lokal

Proyek ini merupakan aplikasi statis. Anda dapat menjalankannya dengan server statis apa pun, misalnya:

```bash
npm install -g serve
serve .
```

Pastikan koneksi internet aktif agar library Supabase dapat dimuat dari CDN.

### Menambahkan kolom ID produk Mekari di varian

Setiap varian produk kini menyimpan `mekariProductId` sebagai referensi ke ID produk
asli di Mekari Jurnal. Untuk dataset lama yang belum memiliki kolom baru tersebut,
jalankan skrip berikut melalui **Supabase SQL Editor** agar tiap entri `variant_pricing`
mendapatkan field `mekariProductId` (diinisialisasi `null`). Nilai ini akan terisi
otomatis ketika sinkronisasi produk Mekari dijalankan.

```sql
update public.products
set variant_pricing = coalesce(
  (
    select jsonb_agg(
      case
        when entry ? 'mekariProductId' then entry
        else entry || jsonb_build_object('mekariProductId', null)
      end
    )
    from jsonb_array_elements(variant_pricing) as entry
  ),
  '[]'::jsonb
)
where exists (
  select 1
  from jsonb_array_elements(variant_pricing) as entry
  where not (entry ? 'mekariProductId')
);
```

### Konfigurasi fungsi `jurnal-pnl`

Supabase Edge Function `jurnal-pnl` kini langsung meneruskan permintaan ke API Mekari Jurnal. Sebelum melakukan deploy, set variabel lingkungan berikut pada project Supabase Anda:

- `JURNAL_API_TOKEN` (wajib): API token/Authorization key dari Mekari Jurnal. Contoh: `gkVa5vJxxmzriunIyOHINHEmnZqew3H6`.
- `JURNAL_API_BASE_URL` (opsional): Basis URL API. Default: `https://api.jurnal.id`.
- `JURNAL_API_PATH` (opsional): Path endpoint. Default: `partner/core/api/v1/profit_and_loss`.

Function akan meneruskan parameter `start_date` dan `end_date` yang dikirimkan dari aplikasi ke endpoint tersebut dan mengembalikan payload JSON dari Mekari Jurnal kepada frontend.

### Sinkronisasi produk Mekari di backend (Supabase Edge Function)

Jika ingin menjadwalkan sinkronisasi produk tanpa membuka dashboard, deploy fungsi Edge berikut dan jalankan terjadwal melalui Supabase cron schedule:

1. Pastikan variabel environment berikut tersedia pada project Supabase Anda:
   - `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` (sudah diisi otomatis oleh Supabase saat deploy fungsi).
   - `MEKARI_ACCESS_TOKEN` (wajib jika tidak menyimpan token pada tabel `api_integrations`).
   - `MEKARI_BASE_URL` (opsional, default: `https://api.jurnal.id`).

2. Deploy fungsi:
   ```bash
   supabase functions deploy mekari-products-sync --no-verify-jwt
   ```

3. (Opsional) Jalankan terjadwal setiap hari pukul 00:01 WIB:
   ```bash
   supabase functions deploy mekari-products-sync --no-verify-jwt --schedule "1 0 * * *"
   ```

Fungsi `mekari-products-sync` akan mengambil token Mekari Jurnal dari tabel `api_integrations` (nama integrasi `Mekari Jurnal`) atau environment `MEKARI_ACCESS_TOKEN`, menarik daftar produk dari Mekari, lalu melakukan upsert ke tabel `products` Supabase. Status sinkronisasi terakhir akan diperbarui pada kolom `last_sync` di tabel `api_integrations`.

Jika Anda menyimpan token Mekari di tabel `api_integrations`, pastikan barisnya sudah ada sebelum menjalankan fungsi:

```sql
create table if not exists public.api_integrations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  api_base_url text,
  access_token text,
  last_sync timestamptz
);

insert into public.api_integrations (name, api_base_url, access_token)
values ('Mekari Jurnal', 'https://api.jurnal.id', 'Bearer <token Anda>')
on conflict (name) do update
set api_base_url = excluded.api_base_url,
    access_token = excluded.access_token;
```

Masukkan token tanpa awalan "Bearer" pun tetap diterima—fungsi akan menambahkan awalan tersebut secara otomatis saat memanggil API Mekari.

