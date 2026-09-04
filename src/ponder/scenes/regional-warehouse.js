/* Scene: the regional warehouse desk — the branch admin's whole screen.

   HIS RULE THAT PUT THIS FILE HERE, 2026-08-30: *"new panel and features means different ponder,
   but inside the same section of the book"*. And on 2026-09-01, asking for the desk itself:
   *"there should be different ponder regional warehouse as well"*. So it is its own scene, and it
   lands in `restock_vault` like the other three, because that is the sidebar section this desk is
   printed in and the book mirrors the sidebar.

   🔴 THIS SCENE TEACHES THE DESK, NOT THE PANELS. The counting step already has `goods-received`,
   the HQ table has `stock-by-warehouse`, the split has `shipment-plan`. What nothing taught until
   now is the thing that changed on 2026-09-01: five tabs, which question each one answers, and the
   two rules a branch admin will otherwise discover by being refused — the address they can no
   longer type, and the master data they can no longer edit.

   🔴 REWRITTEN 2026-09-04: ONE IDEA PER BEAT, AND EVERY BEAT POINTS AT SOMETHING. Aldi, watching
   it play: *"there is too much words but too little showing"*, then *"make sure that for almost
   every sentence there is some textbox to highlights and explain not just sentence reading"*.

   The old version was ten paragraphs sharing seven keys — five beats in a row focused
   `tab:incoming` while long sentences were read, because the stage had nothing else to point at.
   It is 28 beats now, and each one names its own anchor on `RegionalWarehouseStage`: the scan
   button, the typed-number fallback, the counting panel, the withheld HQ figure, each field of the
   request form, the locked address, the stock card, the age figure, the ledger row, the difference
   badge, the read-only lock. A sentence that cannot point at anything does not belong in a scene.

   ⚠️ THE STAGE FOLLOWS THE BEAT. Only the open tab renders, so `RegionalWarehouseStage` reads the
   step it is handed and switches tab from the key's prefix. Naming a `rq:` key from a beat while
   Incoming is showing would highlight nothing — and the integration audit could NOT catch that,
   because it reads source text where every key is present and cannot see conditional rendering.

   LANGUAGE — his rule, 2026-08-27: *"teaching just use indonesia, for terms for the features and
   components just use english"*. Everyday Indonesian; every tab name left in the English it is
   printed in, wrapped in `**` so it renders in accent ink. Translating a tab name here would teach
   a word that appears nowhere on the screen. **Data Induk** is Indonesian on the screen too — he
   named it himself on 2026-08-31 — so it is not wrapped as a foreign term.

   No second person and no first person anywhere: the subject is the warehouse, the shipment or the
   app. His rule, 2026-08-30, and the audit enforces it including the polite `Anda`.

   Step fields are the same as the other scenes: text · focus · at · tone · hold. Every `focus` key
   is a `data-ponder` attribute on `WarehouseDeskNav` or on `RegionalWarehouseStage`, which are the
   components the real screen renders and the stage mounts — so a beat cannot point at markup that
   only exists in the tutorial. */
export const regionalWarehouse = {
  id: 'regional-warehouse',
  title: 'Regional Warehouse',
  section: 'gudang',
  blurb: 'Panel gudang cabang: lima tab, dan dua hal yang sekarang diatur oleh HQ',
  stage: 'regional-warehouse',
  /* NO `related`, ON PURPOSE. Aldi, 2026-09-01: *"i want u to minimize too much reference from
     other tutorial, make sure that each ponder explain everything even when they have this info on
     other ponder tutorial double learning is okay, this way the user doesn't have to refer back and
     forth just to know whats going on"*. A branch admin cannot open the HQ tutorials at all, so a
     link to them is a dead end wearing a helpful face. Anything this reader needs is said here. */
  steps: [
    /* ── the desk itself ─────────────────────────────────────────────────────────────────────── */
    { text: 'Ini panel gudang cabang. Bentuknya mengikuti panel Master Vault di atasnya, supaya satu halaman terbaca sebagai satu tempat kerja.',
      focus: 'desk:nav', at: 'bottom', hold: 3800 },

    { text: 'Bagian kiri atas menyebut **gudang mana yang sedang dibuka**, dan lampunya menyala selama panel ini terbuka.',
      focus: 'desk:where', at: 'near', hold: 3400 },

    /* ── incoming ────────────────────────────────────────────────────────────────────────────── */
    { text: '**Incoming** berisi kiriman yang sedang berjalan menuju gudang ini.',
      focus: 'tab:incoming', at: 'near', tone: 'gold', hold: 2800 },

    { text: 'Satu baris untuk satu kiriman: barangnya, nomor kirimannya, dan statusnya.',
      focus: 'in:row', at: 'near', hold: 3000 },

    { text: 'Angka di sebelah tab hanya menghitung yang belum selesai, jadi angka itu turun setelah barang dihitung.',
      focus: 'in:badge', at: 'near', hold: 3600 },

    { text: 'Waktu kardus sampai di pintu, tombol **Scan barang sampai** dipakai, lalu kamera diarahkan ke barcode pada label kiriman.',
      focus: 'in:scan', at: 'near', tone: 'gold', hold: 3800 },

    { text: 'Kalau kamera tidak jalan atau labelnya rusak, nomor kiriman bisa diketik.',
      focus: 'in:manual', at: 'near', hold: 3000 },

    { text: 'Scan hanya menyatakan kardusnya sudah ada di gudang, bukan isinya sudah benar.',
      focus: 'in:scan', at: 'near', hold: 3200 },

    { text: 'Setelah scan, panel hitung terbuka sendiri. Stok gudang baru bertambah setelah hitungan itu selesai.',
      focus: 'in:count', at: 'near', tone: 'gold', hold: 3800 },

    { text: 'Jumlah kiriman dari HQ sengaja ditutup di panel hitung, supaya hitungannya tidak dituntun angka.',
      focus: 'in:hq', at: 'near', tone: 'gold', hold: 3800 },

    /* ── request ─────────────────────────────────────────────────────────────────────────────── */
    { text: '**Request** dipakai untuk meminta stok ke HQ.',
      focus: 'tab:request', at: 'near', tone: 'gold', hold: 2600 },

    { text: 'Barangnya dipilih lebih dulu.',
      focus: 'rq:item', at: 'near', hold: 2400 },

    { text: 'Jumlahnya diisi dalam Bks, satuan yang sama dengan isi rak.',
      focus: 'rq:qty', at: 'near', hold: 3000 },

    { text: 'Masukkan menaruh barang itu ke daftar permintaan.',
      focus: 'rq:add', at: 'near', hold: 2600 },

    { text: 'Satu permintaan boleh memuat beberapa barang sekaligus.',
      focus: 'rq:list', at: 'near', hold: 2800 },

    { text: 'Alamat tujuan tidak diketik lagi. Yang tampil adalah alamat gudang cabang yang sudah terdaftar, dan hanya HQ yang bisa mendaftarkannya.',
      focus: 'rq:address', at: 'near', tone: 'gold', hold: 4200 },

    { text: 'Permintaan berangkat ke HQ setelah tombol kirim ditekan.',
      focus: 'rq:send', at: 'near', hold: 2800 },

    /* ── stock ───────────────────────────────────────────────────────────────────────────────── */
    { text: '**Stock** menunjukkan isi rak gudang ini sekarang.',
      focus: 'tab:stock', at: 'near', hold: 2600 },

    { text: 'Satu kartu untuk satu barang, lengkap dengan jumlahnya.',
      focus: 'st:card', at: 'near', hold: 2800 },

    { text: 'Umur kiriman paling lama ikut ditulis, supaya barang lama tidak tertinggal di rak.',
      focus: 'st:age', at: 'near', tone: 'gold', hold: 3400 },

    /* ── book ────────────────────────────────────────────────────────────────────────────────── */
    { text: '**Book** menyimpan semua permintaan, yang sudah selesai maupun yang belum.',
      focus: 'tab:book', at: 'near', hold: 2800 },

    { text: 'Satu baris menyimpan jumlah yang dikirim HQ dan jumlah yang dihitung gudang.',
      focus: 'bk:row', at: 'near', hold: 3200 },

    { text: 'Kalau kedua angka itu berbeda, selisihnya tercatat di sini dan dilaporkan ke HQ. Buktinya tidak hilang.',
      focus: 'bk:diff', at: 'near', tone: 'gold', hold: 4000 },

    { text: 'Permintaan yang belum selesai tetap terlihat sampai barangnya dihitung.',
      focus: 'bk:open', at: 'near', hold: 3000 },

    /* ── data induk ──────────────────────────────────────────────────────────────────────────── */
    { text: 'Data Induk memuat daftar pabrik, gudang, dan orang yang boleh mengirim atau menerima.',
      focus: 'tab:data', at: 'near', tone: 'gold', hold: 3400 },

    { text: 'Di panel ini isinya hanya bisa dibaca; yang mengubah hanya HQ.',
      focus: 'dt:lock', at: 'near', tone: 'gold', hold: 3200 },

    { text: 'Alamat gudang cabang tadi juga didaftarkan di sini. Kalau ada yang keliru, laporannya ke HQ.',
      focus: 'dt:row', at: 'near', hold: 3600 },

    /* ── the shape of the whole thing ────────────────────────────────────────────────────────── */
    { text: 'Urutan tabnya mengikuti urutan pertanyaan yang muncul di gudang: barangnya sudah datang atau belum, perlu tambah atau tidak, sekarang ada apa, dulu bagaimana, dan kirim terima lewat siapa.',
      focus: 'desk:nav', at: 'bottom', hold: 5200 },
  ],
};
