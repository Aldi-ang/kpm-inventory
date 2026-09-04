import React from 'react';
import { Camera, Keyboard, Lock, PackageCheck, Send, AlertCircle } from 'lucide-react';
import WarehouseDeskNav from '../../components/WarehouseDeskNav.jsx';

/* The regional warehouse stage: the REAL nav strip, plus a demo body for each of its five tabs.

   🔴 THE BODY USED TO BE ONE GREY SENTENCE, AND THAT WAS THE BUG. Aldi, 2026-09-04, watching this
   scene play: *"there is too much words but too little showing"*, then the instruction that fixed
   it — *"make sure that for almost every sentence there is some textbox to highlights and explain
   not just sentence reading"* and *"show the fake content but real panel like u do on other
   tutorial of course, uve done this before bruh why dont u look at other tutorial that u made"*.

   He was right, and the numbers said so: `StockByWarehouseTable` carries 36 `data-ponder` anchors,
   `ProductPerformanceTable` 14, `GoodsReceivedStage` 12 — and this file carried ONE. Ten beats of
   paragraph shared seven keys, five of them in a row pointing at the same tab, because there was
   nothing else on the stage to point at.

   ⚠️ THE OLD COMMENT HERE ARGUED AGAINST EXACTLY THIS, and it was wrong on its own terms. It
   refused a demo body as "a second version of the screen to keep correct" — but `GoodsReceivedStage`
   is hand-built demo markup and always has been, so the rule this file invented for itself was one
   no other stage followed. The real protection is not abstinence, it is the audit: every `focus`
   key a scene names must resolve to a `data-ponder` attribute here, so deleting or renaming one
   fails the build rather than playing a tutorial that points at nothing.

   WHAT IS COPIED AND WHAT IS NOT. The words on the controls are the screen's own —
   "Scan barang sampai", "Qty (Bks)", "Simpan — Jumlah Cocok", "Buku Besar", "Data Induk" — because
   a tutorial that renames a button teaches a button that does not exist. The LAYOUT is schematic on
   purpose: one row where the screen has many, no live data, no handlers. It has to be recognisable,
   not identical. */

const rp = (n) => 'Rp ' + n.toLocaleString('id-ID');

const DEMO_TABS = [
    { id: 'incoming', label: 'Incoming',   count: 2 },
    { id: 'request',  label: 'Request',    count: 0 },
    { id: 'stock',    label: 'Stock',      count: 4 },
    { id: 'book',     label: 'Book',       count: 3 },
    { id: 'data',     label: 'Data Induk', count: 0 },
];

const DEMO_HEAD = {
    incoming: { title: 'Gudang BANDUNG', sub: 'on the way · count on arrival' },
    request:  { title: 'Request from HQ', sub: 'how many · ship to' },
    stock:    { title: 'On the shelf',    sub: 'per product · in Bks' },
    book:     { title: 'Buku Besar',      sub: 'every request, settled and open' },
    data:     { title: 'Data Induk',      sub: 'gudang · pabrik · orang' },
};

/* Shared shells, so five panels do not each invent their own spacing. */
const Card = ({ children, k }) => (
    <div data-ponder={k} className="bg-panel border border-line-2 rounded-xl p-3.5">{children}</div>
);
const Head = ({ children }) => (
    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted mb-2">{children}</div>
);

function Incoming() {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <Head>Sedang dikirim</Head>
                {/* the badge the third beat is about: it counts only what is not finished */}
                <span data-ponder="in:badge"
                      className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-raised border border-line-3 text-accent-ink">
                    2 belum selesai
                </span>
            </div>

            <Card k="in:row">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[13px] font-bold text-ink truncate">Cello Chocolate</div>
                        <div className="font-mono text-[10px] text-ink-muted">KRM-2609 · dari HQ</div>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted shrink-0">
                        Sedang dikirim
                    </span>
                </div>
            </Card>

            <div className="flex flex-wrap gap-2">
                {/* the button the scene names by its real label */}
                <button type="button" data-ponder="in:scan"
                        className="inline-flex items-center gap-2 text-[12px] font-bold px-3.5 py-2.5 rounded-lg bg-raised border border-line-3 text-ink">
                    <Camera size={15} className="text-accent-ink" /> Scan barang sampai
                </button>
                {/* the fallback, which is its own sentence and so its own anchor */}
                <span data-ponder="in:manual"
                      className="inline-flex items-center gap-2 text-[12px] px-3.5 py-2.5 rounded-lg bg-inset border border-line-3 text-ink-muted">
                    <Keyboard size={15} /> Nomor kiriman diketik
                </span>
            </div>

            <Card k="in:count">
                <Head>Panel hitung — terbuka sendiri setelah scan</Head>
                <div className="flex items-center gap-3">
                    <PackageCheck size={16} className="text-accent-ink shrink-0" />
                    <div className="flex-1 min-w-0 text-[12.5px] text-ink truncate">Cello Chocolate</div>
                    <span className="font-mono text-[13px] text-ink px-2.5 py-1 rounded-md bg-inset border border-line-3">
                        900
                    </span>
                    {/* the HQ figure that is deliberately withheld */}
                    <span data-ponder="in:hq"
                          className="font-mono text-[11px] text-ink-dim px-2.5 py-1 rounded-md bg-inset border border-dashed border-line-3">
                        HQ: ditutup
                    </span>
                </div>
            </Card>
        </div>
    );
}

function Request() {
    return (
        <div className="flex flex-col gap-3">
            <Head>Minta stok ke HQ</Head>
            <div className="flex flex-wrap gap-2">
                <span data-ponder="rq:item"
                      className="flex-1 min-w-[150px] text-[12.5px] text-ink bg-inset border border-line-3 rounded-lg px-3 py-2.5">
                    Cello Chocolate
                </span>
                <span data-ponder="rq:qty"
                      className="w-[120px] text-center font-mono text-[12.5px] text-ink-dim italic bg-inset border border-line-3 rounded-lg px-3 py-2.5">
                    Qty (Bks)
                </span>
                <button type="button" data-ponder="rq:add"
                        className="text-[12px] font-bold px-3.5 py-2.5 rounded-lg bg-raised border border-line-3 text-ink">
                    Masukkan
                </button>
            </div>

            <Card k="rq:list">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] text-ink truncate">Cello Chocolate</span>
                    <span className="font-mono text-[12.5px] text-ink">1.200</span>
                </div>
            </Card>

            {/* the address rule — printed, never typed */}
            <div data-ponder="rq:address"
                 className="flex items-center gap-2.5 bg-inset border border-line-3 rounded-lg px-3 py-2.5">
                <Lock size={14} className="text-ink-muted shrink-0" />
                <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Kirim ke</div>
                    <div className="text-[12.5px] text-ink truncate">Gudang BANDUNG — Jl. Soekarno-Hatta 219</div>
                </div>
            </div>

            <button type="button" data-ponder="rq:send"
                    className="inline-flex items-center justify-center gap-2 text-[12px] font-bold px-3.5 py-2.5 rounded-lg bg-raised border border-line-3 text-ink">
                <Send size={15} className="text-accent-ink" /> Kirim permintaan
            </button>
        </div>
    );
}

function Stock() {
    return (
        <div className="flex flex-col gap-3">
            <Head>Isi rak sekarang</Head>
            <Card k="st:card">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[13px] font-bold text-ink truncate">Cello Chocolate</div>
                        <div className="font-mono text-[10px] text-ink-muted">SKU-CC-12</div>
                    </div>
                    <span className="font-mono text-[15px] text-ink shrink-0">4.380</span>
                </div>
                <div className="flex items-center justify-between gap-3 mt-2.5 pt-2.5 border-t border-line-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Kiriman terlama</span>
                    {/* the age figure gets its own sentence, so its own anchor */}
                    <span data-ponder="st:age" className="font-mono text-[12px] text-accent-ink">38 hari</span>
                </div>
            </Card>
        </div>
    );
}

function Book() {
    return (
        <div className="flex flex-col gap-3">
            <Head>Buku Besar</Head>
            <Card k="bk:row">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[12.5px] text-ink truncate">KRM-2607 · Cello Chocolate</div>
                        <div className="font-mono text-[10px] text-ink-muted">Dikirim 900 · Dihitung 880</div>
                    </div>
                    {/* where the evidence of a difference lives */}
                    <span data-ponder="bk:diff"
                          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-md bg-inset border border-line-3 text-accent-ink shrink-0">
                        <AlertCircle size={12} /> Ada Selisih
                    </span>
                </div>
            </Card>
            <Card k="bk:open">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] text-ink truncate">KRM-2609 · masih berjalan</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted shrink-0">Belum selesai</span>
                </div>
            </Card>
        </div>
    );
}

function DataInduk() {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <Head>Pabrik · gudang · orang</Head>
                {/* the permission rule, which is a sentence of its own */}
                <span data-ponder="dt:lock"
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-md bg-inset border border-line-3 text-ink-muted">
                    <Lock size={12} /> Hanya dibaca
                </span>
            </div>
            <Card k="dt:row">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] text-ink truncate">Gudang BANDUNG</span>
                    <span className="font-mono text-[11px] text-ink-muted shrink-0">terdaftar oleh HQ</span>
                </div>
            </Card>
            <Card k="dt:factory">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] text-ink truncate">Pabrik KUDUS</span>
                    <span className="font-mono text-[11px] text-ink-muted shrink-0">{rp(0)} · pengirim</span>
                </div>
            </Card>
        </div>
    );
}

const PANELS = { incoming: Incoming, request: Request, stock: Stock, book: Book, data: DataInduk };

/* 🔴 THE PANEL HAS TO FOLLOW THE BEAT, or half the anchors are not mounted when they are pointed
   at. Only the active tab renders — that is what the real desk does — so a beat about `rq:qty`
   while Incoming is showing would highlight nothing at all, and the integration audit could not
   catch it: that check reads source text, where every key is present, and cannot see conditional
   rendering.

   The overlay already hands each stage its current `step` (`PonderOverlay.jsx:547`), so the tab is
   derived here rather than added to the step schema. A key's prefix names its panel; `desk:` keys
   belong to the nav strip and leave whatever is open alone. */
const TAB_OF_PREFIX = { in: 'incoming', rq: 'request', st: 'stock', bk: 'book', dt: 'data' };
const tabForStep = (step) => {
    const raw = step?.focus;
    const keys = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
    for (const k of keys) {
        if (typeof k !== 'string') continue;
        if (k.startsWith('tab:')) return k.slice(4);
        const t = TAB_OF_PREFIX[k.slice(0, k.indexOf(':'))];
        if (t) return t;
    }
    return null;
};

export default function RegionalWarehouseStage({ step }) {
    /* Clicking a tab in the tutorial moves the tutorial's own desk, so a beat that names a tab can
       be followed by hand as well as watched. The beat wins when it names one. */
    const [tab, setTab] = React.useState('incoming');
    const wanted = tabForStep(step);
    React.useEffect(() => { if (wanted) setTab(wanted); }, [wanted]);
    const Panel = PANELS[tab];
    return (
        <div className="py-5">
            <div className="flex flex-col bg-ground border border-line-2 rounded-2xl overflow-hidden">
                <WarehouseDeskNav
                    title={DEMO_HEAD[tab].title}
                    sub={DEMO_HEAD[tab].sub}
                    tabs={DEMO_TABS}
                    active={tab}
                    onPick={setTab}
                />
                <div className="p-4 sm:p-5">
                    <Panel />
                </div>
            </div>
        </div>
    );
}
