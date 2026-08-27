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
   A tutorial that rounds its example into nonsense teaches someone to distrust the screen. */
export const goodsReceived = {
  id: 'goods-received',
  title: 'Goods Received',
  section: 'restock_vault',
  blurb: 'Mencatat barang yang baru datang, dan biaya yang menempel padanya',
  stage: 'goods-received',
  related: ['stock-by-warehouse'],
  steps: [
    { text: 'Panel ini untuk mencatat barang yang **baru datang** dari pabrik. Isi dari atas ke bawah.',
      focus: '*', at: 'bottom', hold: 3800 },

    { text: '**Target produksi** cuma catatan bulanan. Dia tidak membatasi apa pun — kamu tetap bisa mencatat lebih atau kurang dari target.',
      focus: 'f:target', at: 'near', hold: 5200 },

    { text: '**Asal** itu dari mana barangnya, **Tujuan** gudang mana yang menerimanya. Stok gudang tujuan yang akan bertambah.',
      focus: 'f:tujuan', at: 'near', hold: 5400 },

    { text: '**Delivery note (app)** dibuat sendiri oleh aplikasi. Nomor ini punya kita.',
      focus: 'f:sj-app', at: 'near', hold: 4400 },

    { text: '**Delivery note (factory)** disalin dari kertas yang dibawa sopir. Dua nomor ini sengaja dipisah: kalau berbeda, kamu masih bisa melacak dokumen mana yang salah.',
      focus: 'f:sj-factory', at: 'near', tone: 'gold', hold: 6600 },

    { text: 'Cari barang di daftar kiri lalu klik. **Batch** diisi kalau kertasnya menyebut nomor batch, dan **Jumlah** dalam Bks.',
      focus: 't:jumlah', at: 'near', hold: 5400 },

    { text: 'Tiga biaya ini yang bikin harga barang naik: **Ongkos kirim**, **Pita cukai**, **Upah bongkar**. Semuanya biaya masuk — cabang tidak membayarnya lagi.',
      focus: 'c:cukai', at: 'near', tone: 'gold', hold: 6800 },

    { text: '**Total landed value** = harga barang + tiga biaya tadi. 900 × Rp 8.500 = Rp 7.650.000, ditambah 250.000 + 180.000 + 90.000, jadi **Rp 8.170.000**.',
      focus: 'sum:total', at: 'near', tone: 'gold', hold: 7400 },

    { text: '**Landed / Bks** = Total landed value ÷ jumlah Bks. Rp 8.170.000 ÷ 900 = **Rp 9.078**. Ini harga modal sebenarnya per bungkus, bukan Rp 8.500.',
      focus: 'sum:perbks', at: 'near', tone: 'gold', hold: 7400 },

    { text: 'Angka **@ Landed** di baris barang memakai perhitungan yang sama. Kalau lebih mahal dari kiriman sebelumnya, aplikasi menandainya di bawah angka itu.',
      focus: 't:landed', at: 'near', hold: 6000 },

    { text: 'Begitu disimpan, **stok gudang tujuan langsung bertambah** dan catatan ini masuk ke Buku. Periksa jumlahnya dulu sebelum menyimpan.',
      focus: 'f:tujuan', at: 'near', tone: 'danger', hold: 6600 },
  ],
};
