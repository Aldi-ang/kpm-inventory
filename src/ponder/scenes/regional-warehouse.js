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
  blurb: 'Meja gudang cabang: lima tab, dan dua hal yang sekarang tidak bisa diketik sendiri',
  stage: 'regional-warehouse',
  related: ['goods-received', 'stock-by-warehouse'],
  steps: [
    { text: 'Ini meja gudang cabang. Bentuknya sama dengan meja Master Vault di atasnya, supaya satu halaman terbaca sebagai satu tempat kerja.',
      focus: 'desk:nav', at: 'bottom', hold: 5200 },

    { text: 'Kiri atas selalu menyebut **gudang mana yang sedang dibuka** dan tab mana yang sedang aktif. Lampunya menyala selama meja ini hidup.',
      focus: 'desk:where', at: 'near', hold: 5000 },

    { text: '**Incoming** — barang yang sedang jalan ke gudang cabang. Angka di sebelahnya hanya menghitung yang belum selesai, jadi angkanya turun setelah barang dihitung.',
      focus: 'tab:incoming', at: 'near', tone: 'gold', hold: 6000 },

    { text: 'Begitu kardus sampai di pintu gudang, **Scan barang sampai** membaca barcode di label kiriman. Satu scan, dan HQ langsung tahu barangnya sudah mendarat.',
      focus: 'tab:incoming', at: 'near', tone: 'gold', hold: 6400 },

    { text: '🔴 Scan hanya berarti **kardusnya sudah ada di gudang** — bukan berarti isinya sudah benar. Stok belum bertambah sampai barangnya dihitung.',
      focus: 'tab:incoming', at: 'near', tone: 'gold', hold: 6600 },

    { text: 'Kalau kamera tidak jalan atau labelnya rusak, nomor kiriman bisa diketik. Barang yang sudah sampai harus tetap bisa dicatat sampai, apa pun keadaan HP-nya.',
      focus: 'tab:incoming', at: 'near', hold: 6000 },

    { text: 'Di tab itu juga **barang datang dihitung**. Jumlah kiriman HQ sengaja disembunyikan sampai hitungan gudang selesai — supaya angka HQ tidak menuntun hitungan itu.',
      focus: 'tab:incoming', at: 'near', hold: 6200 },

    { text: '**Request** — minta stok ke HQ. Pilih barang, isi jumlah, masukkan ke daftar, lalu kirim.',
      focus: 'tab:request', at: 'near', hold: 5200 },

    { text: '🔴 Alamat kirim **tidak lagi diketik di sini.** Yang tampil adalah alamat gudang cabang yang sudah terdaftar. Kalau belum terdaftar, permintaan tidak bisa dikirim — dan yang bisa mendaftarkan hanya HQ.',
      focus: 'tab:request', at: 'near', tone: 'gold', hold: 7000 },

    { text: '**Stock** — isi rak gudang cabang sekarang, satu kartu satu barang, lengkap dengan **umur** kiriman paling lama.',
      focus: 'tab:stock', at: 'near', hold: 5400 },

    { text: '**Book** — semua permintaan, yang sudah selesai maupun yang belum, beserta hasil hitungnya. Kalau ada selisih dengan HQ, buktinya ada di sini.',
      focus: 'tab:book', at: 'near', hold: 5800 },

    { text: 'Data Induk — daftar pabrik, gudang dan orang yang boleh kirim & terima. Di meja ini **hanya bisa dibaca.**',
      focus: 'tab:data', at: 'near', hold: 5400 },

    { text: 'Yang bisa mendaftarkan atau mengubahnya hanya HQ, tier 3 ke atas. Kalau ada yang salah di daftar itu, laporkan ke HQ — jangan cari jalan lain.',
      focus: 'tab:data', at: 'near', tone: 'gold', hold: 6400 },

    { text: 'Urutan tabnya mengikuti urutan pertanyaan yang muncul di gudang: barangnya sudah datang belum, perlu tambah tidak, sekarang ada apa, dulu bagaimana, dan kirim-terima lewat siapa.',
      focus: 'desk:nav', at: 'bottom', hold: 6000 },
  ],
};
