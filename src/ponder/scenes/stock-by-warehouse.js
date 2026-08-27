/* Scene: the Stock by Warehouse panel.

   LANGUAGE — his rule, 2026-08-27: *"teaching just use indonesia, for terms for the features and
   components just use english"*. So the sentences are Indonesian and every column name stays in
   the English it is printed in on screen. `**Sold (7d)**` renders as gold ink, which is what
   makes a term visibly a term rather than a word in the sentence.

   The two formulas in beats 5 and 6 are the ones the panel footnote currently carries. When the
   footnote is deleted in the next slice, audit check 631 MOVES onto this file — it is not
   deleted. A check removed to let a change pass is how the bug it caught comes back. */
export const stockByWarehouse = {
  id: 'stock-by-warehouse',
  title: 'Stock by Warehouse',
  blurb: 'Di mana semua barang berada, dan gudang mana yang harus diisi duluan',
  stage: 'placeholder',
  related: [],
  steps: [
    { text: 'Tabel ini menampilkan semua gudang kamu dalam satu layar. Semua angka dalam **Bks**.',
      focus: '*' },
    { text: '**In stock** adalah barang yang ada di rak gudang itu sekarang juga. Tidak termasuk yang lain.',
      focus: 'col:shelf' },
    { text: '**Shipping** adalah barang yang sudah kamu kirim tapi belum dihitung masuk. Belum bisa dijual siapa pun.',
      focus: 'col:transit' },
    { text: '**Agent inventory** sudah sampai dan sedang dibawa salesman. Yang ini sudah bisa dijual.',
      focus: 'col:field' },
    { text: '**Sold (7d)** menghitung penjualan 7 hari terakhir. **Avg / month** = Sold (7d) ÷ 7 × 30 — itu perkiraan, makanya ditulis pakai ≈.',
      focus: 'col:permonth', hold: 4600 },
    { text: '**Est. days left** = In stock ÷ (Sold (7d) ÷ 7). Merah berarti kurang dari seminggu — kirim ke sana duluan.',
      focus: 'col:daysleft', hold: 4600 },
    { text: 'Buka satu gudang untuk melihat isinya. Total gudang bisa terlihat aman padahal satu produk di dalamnya hampir habis.',
      focus: 'row:master', hold: 4600 },
  ],
};
