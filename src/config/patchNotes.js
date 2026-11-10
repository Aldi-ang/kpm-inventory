/* WHAT CHANGED, in words anyone in the company can read. His 2026-11-05: "i want u to put patch notes button inside the app
   that allow users to see the recent updated features or bug fixes". Newest date first, newest line first inside a date.
   Every finished job that changes what people see adds a line here before its push (CLAUDE.md, Publishing).
   kind is 'new' or 'fixed'. en and id are both needed: the phone's language picks one (Settings > This device). */
export const PATCH_NOTES = [
  { date: '2026-11-10', items: [
    { kind: 'fixed', en: 'The capybara talks less: out loud after a sale (once the cha-ching ends) and for good news, at most once every 20 seconds. His tips pop up quietly and speak only now and then, at most every 15 minutes. While you add items to the cart he only shows his speech bubble.', id: 'Capybara lebih jarang bicara: bersuara setelah penjualan (setelah cha-ching selesai) dan untuk kabar baik, paling sering sekali tiap 20 detik. Tipsnya muncul tanpa suara dan hanya sesekali bersuara, paling sering tiap 15 menit. Saat menambah barang ke keranjang, dia hanya menampilkan gelembung bicaranya.' },
    { kind: 'fixed', en: 'Sales Terminal: the sound when a sale is saved is now a short cha-ching (1.6 seconds) at a gentle volume, instead of a 4-second pen sound that crackled.', id: 'Sales Terminal: suara saat penjualan tersimpan sekarang cha-ching pendek (1,6 detik) dengan volume lembut, bukan suara pena 4 detik yang pecah.' },
    { kind: 'fixed', en: 'The app says DSM everywhere by default: a receipt or invoice with no company name saved prints DISTRIBUTION AND SALES MANAGEMENT, backup and share files are named DSM, and the demo company is DSM Demo.', id: 'Aplikasi memakai nama DSM di semua tempat secara bawaan: nota atau faktur tanpa nama perusahaan tercetak DISTRIBUTION AND SALES MANAGEMENT, file backup dan share bernama DSM, dan perusahaan demo bernama DSM Demo.' },
    { kind: 'fixed', en: 'Demo: it no longer asks you to make a Master Vault password - every demo uses the password shown on its unlock screen, so you go straight there and to the usual intro. The nightly reset can no longer leave the demo empty.', id: 'Demo: tidak lagi meminta membuat sandi Master Vault - semua demo memakai sandi yang tertulis di layar buka kunci, jadi langsung ke sana dan ke intro seperti biasa. Reset tiap malam tidak bisa lagi membuat demo kosong.' },
  ] },
  { date: '2026-11-09', items: [
    { kind: 'fixed', en: 'Shops: every sale now saves the shop\'s visit date. The shop\'s level follows the targets set in Settings, and a sale only raises it. Before, a salesman\'s sale never touched the shop and the level used a fixed table.', id: 'Toko: setiap penjualan sekarang menyimpan tanggal kunjungan toko. Level toko mengikuti target di Pengaturan, dan penjualan hanya menaikkannya. Sebelumnya penjualan salesman tidak pernah mengubah toko dan levelnya memakai tabel tetap.' },
    { kind: 'fixed', en: 'Demo guide: when the Master Vault is locked, the guide now shows where to unlock it and gives the demo password, and it stays on after the unlock.', id: 'Panduan demo: saat Master Vault terkunci, panduan sekarang menunjukkan tempat membukanya dan memberi sandi demo, dan tetap menyala setelah dibuka.' },
    { kind: 'fixed', en: 'EOD: a new salesman (T6) now has EOD Setoran in the menu and can send the day\'s report.', id: 'EOD: salesman baru (T6) sekarang punya EOD Setoran di menu dan bisa mengirim laporan hari itu.' },
    { kind: 'fixed', en: 'Backup reminder: only the owner, who can make the backup, sees it now. Salesmen no longer get it.', id: 'Pengingat backup: sekarang hanya pemilik, yang bisa membuat backup, yang melihatnya. Salesman tidak lagi menerimanya.' },
    { kind: 'fixed', en: 'Demo guide: its words now match the buttons on the screen.', id: 'Panduan demo: kata-katanya sekarang sama dengan tombol di layar.' },
    { kind: 'fixed', en: 'Promo goods: an item with no word of its own (a plain Mug) now shows your company name on its picture instead of KPM.', id: 'Barang promo: barang tanpa tulisan sendiri (misalnya Mug polos) sekarang menampilkan nama perusahaan Anda di gambarnya, bukan KPM.' },
    { kind: 'new', en: 'New name: the app is now called Distribution and Sales Management (DSM on the phone home screen), so it fits any company. Your own company name from Settings still prints on your receipts.', id: 'Nama baru: aplikasi ini sekarang bernama Distribution and Sales Management (DSM di layar utama HP), supaya cocok untuk perusahaan mana pun. Nama perusahaan Anda dari Settings tetap tercetak di nota.' },
    { kind: 'fixed', en: 'Loading Bay: when a van load is refused, the reason is now written in plain words instead of a database code.', id: 'Loading Bay: kalau muat van ditolak, alasannya sekarang ditulis dengan kata-kata biasa, bukan kode database.' },
    { kind: 'fixed', en: 'Reports: the Product Performance box now shows only to the owner, so other logins no longer see a red "could not be read" message.', id: 'Reports: kotak Product Performance sekarang hanya tampil untuk pemilik, jadi login lain tidak lagi melihat pesan merah "could not be read".' },
  ] },
  { date: '2026-11-08', items: [
    { kind: 'fixed', en: 'EOD and Customers: three red buttons now have light words on a deeper red, easy to read in dark mode too.', id: 'EOD dan Customers: tiga tombol merah sekarang bertulisan terang di atas merah yang lebih gelap, mudah dibaca juga di mode gelap.' },
    { kind: 'fixed', en: 'Counters: the small numbers on HQ Audits, HQ Verification, the bell, the cart, the sync button and Customers are now the glowing nixie counter. Easy to read in dark and light, and the number rolls in when it changes.', id: 'Penghitung: angka kecil di HQ Audits, HQ Verification, lonceng, keranjang, tombol sinkron, dan Customers sekarang memakai penghitung nixie yang menyala. Mudah dibaca di mode gelap dan terang, dan angkanya bergulir saat berubah.' },
    { kind: 'fixed', en: 'Sales Terminal: a damaged (RUSAK) pack no longer shows LOW and is never listed under Running low.', id: 'Sales Terminal: bungkus rusak (RUSAK) tidak lagi bertanda LOW dan tidak pernah masuk daftar Stok menipis.' },
    { kind: 'new', en: 'Quarantine: Tier 3 can now use Sell Again and set the price. A switch for it is in the Access Matrix.', id: 'Quarantine: Tier 3 sekarang bisa memakai Jual Lagi dan menentukan harganya. Saklarnya ada di Access Matrix.' },
    { kind: 'new', en: 'Quarantine: Sell Again puts damaged packs back on sale, at full price or a cheaper one. They keep the damaged mark and sit right after their own pack on the Sales Terminal.', id: 'Quarantine: Jual Lagi menjual kembali bungkus rusak, dengan harga penuh atau lebih murah. Tanda rusaknya tetap ada, dan letaknya tepat setelah bungkus aslinya di Sales Terminal.' },
    { kind: 'fixed', en: 'Sales Terminal: Same as last time is now a gold outline instead of an amber block, on the phone and the PC.', id: 'Sales Terminal: tombol Sama seperti terakhir sekarang bergaris tepi emas, bukan blok amber, di HP dan PC.' },
    { kind: 'fixed', en: 'Stock Opname review: the gold line under the chosen warehouse runs exactly from divider to divider, on every screen size.', id: 'Review Stock Opname: garis emas di bawah gudang yang dipilih pas dari garis pemisah ke garis pemisah, di semua ukuran layar.' },
    { kind: 'fixed', en: 'Stock Opname review: a thin line now separates each warehouse tab.', id: 'Review Stock Opname: sekarang ada garis tipis yang memisahkan tiap tab gudang.' },
    { kind: 'fixed', en: 'Tabs: the chosen tab now has a thin gold line under it instead of an amber fill (Stock Opname, Quarantine, EOD Setoran, Sampel).', id: 'Tab: tab yang dipilih sekarang ditandai garis emas tipis di bawahnya, bukan blok warna amber (Stock Opname, Quarantine, Setoran Sore, Sampel).' },
  ] },
  { date: '2026-11-06', items: [
    { kind: 'fixed', en: 'Stock Opname: the buttons at the top stay in the same place on a PC when pressed.', id: 'Stock Opname: tombol di bagian atas tetap di tempatnya di PC saat ditekan.' },
    { kind: 'fixed', en: 'Stock Opname: numbers typed for one warehouse no longer carry over to another warehouse.', id: 'Stock Opname: angka yang diketik untuk satu gudang tidak lagi terbawa ke gudang lain.' },
    { kind: 'fixed', en: 'Stock Opname: the numbers a team leader types stay on the phone until Submit. A reload, a closed app or a dead battery loses nothing.', id: 'Stock Opname: angka yang diketik ketua tim tetap tersimpan di HP sampai dikirim. Muat ulang, aplikasi tertutup, atau baterai habis tidak menghilangkan apa pun.' },
  ] },
  { date: '2026-11-05', items: [
    { kind: 'fixed', en: 'Stock Opname: a count can only be submitted when every product with stock is counted. Type 0 if there are none on the shelf.', id: 'Stock Opname: hitungan baru bisa dikirim kalau semua produk yang ada stoknya sudah dihitung. Isi 0 kalau di rak tidak ada.' },
    { kind: 'new', en: 'Stock Opname review: accept or reject each product on its own. Every warehouse shows what is waiting and how much was lost. A rejected product goes back to the team leader for a recount of that product only.', id: 'Review Stock Opname: terima atau tolak per produk. Setiap gudang menampilkan yang masih menunggu dan nilai yang hilang. Produk yang ditolak kembali ke team leader, dan hanya produk itu yang dihitung ulang.' },
    { kind: 'fixed', en: 'Stock Opname: after a count is confirmed, good stock and Quarantine become exactly what was counted. Damaged packs typed as good cannot be confirmed.', id: 'Stock Opname: setelah hitungan dikonfirmasi, stok bagus dan Quarantine menjadi persis sesuai hitungan. Barang rusak yang diketik sebagai barang bagus tidak bisa dikonfirmasi.' },
    { kind: 'fixed', en: 'Blind count is now really blind: the expected number stays hidden, and a count is only checked when Submit is pressed.', id: 'Hitung buta sekarang benar-benar buta: angka seharusnya tetap tersembunyi, dan hitungan baru diperiksa saat tombol kirim ditekan.' },
    { kind: 'new', en: 'Patch notes: this list shows what changed in the app.', id: 'Catatan update: daftar ini menunjukkan apa yang berubah di aplikasi.' },
  ] },
  { date: '2026-11-04', items: [
    { kind: 'fixed', en: 'Stock Opname: good and damaged packs are now two separate counts. A count can no longer turn damaged packs into good stock without anyone noticing.', id: 'Stock Opname: barang bagus dan barang rusak sekarang dihitung terpisah. Hitungan tidak bisa lagi mengubah barang rusak menjadi stok bagus tanpa diketahui.' },
    { kind: 'new', en: 'Stock Opname day: Tier 3 and above pick one day for the whole company, and the count opens only on that day.', id: 'Hari Stock Opname: Tier 3 ke atas memilih satu hari untuk seluruh perusahaan, dan penghitungan hanya dibuka pada hari itu.' },
    { kind: 'new', en: 'Stock Opname is one count a week for each warehouse, submitted by the team leader.', id: 'Stock Opname sekarang satu kali seminggu untuk tiap gudang, dikirim oleh ketua tim.' },
    { kind: 'new', en: 'Sales Terminal: the save button says what is still missing, and becomes a stamp when the sale is ready.', id: 'Sales Terminal: tombol simpan menunjukkan apa yang masih kurang, dan berubah menjadi stempel saat penjualan siap.' },
    { kind: 'new', en: 'Settings: the owner can choose which place is the Master Vault.', id: 'Pengaturan: pemilik bisa memilih tempat mana yang menjadi Master Vault.' },
    { kind: 'fixed', en: 'A van loads and returns stock at the warehouse of the place on its card. Moving a loaded van now asks first and lists the goods on it.', id: 'Van mengambil dan mengembalikan stok di gudang sesuai tempat pada kartunya. Memindahkan van yang berisi barang sekarang meminta konfirmasi dan menampilkan daftar barangnya.' },
    { kind: 'fixed', en: 'Headquarters counts as one place however it is spelled, so no van reads an empty warehouse of its own.', id: 'Headquarters dihitung satu tempat walau ditulis berbeda, jadi tidak ada van yang membaca gudang kosong.' },
  ] },
  { date: '2026-11-03', items: [
    { kind: 'fixed', en: 'Sales Terminal: LOW now shows only at 1 Slop or less.', id: 'Sales Terminal: tanda LOW sekarang hanya muncul saat stok 1 Slop atau kurang.' },
    { kind: 'new', en: 'Settings: a switch for collecting pita cukai at EOD, on by default.', id: 'Pengaturan: ada sakelar untuk pengumpulan pita cukai saat EOD, aktif secara bawaan.' },
    { kind: 'new', en: 'Salesmen can see their EOD replay until their next night, and the History Log has a Replay.', id: 'Sales bisa melihat replay EOD sampai malam berikutnya, dan History Log punya tombol Replay.' },
    { kind: 'fixed', en: 'Journey chests are back, and a same-day consignment payment counts in the sidebar Utang.', id: 'Peti Journey kembali muncul, dan pembayaran titip di hari yang sama terhitung di Utang pada menu samping.' },
    { kind: 'new', en: 'The Sales Terminal, menu, header and Settings are in Indonesian.', id: 'Sales Terminal, menu, bagian atas, dan Pengaturan sudah berbahasa Indonesia.' },
  ] },
  { date: '2026-11-02', items: [
    { kind: 'new', en: 'Language switch in Settings. Indonesian is the default, English is the second language.', id: 'Pilihan bahasa di Pengaturan. Bahasa Indonesia sebagai bawaan, bahasa Inggris sebagai pilihan kedua.' },
    { kind: 'new', en: 'Quarantine: damaged packs can be converted to samples, and Master Vault damaged packs can be repaired back into stock.', id: 'Quarantine: barang rusak bisa diubah menjadi sampel, dan barang rusak di Master Vault bisa diperbaiki kembali menjadi stok.' },
    { kind: 'fixed', en: 'Master Vault exchanges: damaged packs now land in the Master Vault Quarantine.', id: 'Tukar barang dari Master Vault: barang rusak sekarang masuk ke Quarantine Master Vault.' },
    { kind: 'fixed', en: "The TODAY box on the Sales Terminal counts only that salesman's own sales.", id: 'Kotak HARI INI di Sales Terminal hanya menghitung penjualan sales itu sendiri.' },
  ] },
  { date: '2026-10-31', items: [
    { kind: 'new', en: 'Sales Terminal: arriving at a shop by GPS asks what happened there.', id: 'Sales Terminal: saat tiba di toko lewat GPS, aplikasi menanyakan apa yang terjadi di sana.' },
  ] },
  { date: '2026-10-27', items: [
    { kind: 'new', en: 'Factory offers: "buy 1 Bal, get 1 T-shirt", set by the boss, one tap in the terminal, for all areas or one region.', id: 'Penawaran pabrik: misalnya "beli 1 Bal, gratis 1 kaos", diatur oleh atasan, satu ketukan di terminal, untuk semua area atau satu wilayah.' },
    { kind: 'new', en: 'Promo goods can be given away with nothing bought, recorded as a giveaway.', id: 'Barang promo bisa diberikan tanpa pembelian, dicatat sebagai giveaway.' },
    { kind: 'new', en: 'Photo files are named by date, time, salesman and shop.', id: 'File foto diberi nama menurut tanggal, jam, sales, dan toko.' },
  ] },
];

/* changes with every new line, so a second push on one day lights the button's dot again */
export const PATCH_STAMP = `${PATCH_NOTES[0].date}:${PATCH_NOTES[0].items.length}`;
