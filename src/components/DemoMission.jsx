/* THE DEMO'S MISSION LINE AND THE CAPYBARA WHO EXPLAINS IT - the demo build only (DemoBar renders it).
   His picks: one line under the DEMO bar (B, 2026-10-24 *"b is easier to see"*), a PETUNJUK key that works *"like in
   some puzzle game"* with a square around what to press and the rest blurred, all in Indonesian; and from 2026-10-25 the
   capybara's RPG dialogue behind that key: *"simple image and textbox and blur everything behind it dont need any moving
   animation, just snap image between conversation"*. He speaks as "saya" to "Anda", never aku / kamu (his 2026-10-25 call).
   Same day: *"im expecting a greeting from the capybara when entering the demo app ... hide the mission and let the
   dialogue starts first"* - so he greets once per page load (a SWITCH reloads it) and the line waits until he is done.
   A step ticks only when its REAL write was saved, and only when it is the live step: Restock Vault MASUK / KIRIM, the
   van-loading bay's load, the sales terminal's MAKE DEAL (a sale, then a retur with a damaged pack), the EOD sent and
   the EOD approved (App.jsx), and Stock Opname's Submit send 'kpm-mission' after their commit (behind IS_DEMO - the
   real build compiles the send out). Progress lives in this browser, so a SWITCH keeps it and the nightly reset
   (00:05 WIB) starts it again. */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lightbulb } from 'lucide-react';
import { notify } from './Toast.jsx';
import { STEPS, GUIDE, missionDay, liveStep, liveBeat } from '../config/demoMission.js';
import talk from '../assets/capy-talk/e-talk.webp';
import happy from '../assets/capy-talk/e-happy.webp';
import shock from '../assets/capy-talk/e-shock.webp';
import think from '../assets/capy-talk/e-think.webp';
import sad from '../assets/capy-talk/e-sad.webp';

/* the six faces were remade in Dreamina 2026-10-25 (same body in each, only the face changes); annoyed has no line yet */
const FACE = { talk, happy, shock, think, sad };
const KEY = 'kpm-demo-mission';
const PAD = 6;
const LAST = STEPS.length;

/* once per page load: a remount inside the same load (the vault locked and opened again) does not greet twice */
let greeted = false;
/* the guide outlives the vault gate: the bar drops the mission while the gate is up (DemoBar inside=false), and the
   remount used to come back with the guide off (demo walk #1) */
let guiding = false;

/* storage can be blocked (a private window): then the line forgets on reload, nothing breaks */
const load = () => {
    try {
        const s = JSON.parse(localStorage.getItem(KEY));
        if (s && s.day === missionDay(Date.now())) return s.done || {};
    } catch { /* empty or blocked */ }
    return {};
};
const save = (done) => {
    try { localStorage.setItem(KEY, JSON.stringify({ day: missionDay(Date.now()), done })); } catch { /* blocked */ }
};

/* what he says on each live step: first what the step before it left behind, then where to go */
const BEFORE = {
    2: 'Hasil produksi Anda sudah tercatat',
    3: 'Barang sudah berangkat',
    4: 'Tas Dika sudah terisi',
    5: 'Penjualan sudah tercatat',
    6: 'Retur tercatat',
    7: 'Dika sudah menutup harinya',
    8: 'Mantap',
};
const GO = {
    1: [{ face: 'think', text: 'Langkah pertama: buka Restock Vault, tekan MASUK, pilih Asal: Produksi Pusat dan Tujuan: Gudang Pusat (Master Vault), isi barangnya, lalu simpan surat jalannya.' }],
    2: [{ face: 'think', text: 'Sekarang barang itu perlu dikirim ke gudang wilayah lewat surat jalan.' },
        { face: 'talk', text: 'Di Restock Vault, tekan KIRIM, pilih gudang tujuan dan jumlahnya, lalu kirim.' }],
    3: [{ face: 'think', text: 'Buka Fleet & Canvas, pilih DIKA SAPUTRA, lalu muat barang dari gudang ke tasnya.' }],
    4: [{ face: 'think', text: 'Sekarang saatnya berjualan. Buka Sales Terminal, pilih toko, isi keranjang, ambil foto serah terima, lalu tekan SIMPAN TRANSAKSI.' }],
    5: [{ face: 'think', text: 'Ada toko yang mengembalikan barang rusak. Barang itu tidak boleh dijual lagi, jadi masuk karantina di tas.' },
        { face: 'talk', text: 'Di Sales Terminal, tekan RETUR, pilih tokonya, tandai barangnya Damaged dan pilih alasannya, ambil foto, lalu proses.' }],
    6: [{ face: 'think', text: 'Sore hari, Dika menutup harinya: hitung uang dan sisa barang di tas.' },
        { face: 'talk', text: 'Buka EOD, isi hitungannya, lalu segel dan kirim laporannya ke Owner.' }],
    7: [{ face: 'think', text: 'Saat Owner menyetujui EOD, sisa barang kembali ke Master Vault dan barang rusak masuk karantina Master Vault.' },
        { face: 'talk', text: 'Buka EOD, cari laporan Dika hari ini, lalu setujui semua bagiannya.' }],
    8: [{ face: 'think', text: 'Terakhir, hitung stok Master Vault. Buka Stock Opname, tekan New Count, isi jumlah fisiknya, lalu tekan Submit to HQ.' }],
};

/* the capybara's lines for the live step; `mine` = this login is the one who does it */
function linesFor(n, done, mine, doer) {
    if (!n) return [{ face: 'happy', text: `Mantap! ${STEPS[LAST - 1].done(done[LAST])}. Satu putaran barang selesai, terima kasih sudah mencoba.` }];
    const was = done[n - 1] && { face: 'happy', text: `${BEFORE[n]}: ${STEPS[n - 2].done(done[n - 1])}.` };
    const go = mine ? GO[n] : [
        { face: 'shock', text: `Eits! Langkah ${n} dikerjakan oleh ${doer.role}, bukan oleh akun ini.` },
        { face: 'talk', text: `Silakan tekan SWITCH di pojok atas dan masuk sebagai ${doer.role}, ${doer.name}.` },
    ];
    const lines = [was, ...go].filter(Boolean);
    lines[lines.length - 1] = { ...lines[lines.length - 1], choices: true };
    return lines;
}

/* the greeting on the way in: the whole round the first time today, a hello by name after a SWITCH */
const first = (name) => String(name || '').split(' ')[0].toLowerCase().replace(/^./, (c) => c.toUpperCase());
function greet(n, done, mine, doer, me) {
    const hello = !Object.keys(done).length ? [
        { face: 'happy', text: 'Halo, selamat datang di DSM! Saya Agent Capybara, pemandu Anda di demo ini.' },
        { face: 'talk', text: `Kita akan menjalankan satu putaran barang dalam ${LAST} langkah: dari pabrik ke Master Vault, ke gudang wilayah, ke tas salesman, ke toko, lalu sisa barang dan barang rusak kembali ke gudang dan stoknya dihitung.` },
    ] : [{ face: 'happy', text: me ? `Halo, ${first(me.name)}! Anda masuk sebagai ${me.role}.` : 'Halo, selamat datang kembali!' }];
    return [...hello, ...linesFor(n, done, mine, doer)];
}

/* the dialogue: one face that snaps per line, a text box, everything behind it blurred - no animation (his words) */
function CapyTalk({ lines, onShow, onClose }) {
    const [i, setI] = useState(0);
    const L = lines[Math.min(i, lines.length - 1)];
    const last = i >= lines.length - 1;
    const next = () => (last ? onClose() : setI(i + 1));
    useEffect(() => {
        /* the answers carry the numbers 1 and 2, so the keys pick them too */
        const k = (e) => {
            if (e.key === 'Escape') onClose();
            else if (L.choices && e.key === '1') onShow();
            else if (L.choices && e.key === '2') onClose();
        };
        window.addEventListener('keydown', k);
        return () => window.removeEventListener('keydown', k);
    }, [onClose, onShow, L.choices]);
    /* every face of the scene is in the page from the first line, so a snap never waits for a download */
    const faces = [...new Set(lines.map((l) => l.face))];
    return (
        <>
            <div className="kpm-ct-veil hide-on-print" onClick={L.choices ? undefined : next} />
            <div className="kpm-ct hide-on-print" role="dialog" aria-label="Agent Capybara">
                {faces.map((f) => <img key={f} className="face" src={FACE[f]} alt="" hidden={f !== L.face} />)}
                <div className="box" onClick={L.choices ? undefined : next}>
                    <span className="name"><b>AGENT CAPYBARA</b></span>
                    <p>{L.text}</p>
                    {!L.choices && <button type="button" className="next">{last ? 'TUTUP' : 'LANJUT'} ▼</button>}
                </div>
                {L.choices && (
                    <div className="choices" role="group" aria-label="Pilih jawaban">
                        <span className="ask">PILIH JAWABAN</span>
                        <button type="button" onClick={onShow}><b>1</b>Pandu saya langkah demi langkah<i>▶</i></button>
                        <button type="button" onClick={onClose}><b>2</b>Saya coba sendiri<i>▶</i></button>
                    </div>
                )}
            </div>
        </>
    );
}

/* THE GUIDE (his pick B, 2026-10-25): the step's beats (GUIDE in demoMission.js) walk the real screen - a square round
   what to press, four dim panels around it (blurred; Lite Mode keeps only the dim) that let every press through, and a
   Ponder-style box beside the square with the step, a notch per beat and one sentence. No timer and no buttons but the
   close: it reads the page every 300 ms and after every press, so the square moves on the moment the visitor does the
   thing, goes back if they leave, and skips a beat the form already had filled in. */
const qs = (s) => { try { return document.querySelector(s); } catch { return null; } };
const shows = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < window.innerWidth && r.top < window.innerHeight;
};
/* the live beat, and which of its targets is on screen (the menu item, or the phone's menu key while the menu is shut) */
function aim(beats) {
    const i = liveBeat(beats, (s) => !!qs(s));
    const at = [].concat(beats[i].at), say = [].concat(beats[i].say);
    /* a screen can hold one control twice (the terminal's phone and desk layouts): the copy on screen wins */
    const els = at.map((s) => { let all = []; try { all = [...document.querySelectorAll(s)]; } catch { /* bad selector */ } return all.find(shows) || all[0] || null; });
    let k = els.findIndex((el) => el && shows(el));
    if (k < 0) k = els.findIndex(Boolean);
    return { i, el: els[k] || null, say: say[Math.max(0, k)] ?? say[0] };
}
/* a picker's list hangs outside its box, so `open` beats take the union of everything inside - the list stays bright */
function boxOf(el, open) {
    const r = el.getBoundingClientRect();
    const b = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    if (open) for (const c of el.querySelectorAll('*')) {
        const q = c.getBoundingClientRect();
        if (!q.width || !q.height) continue;
        b.left = Math.min(b.left, q.left); b.top = Math.min(b.top, q.top); b.right = Math.max(b.right, q.right); b.bottom = Math.max(b.bottom, q.bottom);
    }
    return { left: Math.round(b.left), top: Math.round(b.top), right: Math.round(b.right), bottom: Math.round(b.bottom) };
}
const same = (a, b) => (!a && !b) || (a && b && a.i === b.i && a.say === b.say && a.typing === b.typing && JSON.stringify(a.r) === JSON.stringify(b.r));

function Walk({ n, beats, onClose }) {
    const [v, setV] = useState(null);   // { i, say, r } - r null = the target is not on the page
    const seen = useRef(null);
    useEffect(() => {
        /* read straight away, not on the next frame: a few selectors and one rect, and a frame that never comes (a
           background tab, a pane that does not paint) must not freeze the square on the last beat */
        const look = () => {
            /* the dialog gate is asking now ("Kirim ...?", "Approve ...?"): it is the next press, so step aside */
            if (qs('[role="alertdialog"]')) { setV(null); return; }
            const { i, el, say } = aim(beats);
            /* never scroll while he is typing in a box: the first digit already moves the guide on, and the page jumping
               away under the second digit reads as the app eating the number. The scroll waits until he leaves the box. */
            const typing = document.activeElement?.matches?.('input, textarea, select') && !el?.contains(document.activeElement);
            if (el && el !== seen.current && !typing) { el.scrollIntoView({ block: 'nearest' }); seen.current = el; }
            const next = { i, say, r: el ? boxOf(el, beats[i].open) : null, typing: !!typing };
            setV((p) => (same(p, next) ? p : next));
        };
        look();
        const t = setInterval(look, 300);
        window.addEventListener('resize', look);
        window.addEventListener('scroll', look, true);
        window.addEventListener('pointerup', look, true);
        window.addEventListener('keyup', look, true);
        return () => {
            clearInterval(t);
            window.removeEventListener('resize', look);
            window.removeEventListener('scroll', look, true);
            window.removeEventListener('pointerup', look, true);
            window.removeEventListener('keyup', look, true);
        };
    }, [beats]);
    if (!v) return null;
    const W = Math.min(340, window.innerWidth - 24), H = window.innerHeight;
    const r = v.r && { left: v.r.left - PAD, top: v.r.top - PAD, right: v.r.right + PAD, bottom: v.r.bottom + PAD };
    /* the box goes under the square, else over it, else (a square that fills the screen, or one off screen while he types)
       it docks at the bottom - and an off-screen square dims nothing, so the box he is typing in stays clear */
    const off = r && (r.bottom < 0 || r.top > H);
    const below = r && !off && r.bottom + 150 < H, above = r && !off && !below && r.top > 150;
    const left = r && (below || above) ? Math.max(12, Math.min(r.left, window.innerWidth - W - 12)) : (window.innerWidth - W) / 2;
    const tail = r && (below || above) ? Math.max(14, Math.min(r.left + Math.min((r.right - r.left) / 2, 28) - left, W - 26)) : null;
    const place = below ? { top: r.bottom + 12 } : above ? { top: r.top - 12, transform: 'translateY(-100%)' } : { bottom: 16 };
    /* four boxes, not one box with a hole: a clip-path hole painted nothing once Lite Mode took the blur away (2026-10-24) */
    /* no dim while he types: the box under his fingers must stay sharp even when the square has moved on */
    const panels = r && !off && !v.typing ? [
        { left: 0, top: 0, right: 0, height: Math.max(0, r.top) },
        { left: 0, top: r.bottom, right: 0, bottom: 0 },
        { left: 0, top: r.top, width: Math.max(0, r.left), height: r.bottom - r.top },
        { left: r.right, top: r.top, right: 0, height: r.bottom - r.top },
    ] : [];
    /* on the page root: inside the demo bar its z 400 counted only within the bar, and the phone menu (z 90) covered it */
    return createPortal(
        <>
            {panels.map((p, k) => <div key={k} className="kpm-mx-veil hide-on-print" style={p} />)}
            {r && <div className="kpm-mx-ring hide-on-print" style={{ left: r.left, top: r.top, width: r.right - r.left, height: r.bottom - r.top }} />}
            <div className="kpm-mx-cap hide-on-print" role="status" style={{ left, width: W, ...place }}>
                {tail !== null && <span className={`tail ${below ? 'up' : 'down'}`} style={{ left: tail }} />}
                <div className="head">
                    <b>LANGKAH {n}/{LAST}</b>
                    <span className="notch" aria-label={`bagian ${v.i + 1} dari ${beats.length}`}>
                        {beats.map((_, k) => <i key={k} className={k < v.i ? 'done' : k === v.i ? 'on' : ''} />)}
                    </span>
                    <button type="button" className="x" aria-label="Tutup petunjuk" onClick={onClose}>✕</button>
                </div>
                <p>{v.say}</p>
            </div>
        </>,
        document.body
    );
}

export default function DemoMission({ me, isT1, people }) {
    const [done, setDone] = useState(load);
    const doneRef = useRef(done);
    const n = liveStep(done);
    const step = STEPS[(n || LAST) - 1];
    const doer = people.find((p) => p.tier === step.who) || { role: step.who, name: '' };
    const mine = isT1 || me?.tier === step.who;
    const [greeting, setGreeting] = useState(!greeted);   // the line stays hidden until he has said hello
    const [talking, setTalking] = useState(() => (greeted ? null : greet(n, done, mine, doer, me)));
    const [guide, setGuide] = useState(guiding);    // the step-by-step guide, on until closed or the round is done
    useEffect(() => { guiding = guide; }, [guide]);

    /* the 34 px the shell moves down for the line, only once the line is there */
    useEffect(() => {
        if (greeting) return undefined;
        document.documentElement.classList.add('kpm-mission-on');
        return () => document.documentElement.classList.remove('kpm-mission-on');
    }, [greeting]);

    useEffect(() => {
        const tick = (e) => {
            const { step: s, ...d } = e.detail || {};
            /* only the live step counts: once, and in order - a return before the sale is just work */
            if (!STEPS[s - 1] || liveStep(doneRef.current) !== s) return;
            const next = { ...doneRef.current, [s]: d };
            doneRef.current = next;
            save(next);
            setDone(next);
            notify(`MISI ${s}/${LAST} SELESAI: ${STEPS[s - 1].done(d)}.`);
        };
        window.addEventListener('kpm-mission', tick);
        return () => window.removeEventListener('kpm-mission', tick);
    }, []);

    const endGreeting = () => { greeted = true; setGreeting(false); };
    const endGuide = React.useCallback(() => setGuide(false), []);
    const closeTalk = React.useCallback(() => { setTalking(null); greeted = true; setGreeting(false); }, []);
    const press = () => {
        if (talking || guide) { setTalking(null); setGuide(false); return; }
        setTalking(linesFor(n, done, mine, doer));
    };
    /* "Pandu saya": the guide walks the live step - or points at SWITCH when this login is the wrong person - and stays on
       through the next steps, so the visitor is led from the first press to the last */
    const show = () => { endGreeting(); setTalking(null); setGuide(true); };
    const beats = React.useMemo(() => (mine ? GUIDE[n] : [{ at: '[data-mission="switch"]', say: `Langkah ini untuk ${doer.role}. Tekan SWITCH, lalu pilih ${doer.name || doer.role}.` }]),
        [n, mine, doer.role, doer.name]);

    return (
        <>
            {!greeting && (
                <div className="kpm-mission hide-on-print">
                    <span className="tag"><span className="hidden lg:inline">MISI </span><b>{n ? `${n}/${LAST}` : '✓'}</b></span>
                    <span className="now">{n ? step.todo : `Misi selesai: ${step.done(done[LAST])}`}{n && !mine ? <em> · sebagai {doer.role}</em> : null}</span>
                    {/* the PC line: the live step in words, every other step as its tick or its number */}
                    <ol>
                        {STEPS.map((s) => (
                            <li key={s.n} className={s.n === (n || LAST) ? 'on' : ''} title={done[s.n] ? s.done(done[s.n]) : s.todo}>
                                {done[s.n] ? <span className="tick">✓</span> : <span className="n">{s.n}</span>}
                                {s.n === (n || LAST) && (done[s.n] ? s.done(done[s.n]) : s.todo)}
                                {s.n === n && !mine && <em>· sebagai {doer.role}</em>}
                            </li>
                        ))}
                    </ol>
                    <button type="button" className="hintkey" aria-pressed={!!(talking || guide)} aria-label="Petunjuk" onClick={press}>
                        <Lightbulb size={14} /><span className="hidden lg:inline">PETUNJUK</span>
                    </button>
                </div>
            )}
            {guide && n > 0 && !talking && beats && <Walk key={`${n}-${mine}`} n={n} beats={beats} onClose={endGuide} />}
            {talking && <CapyTalk lines={talking} onShow={show} onClose={closeTalk} />}
        </>
    );
}
