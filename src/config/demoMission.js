/* THE DEMO MISSION'S STEPS AND THE TWO RULES THE LINE RUNS ON - demo build only (components/DemoMission.jsx).
   Plain JS so logicFixes.selfcheck.mjs can run the rules on real dates. Who does what, read from demoLogins.js
   2026-10-24: steps 1-2 = the Owner (T2), step 3 = the Regional Admin (T4) loading the motorist Dika's bag.
   2026-10-25 his ask: the whole round, *"starting from the very first flow which is restock in the master vault until
   the stock opname and goods returning"*, and what returning means: *"good returning means EOD and also give back the
   quarantine item to the main warehouse"*. So Dika (T6) sells, takes a damaged pack back from a shop (that is what puts
   anything in his quarantine), sends his EOD; the Owner approves it - that approval is what moves the leftover stock and
   the quarantine packs into the Master Vault (App.jsx handleVerifyEOD) - and then counts the vault. */
/* the guide names a terminal button by the words the phone shows (Indonesian unless English was picked) */
import { tr } from './lang.js';
export const fmt = (n) => (Number(n) || 0).toLocaleString('id-ID');

export const STEPS = [
    { n: 1, who: 'T2', todo: 'Terima hasil produksi di Master Vault', done: (d) => `${fmt(d.qty)} Bks masuk ke Master Vault` },
    { n: 2, who: 'T2', todo: 'Kirim barang ke gudang wilayah', done: (d) => `${fmt(d.qty)} Bks dikirim ke ${d.to}` },
    { n: 3, who: 'T4', todo: 'Muat barang ke tas Dika', done: (d) => `${fmt(d.qty)} Bks masuk ke tas ${d.who}` },
    { n: 4, who: 'T6', todo: 'Jual barang ke toko', done: (d) => `Terjual Rp ${fmt(d.total)} ke ${d.to}` },
    { n: 5, who: 'T6', todo: 'Terima barang rusak dari toko (retur)', done: (d) => `${fmt(d.bks)} Bks barang rusak dari ${d.to} masuk karantina tas` },
    { n: 6, who: 'T6', todo: 'Kirim laporan akhir hari (EOD)', done: (d) => `Laporan akhir hari ${d.who} terkirim` },
    { n: 7, who: 'T2', todo: 'Setujui EOD: sisa barang dan barang rusak kembali ke Master Vault',
      done: (d) => `EOD ${d.who} disetujui, sisa barang${d.damaged ? ` dan ${fmt(d.damaged)} Bks barang rusak` : ''} kembali ke Master Vault` },
    { n: 8, who: 'T2', todo: 'Hitung stok Master Vault (Stock Opname)', done: (d) => `${fmt(d.items)} barang dihitung dan dikirim ke HQ` },
];

/* THE STEP-BY-STEP GUIDE - his pick B, 2026-10-25: *"b is better because its easier to understand and see if the guide
   is just infront of them face without too many buttons"*. Each step is a list of beats on the REAL screen: `at` is what
   the ring goes round (a list = the first one showing, with its own line in `say`), `done` is a selector that is on the
   page once that beat is behind the visitor. The live beat is the first one whose `done` is not on the page, so the guide
   follows whatever the visitor does - forward, back, or straight past a beat the form already had filled in. A beat with
   no `done` is the step's last press; the step's own tick ('kpm-mission') moves the guide on. The `data-guide` /
   `data-*` marks it reads sit on the real components. */
const nav = (id, label, inside) => ({ at: [`[data-mark="${id}"]`, '[aria-label="Open navigation"]'],
    say: [`Buka ${label} dari menu.`, `Buka menu, lalu pilih ${label}.`], done: inside });
const SHOP = { at: ['[data-guide="shops"]', '[aria-label="Choose customer"]'], say: ['Pilih tokonya dari daftar.', 'Pilih toko yang Anda kunjungi.'],
    done: '[data-mission="4"][data-cust]' };
const PHOTO = { at: '[data-guide="photo"]', say: 'Tekan Foto serah terima otomatis.', done: '[data-mission="4"][data-photo]' };
const BAY = '[data-mission="3"]', DIKA = '.pc[data-agent="demo-agent-2"]:not([data-late])';
export const GUIDE = {
    1: [nav('restock_vault', 'Restock Vault', '[data-mission="1"]'),
        { at: '[data-mission="1"]', say: 'Tekan MASUK. Di sini barang yang datang dari pabrik dicatat.', done: '[data-mission="1"][aria-selected="true"]' },
        { at: '[data-guide="asal"]', say: 'Pilih Asal: Produksi Pusat.', done: '[data-guide="asal"][data-ok]', open: true },
        { at: '[data-guide="tujuan"]', say: 'Pilih Tujuan: Gudang Pusat (Master Vault).', done: '[data-guide="tujuan"][data-ok]', open: true },
        { at: '[data-guide="goods"]', say: 'Pilih barang yang datang dari pabrik.', done: '[data-guide="cart"][data-n]' },
        { at: '[data-guide="cart"]', say: 'Isi jumlahnya dalam karton, bal, slop atau bks.', done: '[data-guide="cart"][data-qty]' },
        { at: '[data-guide="save"]', say: 'Tekan Simpan surat jalan.' }],
    2: [nav('restock_vault', 'Restock Vault', '[data-mission="2"]'),
        { at: '[data-mission="2"]', say: 'Tekan KIRIM. Di sini barang keluar dari Master Vault.', done: '[data-mission="2"][aria-selected="true"]' },
        { at: '[data-guide="tujuan"]', say: 'Pilih Tujuan: gudang wilayah yang dikirimi.', done: '[data-guide="tujuan"][data-ok]', open: true },
        { at: '[data-guide="goods"]', say: 'Pilih barang yang mau dikirim.', done: '[data-guide="cart"][data-n]' },
        { at: '[data-guide="cart"]', say: 'Isi jumlah yang dikirim.', done: '[data-guide="cart"][data-qty]' },
        { at: '[data-guide="save"]', say: 'Tekan Kirim sekarang, lalu setujui.' }],
    3: [nav('fleet', 'Fleet & Canvas', '.kpm-actor[data-agent]'),
        { at: '.kpm-actor[data-agent="demo-agent-2"]', say: 'Pilih DIKA SAPUTRA.', done: '.kpm-actor.on[data-agent="demo-agent-2"]' },
        { at: '[data-guide="wh"]', say: 'Ketuk satu barang di gudang.', done: `${BAY} .kpm-bay.picking, .kpm-bay-sheet, ${BAY} [data-ponder="go"]:not(:disabled)` },
        { at: '[data-guide="van"]', say: 'Lalu ketuk kotak kosong di van Dika.', done: `.kpm-bay-sheet, ${BAY} [data-ponder="go"]:not(:disabled)` },
        { at: '.kpm-bay-sheet', say: 'Isi jumlahnya, lalu tekan Masukkan ke van.', done: `${BAY} [data-ponder="go"]:not(:disabled)` },
        { at: `${BAY} [data-ponder="go"]`, say: 'Tekan Muat van.' }],
    4: [nav('sales', 'Sales Terminal', '[data-mission="4"]'),
        { at: '[data-guide="sale-mode"]', say: 'Tekan Sale Mode.', done: '[data-mission="4"]:not([data-retur])' },
        SHOP,
        { at: '[data-guide="products"]', say: 'Tekan + pada barang yang dibeli toko. Jumlahnya bisa diubah di Manifest.', done: '[data-mission="4"][data-cart]' },
        PHOTO,
        { at: '[data-mission="4"]', say: 'Tekan MAKE DEAL.' }],
    5: [nav('sales', 'Sales Terminal', '[data-mission="5"]'),
        { at: '[data-mission="5"]', say: 'Tekan Retur Mode.', done: '[data-mission="4"][data-retur]' },
        SHOP,
        { at: '[data-guide="products"]', say: 'Tekan + pada barang rusak yang dikembalikan toko.', done: '[data-mission="4"][data-cart]' },
        /* a pack put in the cart before Retur Mode is still Good and has no reason box yet: then the condition box first */
        { at: ['[data-guide="reason"]', '[data-guide="cond"]'], say: ['Barangnya sudah ditandai Damaged. Pilih alasan rusaknya.', 'Ubah kondisinya menjadi Damaged.'],
          done: '[data-mission="4"][data-reasons]' },
        PHOTO,
        { at: '[data-mission="4"]', say: `Tekan ${tr('PULL RETUR')}.` }],
    6: [nav('eod', 'EOD Setoran', '[data-mission="6"]'),
        { at: '[data-guide="deck"]', say: 'Hitung tiap kartu: uang tunai, transfer, barang kembali dan pita cukai. Isi angkanya, lalu tekan tombol di bawah kartu.',
          done: '[data-mission="6"]:not([data-stage="open"])' },
        { at: '[data-guide="send"]', say: 'Suratnya sudah lengkap. Tekan kirim.' }],
    7: [nav('eod', 'EOD Setoran', '[data-guide="eod-review"], [data-mission="7"]'),
        { at: '[data-guide="eod-review"]', say: 'Tekan HQ Verification: laporan yang menunggu persetujuan ada di sini.', done: '[data-mission="7"]' },
        { at: DIKA, say: 'Buka kartu Dika hari ini.', done: `${DIKA}.open` },
        { at: `${DIKA} [aria-label^="approve "][aria-pressed="false"]`, say: 'Tekan ✓ untuk menyetujui bagian ini.', done: `${DIKA}[data-all]` },
        { at: `${DIKA} [data-guide="approve-night"]`, say: 'Tekan tombol Approve, lalu setujui.' }],
    8: [nav('stock_opname', 'Stock Opname', '[data-mission="8"]'),
        { at: '[data-mission="8"]', say: 'Tekan New Count.', done: '[data-guide="count"]' },
        { at: ['[data-guide="good"]', '[data-guide="count"]'], say: ['Isi jumlah fisik barang yang Anda hitung.', 'Isi jumlah fisik barang yang Anda hitung.'],
          done: '[data-guide="submit-count"]:not(:disabled)' },
        { at: '[data-guide="submit-count"]', say: 'Tekan Submit to HQ.' }],
};

/* the live beat: the first whose `done` is not on the page (`has` asks the page); the last press when all the rest are */
export const liveBeat = (beats, has) => {
    const i = beats.findIndex((b) => !b.done || !has(b.done));
    return i < 0 ? beats.length - 1 : i;
};

/* the demo resets every night at 00:05 WIB (api/_demoCompany.js): progress saved before that belongs to yesterday */
export const missionDay = (ms) => new Date(ms + 7 * 3600e3 - 5 * 60e3).toISOString().slice(0, 10);

/* the first step not done yet; 0 = all done */
export const liveStep = (done) => STEPS.find((s) => !done[s.n])?.n || 0;
