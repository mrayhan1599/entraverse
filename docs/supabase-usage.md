# Supabase Egress Usage Guidance

Supabase membatasi bandwidth keluar (egress) untuk plan gratis sekitar 8 GB per bulan.
Ketika egress mencapai 100%, permintaan baru bisa dibatasi atau ditolak sampai kuota
reset di siklus tagihan berikutnya. Sebelum mempertimbangkan upgrade, coba langkah-langkah
berikut untuk menekan egress dan mempercepat aplikasi:

1. **Cache data di sisi klien** menggunakan `localStorage` atau IndexedDB sehingga pengguna
   tidak perlu mengunduh dataset penuh pada setiap kunjungan.
2. **Batasi ukuran payload** dengan menyeleksi kolom yang benar-benar diperlukan, menambahkan
   pagination, atau menerapkan filter sebelum mengambil data.
3. **Gunakan CDN untuk aset statis** seperti gambar produk agar trafik tersebut tidak dihitung
   sebagai egress database.
4. **Pantau kueri berat** memakai Supabase dashboard untuk menemukan endpoint yang paling banyak
   menggunakan bandwidth dan optimalkan aksesnya.

Jika setelah optimasi penggunaan egress tetap melebihi batas, pertimbangkan untuk upgrade ke
plan berbayar agar tidak mengalami throttling dan mendapatkan alokasi bandwidth yang lebih besar.
