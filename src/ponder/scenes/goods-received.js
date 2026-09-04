/* Scene: Goods Received — the top panel of Restock Vault.

   The panel had no name until 2026-08-27; Aldi asked for one — *"we need panel name for every
   section, we dont have this panel name for sc1, so name it"*. **Goods Received**: it is the
   standard warehouse term for recording an arrival, it is two plain words, and it cannot be
   confused with Kirim (going out) or Request (asking for).

   LANGUAGE — his rule: Indonesian sentences, English feature and column names left exactly as the
   screen prints them, wrapped in `**` so they render as gold ink.

   🔴 THE ARITHMETIC IN THESE BEATS IS THE APP'S OWN, not an illustration:
   `trueLandedTotal = totalBasePrice + shippingCost + exciseTax + laborCost`, then
   `landedPerUnit = trueLandedTotal / totalItemsReceived` — `RestockVaultView.jsx` lines 273-276.
   A tutorial that rounds its example into nonsense teaches someone to distrust the screen.
   **The worked figures below are load-bearing: 900 × 8.500 = 7.650.000, plus 250.000 + 180.000 +
   90.000 = 8.170.000, ÷ 900 = 9.078. Do not "simplify" any of them.**

   🔴 SPLIT 2026-09-04: ONE IDEA PER BEAT. Aldi, across the whole book — *"there is too much words
   but too little showing"* and *"make sure that for almost every sentence there is some textbox to
   highlights and explain not just sentence reading"*. Before: 11 beats averaging 131 characters,
   with a three-clause sentence sitting on one field for five seconds. Now 28 beats, one sentence
   each. Four anchors the stage already had were being used by nobody — `f:asal`, `f:tanggal`,
   `t:barang` and `t:batch` — and each of them is a sentence in the old text that had nowhere to
   point.

   The two long sums are deliberately split across three beats each: the formula, then the numbers,
   then what the result MEANS. The meaning is the part worth reading twice, and it used to be the
   tail of a sentence that had already spent six seconds on arithmetic. */
export const goodsReceived = {
  id: 'goods-received',
  title: 'Goods Received',
  section: 'restock_vault',
  blurb: 'Mencatat barang yang baru datang, dan biaya yang menempel padanya',
  stage: 'goods-received',
  related: ['stock-by-warehouse'],
  steps: [
    /* ── what the panel is for ───────────────────────────────────────────────────────────────── */
    { text: 'Panel ini untuk mencatat barang yang **baru datang** dari pabrik.',
      focus: '*', at: 'bottom', hold: 3000 },

    { text: 'Isinya diisi dari atas ke bawah.',
      focus: '*', at: 'bottom', hold: 2400 },

    /* ── the header fields ───────────────────────────────────────────────────────────────────── */
    { text: '**Target produksi** cuma catatan bulanan.',
      focus: 'f:target', at: 'near', hold: 2800 },

    { text: 'Catatan itu tidak membatasi apa pun.',
      focus: 'f:target', at: 'near', hold: 2400 },

    { text: 'Jumlah yang dicatat tetap boleh lebih atau kurang dari target.',
      focus: 'f:target', at: 'near', hold: 3000 },

    { text: '**Asal** itu dari mana barangnya.',
      focus: 'f:asal', at: 'near', hold: 2400 },

    { text: '**Tujuan** gudang mana yang menerimanya.',
      focus: 'f:tujuan', at: 'near', hold: 2600 },

    { text: 'Stok gudang tujuan yang akan bertambah.',
      focus: 'f:tujuan', at: 'near', hold: 2600 },

    { text: '**Delivery note (app)** dibuat sendiri oleh aplikasi.',
      focus: 'f:sj-app', at: 'near', hold: 2800 },

    { text: 'Nomor ini milik aplikasi, bukan dari pabrik.',
      focus: 'f:sj-app', at: 'near', hold: 2600 },

    { text: '**Delivery note (factory)** disalin dari kertas yang dibawa sopir.',
      focus: 'f:sj-factory', at: 'near', tone: 'gold', hold: 3200 },

    { text: 'Dua nomor ini sengaja dipisah: kalau berbeda, dokumen mana yang salah masih bisa dilacak.',
      focus: 'f:sj-factory', at: 'near', tone: 'gold', hold: 4200 },

    { text: '**Tanggal** diisi sesuai hari barang itu diterima.',
      focus: 'f:tanggal', at: 'near', hold: 2800 },

    /* ── the line itself ─────────────────────────────────────────────────────────────────────── */
    { text: 'Barangnya dicari di daftar kiri lalu ditekan.',
      focus: 't:barang', at: 'near', hold: 2800 },

    { text: '**Batch** diisi kalau kertasnya menyebut nomor batch.',
      focus: 't:batch', at: 'near', hold: 3000 },

    { text: '**Jumlah** diisi dalam Bks.',
      focus: 't:jumlah', at: 'near', hold: 2400 },

    /* All three keys, because the sentence is about all three. Focusing only `c:cukai` lit one
       field under a caption that said "these three" — *"there is no highlights for that 3 biaya as
       well"*. The player unions their rects, so the ring becomes one band across the whole row,
       which is the shape that says "these, together". */
    { text: 'Tiga biaya ini yang bikin harga barang naik: **Ongkos kirim**, **Pita cukai**, **Upah bongkar**.',
      focus: ['c:ongkir', 'c:cukai', 'c:bongkar'], at: 'near', tone: 'gold', hold: 4200 },

    { text: 'Semuanya biaya masuk, dan cabang tidak membayarnya lagi.',
      focus: ['c:ongkir', 'c:cukai', 'c:bongkar'], at: 'near', tone: 'gold', hold: 3400 },

    /* ── the two sums: formula, numbers, meaning ─────────────────────────────────────────────── */
    { text: '**Total landed value** = harga barang + tiga biaya tadi.',
      focus: 'sum:total', at: 'near', tone: 'gold', hold: 3200 },

    { text: '900 × Rp 8.500 = Rp 7.650.000.',
      focus: 'sum:total', at: 'near', tone: 'gold', hold: 3000 },

    { text: 'Ditambah 250.000 + 180.000 + 90.000, jadi **Rp 8.170.000**.',
      focus: 'sum:total', at: 'near', tone: 'gold', hold: 3800 },

    { text: '**Landed / Bks** = Total landed value ÷ jumlah Bks.',
      focus: 'sum:perbks', at: 'near', tone: 'gold', hold: 3200 },

    { text: 'Rp 8.170.000 ÷ 900 = **Rp 9.078**.',
      focus: 'sum:perbks', at: 'near', tone: 'gold', hold: 3000 },

    { text: 'Ini harga modal sebenarnya per bungkus, bukan Rp 8.500.',
      focus: 'sum:perbks', at: 'near', tone: 'gold', hold: 3600 },

    { text: 'Angka **@ Landed** di baris barang memakai perhitungan yang sama.',
      focus: 't:landed', at: 'near', hold: 3200 },

    { text: 'Kalau lebih mahal dari kiriman sebelumnya, aplikasi menandainya di bawah angka itu.',
      focus: 't:landed', at: 'near', hold: 3800 },

    /* ── what saving does ────────────────────────────────────────────────────────────────────── */
    { text: 'Begitu disimpan, **stok gudang tujuan langsung bertambah**.',
      focus: 'f:tujuan', at: 'near', tone: 'danger', hold: 3400 },

    { text: 'Catatan ini juga langsung masuk ke Buku.',
      focus: 'f:tujuan', at: 'near', tone: 'danger', hold: 2800 },

    { text: 'Jumlahnya diperiksa dulu sebelum disimpan.',
      focus: 't:jumlah', at: 'near', tone: 'danger', hold: 3000 },
  ],
};
