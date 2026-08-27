/* Scene: the Stock by Warehouse panel.

   LANGUAGE — his rule, 2026-08-27: *"teaching just use indonesia, for terms for the features and
   components just use english"*, then *"make the explanation more easier to understand and more
   descriptive with easy indonesian language"*. So: short everyday Indonesian sentences, and every
   column name left in the English it is printed in on screen, wrapped in `**` so it renders as
   gold ink. A translated column name would teach a word that appears nowhere on the panel.

   🔴 THIS FILE IS WHERE THE FOOTNOTE WENT. The five-paragraph explanation that used to sit under
   Company total was deleted on his call — *"we can delete this ... i mean the instruction below
   company total"*. Small print under a table is where an explanation goes to be skipped. Every
   sentence of it is now a beat, in Indonesian, standing next to the column it is about.

   ⚠️ AUDIT CHECK 631 MOVED HERE. It used to pin the two divisions to the panel footnote; it now
   pins them to these steps. It was never deleted, because a check removed to let a change pass is
   how the thing it protected comes back.

   Step fields:
     text   what is said. `**term**` renders in accent ink.
     focus  a `data-ponder` key in the stage. '*' means the whole world.
     at     where the caption sits — 'near' pins it beside what it points at with a pointer,
            'bottom' uses the wide bar. Create's Ponder alternates the same two, and the variety
            is the point: a caption that never moves stops being read.
     tone   'ink' | 'gold' | 'danger'. Ponder's PonderPalette, cut down to what the palette law
            allows — there is no green here and there never will be.
     act    a state change the stage performs. 'open:<warehouse>' | 'close'.
     hold   ms before autoplay moves on. Long sentences get longer holds. */
export const stockByWarehouse = {
  id: 'stock-by-warehouse',
  title: 'Stock by Warehouse',
  section: 'gudang',
  blurb: 'Di mana semua barang berada, dan gudang mana yang harus diisi duluan',
  stage: 'stock-table',
  related: [],
  steps: [
    { text: 'Tabel ini menunjukkan semua gudang kamu dalam satu layar. Semua angka satuannya **Bks**.',
      focus: '*', at: 'bottom', hold: 3800 },

    { text: 'Kolom pertama nama gudangnya. Klik namanya untuk membuka isi gudang itu.',
      focus: 'col:warehouse', at: 'near', hold: 3800 },

    { text: '**In stock** adalah barang yang ada di rak gudang itu sekarang juga. Cuma ini yang benar-benar ada di tempat.',
      focus: 'col:shelf', at: 'near', hold: 4600 },

    { text: '**Shipping** adalah barang yang sudah dikirim tapi belum sampai. Belum bisa dijual siapa pun. Tanda **—** artinya pertanyaan ini tidak berlaku di gudang itu.',
      focus: 'col:transit', at: 'near', hold: 5600 },

    { text: '**Agent inventory** sudah sampai dan sedang dibawa salesman. Yang ini sudah bisa dijual.',
      focus: 'col:field', at: 'near', hold: 4200 },

    { text: 'Garis kecil di bawah nama gudang membagi tiga tadi: di rak, dikirim, di tangan agen. Barang yang sudah terjual tidak ikut, karena barangnya sudah tidak ada di mana pun.',
      focus: 'bar', at: 'near', tone: 'gold', hold: 6000 },

    { text: '**Sold (7d)** menghitung penjualan **7 hari terakhir**. Aplikasi cuma menyimpan satu minggu, jadi tidak ada angka di layar ini yang artinya lebih dari seminggu.',
      focus: 'col:sold', at: 'near', hold: 5800 },

    { text: '**Avg / month** = Sold (7d) ÷ 7 × 30. Ini perkiraan dari satu minggu saja, makanya ditulis pakai **≈**. Satu minggu yang ramai atau sepi bisa menggeser angka ini jauh.',
      focus: 'col:permonth', at: 'near', tone: 'gold', hold: 6400 },

    { text: '**Est. days left** = In stock ÷ (Sold (7d) ÷ 7). Bahasa gampangnya: stok di rak dibagi penjualan per hari.',
      focus: 'col:daysleft', at: 'near', tone: 'gold', hold: 5200 },

    { text: 'Tapi angka itu per produk, bukan per gudang. Ayo buka satu gudang.',
      focus: 'row:master', at: 'near', act: 'open:GUDANG PUSAT', hold: 3800 },

    { text: 'Lihat: **Cello Chocolate** cuma tahan **20 hari**, padahal gudangnya penuh. Yang penuh itu Cello Mint, dan Cello Mint tidak laku.',
      focus: 'item:pusat-choco', at: 'near', tone: 'danger', hold: 6000 },

    { text: 'Itu sebabnya tidak ada "sisa hari" untuk satu gudang penuh. Kalau total stok dibagi total penjualan, semua produk dianggap bisa saling gantikan. Gudang Pusat pernah tertulis **348 hari** padahal barang yang paling laku cuma tahan 20.',
      focus: 'col:daysleft', at: 'bottom', tone: 'danger', hold: 7600 },

    { text: 'Angka **merah** berarti kurang dari 7 hari. Kirim barang itu duluan, karena pengiriman tidak sampai di hari yang sama waktu kamu memutuskan.',
      focus: 'item:solo-choco', at: 'near', tone: 'danger', act: 'open:SOLO', hold: 6200 },

    { text: 'Tanda **—** artinya tidak ada penjualan dalam 7 hari terakhir, jadi tidak ada angka untuk dibagi. Itu **bukan** berarti stoknya awet selamanya.',
      focus: 'item:solo-mint', at: 'near', hold: 5800 },

    { text: 'Dua angka perkiraan itu sengaja tidak menghitung **Shipping** dan **Agent inventory**. Pertanyaannya "rak ini tahan berapa lama", dan barang di truk atau di motor belum ada di rak.',
      focus: 'col:shelf', at: 'bottom', act: 'close', hold: 6600 },

    { text: 'Baris paling bawah total seluruh perusahaan. Di sini pun tidak ada sisa hari, dengan alasan yang sama: stok di gudang yang salah tidak menolong gudang yang kehabisan.',
      focus: 'row:total', at: 'near', hold: 6400 },
  ],
};
