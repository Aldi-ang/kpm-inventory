'use strict';
/* v37 board: five live options for Aldi. Plain DOM + WAAPI, no libraries. Every demo plays while it is on screen;
   Replay (or a key) restarts it from a clean state. */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const still = matchMedia('(prefers-reduced-motion: reduce)').matches || location.hash.includes('still');
const fmt = (n) => Math.round(n).toLocaleString('id-ID');
const rpS = (n) => (n >= 1e9 ? `Rp ${(n / 1e9).toFixed(2).replace('.', ',')} M` : n >= 1e6 ? `Rp ${(n / 1e6).toFixed(1).replace('.', ',')} jt` : `Rp ${fmt(n)}`);
const EO = 'cubic-bezier(.23,1,.32,1)', EIO = 'cubic-bezier(.77,0,.175,1)';
const capy = (cls = '', extra = '') => el('div', 'cy ' + cls, '<i class="fig"></i>' + extra);
const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
const curve = (p, n = 10) => Array.from({ length: n + 1 }, (_, k) => { const t = k / n; return [bez(p[0], p[2], p[4], p[6], t), bez(p[1], p[3], p[5], p[7], t)]; });
const tween = (ms, f, dead) => new Promise((res) => { const t0 = performance.now(); const s = (now) => { if (dead()) return res(); const u = Math.min(1, (now - t0) / ms); f(u); if (u < 1) requestAnimationFrame(s); else res(); }; requestAnimationFrame(s); });

function demo(root, run) {
  let tok = 0, on = false;
  const go = () => { const t = ++tok; run(() => t !== tok); };
  new IntersectionObserver((es) => { for (const e of es) { if (e.isIntersecting && !on) { on = true; go(); } else if (!e.isIntersecting && on) { on = false; tok++; } } }, { threshold: .15 }).observe(root);
  $('.replay', root)?.addEventListener('click', go);
  return { go };
}

/* ================= E · the top bar ================= */
{
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  $$('.mock').forEach((m) => {
    const A = m.dataset.opt === 'A';
    const back = A ? `<button type="button" class="bk" aria-label="Kembali ke semua fitur"><span class="ar">${ARROW}</span><span class="w1">Kembali</span><span class="w2">Kembali ke semua fitur</span></button>`
      : `<button type="button" class="bk b" aria-label="Kembali ke semua fitur"><span class="ar">${ARROW}</span><span>Kembali</span></button>`;
    const motion = A ? '<button type="button" class="sw" aria-pressed="true"><span>Animasi</span><i class="trk"></i><span class="st wd">Nyala</span></button>'
      : '<button type="button" class="mv2" aria-pressed="true"><i></i><span>Animasi: <b class="st">Nyala</b></span></button>';
    m.innerHTML = `<div class="bar">${A ? back : ''}<span class="brand"><i></i>DSM</span><span class="now"><b>04</b> / 23 · Keamanan</span>${A ? '' : back}${motion}</div>
      <div class="slide"><span class="eb">04 · Keamanan Data</span><span class="h">Multi-Layer Security untuk Data Perusahaan.</span><i class="ln"></i><i class="ln"></i></div><div class="toast" role="status"></div>`;
    const say = (t) => { const x = $('.toast', m); x.textContent = t; x.classList.add('on'); clearTimeout(x._t); x._t = setTimeout(() => x.classList.remove('on'), 1700); };
    $('.bk', m).onclick = () => say('← kembali ke roda semua fitur');
    const mv = $('.sw, .mv2', m);
    mv.onclick = () => { const on = mv.getAttribute('aria-pressed') !== 'true'; mv.setAttribute('aria-pressed', String(on)); $('.st', mv).textContent = on ? 'Nyala' : 'Mati'; say(on ? 'Animasi nyala: semua bergerak lagi' : 'Animasi mati: semua diam, lebih ringan'); };
  });
}

/* ================= F · slide 09 (the slide's own numbers) ================= */
const PN = ['A', 'B', 'C', 'D', 'E'], PRICE = [24000, 30000, 26000, 22000, 28000], PR = ['Hari', 'Minggu', 'Bulan', 'Tahun'];
const PB = [[64, 86, 41, 30, 18], [540, 452, 300, 214, 140], [2310, 1980, 1250, 960, 2410], [26800, 24100, 15200, 11900, 8300]];
const PC = ['#E4B04A', '#E8E4DE', '#C46A3A', '#A8703A', '#928B81'];
const rpOf = (r) => PB[r].map((n, i) => n * PRICE[i]);
function keys(box, pick) {
  PR.forEach((n, i) => { const b = el('button', 'key', `<i></i>${n}`); b.type = 'button'; b.onclick = () => pick(i); box.append(b); });
  return (r) => $$('.key', box).forEach((b, i) => b.setAttribute('aria-pressed', String(i === r)));
}
/* A: the race - everyone runs for the same time, the distance is the rupiah */
{
  const root = $('#fA'), lanes = $('.lanes', root); let r = 2, user = false;
  const mark = keys($('.keys', root), (i) => { r = i; user = true; ctl.go(); });
  const rows = PN.map((p, i) => {
    const row = el('div', 'lane', `<span class="ln">Produk ${p}<small></small></span><div class="trk"><i class="fin"></i><div class="runner"><b class="pl"></b><i class="pk" style="--c:${PC[i]}"></i></div></div><span class="res"></span>`);
    $('.runner', row).prepend(capy()); lanes.append(row); return row;
  });
  $('.replay', root).addEventListener('click', () => { user = false; }, true);
  const ctl = demo(root, async (dead) => {
    for (;;) {
      mark(r); const rp = rpOf(r), sum = rp.reduce((a, b) => a + b), max = Math.max(...rp);
      const order = rp.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
      rows.forEach((row, i) => {
        const run = $('.runner', row); run.getAnimations().forEach((a) => a.cancel());
        row.classList.remove('win'); $('.res', row).textContent = ''; $('.ln small', row).textContent = ''; $('.pl', row).textContent = '';
        const x = ($('.trk', row).clientWidth - run.offsetWidth) * rp[i] / max;
        $('.cy', row).classList.toggle('walk', !still);
        run.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${x.toFixed(1)}px)` }], { duration: still ? 1 : 2600, delay: still ? 0 : 300, easing: 'cubic-bezier(.33,.7,.35,1)', fill: 'forwards' });
      });
      await wait(still ? 40 : 2950); if (dead()) return;
      rows.forEach((row, i) => {
        $('.cy', row).classList.remove('walk'); const pl = order.indexOf(i) + 1;
        $('.pl', row).textContent = '#' + pl; row.classList.toggle('win', pl === 1); $('.ln small', row).textContent = fmt(PB[r][i]) + ' bks';
        $('.res', row).innerHTML = `${rpS(rp[i])}<em>${Math.round(rp[i] / sum * 100)}%</em>`;
      });
      if (user || still) return;
      await wait(4300); if (dead()) return; r = (r + 1) % 4;
    }
  });
}
/* B: the bubbles - area is rupiah; they push each other into place */
{
  const root = $('#fB'), box = $('.bubbox', root); let r = 2, user = false, raf = 0, placed = false;
  const mark = keys($('.keys', root), (i) => { r = i; user = true; ctl.go(); });
  const B = PN.map((p, i) => { const e = el('div', 'bb', `<b>${p}</b><span></span><em></em>`); e.style.setProperty('--c', PC[i]); box.append(e); return { e, x: 0, y: 0, r: 4, t: 4, vx: 0, vy: 0 }; });
  const set = () => {
    const W = box.clientWidth, H = box.clientHeight, rp = rpOf(r), sum = rp.reduce((a, b) => a + b), K = Math.sqrt(W * H * .4 / Math.PI), top = rp.indexOf(Math.max(...rp));
    B.forEach((b, i) => { b.t = K * Math.sqrt(rp[i] / sum); b.e.classList.toggle('top', i === top); $('span', b.e).textContent = rpS(rp[i]); $('em', b.e).textContent = Math.round(rp[i] / sum * 100) + '%'; });
    if (!placed) { placed = true; B.forEach((b, i) => { const a = i / B.length * Math.PI * 2; b.x = W / 2 + Math.cos(a) * W * .28; b.y = H / 2 + Math.sin(a) * H * .28; }); }
  };
  const step = () => {
    const W = box.clientWidth, H = box.clientHeight;
    for (const b of B) { b.r += (b.t - b.r) * (still ? 1 : .08); b.vx += (W / 2 - b.x) * .0015; b.vy += (H / 2 - b.y) * .0025; }
    for (let k = 0; k < 3; k++) for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], c = B[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || .01, o = a.r + c.r + 6 - d;
      if (o > 0) { const ux = dx / d, uy = dy / d, s = o / 2; a.x -= ux * s; a.y -= uy * s; c.x += ux * s; c.y += uy * s; }
    }
    for (const b of B) {
      b.vx *= .86; b.vy *= .86; b.x += b.vx; b.y += b.vy;
      b.x = Math.max(b.r + 4, Math.min(W - b.r - 4, b.x)); b.y = Math.max(b.r + 4, Math.min(H - b.r - 4, b.y));
      b.e.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px) scale(${(b.r / 100).toFixed(3)})`;
    }
  };
  $('.replay', root).addEventListener('click', () => { user = false; placed = false; B.forEach((b) => { b.r = 4; }); }, true);
  const ctl = demo(root, async (dead) => {
    cancelAnimationFrame(raf);
    const loop = () => { if (dead()) { raf = 0; return; } step(); raf = requestAnimationFrame(loop); };
    mark(r); set();
    if (still) { for (let k = 0; k < 400; k++) step(); return; }
    loop();
    while (!user) { await wait(4200); if (dead()) return; r = (r + 1) % 4; mark(r); set(); }
  });
}

/* ================= G · slide 18, the hand-over in three steps ================= */
{
  const root = $('#gA'), stage = $('.hostage', root), rail = $$('.rail button', root), say = $('.say', root);
  const STEPS = [
    ['Langkah 1 · Budi', 'Budi mengajukan pindah tangan Toko Makmur ke Andi. Permintaannya dikirim ke admin daerah.'],
    ['Langkah 2 · Admin daerah', 'Admin daerah memeriksa dan menyetujui. Tanpa persetujuan ini, tidak ada yang berpindah.'],
    ['Langkah 3 · Andi', 'Toko Makmur pindah ke Andi, beserta stok dan utangnya. Mulai sekarang Andi yang menagih.'],
  ];
  const UP = [25, 50, 26, 36, 29, 26, 34, 22], DOWN = [27, 81, 42, 92, 58, 92, 73, 81], ST = [UP[6] + 3, UP[7] + 9];   /* the stamp lands on the slip's lower edge, so its words stay readable */
  const budi = capy('', '<span class="tagn">Budi<small>Pemberi</small></span>'), andi = capy('flip', '<span class="tagn">Andi<small>Penerima</small></span>'), adm = capy('', '<span class="tagn">Admin daerah</span>');
  const desk = el('div', 'desk', '<span class="led"><i></i><span>Belum diajukan</span></span>');
  const slip = el('div', 'slip', '<b>Permintaan</b>Toko Makmur → Andi');
  const shop = el('div', 'shop', '<b>Toko Makmur</b><span>Stok 24 bks · Utang Rp 640.000</span><span class="own">Penanggung jawab: Budi</span>');
  const stamp = el('i', 'stamp', 'DISETUJUI');
  const at = (e, x, y) => { e.style.left = x + '%'; e.style.top = y + '%'; };
  at(budi, 18, 63); at(andi, 82, 63); at(adm, 63, 38); desk.style.left = '63%'; desk.style.top = 'calc(38% + 34px)';
  stage.append(budi, andi, adm, desk, slip, shop, stamp);
  const led = (cls, t) => { const l = $('.led', desk); l.className = 'led ' + cls; $('span', l).textContent = t; };
  const pathOn = (k, on) => $(k === 0 ? '.p.up' : '.p.down', stage).classList.toggle('on', on);
  const pose = (who, deal) => who.classList.toggle('deal', deal);
  let from = 0;
  rail.forEach((b, i) => { b.onclick = () => { from = i; ctl.go(); }; });
  function state(s) {   /* the finished picture of everything BEFORE step s */
    slip.getAnimations().forEach((a) => a.cancel()); shop.getAnimations().forEach((a) => a.cancel()); stamp.getAnimations().forEach((a) => a.cancel());
    rail.forEach((b, i) => { b.classList.toggle('done', i < s); b.classList.remove('now'); });
    pose(budi, false); pose(adm, false); pose(andi, false);
    budi.classList.toggle('dim', s > 2); andi.classList.toggle('dim', s <= 2);
    slip.style.opacity = s > 0 ? 1 : 0; at(slip, ...(s > 0 ? UP.slice(6) : UP.slice(0, 2)));
    stamp.style.opacity = s > 1 ? 1 : 0; at(stamp, ...ST);
    at(shop, ...(s > 2 ? DOWN.slice(6) : DOWN.slice(0, 2)));
    $('.own', shop).textContent = 'Penanggung jawab: ' + (s > 2 ? 'Andi' : 'Budi');
    led(s > 1 ? 'on' : s > 0 ? 'warn' : '', s > 1 ? 'Disetujui' : s > 0 ? 'Menunggu persetujuan' : 'Belum diajukan');
    pathOn(0, s === 1); pathOn(1, false);
    say.innerHTML = s > 2 ? '<small>Selesai</small>Toko Makmur sekarang tercatat atas nama Andi.' : '';
  }
  const fly = (e, pts, ms) => e.animate(pts.map(([x, y]) => ({ left: x + '%', top: y + '%' })), { duration: still ? 1 : ms, easing: EIO, fill: 'forwards' }).finished.catch(() => {});
  const ctl = demo(root, async (dead) => {
    let s = from; from = 0;
    for (;;) {
      state(s); await wait(s ? 500 : 900); if (dead()) return;
      for (; s < 3; s++) {
        rail[s].classList.add('now'); say.innerHTML = `<small>${STEPS[s][0]}</small>${STEPS[s][1]}`;
        if (s === 0) {
          pose(budi, true); pathOn(0, true); at(slip, UP[0], UP[1]);
          slip.animate([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: EO, fill: 'forwards' });
          await wait(300); if (dead()) return; await fly(slip, curve(UP), 1500); led('warn', 'Menunggu persetujuan');
        } else if (s === 1) {
          pose(budi, false); pose(adm, true); await wait(700); if (dead()) return;
          at(stamp, ...ST); stamp.style.opacity = 1;
          stamp.animate([{ opacity: 0, transform: 'scale(1.8)' }, { opacity: 1, transform: 'scale(.94)', offset: .7 }, { opacity: 1, transform: 'none' }], { duration: still ? 1 : 360, easing: 'ease-out' });
          led('on', 'Disetujui'); pathOn(0, false);
        } else {
          pose(adm, false); pathOn(1, true); budi.classList.add('dim'); await wait(400); if (dead()) return;
          await fly(shop, curve(DOWN), 2000); if (dead()) return;
          andi.classList.remove('dim'); pose(andi, true); pathOn(1, false);
          const own = $('.own', shop); own.textContent = 'Penanggung jawab: Andi';
          own.animate([{ color: '#fff', textShadow: '0 0 12px rgba(228,176,74,.9)' }, { color: '' , textShadow: 'none' }], { duration: 900, easing: 'ease-out' });
        }
        await wait(still ? 0 : 2600); if (dead()) return;
        rail[s].classList.remove('now'); rail[s].classList.add('done');
      }
      if (still) return;
      say.innerHTML = '<small>Selesai</small>Toko Makmur sekarang tercatat atas nama Andi.';
      await wait(2600); if (dead()) return; s = 0;
    }
  });
}

/* ================= H · slide 19, the level-up with the app's real frames ================= */
{
  const F = window.FRAMES, root = $('#hA');
  document.head.append(el('style', '', F.css));
  const svgs = el('div', '', F.filters); svgs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; document.body.append(svgs);
  const RK = [['bronze', 'Bronze', 0, 'The Wanderer'], ['silver', 'Silver', 5000, 'The Hustler'], ['gold', 'Gold', 20000, 'The Market King'],
    ['platinum', 'Platinum', 50000, 'The Syndicate Boss'], ['diamond', 'Diamond', 100000, 'The Robin Hood'], ['mythic', 'Mythic', 250000, 'The Sales Boomer']];
  const SRC = [['Setoran lolos', 320], ['Toko dilayani', 40], ['Tagihan tertagih', 150]];
  const frame = (id, ini = '') => el('div', `sframe s-${id}`, `<div class="av">${ini}</div>` + F.html[id]);
  const card = $('.pcard', root), well = $('.fwell', root), rank = $('.prank', root), xpn = $('.xpn', root), bar = $('.pbar', root), fill = $('.pbar i', root), next = $('.pnext', root), chips = $('.chips', root), ban = $('.lvban', root), sweep = $('.sweep', root), lad = $('.ladder', root);
  const rungs = RK.map(([id, n, min]) => { const r = el('div', 'rung', `<div class="mini"></div><b>${n}</b><small>${fmt(min)} XP</small>`); $('.mini', r).append(frame(id)); lad.append(r); return r; });
  const rankHtml = (k) => `<div><b>${RK[k][1]}</b><span>${RK[k][3]}</span></div>`;
  function show(k, xp) {
    well.innerHTML = ''; well.append(frame(RK[k][0], 'BS')); rank.innerHTML = rankHtml(k);
    rungs.forEach((r, i) => { r.classList.toggle('past', i < k); r.classList.toggle('now', i === k); });
    paint(k, xp);
  }
  function paint(k, xp) {
    xpn.textContent = fmt(xp);
    if (k >= RK.length - 1) { fill.style.scale = '1 1'; next.textContent = 'Pangkat tertinggi'; return; }
    const a = RK[k][2], b = RK[k + 1][2]; fill.style.scale = `${Math.min(1, (xp - a) / (b - a)).toFixed(4)} 1`;
    next.textContent = `${fmt(b - xp)} XP lagi ke ${RK[k + 1][1]}`;
  }
  const chip = (t) => { const c = el('span', 'chip', t); chips.prepend(c); while (chips.children.length > 3) chips.lastChild.remove();
    c.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EO });
    setTimeout(() => c.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 300, easing: 'ease-out', fill: 'forwards' }).onfinish = () => c.remove(), 1100); };
  async function levelUp(k) {
    bar.classList.add('full'); card.classList.remove('burst'); void card.offsetWidth; card.classList.add('burst');
    $('b', ban).textContent = RK[k][1];
    ban.animate([{ opacity: 0, transform: 'scaleY(.3)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EO, fill: 'forwards' });
    sweep.animate([{ translate: '-110% 0' }, { translate: '110% 0' }], { duration: 900, easing: EIO });
    const old = $('.sframe', well), nu = frame(RK[k][0], 'BS'); well.append(nu);
    old.animate([{ opacity: 1, transform: 'none', filter: 'blur(0px)' }, { opacity: 0, transform: 'scale(.84) rotate(-4deg)', filter: 'blur(6px)' }], { duration: 300, easing: 'ease-out', fill: 'forwards' }).onfinish = () => old.remove();
    nu.animate([{ opacity: 0, transform: 'scale(1.3)', filter: 'blur(10px)' }, { opacity: 1, transform: 'scale(.97)', filter: 'blur(0px)', offset: .75 }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], { duration: 620, delay: 160, easing: EO, fill: 'backwards' });
    const ro = rank.firstElementChild, rn = el('div', '', rankHtml(k).slice(5, -6)); rank.append(rn);
    ro.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-100%)', opacity: 0 }], { duration: 300, easing: EO, fill: 'forwards' }).onfinish = () => ro.remove();
    rn.animate([{ transform: 'translateY(100%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: 140, easing: EO, fill: 'backwards' });
    rungs.forEach((r, i) => { r.classList.toggle('past', i < k); r.classList.toggle('now', i === k); });
    await wait(1700);
    ban.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-out', fill: 'forwards' });
    bar.classList.remove('full');
  }
  demo(root, async (dead) => {
    if (still) { show(2, 31200); return; }
    for (;;) {
      let xp = 3200; show(0, xp); await wait(900); if (dead()) return;
      for (let k = 0; k < RK.length - 1; k++) {
        const a = xp, b = RK[k + 1][2], ms = 2600; let lastChip = 0;
        await tween(ms, (u) => {
          xp = a + (b - a) * (1 - Math.pow(1 - u, 2)); paint(k, xp);
          const now = performance.now(); if (u < .95 && now - lastChip > 380) { lastChip = now; const s = SRC[Math.floor(Math.random() * 3)]; chip(`+${fmt(s[1] * Math.max(1, Math.round((b - a) / 9000)))} ${s[0]}`); }
        }, dead);
        if (dead()) return;
        xp = b; await levelUp(k + 1); if (dead()) return;
        paint(k + 1, xp); await wait(600); if (dead()) return;
      }
      await wait(2600); if (dead()) return;
    }
  });
}

/* ================= I · slide 20, the warehouse ================= */
class Room {
  constructor(host, { alert = true, twin = false, onCount = () => {} } = {}) {
    this.h = host; this.alert = alert; this.onCount = onCount; this.twin = twin; this.low = false;
    host.classList.remove('alarm');
    host.innerHTML = '<i class="floor"></i><div class="rack"></div><i class="beacon"></i><i class="door"></i><span class="empty-word">KOSONG</span>'
      + '<div class="truck"><div class="box">Gudang Pusat</div><div class="cab"></div><i class="wh" style="left:8%"></i><i class="wh" style="left:52%"></i><i class="wh" style="left:80%"></i></div>'
      + (alert ? '<div class="note" role="status"><b>Stok menipis · Produk B</b><p></p><span class="go">Ajukan</span></div>' : '')
      + (twin ? '<span class="rc"></span>' : '');
    this.rack = $('.rack', host); this.slots = []; this.cts = [];
    for (const y of [100, 66.6, 33.3]) { const s = el('i', 'sh'); s.style.top = `calc(${y}% - 5px)`; this.rack.append(s); }
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const y = [100, 66.6, 33.3][r], css = `left:${3 + c * 24.25}%;width:21%;top:calc(${y - 24}% - 5px);height:24%`;
      const sl = el('i', 'slot'); sl.style.cssText = css; this.rack.append(sl); this.slots.push(sl);
      const ct = el('i', 'ct'); ct.style.cssText = css; this.rack.append(ct); this.cts.push(ct);
    }
    const mn = el('i', 'min', '<span>Batas minimum · 20 bks</span>'); mn.style.top = `calc(${100 - 24}% - 9px)`; this.rack.append(mn);
    this.n = 12; this.floorN = 0; this.say();
  }
  get bks() { return this.n * 5; }
  say() { this.onCount(this.bks, this); const rc = $('.rc', this.h); if (rc) { rc.textContent = this.bks + ' bks'; rc.style.color = this.bks === 0 ? 'var(--crit)' : this.bks < 20 ? 'var(--warn)' : ''; } }
  take() {
    if (this.n <= this.floorN) return false;
    this.n--; this.cts[this.n].style.opacity = 0; this.say();
    if (this.alert && !this.low && this.bks < 20) { this.low = true; this.warn(); }
    return true;
  }
  async warn() {
    this.h.classList.add('alarm'); const note = $('.note', this.h); if (!note) return;
    $('p', note).textContent = `${this.bks} bks tersisa, di bawah batas 20 bks. Ajukan permintaan ke Gudang Pusat.`;
    note.classList.remove('ok'); $('.go', note).textContent = 'Ajukan'; note.classList.add('on');
    await wait(1400); const go = $('.go', note); go.classList.add('press'); await wait(200); go.classList.remove('press');
    note.classList.add('ok'); go.textContent = 'Diajukan ✓'; $('p', note).textContent = 'Permintaan terkirim ke Gudang Pusat.';
  }
  async trip(dead, ms) {
    const door = this.twin ? 94 : 96, stand = this.twin ? 64 : 58;
    const w = capy('walk flip'); w.style.left = door + '%'; w.style.top = '78%'; this.h.append(w);
    await w.animate([{ left: door + '%' }, { left: stand + '%' }], { duration: ms, easing: 'linear', fill: 'forwards' }).finished.catch(() => {});
    if (dead()) { w.remove(); return false; }
    const ok = this.take(); if (ok) w.append(el('i', 'ct'));
    w.classList.remove('flip'); await wait(120);
    await w.animate([{ left: stand + '%' }, { left: door + 3 + '%' }], { duration: ms, easing: 'linear', fill: 'forwards' }).finished.catch(() => {});
    w.remove(); return ok;
  }
  async sell(floorN, dead, workers = 2, ms = 620) {
    this.floorN = floorN;
    const one = async (delay) => { await wait(delay); while (!dead() && this.n > floorN) { if (!(await this.trip(dead, ms))) break; } };
    await Promise.all(Array.from({ length: workers }, (_, k) => one(k * (ms + 60))));
  }
  async restock(to, dead) {
    const tr = $('.truck', this.h), park = this.twin ? 59 : 58;
    await tr.animate([{ left: '100%' }, { left: park + '%' }], { duration: 1100, easing: EO, fill: 'forwards' }).finished.catch(() => {}); if (dead()) return;
    const hr = this.h.getBoundingClientRect(), br = $('.box', tr).getBoundingClientRect();
    while (this.n < to) {
      const i = this.n, sr = this.slots[i].getBoundingClientRect(), f = el('i', 'ct');
      f.style.cssText = `left:${sr.left - hr.left}px;top:${sr.top - hr.top}px;width:${sr.width}px;height:${sr.height}px;z-index:4`; this.h.append(f);
      const dx = br.left + br.width * .3 - sr.left, dy = br.top + br.height * .3 - sr.top;
      f.animate([{ transform: `translate(${dx}px, ${dy}px) scale(.8)` }, { transform: `translate(${dx * .5}px, ${dy * .5 - 40}px)`, offset: .5 }, { transform: 'none' }], { duration: 460, easing: EO })
        .onfinish = () => { this.cts[i].style.opacity = 1; f.remove(); };
      this.n++; this.say(); await wait(150); if (dead()) return;
    }
    await wait(500); this.h.classList.remove('alarm'); this.low = false; $('.note', this.h)?.classList.remove('on');
    await tr.animate([{ left: park + '%' }, { left: '100%' }], { duration: 900, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
  }
}
{
  const root = $('#iA'), cnt = $('.cnt .n', root), led = $('.gdhd .led', root);
  demo(root, async (dead) => {
    for (;;) {
      const room = new Room($('.room', root), { onCount: (b, me) => { cnt.textContent = b; cnt.style.color = b < 20 ? 'var(--crit)' : '';
        led.className = 'led ' + (b < 20 ? 'crit' : 'on'); $('span', led).textContent = b < 20 ? 'Di bawah minimum' : me.restocking ? 'Stok masuk' : 'Aman'; } });
      if (still) { room.floorN = 3; while (room.take()); return; }
      await wait(700); if (dead()) return;
      await room.sell(1, dead); if (dead()) return;
      room.restocking = true; await room.restock(11, dead); if (dead()) return;
      room.restocking = false; room.say(); await wait(1800); if (dead()) return;
    }
  });
}
{
  const root = $('#iB');
  demo(root, async (dead) => {
    for (;;) {
      const r0 = new Room($('.r0', root), { alert: false, twin: true }), r1 = new Room($('.r1', root), { alert: true, twin: true });
      if (still) { r0.floorN = 0; while (r0.take()); $('.empty-word', r0.h).style.opacity = 1; r1.floorN = 3; while (r1.take()); return; }
      await wait(700); if (dead()) return;
      await Promise.all([
        (async () => { await r0.sell(0, dead, 2, 520); if (dead()) return;
          $('.empty-word', r0.h).animate([{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out', fill: 'forwards' }); })(),
        (async () => { await r1.sell(1, dead, 2, 520); if (dead()) return; await r1.restock(11, dead); })(),
      ]);
      if (dead()) return; await wait(2600); if (dead()) return;
    }
  });
}
