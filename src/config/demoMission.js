/* THE DEMO MISSION'S STEPS AND THE TWO RULES THE LINE RUNS ON - demo build only (components/DemoMission.jsx).
   Plain JS so logicFixes.selfcheck.mjs can run the rules on real dates. Who does what, read from demoLogins.js
   2026-10-24: steps 1-2 = the Owner (T2), step 3 = the Regional Admin (T4) loading the motorist Dika's bag.
   2026-10-25 his ask: the whole round, *"starting from the very first flow which is restock in the master vault until
   the stock opname and goods returning"*, and what returning means: *"good returning means EOD and also give back the
   quarantine item to the main warehouse"*. So Dika (T6) sells, takes a damaged pack back from a shop (that is what puts
   anything in his quarantine), sends his EOD; the Owner approves it - that approval is what moves the leftover stock and
   the quarantine packs into the Master Vault (App.jsx handleVerifyEOD) - and then counts the vault. */
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

/* the demo resets every night at 00:05 WIB (api/_demoCompany.js): progress saved before that belongs to yesterday */
export const missionDay = (ms) => new Date(ms + 7 * 3600e3 - 5 * 60e3).toISOString().slice(0, 10);

/* the first step not done yet; 0 = all done */
export const liveStep = (done) => STEPS.find((s) => !done[s.n])?.n || 0;
