/* Scene: the Loading Bay (Fleet & Roster).

   HIS RULE THAT PUT THIS FILE HERE, 2026-09-24 12:50: the teaching words inside the bay were "robotic", and *"dont put
   tutorial inside the panel, we will put all the tutorial on the ponder book anyway"*. They left the bay that day (check
   "no tutorial inside the bay or on the stage bar") and come back HERE, rewritten as a person would say them. The
   originals are in A-Brain Brainstorm/2026-09-24_roster-as-a-game-community.md, round 4.5 - never paste them back.

   LANGUAGE: plain Indonesian, the bay's own words; everything printed on the bay stays in the spelling it is printed in,
   wrapped in `**`. The subject is the bay, the stock, the salesman - never the reader (audit: no second person).

   🔴 THE PAGE IS BUILT AROUND ONE RULE: dragging, Salin and the usual load only write the MUATAN, a plan; Muat van is the
   one key that moves stock. The beats say it at the drag, at the key, at each fill, and once more at the end - it is
   the thing a new admin gets wrong, because a box that has already flown into the van LOOKS loaded.

   Step fields as every other scene: text · focus · at · tone · hold · act. The acts pose the real bay - see
   stages/LoadingBayStage.jsx. A beat on a chest's tabs comes after the act that shut that chest (logicFixes checks it).
   'near' everywhere a single part is pointed at; 'bottom' only where the beat is about the whole bay. */
export const loadingBay = {
  id: 'loading-bay',
  title: 'Loading Bay',
  section: 'fleet',
  blurb: 'Menarik kotak cuma menyusun muatan; stok pindah saat Muat van ditekan',
  stage: 'loading-bay',
  related: [],
  steps: [
    /* ── what the bay is ──────────────────────────────────────────────────────────────────────── */
    { text: 'Bay ini memuat van satu orang: yang kartunya dipilih di roster.',
      focus: '*', at: 'bottom', hold: 3400 },

    { text: 'Ada dua peti: **Gudang** dan van Budi.',
      focus: ['chest:wh', 'chest:van'], at: 'near', hold: 2600 },

    { text: '**Gudang Bandung**: barang yang ada di gudang, dihitung dalam Bks.',
      focus: 'gui:wh', at: 'near', hold: 3400 },

    { text: '**Budi inventory**: isi van Budi sekarang.',
      focus: 'gui:van', at: 'near', hold: 2800 },

    /* ── a drag only plans ────────────────────────────────────────────────────────────────────── */
    { text: 'Untuk memuat, kotaknya ditarik dari gudang ke van.',
      focus: 'gui:wh', at: 'near', hold: 3000 },

    { text: 'Untuk mengembalikan, kotaknya ditarik dari van ke gudang.',
      focus: 'gui:van', at: 'near', hold: 3200 },

    { text: 'Di HP tidak perlu menarik: barangnya diketuk, lalu kotak kosong di van diketuk.',
      focus: 'gui:van', at: 'near', hold: 4000 },

    { text: 'Setelah jumlahnya diisi, barisnya masuk ke **Muatan**.',
      focus: 'man', at: 'bottom', act: 'lines:plan', hold: 3200 },

    { text: 'Tanda **+** berangkat ke van, tanda **−** pulang ke gudang.',
      focus: 'man', at: 'bottom', hold: 3200 },

    { text: 'Sampai di sini stok gudang dan van belum berubah sedikit pun.',
      focus: 'man', at: 'bottom', tone: 'gold', hold: 3600 },

    { text: 'Muatan masih rencana, jadi masih boleh salah.',
      focus: 'man', at: 'bottom', hold: 2800 },

    { text: 'Barisnya ditekan untuk mengubah jumlah, atau dibuang lewat **×**.',
      focus: 'man', at: 'bottom', hold: 3400 },

    /* ── the one key ──────────────────────────────────────────────────────────────────────────── */
    { text: '**Muat van** satu-satunya tombol yang memindahkan stok.',
      focus: 'go', at: 'bottom', tone: 'gold', hold: 3400 },

    { text: 'Sekali ditekan, semua baris di muatan dicatat bersama.',
      focus: 'go', at: 'bottom', hold: 3000 },

    { text: 'Yang berangkat ke van dapat satu **surat jalan**.',
      focus: 'go', at: 'bottom', hold: 3000 },

    { text: 'Yang pulang ke gudang dapat satu **bukti kembali**.',
      focus: 'go', at: 'bottom', hold: 3000 },

    { text: 'Baris yang gagal tidak hilang: tetap di muatan, dengan alasannya.',
      focus: 'man', at: 'bottom', tone: 'danger', act: 'lines:failed', hold: 3800 },

    { text: 'Surat jalannya cuma berisi yang benar-benar sampai.',
      focus: 'man', at: 'bottom', tone: 'danger', hold: 3000 },

    /* ── behind the warehouse chest ───────────────────────────────────────────────────────────── */
    { text: 'Peti yang ditutup tidak meninggalkan ruang kosong.',
      focus: 'chest:wh', at: 'near', act: 'shut:wh', hold: 3000 },

    { text: 'Di tempatnya muncul tab: **Muatan biasa** dan **Tim**.',
      focus: 'slip:wh', at: 'near', hold: 3200 },

    { text: 'Di PC, panelnya tetap setinggi tadi, jadi layar tidak meloncat.',
      focus: 'slip:wh', at: 'near', hold: 3400 },

    { text: '**Muatan biasa**: bawaan rutin Budi yang sudah disimpan.',
      focus: 'slip:wh', at: 'near', hold: 3200 },

    { text: '**Pakai muatan biasa** mengisi muatan dari daftar itu.',
      focus: 'man', at: 'bottom', act: 'lines:preset', hold: 3200 },

    { text: 'Stoknya tetap diam. Muatan ini juga masih rencana.',
      focus: 'man', at: 'bottom', tone: 'gold', hold: 3200 },

    { text: 'Tab **Tim**: van lain di tempat yang sama, lengkap dengan isinya.',
      focus: 'slip:wh', at: 'near', act: 'tab:wh:team', hold: 3400 },

    { text: '**Salin** mengisi muatan Budi dengan isi van itu.',
      focus: 'slip:wh', at: 'near', hold: 3000 },

    { text: 'Sama seperti muatan biasa, stok baru pindah saat **Muat van** ditekan.',
      focus: 'go', at: 'bottom', tone: 'gold', hold: 3600 },

    /* ── behind the van chest ─────────────────────────────────────────────────────────────────── */
    { text: 'Peti van yang ditutup juga diganti tab.',
      focus: 'slip:van', at: 'near', act: 'shut:van', hold: 3000 },

    { text: 'Ketiga tab ini cuma untuk dilihat.',
      focus: 'slip:van', at: 'near', hold: 2600 },

    { text: '**Geofence**: permintaan Budi waktu berjualan di luar jarak toko, dengan statusnya.',
      focus: 'slip:van', at: 'near', hold: 3800 },

    { text: 'Permintaan yang menunggu disetujui dari antrean di bagian atas layar, bukan dari sini.',
      focus: 'slip:van', at: 'near', tone: 'gold', hold: 4000 },

    { text: '**Titip**: toko yang masih memegang barang atau utang titipan Budi.',
      focus: 'slip:van', at: 'near', act: 'tab:van:titip', hold: 3600 },

    { text: 'Pelunasannya dicatat di **Receivables & Consignment**.',
      focus: 'slip:van', at: 'near', hold: 3200 },

    { text: '**Bounty**: denda yang masih ditanggung Budi, dengan alasannya.',
      focus: 'slip:van', at: 'near', act: 'tab:van:bounty', hold: 3600 },

    { text: 'Bayarnya di **EOD Setoran**, bukan di tab ini.',
      focus: 'slip:van', at: 'near', hold: 3000 },

    /* ── the rule, once more ──────────────────────────────────────────────────────────────────── */
    { text: 'Menarik, menyalin, dan muatan biasa hanya menyusun rencana.',
      focus: '*', at: 'bottom', act: 'open:wh', hold: 3400 },

    { text: 'Stok gudang dan van berubah lewat satu tombol saja: **Muat van**.',
      focus: 'go', at: 'bottom', tone: 'gold', act: 'open:van', hold: 3600 },
  ],
};
