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
import { VAULT_PASSWORD } from './demoLogins.js';
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
/* the PC's shut menu is one circle in the top-left corner (.kpm-rail-totem); its items stay in the page at opacity 0
   until the pointer is over it, and the guide used to ring that empty spot (Antigravity Task 3). The circle comes before
   the phone's edge key: the phone never shows the circle, the PC never shows the edge key */
const nav = (id, label, inside) => ({ at: [`[data-mark="${id}"]`, '.kpm-rail-totem', '[aria-label="Open navigation"]'],
    say: [`Buka ${label} dari menu.`, `Arahkan kursor ke menu di kiri atas, lalu pilih ${label}.`, `Buka menu, lalu pilih ${label}.`], done: inside });
/* the customer picker that is on screen: the phone's bar on top of the shelf, or the manifest's button on the PC - both
   carry data-guide="customer". The manifest's copy sits off-canvas on the phone (the 2026-11-14 phone walk: ring at x -334). */
const SHOP = { at: ['[data-guide="shops"]', '[data-guide="customer"]'], say: ['Pilih tokonya dari daftar.', 'Pilih toko yang Anda kunjungi.'],
    done: '[data-mission="4"][data-cust]' };
const PHOTO = { at: '[data-guide="photo"]', say: 'Tekan Foto serah terima otomatis.', done: '[data-mission="4"][data-photo]' };
/* the slip (the manifest) is a drawer on the phone, shut off-canvas to the left: a beat whose control lives in it rings
   the phone's own Bayar / Retur key first (lg:hidden, so the PC's always-open slip still wins). The 2026-11-14 phone
   walk found the photo key ringed at x -330 with the whole screen dimmed. */
const slip = (b) => ({ ...b, at: [...[].concat(b.at), '[data-guide="open-slip"][data-shut]'], say: [...[].concat(b.say), 'Buka pesanan dulu: tekan tombol ini.'] });
/* and the other way round: an open slip covers the shelf (its middle sat on BAGIKAN SAMPEL GRATIS, run 6), so the
   shelf counts only while the slip is shut - else the slip's own header key puts it away */
const shelf = (say, done) => ({ at: ['[data-guide="products"]:not([data-covered])', '[data-guide="close-slip"]'], say: [say, 'Tutup pesanan dulu: tekan tombol ini.'], done });
const BAY = '[data-mission="3"]', DIKA = '.pc[data-agent="demo-agent-2"]:not([data-late])';
/* the owner's vault steps start with the vault open (demo walk 2026-11-08 #1: the owner lands locked - the real app's
   path, the password opens it - and the guide pointed at Restock Vault, whose master desk stays shut, forever). The
   big Unlock System key on a locked screen or the menu's Unlock Vault key, whichever is on screen; done = the menu's
   foot says the vault is open (BiohazardTheme data-vault), so an open vault skips the beat. */
const UNLOCK = { at: ['[data-guide="unlock"]', '.kpm-rail-totem', '[aria-label="Open navigation"]'],
    say: [`Master Vault masih terkunci. Tekan tombol ini, lalu ketik sandi ${VAULT_PASSWORD}.`, 'Master Vault masih terkunci. Arahkan kursor ke menu di kiri atas, lalu tekan Unlock Vault.',
        'Master Vault masih terkunci. Buka menu, lalu tekan Unlock Vault.'],
    done: '[data-vault="open"]' };
export const GUIDE = {
    1: [UNLOCK, nav('restock_vault', 'Restock Vault', '[data-mission="1"]'),
        { at: '[data-mission="1"]', say: 'Tekan MASUK. Di sini barang yang datang dari pabrik dicatat.', done: '[data-mission="1"][aria-selected="true"]' },
        { at: '[data-guide="asal"]', say: 'Pilih Asal: Produksi Pusat.', done: '[data-guide="asal"][data-ok]', open: true },
        { at: '[data-guide="tujuan"]', say: 'Pilih Tujuan: Gudang Pusat (Master Vault).', done: '[data-guide="tujuan"][data-ok]', open: true },
        { at: '[data-guide="goods"]', say: 'Pilih barang yang datang dari pabrik.', done: '[data-guide="cart"][data-n]' },
        { at: '[data-guide="cart"]', say: 'Isi jumlahnya dalam karton, bal, slop atau bks.', done: '[data-guide="cart"][data-qty]' },
        { at: '[data-guide="save"]', say: 'Tekan Simpan surat jalan.' }],
    2: [UNLOCK, nav('restock_vault', 'Restock Vault', '[data-mission="2"]'),
        { at: '[data-mission="2"]', say: 'Tekan KIRIM. Di sini barang keluar dari Master Vault.', done: '[data-mission="2"][aria-selected="true"]' },
        { at: '[data-guide="tujuan"]', say: 'Pilih Tujuan: gudang wilayah yang dikirimi.', done: '[data-guide="tujuan"][data-ok]', open: true },
        { at: '[data-guide="goods"]', say: 'Pilih barang yang mau dikirim.', done: '[data-guide="cart"][data-n]' },
        { at: '[data-guide="cart"]', say: 'Isi jumlah yang dikirim.', done: '[data-guide="cart"][data-qty]' },
        { at: '[data-guide="save"]', say: 'Tekan Kirim sekarang, lalu setujui.' }],
    3: [nav('fleet', 'Fleet & Canvas', '.kpm-fleet-row[data-agent]'),
        { at: '.kpm-fleet-row[data-agent="demo-agent-2"]', say: 'Pilih DIKA SAPUTRA.', done: '.kpm-fleet-row.on[data-agent="demo-agent-2"]' },
        { at: `${BAY} [data-guide="load-plus"]`, say: 'Tekan + pada satu barang untuk dimuat ke van Dika.', done: `${BAY} [data-ponder="go"]:not(:disabled)` },
        { at: `${BAY} [data-ponder="go"]`, say: 'Tekan Load van.' }],
    4: [nav('sales', 'Sales Terminal', '[data-mission="4"]'),
        slip({ at: '[data-guide="sale-mode"]', say: 'Tekan Sale Mode.', done: '[data-mission="4"]:not([data-retur])' }),
        SHOP,
        shelf('Tekan + pada barang yang dibeli toko. Jumlahnya bisa diubah di Manifest.', '[data-mission="4"][data-cart]'),
        slip(PHOTO),
        slip({ at: '[data-mission="4"]', say: `Tekan ${tr('MAKE DEAL')}.` })],
    5: [nav('sales', 'Sales Terminal', '[data-mission="5"]'),
        slip({ at: '[data-mission="5"]', say: 'Tekan Retur Mode.', done: '[data-mission="4"][data-retur]' }),
        SHOP,
        shelf('Tekan + pada barang rusak yang dikembalikan toko.', '[data-mission="4"][data-cart]'),
        /* a pack put in the cart before Retur Mode is still Good and has no reason box yet: then the condition box first */
        slip({ at: ['[data-guide="reason"]', '[data-guide="cond"]'], say: ['Barangnya sudah ditandai Damaged. Pilih alasan rusaknya.', 'Ubah kondisinya menjadi Damaged.'],
          done: '[data-mission="4"][data-reasons]' }),
        slip(PHOTO),
        slip({ at: '[data-mission="4"]', say: `Tekan ${tr('PULL RETUR')}.` })],
    6: [nav('eod', 'EOD Setoran', '[data-mission="6"]'),
        { at: '[data-guide="deck"]', say: 'Hitung tiap kartu: uang tunai, transfer, barang kembali dan pita cukai. Isi angkanya, lalu tekan tombol di bawah kartu.',
          done: '[data-mission="6"]:not([data-stage="open"])' },
        { at: '[data-guide="send"]', say: 'Suratnya sudah lengkap. Tekan kirim.' }],
    7: [UNLOCK, nav('eod', 'EOD Setoran', '[data-guide="eod-review"], [data-mission="7"]'),
        { at: '[data-guide="eod-review"]', say: 'Tekan HQ Verification: laporan yang menunggu persetujuan ada di sini.', done: '[data-mission="7"]' },
        { at: DIKA, say: 'Buka kartu Dika hari ini.', done: `${DIKA}.open` },
        { at: `${DIKA} [aria-label^="approve "][aria-pressed="false"]`, say: 'Tekan ✓ untuk menyetujui bagian ini.', done: `${DIKA}[data-all]` },
        { at: `${DIKA} [data-guide="approve-night"]`, say: 'Tekan tombol Approve, lalu setujui.' }],
    8: [nav('stock_opname', 'Stock Opname', '[data-mission="8"]'),
        { at: '[data-mission="8"]', say: 'Tekan New Count.', done: '[data-guide="count"]' },
        /* a counted product needs every box the app asks for (Good and Damaged, 0 if none) before Submit takes it: the
           2026-11-14 phone walk was sent to Submit after one box and got "Cannot submit: type a number in both boxes".
           A half-filled row's empty box comes first (StockOpnameView data-half, from the app's own countBoxEmpty). */
        { at: ['[data-half] input:placeholder-shown', '[data-guide="good"]', '[data-guide="count"]'],
          say: ['Isi juga kotak ini: ketik 0 kalau tidak ada.', 'Isi jumlah fisik barang yang Anda hitung.', 'Isi jumlah fisik barang yang Anda hitung.'],
          done: '[data-guide="submit-count"]:not(:disabled):not([data-half])' },
        { at: '[data-guide="submit-count"]', say: 'Tekan Submit to HQ.' }],
};

/* THE MENU TOUR - his 2026-11-16: *"he should give step by step tutorial starting from the sidebar first and what it use
   then to the next"*. Before the step, the guide walks the menu one item at a time (DemoMission.jsx reads which items this
   login's menu carries). One line per item: Antigravity Task 5's words, with the item's name as the menu shows it (L). */
export const TOUR = {
    agent_profile: (L) => `Di ${L}, Anda melihat profil, target, peringkat, dan catatan kerja Anda.`,
    dashboard: (L) => `${L} merangkum penjualan, setoran, dan stok perusahaan hari ini dalam satu layar.`,
    map_war_room: (L) => `${L} memantau posisi salesman dan sebaran toko di peta secara langsung.`,
    journey: (L) => `${L} menampilkan daftar toko yang harus Anda kunjungi hari ini dan urutannya.`,
    fleet: (L) => `Di ${L}, pimpinan mengatur tim, memuat barang ke tas salesman, dan menariknya kembali.`,
    inventory: (L) => `${L} menyimpan stok utama perusahaan di gudang pusat beserta barang rusak.`,
    agent_inventory: (L) => `${L} menampilkan isi tas jualan Anda sekarang dan catatan pemasukan hari ini.`,
    restock_vault: (L) => `${L} mencatat barang masuk dari pabrik dan pengiriman stok ke gudang wilayah.`,
    sales: (L) => `${L} dipakai untuk mencatat penjualan ke toko, barang titipan, dan retur barang rusak.`,
    receivables: (L) => `${L} mencatat tagihan titipan toko yang belum lunas dan pembayarannya.`,
    eod: (L) => `Di ${L}, Anda menutup hari: hitung uang tunai, sisa barang, dan kirim laporan ke atasan.`,
    stock_opname: (L) => `${L} dipakai untuk menghitung stok fisik gudang dan mencocokkannya dengan catatan sistem.`,
    customers: (L) => `Di ${L}, Anda mengelola daftar toko terdaftar, alamat, dan batas harganya.`,
    sampling: (L) => `${L} mencatat pembagian rokok contoh gratis ke toko beserta pita cukainya.`,
    transactions: (L) => `${L} menyimpan semua riwayat nota penjualan, retur, dan ringkasan hasil kerja.`,
    audit: (L) => `${L} merekam setiap perubahan penting di sistem agar semua catatan bisa ditelusuri.`,
    settings: (L) => `Di ${L}, Anda mengatur bahasa, tampilan hemat baterai, serta aturan perusahaan.`,
};
/* one item's beat: the item inside the menu, else what opens the menu (the PC's corner circle, the phone's edge key) */
export const tourBeat = (id, label, first) => ({ at: [`[data-kpm-rail] [data-mark="${id}"]`, '.kpm-rail-totem', '[aria-label="Open navigation"]'],
    say: [`${first ? 'Ini menu utama: semua layar aplikasi ada di sini. ' : ''}${TOUR[id](label)}`, 'Arahkan kursor ke menu di kiri atas.', 'Buka menu dulu: tekan tombol ini.'] });

/* the live beat: the first whose `done` is not on the page (`has` asks the page); the last press when all the rest are */
export const liveBeat = (beats, has) => {
    const i = beats.findIndex((b) => !b.done || !has(b.done));
    return i < 0 ? beats.length - 1 : i;
};

/* the demo resets every night at 00:05 WIB (api/_demoCompany.js): progress saved before that belongs to yesterday */
export const missionDay = (ms) => new Date(ms + 7 * 3600e3 - 5 * 60e3).toISOString().slice(0, 10);

/* the first step not done yet; 0 = all done */
export const liveStep = (done) => STEPS.find((s) => !done[s.n])?.n || 0;
