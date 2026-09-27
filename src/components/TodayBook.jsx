/* THE BOOK OF THE DAY - Agent Inventory's Sales and Samples as ONE notebook with two sections, for a regional admin and
   above (his 2026-09-27 "make it 1 book instead with 2 section ... more natural ... open when hover and slide its pages
   like some magic book"). Prototype v11 of https://claude.ai/artifact/V5Z3ZkQZ3fvtXHynn4AnNF, approved; its look lives in
   theme.css "THE BOOK OF THE DAY".

   On the shelf it is a shut 3D notebook with both counts on its label. A press opens it as a REAL book: it flies up
   shut, then the cover swings over on the spine and its inside becomes the left page. ONE FIXED SIZE: six ruled lines a
   page, unused lines stay blank. The ribbons at the top are the two sections; Tutup or Escape shuts the cover and it
   flies back to the shelf. PC: the list on the left page, the tapped entry's lines on the right. Phone: one page; an
   entry turns the page to its lines. Lite Mode / reduced motion: simply open, nothing flies or turns.

   It only READS - today's sales (their lines from saleLines) and samples, the same lists the salesman's screen shows. */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatRupiah, saleLines } from '../utils/helpers';

const ROWS = 6;
const SECTION = { sales: 'Penjualan', samples: 'Sampel' };
const still = () => document.documentElement.classList.contains('lite-mode') ||
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const isWide = () => typeof window !== 'undefined' && window.innerWidth >= 720;   // the CSS's own 719 px line
const hhmm = (ts) => (ts?.seconds ? new Date(ts.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Hari ini');
/* a sample's packs as the salesman's list prints them: whole Bks, the rest in Btg */
const packs = (s) => {
  const bks = Math.floor(s.qty || 0), btg = Math.round(((s.qty || 0) - bks) * (s.sticksPerPack || 16));
  return [bks ? `${bks} Bks` : '', btg ? `${btg} Btg` : ''].filter(Boolean).join(' ') || '0 Bks';
};
const saleTotal = (tx) => tx.total || tx.amountPaid || 0;

export default function TodayBook({ sales = [], samples = [], inventory = [] }) {
  const btn = useRef(null), book = useRef(null), timers = useRef([]);
  /* null = on the shelf; fly -> shut -> open when it opens; closing -> away -> null when it shuts */
  const [phase, setPhase] = useState(null);
  const [fly, setFly] = useState({});
  const [s, setS] = useState({ kind: 'sales', page: 0, sel: 0, view: 'list', dir: 0, n: 0 });
  const [wide, setWide] = useState(isWide);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => {
    const r = () => setWide(isWide());
    window.addEventListener('resize', r);
    return () => { window.removeEventListener('resize', r); stop(); };
  }, []);

  function open() {
    stop();
    /* the flight starts where the shelf book stands: the open book is centred at (50vw, 50vh + 22px) by its CSS */
    const r = btn.current.querySelector('.kpm-nb').getBoundingClientRect();
    setFly({ '--fx': r.left + r.width / 2 - window.innerWidth / 2 + 'px', '--fy': r.top + r.height / 2 - (window.innerHeight / 2 + 22) + 'px' });
    setS({ kind: 'sales', page: 0, sel: 0, view: 'list', dir: 0, n: 0 });
    const calm = still();
    setPhase(calm ? 'open' : 'fly');
    later(() => book.current?.querySelector('.tab2[aria-selected="true"]')?.focus(), 0);
    if (calm) return;
    /* the flight ends on the shut book; only then does the cover open - two steps, so the opening is a transition from
       where the flight left it, never a jump */
    later(() => { setPhase('shut'); requestAnimationFrame(() => requestAnimationFrame(() => setPhase(p => (p === 'shut' ? 'open' : p)))); }, 390);
  }
  /* closing reverses it: the cover shuts, then the book flies back to the shelf */
  function close() {
    if (!phase || phase === 'closing' || phase === 'away') return;
    stop();
    btn.current?.focus();
    if (still()) return setPhase(null);
    setPhase('closing');
    later(() => setPhase('away'), 700);
    later(() => setPhase(null), 980);
  }

  const list = s.kind === 'sales' ? sales : samples;
  const pages = Math.max(1, Math.ceil(list.length / ROWS)), start = s.page * ROWS;
  /* a section switch, a page turn or an entry opened on the phone slides the paper over (a new key replays it) */
  const turn = (patch) => setS(o => ({ ...o, ...patch, n: o.n + 1 }));
  const pick = (k) => {
    if (wide) return setS(o => ({ ...o, sel: k, dir: 0 }));
    turn({ sel: k, view: 'detail', dir: 1 });
    later(() => book.current?.querySelector('.back')?.focus(), 0);
  };

  const head = (x) => (s.kind === 'sales' ? (
    <><span className="who2">{x.customerName || 'Unknown Customer'}<small>{x.paymentType || 'CASH'} · {hhmm(x.timestamp)}</small></span>
      <span className="amt">{formatRupiah(saleTotal(x))}</span></>
  ) : (
    <><span className="who2">{x.reason || 'Unknown Target'}<small>{x.productName} · {hhmm(x.timestamp)}</small></span>
      <span className="amt">-{packs(x)}<span className="owe">Owe {Math.ceil(x.qty || 0)} cukai</span></span></>
  ));
  const sum = s.kind === 'sales' ? list.reduce((a, x) => a + saleTotal(x), 0) : list.reduce((a, x) => a + Math.ceil(x.qty || 0), 0);
  const listPage = (
    <>
      <h3>{SECTION[s.kind]} hari ini<span>{list.length} catatan</span></h3>
      <ul className="rows">
        {list.slice(start, start + ROWS).map((x, i) => (
          <li key={start + i}><button type="button" aria-current={wide && s.sel === start + i ? 'true' : undefined} onClick={() => pick(start + i)}>{head(x)}</button></li>
        ))}
      </ul>
      <div className="foot">
        <div className="tot"><span>{s.kind === 'sales' ? 'Total' : 'Cukai'}</span><span>{s.kind === 'sales' ? formatRupiah(sum) : `${sum} Pcs`}</span></div>
        <div className="turn">
          <button className="arrow" type="button" aria-label="Halaman sebelumnya" disabled={s.page === 0} onClick={() => turn({ page: s.page - 1, sel: (s.page - 1) * ROWS, dir: -1 })}>‹</button>
          <span>{s.page + 1} / {pages}</span>
          <button className="arrow" type="button" aria-label="Halaman berikutnya" disabled={s.page >= pages - 1} onClick={() => turn({ page: s.page + 1, sel: (s.page + 1) * ROWS, dir: 1 })}>›</button>
        </div>
      </div>
    </>
  );
  const x = list[s.sel];
  const lines = x && s.kind === 'sales' ? saleLines(x, inventory) : [];
  const detailPage = x ? (
    <>
      <h3>{s.kind === 'sales' ? x.customerName || 'Unknown Customer' : x.reason || 'Unknown Target'}</h3>
      {s.kind === 'sales' ? (
        <ul className="lines">
          {lines.length ? lines.map((l, i) => (
            <li key={i}><span>{l.name} · {l.qty} {l.unit}{l.tier ? ` · ${l.tier}` : ''}</span><span>{formatRupiah(l.amount)}</span></li>
          )) : <li>Tidak ada barang tercatat di penjualan ini.</li>}
        </ul>
      ) : (
        <div className="detail">
          <span>{x.productName} · {packs(x)}</span>
          <span>Diberikan ke {x.reason || 'Unknown Target'} jam {hhmm(x.timestamp)}</span>
          <span>Cukai yang ditanggung: {Math.ceil(x.qty || 0)} Pcs</span>
        </div>
      )}
      {!wide && <button className="back" type="button" onClick={() => turn({ view: 'list', dir: -1 })}>‹ Kembali ke daftar</button>}
    </>
  ) : (
    <>
      <h3>{list.length ? 'Pilih catatan' : `${SECTION[s.kind]} kosong`}</h3>
      <div className="detail"><span className="empty">{list.length ? 'Ketuk satu catatan di halaman kiri.' : 'Hari ini belum ada catatan di bagian ini.'}</span></div>
    </>
  );
  const left = wide ? listPage : null, right = wide || s.view === 'detail' ? detailPage : listPage;
  const paper = (content, key) => (
    <><div className="board" /><div className="stack" />
      <div className="sheet"><div key={key} className={`page${s.dir ? ' slide' : ''}`} style={{ '--dir': s.dir || 1 }}>{content}</div></div></>
  );
  const cls = { fly: 'kpm-ob shut fly', shut: 'kpm-ob shut', open: 'kpm-ob', closing: 'kpm-ob shut', away: 'kpm-ob shut away' }[phase];

  return (
    <div className="kpm-shelf" aria-label="Catatan hari ini">
      <button ref={btn} className="kpm-nbBtn" type="button" data-ponder="book" aria-haspopup="dialog" aria-expanded={!!phase} onClick={open}>
        <span className="stage"><span className="kpm-nb">
          <i className="back" /><i className="spine" /><i className="block" /><i className="edge" /><i className="head" />
          <i className="leaf" /><i className="leaf" /><i className="leaf" />
          <i className="rib a" /><i className="rib b" />
          <i className="cover"><span className="out" /><span className="in" /></i>
        </span></span>
        <span className="lbl">Catatan hari ini<b>{`${sales.length} penjualan · ${samples.length} sampel`}</b></span>
      </button>
      {phase && createPortal(
        <>
          <div className={`kpm-ob-scrim${phase === 'closing' || phase === 'away' ? ' fade' : ''}`} onClick={close} />
          <div ref={book} className={cls} style={fly} role="dialog" aria-modal="true" aria-label="Catatan hari ini"
            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } }}>
            <div className="book2">
              <div className="half">
                {paper(right, 'r' + s.n)}
                <div className="tail" /><div className="fore" />
                <div className="top">
                  <div className="tabs2" role="tablist" aria-label="Bagian">
                    {['sales', 'samples'].map(k => (
                      <button key={k} className="tab2" type="button" role="tab" data-sec={k} aria-selected={s.kind === k}
                        onClick={() => { if (s.kind !== k) turn({ kind: k, page: 0, sel: 0, view: 'list', dir: k === 'samples' ? 1 : -1 }); }}>
                        {SECTION[k]} · {(k === 'sales' ? sales : samples).length}
                      </button>
                    ))}
                  </div>
                  <button className="close" type="button" onClick={close}>Tutup</button>
                </div>
              </div>
              <div className="flap"><div className="face out" /><div className="face in">{paper(left, 'l' + s.n)}</div></div>
              <div className="tail l" /><div className="fore l" />
            </div>
          </div>
        </>, document.body)}
    </div>
  );
}
