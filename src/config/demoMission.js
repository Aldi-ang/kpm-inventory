/* THE DEMO MISSION'S THREE STEPS AND THE TWO RULES THE LINE RUNS ON - demo build only (components/DemoMission.jsx).
   Plain JS so logicFixes.selfcheck.mjs can run the rules on real dates. Who does what, read from demoLogins.js
   2026-10-24: steps 1-2 = the Owner (T2), step 3 = the Regional Admin (T4) loading the motorist Dika's bag. */
export const fmt = (n) => (Number(n) || 0).toLocaleString('id-ID');

export const STEPS = [
    { n: 1, who: 'T2', todo: 'Terima hasil produksi di Master Vault', done: (d) => `${fmt(d.qty)} Bks masuk ke Master Vault` },
    { n: 2, who: 'T2', todo: 'Kirim barang ke gudang wilayah', done: (d) => `${fmt(d.qty)} Bks dikirim ke ${d.to}` },
    { n: 3, who: 'T4', todo: 'Muat barang ke tas Dika', done: (d) => `${fmt(d.qty)} Bks masuk ke tas ${d.who}` },
];

/* the demo resets every night at 00:05 WIB (api/_demoCompany.js): progress saved before that belongs to yesterday */
export const missionDay = (ms) => new Date(ms + 7 * 3600e3 - 5 * 60e3).toISOString().slice(0, 10);

/* the first step not done yet; 0 = all three done */
export const liveStep = (done) => STEPS.find((s) => !done[s.n])?.n || 0;
