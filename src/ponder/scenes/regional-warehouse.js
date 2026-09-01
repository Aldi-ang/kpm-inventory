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

   LANGUAGE — his rule, 2026-08-27: *"teaching just use indonesia, for terms for the features and
   components just use english"*. Everyday Indonesian; every tab name left in the English it is
   printed in, wrapped in `**` so it renders in accent ink. Translating a tab name here would teach
   a word that appears nowhere on the screen. **Data Induk** is Indonesian on the screen too — he
   named it himself on 2026-08-31 — so it is not wrapped as a foreign term.

   Step fields are the same as the other scenes: text · focus · at · tone · hold. Every `focus` key
   is a `data-ponder` attribute on `WarehouseDeskNav`, which is the component the real screen
   renders — so a beat cannot point at markup that only exists in the tutorial. */
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
    { text: 'Ini panel gudang cabang. Bentuknya mengikuti panel Master Vault di atasnya, supaya satu halaman terbaca sebagai satu tempat kerja.',
      focus: 'desk:nav', at: 'bottom', hold: 5000 },

    { text: 'Bagian kiri atas menyebut **gudang mana yang sedang dibuka** dan tab mana yang sedang aktif. Lampunya menyala selama panel ini terbuka.',
      focus: 'desk:where', at: 'near', hold: 4800 },

    { text: '**Incoming** berisi kiriman yang sedang berjalan menuju gudang ini. Angka di sebelahnya hanya menghitung yang belum selesai, jadi angka itu turun setelah barang dihitung.',
      focus: 'tab:incoming', at: 'near', tone: 'gold', hold: 5600 },

    { text: 'Waktu kardus sampai di pintu, tekan **Scan barang sampai** dan arahkan kamera ke barcode pada label kiriman. Kalau kamera tidak jalan atau labelnya rusak, nomor kiriman bisa diketik.',
      focus: 'tab:incoming', at: 'near', tone: 'gold', hold: 6400 },

    { text: 'Scan hanya menyatakan **kardusnya sudah ada di gudang**, bukan isinya sudah benar. Setelah scan, panel hitung terbuka sendiri, dan stok baru bertambah setelah hitungan itu selesai. Jumlah kiriman dari HQ sengaja disembunyikan supaya tidak menuntun hitungan.',
      focus: 'tab:incoming', at: 'near', tone: 'gold', hold: 7200 },

    { text: '**Request** dipakai untuk meminta stok ke HQ: pilih barang, isi jumlah, masukkan ke daftar, lalu kirim. Alamat tujuan tidak diketik lagi. Yang tampil adalah alamat gudang cabang yang sudah terdaftar, dan hanya HQ yang bisa mendaftarkannya.',
      focus: 'tab:request', at: 'near', tone: 'gold', hold: 7000 },

    { text: '**Stock** menunjukkan isi rak gudang ini sekarang, satu kartu untuk satu barang, lengkap dengan umur kiriman paling lama.',
      focus: 'tab:stock', at: 'near', hold: 5000 },

    { text: '**Book** menyimpan semua permintaan, yang sudah selesai maupun yang belum, beserta hasil hitungnya. Kalau ada selisih dengan HQ, buktinya ada di sini.',
      focus: 'tab:book', at: 'near', hold: 5200 },

    { text: 'Data Induk memuat daftar pabrik, gudang, dan orang yang boleh mengirim atau menerima. Di panel ini isinya **hanya bisa dibaca**; yang mengubah hanya HQ. Kalau ada yang keliru, laporkan ke HQ.',
      focus: 'tab:data', at: 'near', tone: 'gold', hold: 6400 },

    { text: 'Urutan tabnya mengikuti urutan pertanyaan yang muncul di gudang: barangnya sudah datang atau belum, perlu tambah atau tidak, sekarang ada apa, dulu bagaimana, dan kirim terima lewat siapa.',
      focus: 'desk:nav', at: 'bottom', hold: 5600 },
  ],
};
