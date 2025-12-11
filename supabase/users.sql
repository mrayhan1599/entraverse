-- Tambahkan kolom jenis akun untuk tabel users.
-- Jalankan skrip ini di Supabase SQL Editor.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS user_type TEXT;

-- Pastikan constraint lama tidak membatasi nilai super_admin.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Pastikan data lama mendapatkan nilai bawaan sebelum mengatur NOT NULL.
UPDATE public.users
SET user_type = 'pelanggan'
WHERE user_type IS NULL;

-- Pastikan nilai default dan batasan jenis akun diperbarui.
ALTER TABLE public.users
ALTER COLUMN user_type SET DEFAULT 'pelanggan',
ALTER COLUMN user_type SET NOT NULL;

ALTER TABLE public.users
ADD CONSTRAINT users_user_type_check CHECK (user_type IN ('pelanggan', 'admin', 'owner', 'super_admin'));

-- Jadikan email berikut sebagai Super Admin.
UPDATE public.users
SET user_type = 'super_admin'
WHERE LOWER(email) = LOWER('rayhan1599@gmail.com');
