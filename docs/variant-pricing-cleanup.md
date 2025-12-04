# Membersihkan data `variant_pricing`

Gunakan skrip berikut di **Supabase SQL Editor** untuk menormalkan entri `variant_pricing`:

- Semua nilai lead time dipindahkan ke field `leadTime` (jika sebelumnya hanya ada `lead_time`, nilainya tetap dipertahankan).
- Field legacy `lead_time`, `currentStock`, dan `current_stock` dihapus agar tidak ikut tersimpan di JSON.

```sql
update public.products
set variant_pricing = coalesce(
  (
    select jsonb_agg(
      -- Hapus field legacy lalu tambahkan `leadTime` bila tersedia
      (entry - 'lead_time' - 'currentStock' - 'current_stock') ||
      coalesce(
        nullif(entry -> 'leadTime', 'null'::jsonb),
        nullif(entry -> 'lead_time', 'null'::jsonb),
        '{}'::jsonb
      )
    )
    from jsonb_array_elements(variant_pricing) as entry
  ),
  '[]'::jsonb
)
where exists (
  select 1
  from jsonb_array_elements(variant_pricing) as entry
  where entry ? 'lead_time' or entry ? 'currentStock' or entry ? 'current_stock'
);
```

Skrip tersebut aman dijalankan berulang kali dan hanya memproses baris yang masih memiliki field legacy.
