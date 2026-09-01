/* THE BOOK'S TABLE OF CONTENTS — data only, and it MIRRORS THE SIDEBAR.

   🔴 EVERY `id` HERE IS AN `activeTab` VALUE FROM `BiohazardTheme`'s nav list, and every label is
   that nav item's label. That is not a convention, it is the contract: the book opens straight to
   the section you are standing in, which only works if the two lists use the same keys.

   Aldi, 2026-08-27: *"right now u put it on the gudang section, dont do that we dont have any
   gudang components in our sidebar, all the section in the book should follow the sidebar and
   everything on the sidebar should be on the book"*. The first version invented seven categories
   of its own — Gudang, Kasir, Setoran — and none of them was a thing you can click in this app.
   **An index that names screens the app does not have is worse than no index.**

   `registry.js` imports a stage, and a stage is JSX. The integration audit runs in plain Node, so
   it cannot import that file — but it MUST read these sections, because the check that every entry
   resolves to a real scene is what stops a card that does nothing when pressed. Hence the split.

   `short` is the tab label on the book's edge. A tab is ~120px and a truncated tab teaches
   nothing; the full name is printed across the page it opens.

   ⚠️ `icon` is a STRING, resolved to a lucide component inside PonderBook — the same icons the
   sidebar uses, so a section looks like the thing it is about. Keeping it a string is what lets
   this file stay data.

   ORDER = SIDEBAR ORDER. Entries inside a section = TOP-TO-BOTTOM ORDER ON THE SCREEN. His rule
   for Restock Vault: *"put it in the book section restock vault number 1, since its on top so its
   number 1 ... then stock by warehouse ... number 2 since its the second panel"*. */
export const SECTIONS = [
  {
    id: 'dashboard', label: 'Command Center', short: 'Command', icon: 'LayoutGrid',
    blurb: 'Angka ringkasan seluruh perusahaan. Cuma dibaca, tidak mengubah apa pun.',
    entries: [{ title: 'Membaca Command Center', desc: 'Jendela 7 hari, dan mana yang bukan tren.', icon: 'LayoutGrid', soon: true }],
  },
  {
    id: 'restock_vault', label: 'Restock Vault', short: 'Restock', icon: 'PackagePlus',
    blurb: 'Barang masuk dari pabrik, kirim ke cabang, dan di mana semua barang berada.',
    entries: [
      { sceneId: 'goods-received', title: 'Goods Received', desc: 'Panel paling atas: mencatat barang yang baru datang, dan biaya yang menempel padanya.', icon: 'PackagePlus' },
      { sceneId: 'stock-by-warehouse', title: 'Stock by Warehouse', desc: 'Baca tabel gudang, dan kenapa tidak ada sisa hari untuk satu gudang penuh.', icon: 'Package' },
      /* His rule, 2026-08-30: *"new panel and features means different ponder, but inside the same
         section of the book"*. Shipment Plan is the third panel down on this screen, so it is the
         third entry here — entries inside a section are TOP-TO-BOTTOM ORDER ON THE SCREEN. */
      { sceneId: 'shipment-plan', title: 'Shipment Plan', desc: 'Kalau barangnya tidak cukup untuk semua cabang, siapa yang dikirim duluan.', icon: 'Truck' },
      /* LAST, and the top-to-bottom rule above does not settle it — this desk is the only thing a
         BRANCH admin sees on this screen, and it does not render for HQ at all. So there is no one
         order that is true for both readers. It sits last because the three above are HQ's, and HQ
         is who opens this book most. */
      { sceneId: 'regional-warehouse', title: 'Regional Warehouse', desc: 'Panel gudang cabang: lima tab, scan barang sampai, alamat yang diatur HQ, dan data induk yang hanya bisa dibaca.', icon: 'Warehouse' },
    ],
  },
  {
    id: 'sales', label: 'Sales Terminal', short: 'Sales', icon: 'Store',
    blurb: 'Menjual, mencetak nota, dan apa yang tidak bisa ditarik lagi.',
    entries: [{ title: 'Titip vs Lunas', desc: 'Beda barang titipan dan barang yang sudah dibayar.', icon: 'Store', soon: true }],
  },
  {
    id: 'inventory', label: 'Master Vault', short: 'Vault', icon: 'Package',
    blurb: 'Daftar barang, harga, dan siapa yang boleh mengubahnya.',
    entries: [{ title: 'Mengubah barang', desc: 'Apa yang ikut berubah waktu harga diubah.', icon: 'Package', soon: true }],
  },
  {
    id: 'agent_inventory', label: 'Agent Inventory', short: 'Agent', icon: 'Boxes',
    blurb: 'Barang yang sedang dibawa salesman.',
    entries: [{ title: 'Stok di tangan agen', desc: 'Sudah sampai, sudah bisa dijual, belum di rak.', icon: 'Boxes', soon: true }],
  },
  {
    id: 'stock_opname', label: 'Stock Opname', short: 'Opname', icon: 'ClipboardList',
    blurb: 'Hitung fisik, dan membandingkannya dengan catatan.',
    entries: [{ title: 'Hitung buta', desc: 'Kenapa angka sistem sengaja disembunyikan saat menghitung.', icon: 'ClipboardList', soon: true }],
  },
  {
    id: 'eod', label: 'EOD Setoran', short: 'Setoran', icon: 'Wallet',
    blurb: 'Tutup hari: uang yang dihitung dibandingkan dengan apa.',
    entries: [{ title: 'Setoran harian', desc: 'Angka kamu dibandingkan dengan penjualan hari itu, dan kenapa tidak bisa diubah.', icon: 'Wallet', soon: true }],
  },
  {
    id: 'receivables', label: 'Receivables & Consignment', short: 'Piutang', icon: 'Receipt',
    blurb: 'Utang yang nyata, dan barang yang cuma dititipkan.',
    entries: [{ title: 'Piutang vs titipan', desc: 'Mana yang uang kamu, mana yang barang kamu.', icon: 'Receipt', soon: true }],
  },
  {
    id: 'fleet', label: 'Fleet & Canvas', short: 'Fleet', icon: 'Truck',
    blurb: 'Memuat motor, dan stok yang ikut jalan.',
    entries: [{ title: 'Memuat armada', desc: 'Memuat motor MEMINDAHKAN stok, bukan menyalinnya.', icon: 'Truck', soon: true }],
  },
  {
    id: 'journey', label: 'Journey Plan', short: 'Journey', icon: 'Route',
    blurb: 'Rute kunjungan, dan siapa yang dikunjungi hari ini.',
    entries: [{ title: 'Menyusun rute', desc: 'Urutan kunjungan dan apa yang dicatat di tiap titik.', icon: 'Route', soon: true }],
  },
  {
    id: 'map_war_room', label: 'Map System', short: 'Map', icon: 'Map',
    blurb: 'Semua titik pelanggan di satu peta.',
    entries: [{ title: 'Membaca peta', desc: 'Apa arti tiap warna titik.', icon: 'Map', soon: true }],
  },
  {
    id: 'customers', label: 'Customers', short: 'Customer', icon: 'Users',
    blurb: 'Daftar pelanggan, dan siapa yang boleh melihat siapa.',
    entries: [{ title: 'Menambah pelanggan', desc: 'Data yang wajib, dan kenapa.', icon: 'Users', soon: true }],
  },
  {
    id: 'sampling', label: 'Sampling', short: 'Sampling', icon: 'Gift',
    blurb: 'Barang yang keluar tanpa dibayar, dan siapa yang menanggungnya.',
    entries: [{ title: 'Mencatat sampling', desc: 'Stok tetap berkurang walau tidak ada uang masuk.', icon: 'Gift', soon: true }],
  },
  {
    id: 'transactions', label: 'Reports', short: 'Reports', icon: 'BarChart3',
    blurb: 'Riwayat transaksi dan laporan. Cuma dibaca.',
    entries: [
      /* Product Performance is the top panel on this screen, so it is entry 1 - entries inside a
         section are top-to-bottom order on the screen. */
      { sceneId: 'product-performance', title: 'Product Performance', desc: 'Barang mana yang benar-benar laku, dalam sehari, seminggu, sebulan atau setahun.', icon: 'BarChart3' },
      { title: 'Membaca laporan', desc: 'Rentang tanggal, dan apa yang tidak masuk hitungan.', icon: 'BarChart3', soon: true },
    ],
  },
  {
    id: 'agent_profile', label: 'Agent Profile', short: 'Profile', icon: 'User',
    blurb: 'Profil, tier, dan pencapaian.',
    entries: [{ title: 'Membaca profil', desc: 'Apa yang menaikkan tier.', icon: 'User', soon: true }],
  },
  {
    id: 'audit', label: 'Audit Logs', short: 'Audit', icon: 'ScrollText',
    blurb: 'Catatan siapa melakukan apa. Tidak bisa dihapus.',
    entries: [{ title: 'Membaca audit log', desc: 'Apa yang tercatat otomatis, dan apa yang tidak.', icon: 'ScrollText', soon: true }],
  },
  {
    id: 'settings', label: 'Settings', short: 'Settings', icon: 'Settings',
    blurb: 'Izin, tier, tema, dan Lite Mode.',
    entries: [{ title: 'Izin dan tier', desc: 'Siapa boleh melihat dan mengubah apa.', icon: 'Settings', soon: true }],
  },
];
