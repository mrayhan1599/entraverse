# purchase-in-transit-sync

Edge Function untuk menyinkronkan stok dalam perjalanan berdasarkan Pemesanan Pembelian berstatus belum dibayar dari API mitra (mis. Mekari Jurnal). Fungsi akan:

- Menarik daftar pemesanan pembelian berstatus belum dibayar secara paginasi.
- Menyimpan ringkasan pemesanan dan item ke tabel `purchase_orders` dan `purchase_order_items`.
- Menandai pesanan yang sebelumnya "unpaid" tetapi sudah tidak muncul lagi sebagai `removed`.
- Menghitung agregasi stok dalam perjalanan per SKU dan menyimpannya di tabel `in_transit_stock`.

## Menjalankan secara lokal

Pastikan variabel lingkungan berikut sudah terisi:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Opsional: `PURCHASE_ORDER_STATUS_KEY` (default `transaction_status`) dan `PURCHASE_ORDER_STATUS_VALUE` (default `Open`)

Lalu jalankan:

```bash
supabase functions serve purchase-in-transit-sync --env-file ./supabase/.env.local
```

## Deploy

```bash
supabase functions deploy purchase-in-transit-sync --project-ref your-project --env-file ./supabase/.env.local
```

## Penjadwalan

Gunakan Supabase Scheduled Functions untuk memanggil fungsi ini setiap jam sehingga stok dalam perjalanan selalu mengikuti status terbaru pemesanan pembelian.
