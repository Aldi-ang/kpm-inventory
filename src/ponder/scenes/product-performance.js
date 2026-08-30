/* Scene: the Product Performance panel on Reports.

   His rule, 2026-08-30: a new panel gets its own scene, in the sidebar section it is printed in.
   This one is printed on Reports, so it lives under `transactions`.

   LANGUAGE: short everyday Indonesian, column names left in the English the panel prints, and the
   subject of every sentence is the product, the period or the app — never the reader. That is his
   instruction from the same day: *"we are talking about the factory, subject is factory,
   employees, manager and all of these subject no u and me"*. Audit check 667 enforces it.

   🔴 THE SCENE HAS TO TEACH TWO THINGS THE NUMBERS DO NOT SAY THEMSELVES:
     1. the bar is SHARE of what moved, not progress toward a target nobody set, and
     2. an incomplete range says so, and the fix is a button in Settings.
   Everything else on the panel is legible without help. */
export const productPerformance = {
  id: 'product-performance',
  title: 'Product Performance',
  section: 'transactions',
  blurb: 'Barang mana yang benar-benar laku, dalam sehari, seminggu, sebulan atau setahun',
  stage: 'product-performance',
  related: ['stock-by-warehouse'],
  steps: [
    { text: 'Panel ini menjawab satu pertanyaan: **barang mana yang laku**, dan seberapa banyak, dalam rentang waktu yang dipilih.',
      focus: '*', at: 'bottom', hold: 5000 },

    { text: 'Angkanya menggabungkan **semua cabang**. Pertanyaannya tentang barangnya, bukan tentang gudangnya. Sebaran Stok yang memisah per gudang.',
      focus: 'col:head', at: 'bottom', hold: 6200 },

    { text: 'Satu baris satu barang. Urutannya dari yang paling banyak terjual.',
      focus: 'col:product', at: 'bottom', hold: 4600 },

    { text: '**Sold (Bks)** jumlah pak yang keluar dalam rentang itu. Penjualan dalam Slop, Bal atau Karton sudah diubah ke Bks dulu, jadi semuanya satu satuan.',
      focus: 'col:qty', at: 'bottom', tone: 'gold', hold: 6600 },

    { text: '**Revenue** uang yang masuk dari barang itu. Urutannya tidak selalu sama dengan Sold: **Cello Mint** laku banyak tapi harganya lebih murah per pak.',
      focus: 'row:perf-mint', at: 'near', hold: 6800 },

    { text: '**Share** berapa persen dari seluruh pak yang keluar periode ini. **Cello Chocolate** memakan sebagian besar.',
      focus: 'row:perf-choco', at: 'near', tone: 'gold', hold: 6000 },

    { text: 'Garis di bawah nama barang menggambar Share yang sama. Garis itu **bukan** target — tidak ada target di layar ini. Panjangnya berarti seberapa besar bagiannya dari yang terjual.',
      focus: 'bar', at: 'bottom', tone: 'gold', hold: 7200 },

    { text: 'Barang yang hampir berhenti laku tetap ditampilkan. **Cello Kopi** cuma 3 pak, dan justru baris seperti itu yang perlu dilihat.',
      focus: 'row:perf-kopi', at: 'near', tone: 'danger', hold: 6400 },

    { text: 'Baris bawah menjumlahkan semuanya: total pak keluar dan total uang masuk untuk periode itu.',
      focus: 'row:total', at: 'near', hold: 5600 },

    { text: 'Angka-angka ini dihitung otomatis setiap ada penjualan, jadi membukanya hampir tidak menambah biaya. Yang mahal itu menghitung ulang dari nol, dan itu hanya dilakukan lewat tombol.',
      focus: '*', at: 'bottom', hold: 7000 },

    { text: 'Kalau ada bulan yang belum pernah tercatat, panel bilang berapa bulan yang kurang. Angkanya masih benar untuk bulan yang ada, tapi belum lengkap.',
      focus: 'gap', at: 'near', tone: 'danger', hold: 7000 },

    { text: 'Perbaikannya ada di **Settings**: hitung ulang semua bulan dari nota aslinya. Nota tidak pernah ikut berubah — nota tetap sumber datanya, ringkasan ini cuma salinan yang bisa dibuat ulang kapan saja.',
      focus: 'gap', at: 'bottom', tone: 'gold', hold: 7600 },
  ],
};
