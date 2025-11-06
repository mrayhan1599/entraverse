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

   Anda dapat menaruh konfigurasi ini di satu file terpisah dan memuatnya sebelum `assets/js/app.js` bila diperlukan.

3. Setelah konfigurasi benar, aplikasi akan otomatis melakukan seeding data awal (produk dan kategori contoh) saat pertama kali dijalankan.

### Pengembangan lokal

Proyek ini merupakan aplikasi statis. Anda dapat menjalankannya dengan server statis apa pun, misalnya:

```bash
npm install -g serve
serve .
```

Pastikan koneksi internet aktif agar library Supabase dapat dimuat dari CDN.

### Konfigurasi fungsi `jurnal-pnl`

Supabase Edge Function `jurnal-pnl` kini langsung meneruskan permintaan ke API Mekari Jurnal. Sebelum melakukan deploy, set variabel lingkungan berikut pada project Supabase Anda:

- `JURNAL_API_TOKEN` (wajib): API token/Authorization key dari Mekari Jurnal. Contoh: `gkVa5vJxxmzriunIyOHINHEmnZqew3H6`.
- `JURNAL_API_BASE_URL` (opsional): Basis URL API. Default: `https://api.jurnal.id`.
- `JURNAL_API_PATH` (opsional): Path endpoint. Default: `partner/core/api/v1/profit_and_loss`.

Function akan meneruskan parameter `start_date` dan `end_date` yang dikirimkan dari aplikasi ke endpoint tersebut dan mengembalikan payload JSON dari Mekari Jurnal kepada frontend.

