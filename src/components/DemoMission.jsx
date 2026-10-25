/* THE DEMO'S MISSION LINE AND THE CAPYBARA WHO EXPLAINS IT - the demo build only (DemoBar renders it).
   His picks: one line under the DEMO bar (B, 2026-10-24 *"b is easier to see"*), a PETUNJUK key that works *"like in
   some puzzle game"* with a square around what to press and the rest blurred, all in Indonesian; and from 2026-10-25 the
   capybara's RPG dialogue behind that key: *"simple image and textbox and blur everything behind it dont need any moving
   animation, just snap image between conversation"*. He speaks as "saya" to "Anda", never aku / kamu (his 2026-10-25 call).
   Same day: *"im expecting a greeting from the capybara when entering the demo app ... hide the mission and let the
   dialogue starts first"* - so he greets once per page load (a SWITCH reloads it) and the line waits until he is done.
   A step ticks only when its REAL write was saved, and only when it is the live step: Restock Vault MASUK / KIRIM, the
   van-loading bay (the load, later the return), the sales terminal's MAKE DEAL and Stock Opname's Submit send
   'kpm-mission' after their commit (behind IS_DEMO - the real build compiles the send out). Progress lives in this
   browser, so a SWITCH keeps it and the nightly reset (00:05 WIB) starts it again. */
import React, { useEffect, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { notify } from './Toast.jsx';
import { STEPS, missionDay, liveStep } from '../config/demoMission.js';
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

/* where each step is done and what the hint says there */
const BAY_LOST = 'Tasnya tidak ada di layar ini. Buka Fleet & Canvas, pilih DIKA SAPUTRA, lalu tekan PETUNJUK lagi.';
const PLACE = {
    1: { sel: '[data-mission="1"]', tip: 'Tekan MASUK, isi barang dari pabrik, lalu simpan', lost: 'Tombolnya tidak ada di layar ini. Buka Restock Vault dulu, lalu tekan PETUNJUK lagi.' },
    2: { sel: '[data-mission="2"]', tip: 'Tekan KIRIM, pilih gudang tujuan, lalu kirim', lost: 'Tombolnya tidak ada di layar ini. Buka Restock Vault dulu, lalu tekan PETUNJUK lagi.' },
    3: { sel: '[data-mission="3"]', tip: 'Muat barang dari gudang ke tas Dika di sini', lost: BAY_LOST },
    4: { sel: '[data-mission="4"]', tip: 'Pilih toko, isi keranjang, ambil foto serah terima, lalu tekan di sini', lost: 'Tombolnya tidak ada di layar ini. Buka Sales Terminal dulu, lalu tekan PETUNJUK lagi.' },
    5: { sel: '[data-mission="3"]', tip: 'Tarik barang dari van ke gudang, lalu tekan MUAT VAN', lost: BAY_LOST },
    6: { sel: '[data-mission="6"]', tip: 'Tekan New Count, isi jumlah fisiknya, lalu tekan Submit to HQ', lost: 'Tombolnya tidak ada di layar ini. Buka Stock Opname dulu, lalu tekan PETUNJUK lagi.' },
};

/* what he says on each live step: first what the step before it left behind, then where to go */
const BEFORE = {
    2: 'Hasil produksi Anda sudah tercatat',
    3: 'Barang sudah berangkat',
    4: 'Tas Dika sudah terisi',
    5: 'Penjualan sudah tercatat',
    6: 'Sisa barang sudah kembali',
};
const GO = {
    1: [{ face: 'think', text: 'Langkah pertama: buka Restock Vault, tekan MASUK, isi barang dari pabrik, lalu simpan surat jalannya.' }],
    2: [{ face: 'think', text: 'Sekarang barang itu perlu dikirim ke gudang wilayah lewat surat jalan.' },
        { face: 'talk', text: 'Di Restock Vault, tekan KIRIM, pilih gudang tujuan dan jumlahnya, lalu kirim.' }],
    3: [{ face: 'think', text: 'Buka Fleet & Canvas, pilih DIKA SAPUTRA, lalu muat barang dari gudang ke tasnya.' }],
    4: [{ face: 'think', text: 'Sekarang saatnya berjualan. Buka Sales Terminal, pilih toko, isi keranjang, ambil foto serah terima, lalu tekan MAKE DEAL.' }],
    5: [{ face: 'think', text: 'Sore hari, sisa barang di tas Dika kembali ke gudang.' },
        { face: 'talk', text: 'Buka Fleet & Canvas, pilih DIKA SAPUTRA, tarik barang dari van ke gudang, lalu tekan MUAT VAN.' }],
    6: [{ face: 'think', text: 'Terakhir, hitung stok Master Vault. Buka Stock Opname, tekan New Count, isi jumlah fisiknya, lalu tekan Submit to HQ.' }],
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
        { face: 'happy', text: 'Halo, selamat datang di KPM! Saya Kapibara, pemandu Anda di demo ini.' },
        { face: 'talk', text: `Kita akan menjalankan satu putaran barang dalam ${LAST} langkah: dari pabrik ke Master Vault, ke gudang wilayah, ke tas salesman, ke toko, lalu sisanya kembali ke gudang dan stoknya dihitung.` },
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
        const k = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', k);
        return () => window.removeEventListener('keydown', k);
    }, [onClose]);
    /* every face of the scene is in the page from the first line, so a snap never waits for a download */
    const faces = [...new Set(lines.map((l) => l.face))];
    return (
        <>
            <div className="kpm-ct-veil hide-on-print" onClick={L.choices ? undefined : next} />
            <div className="kpm-ct hide-on-print" role="dialog" aria-label="Kapibara">
                {faces.map((f) => <img key={f} className="face" src={FACE[f]} alt="" hidden={f !== L.face} />)}
                <div className="box" onClick={L.choices ? undefined : next}>
                    <span className="name"><b>KAPIBARA</b></span>
                    <p>{L.text}</p>
                    {!L.choices && <button type="button" className="next">{last ? 'TUTUP' : 'LANJUT'} ▼</button>}
                </div>
                {L.choices && (
                    <div className="choices">
                        <button type="button" onClick={onShow}>Tunjukkan tempatnya</button>
                        <button type="button" onClick={onClose}>Saya coba sendiri</button>
                    </div>
                )}
            </div>
        </>
    );
}

/* the hint: a square around what to press, four dim panels around it (blurred; Lite Mode keeps only the dim). A press
   anywhere - the panels let it through - or the target leaving the screen ends it. Anywhere, not only the target, since
   2026-10-25: MAKE DEAL stays disabled until the cart is ready, a disabled button gets no press, and the square sat on. */
function Hint({ sel, tip, onEnd }) {
    const [r, setR] = useState(null);
    useEffect(() => {
        const el = document.querySelector(sel);
        if (!el) { onEnd(); return undefined; }
        el.scrollIntoView({ block: 'nearest' });
        let raf = 0;
        const measure = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => (el.isConnected ? setR(el.getBoundingClientRect()) : onEnd()));
        };
        measure();
        window.addEventListener('pointerdown', onEnd, true);
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('pointerdown', onEnd, true);
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [sel, onEnd]);
    if (!r) return null;
    const x1 = r.left - PAD, y1 = r.top - PAD, x2 = r.right + PAD, y2 = r.bottom + PAD;
    /* four boxes, not one box with a hole: a clip-path hole painted nothing once Lite Mode took the blur away (2026-10-24) */
    const panels = [
        { left: 0, top: 0, right: 0, height: Math.max(0, y1) },
        { left: 0, top: y2, right: 0, bottom: 0 },
        { left: 0, top: y1, width: Math.max(0, x1), height: y2 - y1 },
        { left: x2, top: y1, right: 0, height: y2 - y1 },
    ];
    return (
        <>
            {panels.map((p, i) => <div key={i} className="kpm-mx-veil hide-on-print" style={p} />)}
            <div className="kpm-mx-ring hide-on-print" style={{ left: x1, top: y1, width: x2 - x1, height: y2 - y1 }} />
            <div className="kpm-mx-tip hide-on-print" style={{ left: Math.max(8, Math.min(x1, window.innerWidth - 268)), top: Math.min(y2 + 8, window.innerHeight - 64) }}>{tip}</div>
        </>
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
    const [hint, setHint] = useState(null);         // { sel, tip } while the square is up

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
            setHint(null);
            notify(`MISI ${s}/${LAST} SELESAI: ${STEPS[s - 1].done(d)}.`);
        };
        window.addEventListener('kpm-mission', tick);
        return () => window.removeEventListener('kpm-mission', tick);
    }, []);

    const endGreeting = () => { greeted = true; setGreeting(false); };
    const endHint = React.useCallback(() => setHint(null), []);
    const closeTalk = React.useCallback(() => { setTalking(null); greeted = true; setGreeting(false); }, []);
    const press = () => {
        if (talking || hint) { setTalking(null); setHint(null); return; }
        setTalking(linesFor(n, done, mine, doer));
    };
    /* "Tunjukkan tempatnya": the square goes round the live step's key - or SWITCH when this login is the wrong person */
    const show = () => {
        endGreeting();
        const place = mine ? PLACE[n] : { sel: '[data-mission="switch"]', tip: `Tekan SWITCH, lalu pilih ${doer.role}` };
        if (document.querySelector(place.sel)) { setTalking(null); setHint(place); }
        else setTalking([{ face: 'sad', text: place.lost }]);
    };

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
                    <button type="button" className="hintkey" aria-pressed={!!(talking || hint)} aria-label="Petunjuk" onClick={press}>
                        <Lightbulb size={14} /><span className="hidden lg:inline">PETUNJUK</span>
                    </button>
                </div>
            )}
            {hint && <Hint sel={hint.sel} tip={hint.tip} onEnd={endHint} />}
            {talking && <CapyTalk lines={talking} onShow={show} onClose={closeTalk} />}
        </>
    );
}
