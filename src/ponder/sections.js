/* THE BOOK'S TABLE OF CONTENTS — data only, and in its own file on purpose.

   `registry.js` imports a stage, and a stage is JSX. The integration audit runs in plain Node, so
   it cannot import that file at all — but it MUST be able to read these sections, because the
   check that every entry resolves to a real scene is the one stopping a card that does nothing
   when pressed. Keeping this as data means the audit holds the real objects instead of grepping
   for them, which is a different and much weaker claim.

   His ask, 2026-08-27: *"inside the book i want every section of this app tutorials to be put
   there"*. An index that lists only what exists teaches nobody what is coming and quietly implies
   the rest of the app has nothing to explain. So every section is here, and an entry with no
   scene yet says so on its own face rather than being missing.

   `short` is the tab label. A tab is ~110px wide and a truncated tab teaches nothing — the
   full name is printed across the page it opens, so the tab only has to be recognisable.

   ⚠️ `icon` is a STRING, resolved to a lucide component inside PonderBook. Keeping it a string is
   what lets this file stay data — the same rule the scenes follow.

   The order is the build order from `.claude/PONDER-PLAN.md`, which is ranked by where a mistake
   costs money, not by where it is easiest to write. */
export const SECTIONS = [
  {
    id: 'gudang', label: 'Gudang & Stok', short: 'Gudang', icon: 'Globe',
    blurb: 'Di mana barang berada, dan gudang mana yang harus diisi duluan.',
    entries: [
      { sceneId: 'stock-by-warehouse', title: 'Stock by Warehouse', desc: 'Baca tabel gudang, dan kenapa tidak ada sisa hari untuk satu gudang penuh.', icon: 'Globe' },
      { title: 'Stock Opname', desc: 'Hitung buta, dan kenapa angkanya sengaja disembunyikan.', icon: 'Eye', soon: true },
    ],
  },
  {
    id: 'kasir', label: 'Kasir', short: 'Kasir', icon: 'Package',
    blurb: 'Menjual, mencetak nota, dan apa yang sudah tidak bisa ditarik lagi.',
    entries: [
      { title: 'Titip vs Lunas', desc: 'Beda barang titipan dan barang yang sudah dibayar.', icon: 'Package', soon: true },
      { title: 'Nota', desc: 'Apa yang terkunci begitu nota dicetak.', icon: 'FileText', soon: true },
    ],
  },
  {
    id: 'setoran', label: 'Setoran', short: 'Setoran', icon: 'FileText',
    blurb: 'Tutup hari: uang yang dihitung dibandingkan dengan apa.',
    entries: [
      { title: 'Setoran harian', desc: 'Angka kamu dibandingkan dengan penjualan hari itu.', icon: 'FileText', soon: true },
      { title: 'Kenapa tidak bisa diubah', desc: 'Setelah dikirim, setoran jadi catatan, bukan draf.', icon: 'Check', soon: true },
    ],
  },
  {
    id: 'restock', label: 'Restock Vault', short: 'Restock', icon: 'Truck',
    blurb: 'Permintaan cabang, pengiriman, dan surat jalan.',
    entries: [
      { title: 'Siapkan Pengiriman', desc: 'Stok pusat langsung berkurang saat tombol ini ditekan.', icon: 'Truck', soon: true },
      { title: 'Delivery note', desc: 'Tiga nomor surat jalan, dan siapa yang membuat masing-masing.', icon: 'FileText', soon: true },
    ],
  },
  {
    id: 'piutang', label: 'Piutang & Titipan', short: 'Piutang', icon: 'User',
    blurb: 'Utang yang nyata, dan barang yang cuma dititipkan.',
    entries: [
      { title: 'Piutang vs titipan', desc: 'Mana yang uang kamu, mana yang barang kamu.', icon: 'User', soon: true },
    ],
  },
  {
    id: 'armada', label: 'Armada & Canvas', short: 'Armada', icon: 'MapPin',
    blurb: 'Memuat motor, rute, dan stok yang ikut jalan.',
    entries: [
      { title: 'Memuat armada', desc: 'Memuat motor MEMINDAHKAN stok, bukan menyalinnya.', icon: 'MapPin', soon: true },
    ],
  },
  {
    id: 'laporan', label: 'Dashboard & Laporan', short: 'Laporan', icon: 'Clock',
    blurb: 'Angka yang cuma dibaca, tidak mengubah apa pun.',
    entries: [
      { title: 'Membaca dashboard', desc: 'Jendela 7 hari, dan apa yang bukan tren.', icon: 'Clock', soon: true },
    ],
  },
];

