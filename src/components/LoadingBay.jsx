/* THE VAN-LOADING BAY — Aldi's prototype (https://claude.ai/artifact/M3xbaPAJ9LT7FL1ETmXvuu), built
   into Fleet & Roster at his 2026-09-24 "yes start it now".

   Two chests: the warehouse is an ENDER CHEST (the agent's own branch stock, or the master vault),
   the van is a brown one (the agent's activeCanvas laid out on squares). Drag a box from one to the
   other, the HOW MANY panel asks the amount, and the line goes into the MUATAN. A drag writes
   NOTHING: stock only moves when MUAT VAN is pressed, once - one handleLoadCanvas per product going
   out, one return transaction per product coming back - and only the report collapses to one line,
   with one surat jalan for what went out and one bukti kembali for what came back. A line that fails
   stays in the muatan with its reason, and each document lists only what landed.

   What a drag DOES save is the layout (which square holds which product - a hole means something),
   in its own field through onLayout, never inside activeCanvas, which every sale also writes.

   The figures change before any motion; the flying boxes only decorate what is already true, so
   Lite Mode, reduced motion or a stalled animation can never hide a number.

   `vanOnly` is the AGENT INVENTORY CHEST (AgentInventoryView, regional admin and above - his 2026-09-22 "agent chest is
   basically agent inventory for regional admin tier and above by default", design: the chest v3 prototype
   https://claude.ai/artifact/V5Z3ZkQZ3fvtXHynn4AnNF). The van chest alone: no warehouse, no tabs, no muatan, so nothing
   there can load or return - a drag only tidies the SAME vanLayout field, six squares a page on every width.

   THE QUARANTINE SWITCH (Fleet & Roster, his prototype v21, 2026-09-29): the ender chest keeps ONE box that shows the
   healthy stock or that warehouse's Quarantine (`warehouseQ`), switched on his Satisfactory hatch in a deck at the bottom
   of the box (components/QuarantineSwitch.jsx); blast doors close over the box while it changes. The Quarantine squares
   only tell - fixing damaged stock stays in Stock Opname. On the van side the wooden chest and the yellow crate (the van's
   damaged goods) take turns in one place. Four squares a page, in one row, at every width. */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { convertToBks, getLocalDayKey, formatRupiah } from '../utils/helpers';
import { PER, lineBks, netBks, loadCap, backCap, foldLine, vanCells, landingCell, applyPreset, teamLoad, HAZARD_SIGN } from '../utils/vanBay';
import { playSound } from '../hooks/useSound';
import { QuarantineHatch, BlastDoors, QuarantineBand, runSwitch } from './QuarantineSwitch.jsx';

const UNITS = ['Bks', 'Slop', 'Bal', 'Karton'];
const fmt = (n) => Number(n).toLocaleString('id-ID');
const signed = (n) => (n > 0 ? '+' : '−') + fmt(Math.abs(n));
const items = (n) => `${fmt(n)} item${n === 1 ? '' : 's'}`;
const MOTE_COLORS = ['#B44CF0', '#8A2BE2', '#D98CFF', '#6A1FB0'];
const rnd = (a, b) => a + Math.random() * (b - a);
const jitter = () => 1 + (Math.random() - 0.5) * 0.02;

function moteVars(once) {
  const ang = rnd(0, Math.PI * 2), r0 = rnd(6, 26), r1 = rnd(34, once ? 80 : 64);
  const v = {
    '--x0': Math.cos(ang) * r0 + 'px', '--y0': Math.sin(ang) * r0 * 0.6 + 'px',
    '--x1': Math.cos(ang) * r1 + 'px', '--y1': (Math.sin(ang) * r1 * 0.6 - rnd(10, 40)) + 'px',
    '--mc': MOTE_COLORS[Math.floor(Math.random() * MOTE_COLORS.length)],
    '--md': (once ? rnd(0.6, 1.1) : rnd(2.4, 4.4)) + 's',
  };
  if (!once) v['--mdl'] = -rnd(0, 4.4) + 's';
  return v;
}
function motionOK() {
  return !document.documentElement.classList.contains('lite-mode') &&
         !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
/* WHERE THINGS ARE — rectangles compared directly: the point-to-element lookup returns null whenever
   the page is not compositing, and a drop that silently does nothing is the one failure this screen
   cannot have. */
function inRect(el, x, y) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
function center(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

/* The app's own 3D box - the same faces as the sales terminal's renderCube (MerchantSalesView),
   without its EXAMINE label, which means nothing inside a chest. */
export function Cube({ p }) {
  const d = p?.dimensions || { w: 55, h: 90, d: 22 };
  const img = p?.images || {};
  const front = img.front || p?.image;
  const back = p?.useFrontForBack ? front : img.back;
  const face = (cls, src) => <i className={cls}>{src ? <img src={src} alt="" draggable={false} /> : null}</i>;
  return (
    <span className="kpm-cube-stage">
      <span className="kpm-cube" style={{ '--mm-w': d.w, '--mm-h': d.h, '--mm-d': d.d }}>
        {face('f', front)}{face('bk', back)}{face('l', img.left)}{face('r', img.right)}{face('t', img.top)}{face('bt', img.bottom)}
      </span>
    </span>
  );
}

/* what a cut preset line says, by its reason (vanBay applyPreset) */
const CUT_WHY = {
  short: (c) => `dipotong ke ${fmt(c.got)} dari ${fmt(c.want)} Bks — sisa gudang segitu`,
  planned: () => 'semua stok sudah di muatan',
  dry: () => 'habis di gudang',
  missing: () => 'tidak ada di gudang ini',
  full: () => 'van penuh — kosongkan satu kotak dulu',
};
const BYPASS_WORD = { PENDING: 'menunggu', APPROVED: 'disetujui', REJECTED: 'ditolak' };
const VIEW_ONLY = 'Hanya lihat — jabatan ini tidak bisa memuat van';
const TIDY = 'Tarik ke kotak lain untuk menata susunan';
/* the quarantine crate's sign, drawn once (vanBay HAZARD_SIGN); its colour is the CSS's, so it can turn green and back */
const SIGN = <svg viewBox="0 0 15 15" shapeRendering="crispEdges" aria-hidden="true">{HAZARD_SIGN.map(([x, y]) => <rect key={x + '-' + y} x={x} y={y} width="1.02" height="1.02" />)}</svg>;

/* `pose` is the ponder book's (ponder/stages/LoadingBayStage.jsx): a STARTING state only - the chests, the tabs and the
   muatan a beat wants on screen. It is read by useState and nowhere else, and Fleet & Roster never passes one. */
export default function LoadingBay({ agent, warehouse, stock, damaged = [], canEdit, onLoad, onReturn, onLayout, onDirty, onPreset, team = [], bypasses = [], titip = [], bounties = [], pose, vanOnly = false, quarantine = [], warehouseQ = [] }) {
  const P = useMemo(() => Object.fromEntries(stock.map(p => [p.id, p])), [stock]);
  /* the van, in packs, from its live rows */
  const vanOf = useMemo(() => {
    const m = {};
    for (const r of agent.activeCanvas || []) {
      const p = P[r.productId];
      if (!p) continue;
      m[r.productId] = Math.round(((m[r.productId] || 0) + convertToBks(r.qty, r.unit, p)) * 1000) / 1000;
    }
    return m;
  }, [agent.activeCanvas, P]);

  const [lines, setLines] = useState(() => pose?.lines || []);
  const [layout, setLayout] = useState(() => agent.vanLayout || []);
  const [whPage, setWhPage] = useState(0);
  const [vanPage, setVanPage] = useState(0);
  const [query, setQuery] = useState('');
  /* null = not opened yet (the pick opens both); false = closed by hand, and its tabs take the panel's place */
  const [open, setOpen] = useState(pose?.open || { wh: null, van: null, q: null });
  const [tabs, setTabs] = useState(pose?.tabs || { wh: 'preset', van: 'geo' });
  const [preset, setPreset] = useState(() => agent.loadPreset || []);
  const [fillCut, setFillCut] = useState(null);
  const [anim, setAnim] = useState({ wh: true, van: true, q: true });
  const [qPage, setQPage] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState(false);
  const [doneUpTo, setDoneUpTo] = useState(-1);
  const [report, setReport] = useState(null);
  const [says, setSays] = useState({ wh: null, van: null, q: null });
  const [dragging, setDragging] = useState(false);
  const [lift, setLift] = useState(null);
  /* squares on a page: 4 in one row at every width (his 07:50 "make per page 4 box only" on the phone, and v21's "the
     inventory box can also be 4" on the PC, so the hatch gets its room); van-only keeps its six */
  const per = vanOnly ? PER : 4;
  /* tap a product, then tap a van square (his 07:50 "press the product and press on the expty van space box") */
  const [picked, setPicked] = useState(null);
  /* the warehouse box's view: 'ok' = the healthy stock, 'q' = this warehouse's Quarantine */
  const [whView, setWhView] = useState('ok');
  const [qwPage, setQwPage] = useState(0);
  const whViewRef = useRef('ok'), sw = useRef({ busy: false, next: null });

  const refs = { bay: useRef(null), whGui: useRef(null), vanGui: useRef(null), whChest: useRef(null), vanChest: useRef(null), qChest: useRef(null),
    dmg: useRef(null), whGrid: useRef(null), vanGrid: useRef(null), vanPages: useRef(null), motes: useRef(null), qty: useRef(null), sheet: useRef(null),
    hatch: useRef(null), doors: useRef(null) };
  const drag = useRef(null);
  const sheetGhost = useRef(null);
  const sheetPrev = useRef(null);
  const sayTimers = useRef({});
  const motes = useMemo(() => Array.from({ length: 12 }, () => moteVars(false)), []);

  const net = (id) => netBks(lines, id, P[id]);
  const stockOf = (id) => P[id]?.stock || 0;
  const capLoad = (id) => loadCap(stockOf(id), net(id));
  const capBack = (id) => backCap(vanOf[id] || 0, net(id));

  const keepOf = (ls) => {
    const ids = Object.keys(vanOf).filter(id => vanOf[id] > 0);
    for (const l of ls) if (l.dir > 0 && !ids.includes(l.id)) ids.push(l.id);
    return ids;
  };
  const cells = useMemo(() => vanCells(layout, keepOf(lines), per), [layout, lines, vanOf, per]);   // eslint-disable-line react-hooks/exhaustive-deps
  const vanPageCount = cells.length / per;

  const q = query.trim().toLowerCase();
  const whList = q ? stock.filter(p => (p.name || '').toLowerCase().includes(q)) : stock;
  const whPages = Math.max(1, Math.ceil(whList.length / per));
  const whPageNow = Math.min(whPage, whPages - 1);
  const whPageOf = (id) => { const i = whList.findIndex(p => p.id === id); return i < 0 ? -1 : Math.floor(i / per); };
  /* the same box's Quarantine view, searched by the same field */
  const isq = whView === 'q';
  const wq = q ? warehouseQ.filter(p => (p.name || '').toLowerCase().includes(q)) : warehouseQ;
  const qwPages = Math.max(1, Math.ceil(wq.length / per));
  const qwPageNow = Math.min(qwPage, qwPages - 1);
  /* the crate's squares: the Quarantine tab's list in Agent Inventory, the van's damaged goods in Fleet & Roster */
  const qRows = vanOnly ? quarantine : damaged;

  useEffect(() => { onDirty?.(lines.length); }, [lines.length]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onDirty?.(0), []);                          // eslint-disable-line react-hooks/exhaustive-deps

  /* every action reports, in the panel where it happened */
  function say(where, msg, err) {
    setSays(s => ({ ...s, [where]: { msg, err: !!err, n: (s[where]?.n || 0) + 1, show: true } }));
    clearTimeout(sayTimers.current[where]);
    sayTimers.current[where] = setTimeout(() => setSays(s => ({ ...s, [where]: s[where] && { ...s[where], show: false } })), 2600);
  }

  const whSlotEl = (id) => refs.whGrid.current?.querySelector(`.slot[data-id="${CSS.escape(id)}"]`) || null;
  const vanSlotEl = (cell) => (cell < 0 ? null : refs.vanGrid.current?.querySelector(`.slot[data-i="${cell}"]`) || null);
  const slotAt = (grid, x, y) => { let hit = null; grid?.querySelectorAll('.slot').forEach(s => { if (inRect(s, x, y)) hit = s; }); return hit; };
  const tabAt = (x, y) => { let hit = null; refs.vanPages.current?.querySelectorAll('.pg').forEach(b => { if (inRect(b, x, y)) hit = +b.dataset.p; }); return hit; };
  function zoneAt(x, y) {
    /* the quarantine crate and its panel refuse a drop (refs.dmg is its panel) - damaged goods are settled at EOD */
    if (inRect(refs.qChest.current, x, y) || (open.q && inRect(refs.dmg.current, x, y))) return 'dmg';
    if (inRect(refs.vanChest.current, x, y) || (open.van && inRect(refs.vanGui.current, x, y))) return 'van';
    if (inRect(refs.whChest.current, x, y) || (open.wh && inRect(refs.whGui.current, x, y))) return 'wh';
    return 'none';
  }
  function landingFor(id, x, y) {
    const under = slotAt(refs.vanGrid.current, x, y);
    return landingCell(cells, id, under ? +under.dataset.i : -1, vanPage, per);
  }

  /* ── the chests ── */
  function burst(n) {
    if (!motionOK() || !refs.motes.current) return;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      el.className = 'once';
      Object.entries(moteVars(true)).forEach(([k, v]) => el.style.setProperty(k, v));
      refs.motes.current.appendChild(el);
      setTimeout(() => el.remove(), 1300);
    }
  }
  function bump(el) {
    const chest = el?.querySelector('.chest');
    if (!chest || !motionOK()) return;
    chest.animate([{ transform: 'none' }, { transform: 'translateY(3px) scale(1.03,.95)' }, { transform: 'none' }], { duration: 200, easing: 'ease-out' });
  }
  /* A tap opens a chest and closes it again (his 09:35 "i still want u to add the closing animation on the chest"),
     and a chest closed by hand shows its TABS in its panel's place, so the room is never empty: behind the
     warehouse his usual load and the team, behind the van this person's geofence requests. */
  function toggle(side, on) {
    /* the van and the crate share ONE place (Agent Inventory v4.1, his 2026-09-28 "open them one by one"; Fleet & Roster
       v21, his "opening quarantine chest will close the wooden chest and vice versa"), so opening one shuts the other */
    if (on && side !== 'wh') setOpen(o => ({ ...o, van: side === 'van', q: side === 'q' }));
    else setOpen(o => ({ ...o, [side]: on }));
    setAnim(a => ({ ...a, [side]: true }));
    if (on && side === 'wh') burst(12);
    playSound(side === 'wh' ? (on ? 'chestEnderOpen' : 'chestEnderClose') : (on ? 'chestVanOpen' : 'chestVanClose'));
    if (on && side !== 'wh') {
      const [gui, chest] = panelOf(side);   // it grows out of the chest that was pressed
      if (gui && chest) gui.style.setProperty('--ox', Math.round(chest.offsetLeft + chest.offsetWidth / 2 - gui.offsetLeft) + 'px');
      if (vanOnly) requestAnimationFrame(() => fitPanel(side));
    }
  }
  const panelOf = (side) => [side === 'q' ? refs.dmg.current : refs.vanGui.current, (side === 'q' ? refs.qChest : refs.vanChest).current];
  /* THE FLOATING PANEL (van-only, his "the inventory box should appear on the top of it but dont move any panel") opens
     above its chest, over the page, and must be seen whole: the page scrolls up just enough, and only if it cannot go
     higher does the panel sink into the chest row by what is still missing. Nothing else on the page moves. */
  function fitPanel(side) {
    const [gui] = panelOf(side), bay = refs.bay.current;
    if (!gui || !bay) return;
    gui.style.setProperty('--sink', '0px');
    let sc = bay.parentElement;
    while (sc && sc !== document.body && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
    const win = !sc || sc === document.body;
    let short = (win ? 0 : sc.getBoundingClientRect().top) + 8 - (bay.getBoundingClientRect().top + gui.offsetTop);
    if (short <= 0) return;
    const by = Math.min(short, win ? window.scrollY : sc.scrollTop);
    if (by > 0) (win ? window : sc).scrollBy({ top: -by, behavior: motionOK() ? 'smooth' : 'auto' });
    short -= by;
    if (short > 0) gui.style.setProperty('--sink', Math.ceil(short) + 'px');
  }
  useEffect(() => {
    const m = motionOK();
    const t1 = pose?.open || vanOnly ? 0 : setTimeout(() => toggle('wh', true), m ? 150 : 0);
    const t2 = pose?.open || vanOnly ? 0 : setTimeout(() => toggle('van', true), m ? 300 : 0);   // van-only waits for a tap: an open panel covers the Manifest
    return () => { clearTimeout(t1); clearTimeout(t2); Object.values(sayTimers.current).forEach(clearTimeout); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /* ── the carried box ── */
  function park(g, to) {
    if (!g) return;
    if (motionOK()) { g.classList.add('glide'); void g.offsetWidth; }
    g.style.left = to.x + 'px'; g.style.top = to.y + 'px'; g.classList.add('parked');
  }
  function flyHome(g, home) {
    if (!g) return;
    if (!motionOK() || !home) { g.remove(); return; }
    g.classList.remove('glide', 'parked'); g.classList.add('home'); void g.offsetWidth;
    g.style.left = home.x + 'px'; g.style.top = home.y + 'px';
    setTimeout(() => g.remove(), 320);
  }
  function settle(g) {
    if (!g) return;
    if (!motionOK()) { g.remove(); return; }
    g.classList.add('settle'); setTimeout(() => g.remove(), 200);
  }
  function clearMarks() {
    refs.bay.current?.querySelectorAll('.slot.over, .zoneover, .refuse').forEach(el => el.classList.remove('over', 'zoneover', 'refuse'));
  }
  /* hold the box over a van page number and that page turns under it */
  function vanTabHold(d, x, y) {
    const tab = tabAt(x, y);
    if (tab !== null && tab !== vanPage) {
      if (!d.hover || d.hover.p !== tab) d.hover = { p: tab, t: Date.now() };
      else if (Date.now() - d.hover.t > 260) { setVanPage(tab); setAnim(a => ({ ...a, van: false })); d.hover = null; playSound('chestPage'); }
    } else if (tab === null) d.hover = null;
    return tab;
  }
  function mark(d, x, y) {
    clearMarks();
    const zone = zoneAt(x, y);
    if (zone === 'dmg') { refs.dmg.current.classList.add('refuse'); d.hover = null; return; }
    if (d.src === 'wh') {
      if (zone !== 'van') { d.hover = null; return; }
      refs.vanGui.current.classList.add('zoneover'); refs.vanChest.current.classList.add('zoneover');
      const tab = vanTabHold(d, x, y), cell = landingFor(d.id, x, y);
      if (cell < 0) return;
      if (Math.floor(cell / per) !== vanPage && tab === null) { setVanPage(Math.floor(cell / per)); setAnim(a => ({ ...a, van: false })); }
      vanSlotEl(cell)?.classList.add('over');
      return;
    }
    /* from the van: over the warehouse it is a RETURN onto the product's own square; over the van only a tidy-up */
    if (zone === 'wh') {
      d.hover = null;
      refs.whGui.current.classList.add('zoneover'); refs.whChest.current.classList.add('zoneover');
      const pg = whPageOf(d.id);
      if (pg >= 0 && pg !== whPageNow) { setWhPage(pg); setAnim(a => ({ ...a, wh: false })); }
      whSlotEl(d.id)?.classList.add('over');
    } else if (zone === 'van') {
      vanTabHold(d, x, y);
      const t = slotAt(refs.vanGrid.current, x, y);
      if (t && +t.dataset.i !== d.cell) t.classList.add('over');
    } else d.hover = null;
  }

  function startDrag(e, src) {
    if (busy || sheet || (e.button !== undefined && e.button !== 0)) return;
    const slot = e.target.closest('.slot.has');
    if (!slot) return;
    drag.current = { src, id: slot.dataset.id, cell: src === 'van' ? +slot.dataset.i : -1, slot, x0: e.clientX, y0: e.clientY,
      live: false, pid: e.pointerId, lift: e.pointerType === 'touch' ? 46 : 0 };   // on a finger the box rides above it, where it can be seen
  }
  function move(e) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pid) return;
    if (!d.live) {
      if (Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0) < 6) return;   // still a tap
      const p = P[d.id];
      if (!canEdit) { say(d.src, VIEW_ONLY, true); drag.current = null; return; }
      if (d.src === 'wh' && capLoad(d.id) <= 0) {
        say('wh', stockOf(d.id) ? `Semua stok ${p.name} sudah di muatan` : `${p.name} habis di gudang`, true);
        playSound('chestRefuse'); drag.current = null; return;
      }
      d.live = true;
      setPicked(null);
      d.home = center(d.slot);
      const g = document.createElement('div');
      g.className = 'kpm-bay-ghost';
      g.innerHTML = d.slot.querySelector('.kpm-cube-stage')?.outerHTML || '';
      document.body.appendChild(g);
      d.ghost = g;
      setDragging(true);
      setLift(d.src === 'wh' ? 'wh:' + d.id : 'van:' + d.cell);
      playSound('chestPick');
    }
    const x = e.clientX, y = e.clientY - d.lift;
    d.x = x; d.y = y;
    d.ghost.style.left = x + 'px'; d.ghost.style.top = y + 'px';
    mark(d, x, y);
    if (e.clientY > window.innerHeight - 48) window.scrollBy(0, 14); else if (e.clientY < 48) window.scrollBy(0, -14);
  }
  function end(e) {
    const d = drag.current;
    if (!d || (e && e.pointerId !== d.pid)) return;
    drag.current = null;
    clearMarks();
    if (!d.live) { if (e.type === 'pointerup') tapBox(d); return; }
    setDragging(false); setLift(null);
    const zone = e.type === 'pointercancel' ? 'none' : zoneAt(d.x, d.y);
    if (zone === 'dmg') {
      say(open.q ? 'q' : 'van', 'Barang rusak dicatat lewat EOD, bukan dipindah di sini', true); playSound('chestRefuse');
      return flyHome(d.ghost, d.home);
    }
    if (d.src === 'wh') {
      if (zone !== 'van') return flyHome(d.ghost, d.home);
      const cell = landingFor(d.id, d.x, d.y);
      if (cell < 0) { say('van', 'Van penuh — kosongkan satu kotak dulu', true); playSound('chestRefuse'); return flyHome(d.ghost, d.home); }
      if (Math.floor(cell / per) !== vanPage) flushSync(() => { setVanPage(Math.floor(cell / per)); setAnim(a => ({ ...a, van: false })); });
      const to = vanSlotEl(cell);
      if (to) park(d.ghost, center(to));
      return openSheet({ mode: 'add', dir: 1, id: d.id, cell, ghost: d.ghost, home: d.home });
    }
    if (zone === 'wh') {
      showWh('ok', true);   // a return always lands in the healthy stock
      if (capBack(d.id) <= 0) { say('van', `Semua ${P[d.id]?.name} sudah direncanakan kembali`, true); playSound('chestRefuse'); return flyHome(d.ghost, d.home); }
      const ws = whSlotEl(d.id);
      park(d.ghost, center(ws || refs.whChest.current.querySelector('.chest')));
      return openSheet({ mode: 'add', dir: -1, id: d.id, cell: d.cell, ghost: d.ghost, home: d.home });
    }
    if (zone === 'van') {
      const t = slotAt(refs.vanGrid.current, d.x, d.y);
      if (t && +t.dataset.i !== d.cell) {
        /* a tidy-up: an empty square takes the box, a filled one trades places. Only the LAYOUT changes,
           in its own field, written on this drop - never the van's stock */
        const to = +t.dataset.i, next = [...cells];
        const a = next[d.cell], b = next[to];
        next[to] = a; next[d.cell] = b || null;
        flushSync(() => { setLayout(next); setAnim(an => ({ ...an, van: false })); });
        settle(d.ghost);
        playSound('chestPage');
        Promise.resolve(onLayout(next)).then(ok => say('van', ok === false ? 'Susunan tidak tersimpan — coba lagi' : 'tersimpan — hanya susunan kotak', ok === false));
        return;
      }
    }
    flyHome(d.ghost, d.home);
  }
  /* THE MOVE AND THE DROP LISTEN ON THE WINDOW: turning a page mid-drag re-draws its squares, and a
     listener on a square that no longer exists would drop the box into nothing. */
  const handlers = useRef({});
  handlers.current = { move, end };
  useEffect(() => {
    const mv = (e) => handlers.current.move(e), up = (e) => handlers.current.end(e);
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      drag.current?.ghost?.remove();
      sheetGhost.current?.remove();
    };
  }, []);

  function tapBox(d) {
    const c = d.slot.querySelector('.kpm-cube');
    if (c && motionOK()) { c.classList.remove('spin'); void c.offsetWidth; c.classList.add('spin'); setTimeout(() => c.classList.remove('spin'), 760); }
    const p = P[d.id];
    if (!canEdit) return say(d.src, VIEW_ONLY);
    if (d.src === 'van') {
      if (picked) return placePicked(d.cell);
      return say('van', vanOnly ? TIDY : 'Tarik ke gudang untuk mengembalikan, atau ke kotak lain untuk menata');
    }
    if (picked?.id === d.id) { setPicked(null); return say('wh', `${p.name} batal dipilih`); }
    if (capLoad(d.id) <= 0) {
      setPicked(null); playSound('chestRefuse');
      return say('wh', stockOf(d.id) ? `Semua stok ${p.name} sudah di muatan` : `${p.name} habis di gudang`, true);
    }
    setPicked({ src: 'wh', id: d.id });
    playSound('chestPick');
    say('wh', `${p.name} dipilih · ketuk kotak di van`);
  }
  /* the second tap: the square under the finger, else the product's own square or the next empty one - the landing
     a drop uses - then the same HOW MANY sheet. Nothing is written before MUAT VAN. */
  function placePicked(cell) {
    const at = landingCell(cells, picked.id, cell, vanPage, per);
    if (at < 0) { playSound('chestRefuse'); return say('van', 'Van penuh — kosongkan satu kotak dulu', true); }
    setPicked(null);
    openSheet({ mode: 'add', dir: 1, id: picked.id, cell: at, back: { grid: 'wh', id: picked.id } });
  }
  function tapVan(e) {
    if (!picked) return;
    const slot = e.target.closest('.slot');
    if (!slot || slot.classList.contains('has')) return;   // a filled square answers through tapBox
    placePicked(+slot.dataset.i);
  }
  /* THE QUARANTINE CRATE ONLY TELLS: which shop, which reason. Settling it is EOD's job, so nothing drags in or out. */
  function tellQ(e) {
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    const slot = e.target.closest('.slot.has');
    if (!slot) return;
    e.preventDefault();
    const x = qRows[+slot.dataset.q];
    playSound('chestPage');
    if (!vanOnly) return say('q', `${x.name} · ${fmt(x.bks)} Bks${x.why ? ' · ' + x.why : ''} · waits for EOD`);
    const at = x.timestamp?.seconds ? ' ' + new Date(x.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
    say('q', `${x.itemName} · ${fmt(x.qty)}${x.unit ? ' ' + x.unit : ''} · ${x.returnReason} · dari ${x.customerOrigin}${at}`);
  }
  /* THE WAREHOUSE'S QUARANTINE ONLY TELLS too: the product and how much of it is damaged here. Fixing it is Stock Opname's. */
  function tellWhQ(e) {
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    const slot = e.target.closest('.slot.has');
    if (!slot) return;
    e.preventDefault();
    const p = warehouseQ.find(x => x.id === slot.dataset.id);
    if (!p) return;
    playSound('chestPage');
    say('wh', `${p.name} · ${fmt(p.damagedStock)} Bks damaged`);
  }
  /* THE SWITCH: his hatch runs and the blast doors close over the box; the box changes while they are shut, and reports.
     A press while one runs is ignored; a RETURN queues its switch back, so a box coming home always lands in the healthy
     stock. */
  function swapWh(next) {
    whViewRef.current = next;
    flushSync(() => { setWhView(next); setQuery(''); setAnim(a => ({ ...a, wh: false })); });
    say('wh', next === 'q' ? `Showing Quarantine · ${items(warehouseQ.length)}` : `Showing healthy stock · ${items(stock.length)}`);
  }
  async function showWh(next, queue) {
    if (sw.current.busy) { if (queue) sw.current.next = next; return; }
    if (next === whViewRef.current) return;
    sw.current.busy = true;
    playSound('chestPage');
    try { await runSwitch(refs.hatch.current, refs.doors.current, next === 'q', () => swapWh(next)); }
    finally {
      sw.current.busy = false;
      const n = sw.current.next;
      sw.current.next = null;
      if (n) showWh(n);
    }
  }
  /* keyboard path — no mouse, no finger: Enter on a warehouse box loads, Enter on a van box returns */
  function keyBox(e, src) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const slot = e.target.closest('.slot.has');
    if (!slot || !canEdit || busy) return;
    if (vanOnly) { e.preventDefault(); return say('van', TIDY); }
    e.preventDefault();
    const id = slot.dataset.id;
    if (src === 'wh') {
      if (capLoad(id) <= 0) return say('wh', stockOf(id) ? `Semua stok ${P[id].name} sudah di muatan` : `${P[id].name} habis di gudang`, true);
      const cell = landingCell(cells, id, -1, vanPage, per);
      if (cell < 0) return say('van', 'Van penuh — kosongkan satu kotak dulu', true);
      openSheet({ mode: 'add', dir: 1, id, cell, back: { grid: 'wh', id } });
    } else {
      if (capBack(id) <= 0) return say('van', `Semua ${P[id].name} sudah direncanakan kembali`, true);
      showWh('ok', true);
      openSheet({ mode: 'add', dir: -1, id, cell: +slot.dataset.i, back: { grid: 'van', id } });
    }
  }

  /* ── HOW MANY ── */
  function openSheet(o) {
    const line = lines.find(l => l.id === o.id);
    sheetGhost.current = o.ghost || null;
    sheetPrev.current = document.activeElement;
    setSheet({ mode: o.mode, dir: o.mode === 'edit' ? line.dir : o.dir, id: o.id, cell: o.cell, home: o.home, back: o.back,
      unit: o.mode === 'edit' ? line.unit : 'Bks',          // the packs the stock is counted in — never a guessed amount
      raw: o.mode === 'edit' ? String(line.qty) : '' });
    setTimeout(() => refs.qty.current?.focus(), 40);
    playSound('chestPage', { rate: 0.85 });
  }
  function calc(s) {
    const p = P[s.id], raw = s.raw.trim(), n = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
    const bks = n > 0 ? convertToBks(n, s.unit, p) : 0;
    const line = lines.find(l => l.id === s.id), nt = net(s.id), have = vanOf[s.id] || 0, st = stockOf(s.id);
    const cap = s.mode === 'edit' ? (s.dir > 0 ? st : have) : (s.dir > 0 ? capLoad(s.id) : capBack(s.id));
    let ok = false, msg = '', err = false;
    if (raw === '') msg = `${s.dir > 0 ? 'Sisa di gudang' : 'Isi van'} ${fmt(cap)} Bks.`;
    else if (!(n > 0)) { msg = 'Tulis angka bulat, lebih dari 0.'; err = true; }
    else if (bks > cap) { msg = `Lebih dari ${s.dir > 0 ? 'sisa gudang' : 'isi van'}: ${fmt(cap)} Bks.`; err = true; }
    else {
      ok = true;
      const after = s.mode === 'edit' ? s.dir * bks : nt + s.dir * bks;
      msg = (s.mode === 'add' && line ? `Digabung dengan ${signed(nt)} Bks di muatan. ` : '') + `Gudang jadi ${fmt(st - after)} Bks · van jadi ${fmt(have + after)} Bks.`;
    }
    return { ok, n, bks, cap, msg, err };
  }
  function refocus(s) {
    let el = null;
    if (s.back) el = (s.back.grid === 'wh' ? refs.whGrid : refs.vanGrid).current?.querySelector(`.slot[data-id="${CSS.escape(s.back.id)}"]`);
    if (!el && s.mode === 'edit') el = refs.bay.current?.querySelector(`[data-edit="${CSS.escape(s.id)}"]`);
    if (!el) el = sheetPrev.current;
    try { el?.focus?.(); } catch { /* gone */ }
  }
  function confirm() {
    const s = sheet;
    if (!s) return;
    const c = calc(s);
    if (!c.ok) return;
    const p = P[s.id];
    const nextLines = foldLine(lines, { id: s.id, qty: c.n, unit: s.unit, dir: s.dir, bks: c.bks }, p, s.mode);
    let nextLayout = layout;
    if (s.dir > 0 && s.mode === 'add' && !cells.includes(s.id)) { nextLayout = [...cells]; nextLayout[s.cell] = s.id; }
    const vc = vanCells(nextLayout, keepOf(nextLines), per).indexOf(s.id), wp = whPageOf(s.id);
    const ghost = sheetGhost.current; sheetGhost.current = null;
    /* the figures change NOW, before any motion — the flight below only decorates what is already true */
    flushSync(() => { setLines(nextLines); setLayout(nextLayout); setSheet(null); if (vc >= 0) setVanPage(Math.floor(vc / per)); if (wp >= 0) setWhPage(wp); setAnim({ wh: false, van: false }); });
    settle(ghost);
    if (s.mode === 'add') transfer(p, c.n, s.dir, vc); else playSound('chestPage');
    say(s.dir > 0 || s.mode === 'edit' ? 'van' : 'wh', s.mode === 'edit' ? `${p.name}: ${signed(netBks(nextLines, s.id, p))} Bks di muatan`
      : (s.dir > 0 ? `+${fmt(c.bks)} Bks ${p.name} ke van` : `${fmt(c.bks)} Bks ${p.name} kembali ke gudang`) + ' — belum tercatat');
    refocus(s);
  }
  function cancel() {
    const s = sheet;
    if (!s) return;
    setSheet(null);
    const ghost = sheetGhost.current; sheetGhost.current = null;
    if (ghost) flyHome(ghost, s.home);
    say(s.mode === 'edit' || s.dir < 0 ? 'van' : 'wh', 'Batal — tidak ada yang berubah');
    refocus(s);
  }
  function takeAll() {
    const c = calc(sheet);
    if (c.cap <= 0) return;
    setSheet(s => ({ ...s, unit: 'Bks', raw: String(c.cap) }));
  }
  function sheetKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); confirm(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    else if (e.key === 'Tab') {   // focus stays inside the panel while it is open
      const f = refs.sheet.current.querySelectorAll('input, button:not([disabled])'), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  /* ── THE TRANSFER — the goods fly ACROSS THE MIDDLE, from the square they left to the square they land
        in (his "middle level of between the chests and not too bottom"): a shallow bow sideways to the
        line, never a hop over the top. As many boxes as the count, up to six. ── */
  function transfer(p, n, dir, cell) {
    const ws = whSlotEl(p.id), vs = vanSlotEl(cell);
    const mouth = (el) => { const r = el.querySelector('.chest').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.32 }; };
    const whPt = ws ? center(ws) : mouth(refs.whChest.current), vanPt = vs ? center(vs) : mouth(refs.vanChest.current);
    const a = dir > 0 ? whPt : vanPt, b = dir > 0 ? vanPt : whPt;
    if (!motionOK()) { playSound('chestLand'); return; }
    if (dir > 0) burst(10);                                  // the ender chest gives
    const html = (ws || vs)?.querySelector('.kpm-cube-stage')?.outerHTML || '';
    const k = Math.max(1, Math.min(6, n)), dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let nx = (b.y - a.y) / dist, ny = -(b.x - a.x) / dist;
    if (ny > 0) { nx = -nx; ny = -ny; }
    const bow = 24 + dist * 0.08, cx = (a.x + b.x) / 2 + nx * bow, cy = (a.y + b.y) / 2 + ny * bow;
    for (let i = 0; i < k; i++) {
      const el = document.createElement('div');
      el.className = 'kpm-bay-pack';
      el.innerHTML = html;
      el.style.transform = `translate(${a.x - 20}px,${a.y - 20}px)`;
      el.style.opacity = '0';
      document.body.appendChild(el);
      const frames = [];
      for (let j = 0; j <= 14; j++) {
        const t = j / 14, u = 1 - t;
        const x = u * u * a.x + 2 * u * t * cx + t * t * b.x, y = u * u * a.y + 2 * u * t * cy + t * t * b.y;
        frames.push({ transform: `translate(${x - 20}px,${y - 20}px) rotate(${t * 24 - 8}deg) scale(${1 - 0.3 * t})`, opacity: j === 0 || j === 14 ? 0 : 1 });
      }
      const an = el.animate(frames, { duration: 560, delay: i * 95, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' });
      an.onfinish = () => {
        el.remove();
        playSound('chestLand', { rate: (1 + dir * i * .07) * jitter() });   // into the van each box lands a little HIGHER, back to the warehouse a little LOWER (his call)
        const chip = (dir > 0 ? vanSlotEl(cell) : whSlotEl(p.id))?.querySelector('.chip');
        chip?.animate([{ transform: 'scale(1.35)' }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
        bump(dir > 0 ? refs.vanChest.current : refs.whChest.current);
        if (dir < 0 && i === k - 1) burst(8);                  // the ender chest takes it back
      };
      setTimeout(() => el.remove(), 660 + i * 95 + 400);        // a stalled clock never leaves a box hanging
    }
  }

  /* ── MUAT VAN — the ONE press ── */
  async function load() {
    if (busy || !lines.length || !canEdit) return;
    setBusy(true); setReport(null);
    const todo = lines.slice(), out = [], back = [], failed = [];
    for (let i = 0; i < todo.length; i++) {
      const l = todo[i], p = P[l.id], bks = lineBks(l, p);
      let r;
      try { r = await (l.dir > 0 ? onLoad(l.id, bks) : onReturn(l.id, bks)); }
      catch (err) { r = { ok: false, reason: err?.message }; }
      const row = { id: l.id, name: p?.name || l.id, qty: l.qty, unit: l.unit, bks };
      if (r && r.ok) (l.dir > 0 ? out : back).push(row);
      else failed.push({ ...l, reason: (r && r.reason) || 'Tidak tersimpan' });
      setDoneUpTo(i);
    }
    const sum = (rows) => rows.reduce((a, x) => a + x.bks, 0);
    const stamp = `${getLocalDayKey().replace(/-/g, '')}-${String(agent.id).slice(-4)}-${new Date().toTimeString().slice(0, 5).replace(':', '')}`;
    const docs = [], parts = [];
    if (out.length) {
      docs.push({ title: 'SURAT JALAN', no: 'SJ-' + stamp, sub: `Gudang ${warehouse} → ${agent.name} · ${agent.vehicle || '—'}`, rows: out, total: sum(out) });
      parts.push(`${out.length} dimuat · ${fmt(sum(out))} Bks · SJ-${stamp}`);
    }
    if (back.length) {
      docs.push({ title: 'BUKTI KEMBALI', no: 'BK-' + stamp, sub: `${agent.name} · ${agent.vehicle || '—'} → Gudang ${warehouse}`, rows: back, total: sum(back) });
      parts.push(`${back.length} kembali · ${fmt(sum(back))} Bks · BK-${stamp}`);
    }
    if (failed.length) parts.push(`${failed.length} gagal — alasannya di muatan`);
    setLines(failed);
    setBusy(false); setDoneUpTo(-1);
    setReport({ landed: out.length + back.length > 0, parts, docs });
    if (out.length || back.length) {
      if (out.length) onLayout(cells);                           // the new products keep the squares they were planned in
      say('van', failed.length ? 'tersimpan sebagian' : 'tersimpan', !!failed.length);
      playSound('chestLoad'); bump(refs.vanChest.current);
    } else {
      say('van', 'Tidak ada yang tercatat — alasannya di muatan', true);
      playSound('chestRefuse');
    }
  }
  /* ── behind the closed warehouse: HIS USUAL LOAD ── */
  async function savePreset() {
    if (!canEdit || busy) return;
    const next = lines.filter(l => l.dir > 0).map(({ id, qty, unit }) => ({ id, qty, unit }));
    if (!next.length) return say('wh', 'Belum ada barang masuk di muatan untuk disimpan', true);
    const ok = await onPreset?.(next);
    if (ok !== true) return say('wh', 'Muatan biasa tidak tersimpan — coba lagi', true);
    say('wh', `${preset.length ? 'Muatan biasa diganti' : 'Tersimpan sebagai muatan biasa'} — ${next.length} barang`);
    setPreset(next); setFillCut(null);
    playSound('chestPage');
  }
  /* his rule: a preset only FILLS THE MUATAN, the same way a drag does - and so does a van copied from the team.
     Nothing is written here; every line that could not go in whole is listed with its reason. */
  function fillMuatan(src, done, from) {
    if (!canEdit || busy || !src.length) return;
    const r = applyPreset(lines, cells, src, P, vanPage, per);
    const went = src.length - r.cut.filter(c => c.why !== 'short').length;
    flushSync(() => { setLines(r.lines); setLayout(r.layout); setAnim({ wh: false, van: false }); });
    setFillCut(r.cut);
    say('wh', went ? `${done} — ${went} barang, belum tercatat${r.cut.length ? ` · ${r.cut.length} dipotong` : ''}`
      : `Tidak ada yang bisa diambil dari ${from}`, !went);
    playSound(went ? 'chestLand' : 'chestRefuse');
  }
  /* his 12:50 "copy paste loadout": another van's goods into this muatan, pure convenience */
  function copyLoad(v) { fillMuatan(v.items.map(({ id, qty, unit }) => ({ id, qty, unit })), `Muatan ${v.name} disalin`, `muatan ${v.name}`); }

  function removeLine(id) {
    if (busy) return;
    setLines(ls => ls.filter(l => l.id !== id));
    setAnim({ wh: false, van: false });
    say('van', `${P[id]?.name || id} keluar dari muatan — gudang dan van tidak berubah`);
    playSound('chestPage');
  }

  /* ── drawing ── */
  const totalWh = stock.reduce((a, p) => a + (p.stock || 0), 0);
  let vanHave = 0, plus = 0, minus = 0;
  Object.values(vanOf).forEach(v => { vanHave += v; });
  lines.forEach(l => { const b = lineBks(l, P[l.id]); if (l.dir > 0) plus += b; else minus += b; });
  const dmgTotal = damaged.reduce((a, x) => a + x.bks, 0);
  const qTotal = quarantine.reduce((a, x) => a + (x.qty || 0), 0), qPages = Math.max(1, Math.ceil(qRows.length / per));
  const qwTotal = warehouseQ.reduce((a, p) => a + p.damagedStock, 0);
  const sayEl = (where) => { const s = says[where]; return <span key={s?.n || 0} className={`say${s?.show ? ' show' : ''}${s?.err ? ' err' : ''}`} role="status" aria-live="polite">{s?.msg || ''}</span>; };
  const goParts = [];
  if (plus) goParts.push(`${fmt(plus)} Bks masuk`);
  if (minus) goParts.push(`${fmt(minus)} Bks kembali`);

  const sh = sheet && P[sheet.id] ? { s: sheet, p: P[sheet.id], c: calc(sheet) } : null;
  /* what sits behind a closed chest */
  const teamRows = open.wh === false ? teamLoad(team, P) : [];
  const cutList = fillCut?.length ? (
    <ul className="rows cut" aria-label="Yang dipotong">
      {fillCut.map(c => <li key={c.id}><span>{P[c.id]?.name || 'Barang yang sudah tidak ada'}</span><b>{CUT_WHY[c.why](c)}</b></li>)}
    </ul>
  ) : null;
  const geo = [...bypasses].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  const plusLines = lines.filter(l => l.dir > 0).length;
  const tabKeys = (side, list) => (
    <div className="tabs" role="tablist" aria-label={side === 'wh' ? 'Di balik peti gudang' : 'Di balik peti van'}>
      {list.map(([k, label]) => (
        <button key={k} id={`kpm-slip-${k}`} type="button" role="tab" aria-selected={tabs[side] === k} className={`tab${tabs[side] === k ? ' on' : ''}`}
          onClick={() => { setTabs(t => ({ ...t, [side]: k })); playSound('chestPage'); }}>{label}</button>
      ))}
    </div>
  );

  const vanChest = (
    <button ref={refs.vanChest} className="chestCell vanc" type="button" data-ponder="chest:van" aria-expanded={!!open.van} aria-label={`Peti van ${agent.name} — buka atau tutup`} onClick={() => toggle('van', !open.van)}>
      <span className="chest small"><span className="lid" /><span className="latch" /><span className="body" /></span>
      <span className="cap">{vanOnly ? `Van · ${agent.vehicle || '—'}` : <>Van<span className="plate">{agent.vehicle || '—'}</span></>}</span>
    </button>
  );
  /* THE QUARANTINE CRATE: a yellow hazard crate, the pixel radiation sign on its front, ONE quiet effect (his 2026-09-27
     C+B pick). Agent Inventory: the Quarantine tab's own list. Fleet & Roster: the van's damaged goods. */
  const crate = (
    <button ref={refs.qChest} className="chestCell qc" type="button" data-ponder="chest:q" aria-expanded={!!open.q} aria-label="Quarantine chest — open or close" onClick={() => toggle('q', !open.q)}>
      <span className="specks" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="chest small hazard"><span className="lid" /><span className="latch" /><span className="body"><span className="sign">{SIGN}</span></span></span>
      <span className="cap">Quarantine</span>
    </button>
  );

  return (
    <div className="kpm-bay-wrap">
      <div className="kpm-bay-duo">
      <section ref={refs.bay} className={`kpm-bay${open.wh ? ' wh-open' : ''}${open.van ? ' van-open' : ''}${open.wh === false ? ' wh-shut' : ''}${open.van === false ? ' van-shut' : ''}${dragging ? ' dragging' : ''}${picked ? ' picking' : ''}${vanOnly ? ' solo' : ''}${open.q ? ' q-open' : ''}${open.q === false ? ' q-shut' : ''}`} aria-label={vanOnly ? `${agent.name} inventory` : 'Muat van'}>
        {!canEdit && <p className="bayHint">{VIEW_ONLY}</p>}

        {!vanOnly && (<>
        {open.wh === false && (
          <div className="slip wh" data-ponder="slip:wh">
            {tabKeys('wh', [['preset', 'Muatan biasa'], ['team', `Tim · ${teamRows.length}`]])}
            {sayEl('wh')}
            {tabs.wh === 'preset' ? (
              <div className="pane" role="tabpanel" aria-labelledby="kpm-slip-preset">
                {preset.length ? (
                  <ul className="rows">
                    {preset.map(l => (
                      <li key={l.id}><span>{P[l.id]?.name || 'Barang yang sudah tidak ada'}<small>gudang {fmt(stockOf(l.id))} Bks</small></span>
                        <b>{fmt(l.qty)} {l.unit}</b></li>
                    ))}
                  </ul>
                ) : <p className="note">Belum ada muatan biasa.</p>}
                {cutList}
                {canEdit && (
                  <div className="acts">
                    <button type="button" className="use" disabled={!preset.length || busy} onClick={() => fillMuatan(preset, 'Muatan biasa dipakai', 'muatan biasa')}>Pakai muatan biasa</button>
                    <button type="button" className="keep" disabled={!plusLines || busy} onClick={savePreset}>Simpan sebagai muatan biasa</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="pane" role="tabpanel" aria-labelledby="kpm-slip-team">
                {teamRows.length ? (
                  <ul className="rows team">
                    {teamRows.map(v => (
                      <li key={v.id}>
                        <span>{v.name}<small>{v.items.map(x => `${x.name} ${fmt(x.qty)} ${x.unit}`).join(' · ')}</small></span>
                        <span className="side"><b>{fmt(v.bks)} Bks</b>
                          {canEdit && <button type="button" className="copy" aria-label={`Salin muatan ${v.name}`} disabled={busy} onClick={() => copyLoad(v)}>Salin</button>}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="note">{team.length ? 'Van lain di tempat ini kosong.' : 'Tidak ada orang lain di tempat ini.'}</p>}
                {cutList}
              </div>
            )}
          </div>
        )}

        <div ref={refs.whGui} className={`gui wh${anim.wh ? '' : ' noanim'}${isq ? ' isq' : ''}`} data-ponder="gui:wh">
          <div className="stage">
          <p className="title">
            <span className="tname">{isq && <span className="tsign">{SIGN}</span>}<span className="tt">{isq ? `Quarantine · ${warehouse}` : `Gudang ${warehouse}`}</span></span>
            <span className="count">{isq ? `${fmt(qwTotal)} Bks · ${items(warehouseQ.length)}` : `${stock.length} barang · ${fmt(totalWh)} Bks`}</span>
          </p>
          <QuarantineBand q={isq} />
          {open.wh !== false ? sayEl('wh') : <span className="say" aria-hidden="true" />}
          <label className="find">
            <span className="sr-only">{isq ? 'Search quarantine' : 'Cari barang di gudang'}</span>
            <input type="search" value={query} placeholder={isq ? 'Search quarantine…' : 'Cari barang di gudang…'} autoComplete="off" enterKeyHint="search"
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v); (isq ? setQwPage : setWhPage)(0); setAnim(a => ({ ...a, wh: false }));
                const qq = v.trim().toLowerCase();
                if (qq && !(isq ? warehouseQ : stock).some(p => (p.name || '').toLowerCase().includes(qq)))
                  say('wh', isq ? `No “${v.trim()}” in the Quarantine` : `Tidak ada “${v.trim()}” di Gudang ${warehouse}`, true);
              }} />
            {query && <button className="x" type="button" aria-label="Hapus pencarian" onClick={() => { setQuery(''); (isq ? setQwPage : setWhPage)(0); setAnim(a => ({ ...a, wh: false })); }}>×</button>}
          </label>
          {isq ? (
            <div className="grid" key={'wq' + qwPageNow} onClick={tellWhQ} onKeyDown={tellWhQ}>
              {Array.from({ length: per }, (_, i) => {
                const p = wq[qwPageNow * per + i], style = { '--d': 120 + i * 50 + 'ms' };
                if (!p) return <div key={'e' + i} className="slot" style={style} />;
                return (
                  <div key={p.id} className="slot has qs" data-id={p.id} tabIndex={0} role="button" style={style} aria-label={`${p.name}, ${fmt(p.damagedStock)} Bks damaged`}>
                    <Cube p={p} />
                    <span className="n">{fmt(p.damagedStock)}</span>
                    <span className="name">{p.name}</span>
                  </div>
                );
              })}
            </div>
          ) : (
          <div className="grid" key={'wh' + whPageNow} ref={refs.whGrid} onPointerDown={(e) => startDrag(e, 'wh')} onKeyDown={(e) => keyBox(e, 'wh')}>
            {Array.from({ length: per }, (_, i) => {
              const p = whList[whPageNow * per + i], style = { '--d': 120 + i * 50 + 'ms' };
              if (!p) return <div key={'e' + i} className="slot" style={style} />;
              const st = p.stock || 0, nt = net(p.id), out = capLoad(p.id) <= 0;
              return (
                <div key={p.id} className={`slot has${out ? ' out' : ''}${lift === 'wh:' + p.id ? ' lift' : ''}${picked?.id === p.id ? ' picked' : ''}`} data-id={p.id} tabIndex={0} role="button" style={style}
                  aria-label={`${p.name}, stok ${fmt(st)} Bks${nt ? `, ${signed(-nt)} Bks di muatan` : ''}`}>
                  <Cube p={p} />
                  <span className="n">{st ? fmt(st) : 'habis'}</span>
                  {nt ? <span className="chip">{signed(-nt)}</span> : null}
                  <span className="name">{p.name}</span>
                </div>
              );
            })}
          </div>
          )}
          <BlastDoors ref={refs.doors} />
          </div>
          {/* the deck: page keys | his hatch | the note - the hatch outside every grid, so a press never starts a drag */}
          <div className="deck">
            <span className="pgs">
              {Array.from({ length: isq ? qwPages : whPages }, (_, k) => (
                <button key={k} type="button" className={`pg${k === (isq ? qwPageNow : whPageNow) ? ' on' : ''}`} onClick={() => { (isq ? setQwPage : setWhPage)(k); setAnim(a => ({ ...a, wh: true })); playSound('chestPage'); }}>
                  {k + 1}
                </button>
              ))}
            </span>
            <QuarantineHatch ref={refs.hatch} view={whView} onPress={() => showWh(isq ? 'ok' : 'q')} />
            <span className="of">{isq ? 'fix in Stock Opname' : q ? `${whList.length} hasil` : `halaman ${whPageNow + 1}/${whPages}`}</span>
          </div>
        </div>

        <button ref={refs.whChest} className="chestCell whc" type="button" data-ponder="chest:wh" aria-expanded={!!open.wh} aria-label="Peti gudang — buka atau tutup" onClick={() => toggle('wh', !open.wh)}>
          <span className="chest ender"><span className="lid" /><span className="latch" /><span className="body" /></span>
          <span className="motes" ref={refs.motes} aria-hidden="true">{motes.map((v, i) => <i key={i} style={v} />)}</span>
          <span className="cap">Gudang</span>
        </button>
        </>)}
        {/* Fleet & Roster: the wooden chest and the yellow crate stand together beside the ender chest, one box between them */}
        {vanOnly ? vanChest : <div className="vpair">{vanChest}{crate}</div>}

        <div ref={refs.vanGui} className={`gui van${anim.van ? '' : ' noanim'}`} data-ponder="gui:van">
          <p className="title">
            <span>{agent.name} inventory</span>
            <span className="count">{fmt(vanHave)} Bks{plus ? <> <b>+{fmt(plus)}</b></> : null}{minus ? <> <b>−{fmt(minus)}</b></> : null}</span>
          </p>
          {open.van !== false ? sayEl('van') : <span className="say" aria-hidden="true" />}
          <div className="grid" key={'van' + vanPage} ref={refs.vanGrid} onPointerDown={(e) => startDrag(e, 'van')} onKeyDown={(e) => keyBox(e, 'van')} onClick={tapVan}>
            {Array.from({ length: per }, (_, i) => {
              const c = vanPage * per + i, id = cells[c], p = id ? P[id] : null, style = { '--d': 120 + i * 50 + 'ms' };
              if (!p) return <div key={'e' + c} className="slot" data-i={c} style={style} />;
              const have = vanOf[id] || 0, nt = net(id);
              return (
                <div key={id} className={`slot has${nt > 0 && !have ? ' new' : ''}${lift === 'van:' + c ? ' lift' : ''}`} data-i={c} data-id={id} tabIndex={0} role="button" title={p.name} style={style}
                  aria-label={`${p.name}, di van ${fmt(have)} Bks${nt ? `, ${signed(nt)} Bks di muatan` : ''}`}>
                  <Cube p={p} />
                  {have ? <span className="n">{fmt(have)}</span> : null}
                  {nt ? <span className="chip">{signed(nt)}</span> : null}
                  <span className="name">{p.name}</span>
                </div>
              );
            })}
          </div>
          <div className="pages" ref={refs.vanPages} data-ponder="pages:van">
            {Array.from({ length: vanPageCount }, (_, k) => (
              <button key={k} type="button" data-p={k} className={`pg${k === vanPage ? ' on' : ''}`} onClick={() => { setVanPage(k); setAnim(a => ({ ...a, van: true })); playSound('chestPage'); }}>
                {k + 1}{vanOnly ? ` · ${cells.slice(k * per, k * per + per).filter(Boolean).length}` : ''}
              </button>
            ))}
            <span className="of">{cells.filter(Boolean).length} barang</span>
          </div>
        </div>

        {/* THE CRATE'S BOX (Fleet & Roster v21): the van's damaged goods under the tape band, in the van box's place. It only
            tells, as the damaged row did - a drop on it is refused; settling it is EOD's job. */}
        {!vanOnly && (
          <div ref={refs.dmg} className={`gui q${anim.q ? '' : ' noanim'}`} data-ponder="gui:q">
            <p className="title">
              <span className="tname"><span className="tsign">{SIGN}</span><span className="tt">Quarantine · in van</span></span>
              <span className="count">{fmt(dmgTotal)} Bks · {items(damaged.length)}</span>
            </p>
            <QuarantineBand q />
            {open.q !== false ? sayEl('q') : <span className="say" aria-hidden="true" />}
            <div className="grid" key={'d' + qPage} onClick={tellQ} onKeyDown={tellQ}>
              {Array.from({ length: per }, (_, i) => {
                const k = qPage * per + i, x = damaged[k], style = { '--d': 120 + i * 50 + 'ms' };
                if (!x) return <div key={'e' + k} className="slot" style={style} />;
                return (
                  <div key={x.id} className="slot has" data-q={k} tabIndex={0} role="button" title={x.name} style={style}
                    aria-label={`${x.name}, ${fmt(x.bks)} Bks${x.why ? ', ' + x.why : ''}`}>
                    <Cube p={P[x.id]} />
                    <span className="n">{fmt(x.bks)}</span>
                    <span className="name">{x.why || x.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="pages">
              {Array.from({ length: qPages }, (_, k) => (
                <button key={k} type="button" className={`pg${k === qPage ? ' on' : ''}`} onClick={() => { setQPage(k); setAnim(a => ({ ...a, q: true })); playSound('chestPage'); }}>{k + 1}</button>
              ))}
              <span className="of">{damaged.length ? 'waits for EOD' : 'nothing damaged today'}</span>
            </div>
          </div>
        )}

        {/* THE QUARANTINE CRATE (van-only, Agent Inventory v4): a yellow hazard crate beside the goods chest, the pixel
            radiation sign on its front, and ONE quiet effect (his 2026-09-27 C+B pick). Its squares are the Quarantine
            tab's own list - what came back damaged today and waits for EOD. A tap tells shop + reason; nothing drags. */}
        {vanOnly && (<>
        {crate}
        <div ref={refs.dmg} className={`gui q${anim.q ? '' : ' noanim'}`} data-ponder="gui:q">
          {/* look C (his 2026-09-29 pick): the sign in the title, the tape band under it, no word on the band */}
          <p className="title">
            <span className="tname"><span className="tsign">{SIGN}</span><span className="tt">Quarantine · in van</span></span>
            <span className="count">{fmt(qTotal)} · {items(quarantine.length)}</span>
          </p>
          <QuarantineBand q />
          {open.q !== false ? sayEl('q') : <span className="say" aria-hidden="true" />}
          <div className="grid" key={'q' + qPage} onClick={tellQ} onKeyDown={tellQ}>
            {Array.from({ length: per }, (_, i) => {
              const k = qPage * per + i, x = quarantine[k], style = { '--d': 120 + i * 50 + 'ms' };
              if (!x) return <div key={'e' + k} className="slot" style={style} />;
              return (
                <div key={x.id} className="slot has" data-q={k} tabIndex={0} role="button" title={x.itemName} style={style}
                  aria-label={`${x.itemName}, ${fmt(x.qty)}${x.unit ? ' ' + x.unit : ''}, ${x.returnReason}, dari ${x.customerOrigin}`}>
                  <Cube p={P[x.productId]} />
                  <span className="n">{fmt(x.qty)}</span>
                  <span className="name">{x.returnReason}</span>
                </div>
              );
            })}
          </div>
          <div className="pages">
            {Array.from({ length: qPages }, (_, k) => (
              <button key={k} type="button" className={`pg${k === qPage ? ' on' : ''}`} onClick={() => { setQPage(k); setAnim(a => ({ ...a, q: true })); playSound('chestPage'); }}>
                {k + 1} · {quarantine.slice(k * per, k * per + per).length}
              </button>
            ))}
            <span className="of">{quarantine.length ? 'menunggu EOD' : 'kosong hari ini'}</span>
          </div>
        </div>
        </>)}

        {/* behind the closed van: this person's geofence requests, what they left at shops on titip, their bounties.
            All three only READ - the company-wide PENDING queue stays at the top of the screen (his salesman waits at a
            shop for it), settling a titip and paying a bounty stay on their own screens. */}
        {open.van === false && !vanOnly && !open.q && (
          <div className="slip van" data-ponder="slip:van">
            {tabKeys('van', [['geo', `Geofence · ${geo.length}`], ['titip', `Titip · ${titip.length}`], ['bounty', `Bounty · ${bounties.length}`]])}
            {sayEl('van')}
            {tabs.van === 'titip' ? (
              <div className="pane" role="tabpanel" aria-labelledby="kpm-slip-titip">
                {titip.length ? (
                  <ul className="rows">
                    {titip.map(s => <li key={s.key}><span>{s.name}<small>{fmt(s.bks)} Bks di toko</small></span><b>{formatRupiah(s.rp)}</b></li>)}
                  </ul>
                ) : <p className="note">{agent.name} tidak punya titipan yang belum lunas.</p>}
              </div>
            ) : tabs.van === 'bounty' ? (
              <div className="pane" role="tabpanel" aria-labelledby="kpm-slip-bounty">
                {bounties.length ? (
                  <ul className="rows">
                    {bounties.map(x => <li key={x.key}><span>{x.label}{x.date && <small>{x.date}</small>}</span><b>{formatRupiah(x.amount)}</b></li>)}
                  </ul>
                ) : <p className="note">{agent.name} tidak punya bounty.</p>}
              </div>
            ) : (
              <div className="pane" role="tabpanel" aria-labelledby="kpm-slip-geo">
                {geo.length ? (
                  <ul className="rows">
                    {geo.map(b => (
                      <li key={b.id}><span>{b.storeName}<small>{b.timestamp ? new Date(b.timestamp).toLocaleString('id-ID') : '—'} · {b.distance ?? '—'} m</small></span>
                        <b className={`st ${b.status}`}>{BYPASS_WORD[b.status] || b.status}</b></li>
                    ))}
                  </ul>
                ) : <p className="note">Belum ada permintaan geofence dari {agent.name}.</p>}
              </div>
            )}
          </div>
        )}

      </section>
        {canEdit && !vanOnly && (
          <aside className="man" aria-label="Muatan hari ini" data-ponder="man">
            <div className="manHead"><p className="lbl">Muatan · {agent.name}</p>
              <span className="tally">{!lines.length ? '0 Bks' : `${plus ? '+' + fmt(plus) : ''}${plus && minus ? ' / ' : ''}${minus ? '−' + fmt(minus) : ''} Bks`}</span></div>
            {!lines.length && <p className="empty">Muatan masih kosong.</p>}
            <ol className="lines">
              {lines.map((l, i) => {
                const p = P[l.id], b = lineBks(l, p), have = vanOf[l.id] || 0;
                const sub = l.dir > 0 ? `ke van · gudang tinggal ${fmt(stockOf(l.id) - b)} Bks` : `kembali ke gudang · van tinggal ${fmt(have - b)} Bks`;
                return (
                  <li key={l.id} className={`${l.dir < 0 ? 'back' : ''}${l.reason ? ' failed' : ''}${busy && i <= doneUpTo ? ' done' : ''}`}>
                    <button type="button" className="ln" data-edit={l.id} aria-label={`Ubah jumlah ${p?.name || l.id}`} disabled={busy}
                      onClick={() => openSheet({ mode: 'edit', id: l.id, cell: cells.indexOf(l.id) })}>
                      <span className="mc"><Cube p={p} /></span>
                      <span className="nm">{p?.name || l.id}<small>{sub}</small>{l.reason ? <small className="why">Gagal: {l.reason}</small> : null}</span>
                      <span className="q">{fmt(l.qty)} {l.unit}<b>= {l.dir > 0 ? '+' : '−'}{fmt(b)} Bks</b></span>
                    </button>
                    <button type="button" className="trash" aria-label={`Keluarkan ${p?.name || l.id} dari muatan`} disabled={busy} onClick={() => removeLine(l.id)}>×</button>
                  </li>
                );
              })}
            </ol>
            <button className="go" type="button" data-ponder="go" disabled={!lines.length || busy} onClick={load}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 9.38a1 1 0 0 0-.78-.38H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
              <span>{busy ? `Memuat ${Math.min(doneUpTo + 2, lines.length)} dari ${lines.length}…` : lines.length ? `Muat van · ${goParts.join(', ')}` : 'Muat van'}</span>
            </button>
            <p className="report" role="status" aria-live="polite">
              {report && <>{report.landed ? <b>✓ Van {agent.name} tercatat</b> : <b>Belum tercatat</b>} · {report.parts.join(' · ')}</>}
            </p>
            {report?.docs.map(d => (
              <div key={d.no} className="sj">
                <p className="sjHead"><b>{d.title}</b><span>{d.no}</span></p>
                <p className="sjSub">{d.sub}</p>
                <ol>{d.rows.map(x => <li key={x.id}>{x.name} <span>— {fmt(x.qty)} {x.unit}{x.unit !== 'Bks' ? ` (${fmt(x.bks)} Bks)` : ''}</span></li>)}</ol>
                <p className="sjTot"><span>Total</span><span>{fmt(d.total)} Bks · {d.rows.length} barang</span></p>
              </div>
            ))}
          </aside>
        )}
      </div>

      {sh && createPortal(
        <>
          <div className="kpm-bay-scrim" onClick={cancel} />
          <div className="kpm-bay-sheet" ref={refs.sheet} role="dialog" aria-modal="true" aria-labelledby="kpm-bay-sh-lbl" onKeyDown={sheetKey}>
            <div className="shHead">
              <span className="mc"><Cube p={sh.p} /></span>
              <div>
                <p className="shName">{sh.p.name}</p>
                <p className="shSub">{sh.s.dir > 0 ? `Gudang ${warehouse} · stok ${fmt(stockOf(sh.s.id))} Bks` : `Van ${agent.name} · berisi ${fmt(vanOf[sh.s.id] || 0)} Bks`}
                  {sh.s.mode === 'add' && lines.some(l => l.id === sh.s.id) ? ` · ${signed(net(sh.s.id))} di muatan` : ''}</p>
              </div>
            </div>
            <label className="lbl" id="kpm-bay-sh-lbl" htmlFor="kpm-bay-qty">
              {sh.s.mode === 'edit' ? 'Ubah jumlah di muatan' : sh.s.dir > 0 ? 'Berapa yang dimuat ke van?' : 'Berapa yang dikembalikan ke gudang?'}
            </label>
            <div className="qtyRow">
              <input id="kpm-bay-qty" ref={refs.qty} className="qty" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="0"
                aria-describedby="kpm-bay-sh-msg" value={sh.s.raw} onChange={(e) => { const v = e.target.value; setSheet(s => ({ ...s, raw: v })); }} />
              <span className={`eq${sh.c.err ? ' err' : ''}`}>{sh.c.n > 0 ? `= ${fmt(sh.c.bks)} Bks` : '= — Bks'}</span>
            </div>
            <div className="units" role="group" aria-label="Satuan">
              {UNITS.map(u => (
                <button key={u} type="button" className="key" aria-pressed={sh.s.unit === u} onClick={() => { setSheet(s => ({ ...s, unit: u })); refs.qty.current?.focus(); }}>
                  {u}<small>= {fmt(convertToBks(1, u, sh.p))} bks</small>
                </button>
              ))}
            </div>
            <button type="button" className="key all" disabled={sh.c.cap <= 0} onClick={takeAll}>
              {sh.s.mode === 'edit' ? 'Semua' : sh.s.dir > 0 ? 'Ambil semua' : 'Kembalikan semua'} · {fmt(Math.max(0, sh.c.cap))} Bks
            </button>
            <p className={`msg${sh.c.err ? ' err' : ''}`} id="kpm-bay-sh-msg" aria-live="polite">{sh.c.msg}</p>
            <div className="shKeys">
              <button type="button" className="key" onClick={cancel}>Batal</button>
              <button type="button" className="key ok" disabled={!sh.c.ok} onClick={confirm}>
                {sh.c.ok ? `${sh.s.mode === 'edit' ? 'Simpan' : sh.s.dir > 0 ? 'Masukkan' : 'Kembalikan'} ${fmt(sh.c.bks)} Bks`
                  : sh.s.mode === 'edit' ? 'Simpan' : sh.s.dir > 0 ? 'Masukkan ke van' : 'Kembalikan ke gudang'}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
