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
   `act` in this scene because the panel has no state to open or close — which also means no beat
   here can point inside something closed, the trap that check `strandedBeats` exists for.

   🔴 SPLIT 2026-09-04: ONE IDEA PER BEAT, the last of the five scenes. Aldi — *"there is too much
   words but too little showing"*, *"make sure that for almost every sentence there is some textbox
   to highlights and explain not just sentence reading"*, *"also apply this logic to other tutorial
   as well"*. Before: 13 beats averaging 128 characters, several holding a column and its caveat and
   its example in one seven-second breath. Now 29 beats, one sentence each.

   ⚠️ THIS SCENE USED TO BE ALMOST ENTIRELY `at: 'bottom'`, AND THAT REASON EXPIRED 2026-08-31.
   The original note said a 'near' caption on a four-row panel lands on the rows underneath, and it
   was right at the time: a beat at 'near' covered Cello Mint, Cello Kopi and the total at once,
   checked on a frame. What made that true was a placement bug, not this panel — the stage never
   scrolled its subject into view, so every caption was positioned against a spot measured
   off-stage, and the fallback for "no room" put the box on top of the subject.

   With that fixed the same beats have somewhere to stand: the stage is 1023px wide against a 380px
   caption, so a column beat stands BESIDE its column instead of over the rows. Aldi asked for it
   back — *"why the tutorial description is static again on PC"* — and it was re-measured rather
   than re-argued. **Only the beats that focus `'*'` stay 'bottom'**, and that rule survives the
   split: there is no single thing to point at, so a moving box would be pointing at the panel in
   general. Every other beat is 'near'.

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
    /* ── the question this panel exists for ──────────────────────────────────────────────────── */
    { text: 'Panel ini menjawab pertanyaan yang tidak bisa dijawab tabel di atasnya.',
      focus: '*', at: 'bottom', hold: 3200 },

    { text: '**Barangnya kurang, cabang mana yang dikirim lebih dulu.**',
      focus: '*', at: 'bottom', hold: 3400 },

    { text: 'Bedanya dengan tabel di atas: **Stock by Warehouse** satu baris satu gudang.',
      focus: 'col:product', at: 'near', hold: 3600 },

    { text: 'Di panel ini satu baris **satu barang**, dan kolomnya cabang.',
      focus: 'col:product', at: 'near', hold: 3400 },

    /* ── the columns, left to right ──────────────────────────────────────────────────────────── */
    { text: '**Master vault has** = stok barang itu di gudang pusat saat ini.',
      focus: 'col:hq', at: 'near', tone: 'gold', hold: 3400 },

    { text: 'Sebanyak itu yang tersedia untuk dibagi.',
      focus: 'col:hq', at: 'near', tone: 'gold', hold: 2600 },

    { text: 'Kolom tengah satu per cabang.',
      focus: 'col:branch', at: 'near', hold: 2400 },

    { text: 'Isinya angka yang sama dengan **Send at least** di tabel atas.',
      focus: 'col:branch', at: 'near', hold: 3200 },

    { text: 'Artinya jumlah paling sedikit yang harus dikirim ke cabang tersebut.',
      focus: 'col:branch', at: 'near', hold: 3400 },

    { text: '**All branches need** menjumlahkan cabang-cabang tadi.',
      focus: 'col:needed', at: 'near', hold: 3000 },

    { text: 'Bks boleh dijumlah antar cabang, karena satuannya sama dan barangnya sama.',
      focus: 'col:needed', at: 'near', hold: 3600 },

    { text: 'Kolom **Short by** adalah alasan panel ini dibuat.',
      focus: 'col:short', at: 'near', tone: 'danger', hold: 3200 },

    /* ── the one row that decides something ──────────────────────────────────────────────────── */
    { text: '**Cello Chocolate**: gudang pusat punya **900**, tiga cabang butuh **1.400**.',
      focus: 'row:plan-choco', at: 'near', tone: 'danger', hold: 3800 },

    { text: 'Kurangnya **500**, dan tidak ada tempat lain untuk mengambilnya.',
      focus: 'row:plan-choco', at: 'near', tone: 'danger', hold: 3600 },

    { text: 'Baris merah selalu naik ke atas.',
      focus: 'row:plan-choco', at: 'near', tone: 'danger', hold: 2600 },

    { text: 'Baris itu yang harus diputuskan hari ini.',
      focus: 'row:plan-choco', at: 'near', tone: 'danger', hold: 2800 },

    { text: 'Aplikasi tidak memutuskan cabang mana yang mengalah.',
      focus: 'row:plan-choco', at: 'near', tone: 'danger', hold: 3200 },

    /* ── the rows that decide nothing, and why they are still shown ──────────────────────────── */
    { text: '**Cello Mint** tulisannya **covered**.',
      focus: 'row:plan-mint', at: 'near', hold: 2600 },

    { text: 'Stok pusat cukup untuk semua cabang, jadi tidak ada yang perlu diputuskan.',
      focus: 'row:plan-mint', at: 'near', hold: 3600 },

    { text: 'Tanda **—** artinya belum bisa dihitung.',
      focus: 'row:plan-kopi', at: 'near', hold: 2600 },

    { text: '**Cello Kopi** belum punya riwayat kiriman yang cukup.',
      focus: 'row:plan-kopi', at: 'near', hold: 3000 },

    { text: 'Aplikasi memilih diam daripada menebak.',
      focus: 'row:plan-kopi', at: 'near', hold: 2800 },

    /* ── the dash and the zero ───────────────────────────────────────────────────────────────── */
    { text: '**—** dan **0** tidak sama.',
      focus: 'col:branch', at: 'near', tone: 'gold', hold: 2400 },

    { text: 'Nol berarti perhitungannya selesai dan hasilnya tidak perlu kiriman.',
      focus: 'col:branch', at: 'near', tone: 'gold', hold: 3400 },

    { text: '**—** berarti belum bisa dihitung.',
      focus: 'col:branch', at: 'near', tone: 'gold', hold: 2600 },

    { text: 'Barang yang semua cabangnya nol tidak ditampilkan sama sekali.',
      focus: '*', at: 'bottom', hold: 3200 },

    { text: 'Panel ini tentang barang yang kurang, jadi barang yang aman tidak ikut memenuhi layar.',
      focus: '*', at: 'bottom', hold: 3800 },

    /* ── the company line ────────────────────────────────────────────────────────────────────── */
    { text: 'Baris bawah totalnya.',
      focus: 'row:total', at: 'near', tone: 'gold', hold: 2200 },

    { text: '**Short by** di baris itu menjumlahkan semua kekurangan.',
      focus: 'row:total', at: 'near', tone: 'gold', hold: 3200 },

    { text: 'Kira-kira sebanyak itu barang yang perlu diproduksi supaya semua cabang aman.',
      focus: 'row:total', at: 'near', tone: 'gold', hold: 3800 },
  ],
};
