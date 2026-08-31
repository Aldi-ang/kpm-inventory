/* Scene: the Shipment Plan panel.

   HIS RULE THAT PUT THIS FILE HERE, 2026-08-30: *"dont forget that we might need to update the
   ponder book for the new columns and also the new panel, remember, new panel and features means
   different ponder, but inside the same section of the book"*. So a new PANEL gets its own scene;
   a new COLUMN on an existing panel gets extra beats on that panel's existing scene. Both land in
   `restock_vault`, because that is the sidebar section they are printed in, and the book mirrors
   the sidebar.

   LANGUAGE — his rule, 2026-08-27: *"teaching just use indonesia, for terms for the features and
   components just use english"*. Short everyday Indonesian; every column name left in the English
   it is printed in, wrapped in `**` so it renders in accent ink. Translating a column name would
   teach a word that appears nowhere on the panel.

   🔴 THE SCENE IS BUILT AROUND ONE ROW. Cello Chocolate is the only row where `Short by` bites,
   and it is the only reason this panel exists — every other figure on it can be found elsewhere.
   The beats walk to that row and stop there; a tour that gave equal time to the covered rows would
   teach the panel as a table rather than as a decision.

   Step fields are the same as stock-by-warehouse.js: text · focus · at · tone · hold. There is no
   `act` in this scene because the panel has no state to open or close.

   ⚠️ THIS SCENE USED TO BE ALMOST ENTIRELY `at: 'bottom'`, AND THAT REASON EXPIRED 2026-08-31.
   The original note said a 'near' caption on a four-row panel lands on the rows underneath, and it
   was right at the time: beat 7 at 'near' covered Cello Mint, Cello Kopi and the total at once,
   checked on a frame. What made that true was a placement bug, not this panel — the stage never
   scrolled its subject into view, so every caption was positioned against a spot measured
   off-stage, and the fallback for "no room" put the box on top of the subject.

   With that fixed the same beats have somewhere to stand: the stage is 1023px wide against a 380px
   caption, so a column beat stands BESIDE its column instead of over the rows. Aldi asked for it
   back — *"why the tutorial description is static again on PC"* — and it was re-measured rather
   than re-argued: 11 of 13 beats now move, with ZERO overlapping their own highlight and none
   outside the stage, at 1023x527. Beats 1 and 12 stay 'bottom' because they focus `'*'`; there is
   no single thing to point at, so a moving box would be pointing at the panel in general.

   ON A PHONE ALL OF THEM ARE STILL STATIC, and that is deliberate and his call — *"for phone just
   let it static"*. `PonderOverlay` returns no near-caption when the box would take most of the
   stage width, which at 375px it always would. */
export const shipmentPlan = {
  id: 'shipment-plan',
  title: 'Shipment Plan',
  section: 'gudang',
  blurb: 'Kalau barangnya tidak cukup untuk semua cabang, siapa yang dikirim duluan',
  stage: 'shipment-plan',
  related: ['stock-by-warehouse'],
  steps: [
    { text: 'Panel ini menjawab pertanyaan yang tidak bisa dijawab tabel di atasnya: **barangnya kurang, cabang mana yang dikirim lebih dulu.**',
      focus: '*', at: 'bottom', hold: 5200 },

    { text: 'Bedanya dengan tabel di atas: **Stock by Warehouse** satu baris satu gudang. Di panel ini satu baris **satu barang**, dan kolomnya cabang.',
      focus: 'col:product', at: 'near', hold: 5600 },

    { text: '**Master vault has** = stok barang itu di gudang pusat saat ini. Sebanyak itu yang tersedia untuk dibagi.',
      focus: 'col:hq', at: 'near', tone: 'gold', hold: 5000 },

    { text: 'Kolom tengah satu per cabang. Isinya angka yang sama dengan **Send at least** di tabel atas: jumlah paling sedikit yang harus dikirim ke cabang tersebut.',
      focus: 'col:branch', at: 'near', hold: 6000 },

    { text: '**All branches need** menjumlahkan cabang-cabang tadi. Bks boleh dijumlah antar cabang, karena satuannya sama dan barangnya sama.',
      focus: 'col:needed', at: 'near', hold: 5800 },

    { text: 'Kolom **Short by** adalah alasan panel ini dibuat.',
      focus: 'col:short', at: 'near', tone: 'danger', hold: 4200 },

    { text: '**Cello Chocolate**: gudang pusat punya **900**, tiga cabang butuh **1.400**. Kurangnya **500**, dan tidak ada tempat lain untuk mengambilnya.',
      focus: 'row:plan-choco', at: 'near', tone: 'danger', hold: 7000 },

    { text: 'Baris merah selalu naik ke atas. Baris itu yang harus diputuskan hari ini. Aplikasi tidak memutuskan cabang mana yang mengalah.',
      focus: 'row:plan-choco', at: 'near', tone: 'danger', hold: 6400 },

    { text: '**Cello Mint** tulisannya **covered**: stok pusat cukup untuk semua cabang, jadi tidak ada yang perlu diputuskan.',
      focus: 'row:plan-mint', at: 'near', hold: 5400 },

    { text: 'Tanda **—** artinya belum bisa dihitung. **Cello Kopi** belum punya riwayat kiriman yang cukup, jadi aplikasi memilih diam daripada menebak.',
      focus: 'row:plan-kopi', at: 'near', hold: 6000 },

    { text: '**—** dan **0** tidak sama. Nol berarti perhitungannya selesai dan hasilnya tidak perlu kiriman. **—** berarti belum bisa dihitung.',
      focus: 'col:branch', at: 'near', tone: 'gold', hold: 6400 },

    { text: 'Barang yang semua cabangnya nol tidak ditampilkan sama sekali. Panel ini tentang barang yang kurang, jadi barang yang aman tidak ikut memenuhi layar.',
      focus: '*', at: 'bottom', hold: 6000 },

    { text: 'Baris bawah totalnya. **Short by** di baris itu menjumlahkan semua kekurangan. Kira-kira sebanyak itu barang yang perlu diproduksi supaya semua cabang aman.',
      focus: 'row:total', at: 'near', tone: 'gold', hold: 6600 },
  ],
};
