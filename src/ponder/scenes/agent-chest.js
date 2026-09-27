/* Scene: the Agent Chest (Agent Inventory, for a regional admin and above).

   His 2026-09-22 words: *"agent chest is basically agent inventory for regional admin tier and above by default"*. The
   chest is the bay's own van chest (components/LoadingBay.jsx, vanOnly); the salesman keeps his list screen.

   LANGUAGE: plain Indonesian, the chest's own words; everything printed on screen stays in its spelling, wrapped in `**`.
   The subject is the chest, the van, Budi - never the reader (audit: no second person).

   🔴 THE PAGE IS BUILT AROUND ONE RULE: a drag here only tidies the SUSUNAN. The stock does not move, and loading still
   goes through Muat van in the Loading Bay - the same thing the bay page teaches, from the other side.

   Step fields as every other scene: text · focus · at · tone · hold · act. The only acts are shut:van / open:van
   (stages/AgentChestStage.jsx). 'near' where one part is pointed at; 'bottom' where the beat is about the whole chest. */
export const agentChest = {
  id: 'agent-chest',
  title: 'Agent Chest',
  section: 'agent_inventory',
  blurb: 'Isi van sebagai peti; menarik kotak cuma menata susunan',
  stage: 'agent-chest',
  related: [],
  steps: [
    /* ── who sees it ──────────────────────────────────────────────────────────────────────────── */
    { text: 'Untuk **Regional Admin** ke atas, Agent Inventory tampil sebagai dua peti dan satu buku.',
      focus: '*', at: 'bottom', hold: 3400 },

    { text: 'Salesman tetap melihat daftar barang seperti biasa.',
      focus: '*', at: 'bottom', hold: 2800 },

    { text: 'Petinya diketuk untuk membuka atau menutup.',
      focus: 'chest:van', at: 'near', hold: 2800 },

    /* ── what the chest shows ─────────────────────────────────────────────────────────────────── */
    { text: '**Budi inventory**: isi van Budi sekarang, totalnya dalam Bks.',
      focus: 'gui:van', at: 'near', hold: 3200 },

    { text: 'Satu halaman berisi enam kotak, di PC maupun di HP.',
      focus: 'gui:van', at: 'near', hold: 3000 },

    { text: 'Tiap barang berdiri sebagai kotak 3D seukuran bungkusnya.',
      focus: 'gui:van', at: 'near', hold: 3200 },

    { text: 'Angka di pojok kotak adalah jumlah Bks barang itu di van.',
      focus: 'gui:van', at: 'near', hold: 3200 },

    { text: 'Tombol halaman ikut menghitung: **2 · 4** berarti halaman 2 berisi empat barang.',
      focus: 'pages:van', at: 'near', hold: 3800 },

    { text: 'Jadi halaman tidak perlu dibalik cuma untuk tahu isinya.',
      focus: 'pages:van', at: 'near', hold: 3000 },

    /* ── a drag only tidies ───────────────────────────────────────────────────────────────────── */
    { text: 'Kotak bisa ditarik ke kotak lain untuk menata susunan.',
      focus: 'gui:van', at: 'near', hold: 3000 },

    { text: 'Ke kotak kosong, barangnya pindah. Ke kotak yang terisi, keduanya bertukar tempat.',
      focus: 'gui:van', at: 'near', hold: 3800 },

    { text: 'Kotak kosong tetap di tempatnya. Susunannya tidak dirapatkan sendiri.',
      focus: 'gui:van', at: 'near', hold: 3200 },

    { text: 'Untuk pindah halaman, kotaknya ditahan sebentar di atas nomor halaman.',
      focus: 'pages:van', at: 'near', hold: 3400 },

    { text: 'Yang tersimpan cuma susunan kotak. Stok van tidak berubah sedikit pun.',
      focus: 'gui:van', at: 'near', tone: 'gold', hold: 3600 },

    { text: 'Susunan yang sama dipakai peti van di **Fleet & Canvas**.',
      focus: 'gui:van', at: 'near', hold: 3200 },

    { text: 'Memuat dan mengembalikan barang tetap lewat **Muat van** di Loading Bay.',
      focus: 'gui:van', at: 'near', tone: 'gold', hold: 3600 },

    /* ── the quarantine crate (v4) ──────────────────────────────────────────────────────────────── */
    { text: 'Di sebelahnya berdiri peti kuning **Karantina**: retur rusak hari ini yang menunggu EOD.',
      focus: 'chest:q', at: 'near', hold: 3400 },

    { text: 'Kotak di dalamnya diketuk untuk melihat asal toko dan alasannya.',
      focus: 'gui:q', at: 'near', hold: 3200 },

    { text: 'Isi peti ini tidak bisa ditambah atau dikeluarkan dengan menarik kotak.',
      focus: 'gui:q', at: 'near', tone: 'danger', hold: 3400 },

    { text: 'Barang rusak dicatat lewat **EOD Setoran**.',
      focus: 'gui:q', at: 'near', hold: 3000 },

    /* ── the book of the day (v4) ─────────────────────────────────────────────────────────────── */
    { text: 'Di bawahnya ada buku **Catatan hari ini**: penjualan dan sampel hari ini.',
      focus: 'book', at: 'near', hold: 3400 },

    { text: 'Bukunya punya dua bagian, **Penjualan** dan **Sampel**, dua pita di atasnya.',
      focus: 'book', at: 'near', hold: 3400 },

    { text: 'Ditekan, bukunya terbuka lebar. **Tutup** mengembalikannya ke rak.',
      focus: 'book', at: 'near', hold: 3400 },

    /* ── shut and open ────────────────────────────────────────────────────────────────────────── */
    { text: 'Petinya boleh ditutup kalau layar mau lebih lega.',
      focus: 'chest:van', at: 'near', act: 'shut:van', hold: 3000 },

    { text: 'Diketuk lagi, isinya kembali persis seperti tadi.',
      focus: 'gui:van', at: 'near', act: 'open:van', hold: 3200 },

    { text: 'Di Lite Mode kotaknya langsung tampil, tanpa putaran.',
      focus: 'gui:van', at: 'near', hold: 3000 },
  ],
};
