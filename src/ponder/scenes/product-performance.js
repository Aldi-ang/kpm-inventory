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
   Everything else on the panel is legible without help.

   🔴 SPLIT 2026-09-04: ONE IDEA PER BEAT. Aldi, across the whole book — *"there is too much words
   but too little showing"*, *"make sure that for almost every sentence there is some textbox to
   highlights and explain not just sentence reading"*, *"also apply this logic to other tutorial as
   well"*. Measured before the split: 12 beats averaging 137 characters, three over 150, and holds
   up to 7600ms — three sentences would run past on one highlight and the eye had nowhere to go.
   It is 30 beats now, one sentence each, holds around 2400–4000ms.

   The stage already carried the anchors: `ProductPerformanceTable` has 14 and the old scene named
   10, so the sentences mostly just needed splitting onto keys that already existed. `row:perf-teh`
   was the only one nobody pointed at. */
export const productPerformance = {
  id: 'product-performance',
  title: 'Product Performance',
  section: 'transactions',
  blurb: 'Barang mana yang benar-benar laku, dalam sehari, seminggu, sebulan atau setahun',
  stage: 'product-performance',
  related: ['stock-by-warehouse'],
  steps: [
    /* ── what the panel answers ──────────────────────────────────────────────────────────────── */
    { text: 'Panel ini menjawab satu pertanyaan: **barang mana yang laku**.',
      focus: '*', at: 'bottom', hold: 2800 },

    { text: 'Jawabannya dihitung untuk rentang waktu yang sedang dipilih.',
      focus: '*', at: 'bottom', hold: 2800 },

    { text: 'Angkanya menggabungkan **semua cabang**.',
      focus: 'col:head', at: 'bottom', hold: 2600 },

    { text: 'Pertanyaannya tentang barangnya, bukan tentang gudangnya.',
      focus: 'col:head', at: 'bottom', hold: 3000 },

    { text: 'Sebaran Stok yang memisah per gudang.',
      focus: 'col:head', at: 'bottom', hold: 2600 },

    /* ── the four columns ────────────────────────────────────────────────────────────────────── */
    { text: 'Satu baris satu barang.',
      focus: 'col:product', at: 'bottom', hold: 2200 },

    { text: 'Urutannya dari yang paling banyak terjual.',
      focus: 'col:product', at: 'bottom', hold: 2600 },

    { text: '**Sold (Bks)** jumlah pak yang keluar dalam rentang itu.',
      focus: 'col:qty', at: 'bottom', tone: 'gold', hold: 3000 },

    { text: 'Penjualan dalam Slop, Bal atau Karton sudah diubah ke Bks dulu, jadi semuanya satu satuan.',
      focus: 'col:qty', at: 'bottom', tone: 'gold', hold: 4000 },

    { text: '**Revenue** uang yang masuk dari barang itu.',
      focus: 'col:revenue', at: 'bottom', hold: 2800 },

    { text: 'Urutannya tidak selalu sama dengan Sold.',
      focus: 'col:revenue', at: 'bottom', hold: 2600 },

    { text: '**Cello Mint** laku banyak tapi harganya lebih murah per pak.',
      focus: 'row:perf-mint', at: 'near', hold: 3400 },

    { text: '**Share** berapa persen dari seluruh pak yang keluar periode ini.',
      focus: 'col:share', at: 'bottom', tone: 'gold', hold: 3400 },

    { text: '**Cello Chocolate** memakan sebagian besar.',
      focus: 'row:perf-choco', at: 'near', tone: 'gold', hold: 2800 },

    /* ── the bar, and what it is not ─────────────────────────────────────────────────────────── */
    { text: 'Garis di bawah nama barang menggambar Share yang sama.',
      focus: 'bar', at: 'bottom', tone: 'gold', hold: 3000 },

    { text: 'Garis itu **bukan** target — tidak ada target di layar ini.',
      focus: 'bar', at: 'bottom', tone: 'gold', hold: 3400 },

    { text: 'Panjangnya berarti seberapa besar bagiannya dari yang terjual.',
      focus: 'bar', at: 'bottom', hold: 3000 },

    /* ── the rows that matter most are the quiet ones ────────────────────────────────────────── */
    { text: 'Barang yang penjualannya sedang tetap tercatat lengkap.',
      focus: 'row:perf-teh', at: 'near', hold: 2800 },

    { text: 'Barang yang hampir berhenti laku tetap ditampilkan.',
      focus: 'row:perf-kopi', at: 'near', tone: 'danger', hold: 2800 },

    { text: '**Cello Kopi** cuma 3 pak, dan justru baris seperti itu yang perlu dilihat.',
      focus: 'row:perf-kopi', at: 'near', tone: 'danger', hold: 3600 },

    { text: 'Baris bawah menjumlahkan semuanya.',
      focus: 'row:total', at: 'near', hold: 2400 },

    { text: 'Total pak keluar dan total uang masuk untuk periode itu.',
      focus: 'row:total', at: 'near', hold: 3000 },

    /* ── where the numbers come from ─────────────────────────────────────────────────────────── */
    { text: 'Angka-angka ini dihitung otomatis setiap ada penjualan.',
      focus: '*', at: 'bottom', hold: 3000 },

    { text: 'Membukanya hampir tidak menambah biaya.',
      focus: '*', at: 'bottom', hold: 2400 },

    { text: 'Yang mahal itu menghitung ulang dari nol, dan itu hanya dilakukan lewat tombol.',
      focus: '*', at: 'bottom', hold: 3600 },

    /* ── an incomplete range says so ─────────────────────────────────────────────────────────── */
    { text: 'Kalau ada bulan yang belum pernah tercatat, panel bilang berapa bulan yang kurang.',
      focus: 'gap', at: 'near', tone: 'danger', hold: 4000 },

    { text: 'Angkanya masih benar untuk bulan yang ada, tapi belum lengkap.',
      focus: 'gap', at: 'near', tone: 'danger', hold: 3400 },

    { text: 'Perbaikannya ada di **Settings**: hitung ulang semua bulan dari nota aslinya.',
      focus: 'gap', at: 'bottom', tone: 'gold', hold: 4000 },

    { text: 'Nota tidak pernah ikut berubah.',
      focus: 'gap', at: 'bottom', tone: 'gold', hold: 2400 },

    { text: 'Nota tetap sumber datanya, dan ringkasan ini cuma salinan yang bisa dibuat ulang kapan saja.',
      focus: 'gap', at: 'bottom', tone: 'gold', hold: 4200 },
  ],
};
