-- Tambahkan kolom jenis akun untuk tabel users.
-- Jalankan skrip ini di Supabase SQL Editor.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'pelanggan'
CHECK (user_type IN ('pelanggan', 'admin', 'owner'));

-- Pastikan data lama mendapatkan nilai bawaan.
UPDATE public.users
SET user_type = 'pelanggan'
WHERE user_type IS NULL;
