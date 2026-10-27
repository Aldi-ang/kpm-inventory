import React, { useState } from 'react';
import { confirmAction } from './ConfirmGate';
import { offerResults } from '../utils/vanBay';

/* FACTORY OFFERS on a promo item's edit panel (his 2026-10-26: "some strategy that factory offer is buy 1 bal of our
   product and we will give a t shirt for free"). Each offer is a recipe on settings/general.promoBundles - buy these
   cigarettes, get this item free - and shows in the Sales Terminal under the BUNDLES chip. The cigarettes keep the
   shop's price and the promo is a bonus, unless a bundle price is set (below).
   WHERE (his 2026-10-27 "bundle that are special for the regional location"): all areas, or one region from the roster.
   `lockRegion` (TEAM OFFERS, his 2026-10-27 "regional admin can make offers for his own"): WHERE is his region, no choice,
   and `by` names him on the offer so the boss sees who made it.
   `loadResults` (his 2026-10-27 "sales record performance for the offer"): the last 30 days of sales, read only when
   SEE RESULTS is pressed; each offer then shows its sales, shops and rupiah, best first.
   MORE THAN ONE OF EACH (his 2026-10-27 "add option to add another product or promotional goods for the bundle not just
   for 1 on 1 goods"): up to 4 cigarettes and every other promo item; this one is always the first gift, so the offer
   lists under it. `canSetPrice` (his "a power on setting the price for the bundle ... tier 3 and above as default, put
   this on the matrix", key set_bundle_price): an optional price for the whole bundle; empty = each shop's normal price.
   The inputs carry no `name` and Enter does not submit, so the product form around this never saves them. */
const NEW_LINE = { productId: '', qty: 1, unit: 'Bal' };

export default function PromoBundleFields({ promo, bundles = [], products = [], promoItems = [], regions = [], lockRegion = '', by = '', canSetPrice = false, onSave, loadResults = null }) {
    const [results, setResults] = useState(null);   // null = not loaded yet
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [region, setRegion] = useState(lockRegion);   // '' = every area; a region = only salesmen whose location is that region
    const [lines, setLines] = useState([NEW_LINE]);     // the cigarettes the shop buys
    const [gives, setGives] = useState(1);              // pcs of THIS promo item
    const [moreGives, setMoreGives] = useState([]);     // other promo items given too: [{ productId, qty }]
    const [price, setPrice] = useState('');
    const [busy, setBusy] = useState(false);
    const mine = bundles.filter(b => (b.gives || []).some(g => g.productId === promo.id));
    const shown = results ? [...mine].sort((a, b) => (results[b.id]?.rp || 0) - (results[a.id]?.rp || 0)) : mine;
    const rp = (n) => `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(n))}`;
    const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    const seeResults = async () => {
        setLoading(true);
        try { setResults(offerResults(await loadResults())); } finally { setLoading(false); }
    };
    const field = 'w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-veil-edge-2)] text-[var(--duke-ink-hi)] focus:border-[var(--duke-amber-edge)] outline-none';
    const rowBtn = 'w-full min-h-[40px] lg:min-h-0 lg:py-1.5 border border-dashed border-[var(--duke-veil-edge-2)] text-[var(--duke-ink-8)] font-bold hover:text-[var(--duke-ink-hi)]';
    const dropBtn = 'shrink-0 w-10 border border-[var(--duke-veil-edge-2)] text-[var(--duke-ink-8)] hover:text-red-400';
    const noEnter = (e) => { if (e.key === 'Enter') e.preventDefault(); };
    const whole = (v) => Math.max(0, parseInt(v, 10) || 0);
    const setLine = (i, k, v) => setLines(ls => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
    const setGive = (i, k, v) => setMoreGives(gs => gs.map((g, j) => (j === i ? { ...g, [k]: v } : g)));
    const save = async (list) => { setBusy(true); try { return await onSave(list); } finally { setBusy(false); } };

    const buys = lines.map(l => ({ ...l, p: products.find(x => x.id === l.productId) })).filter(l => l.p && l.qty > 0);
    const extras = moreGives.map(g => ({ ...g, p: promoItems.find(x => x.id === g.productId) })).filter(g => g.p && g.qty > 0);
    const ready = name.trim() && buys.length > 0 && gives > 0;
    const otherPromos = promoItems.filter(p => p.id !== promo.id);

    const add = async () => {
        if (!ready) return;   // the button is disabled until a name, one cigarette and a gift count are set
        const offer = { id: `b_${Date.now()}`, name: name.trim().toUpperCase(), ...(region ? { region } : {}), ...(by ? { by } : {}),
            ...(canSetPrice && Number(price) > 0 ? { price: Math.round(Number(price)) } : {}),
            lines: buys.map(l => ({ productId: l.p.id, name: l.p.name, qty: Math.floor(l.qty), unit: l.unit })),
            gives: [{ productId: promo.id, name: promo.name, qty: Math.floor(gives) }, ...extras.map(g => ({ productId: g.p.id, name: g.p.name, qty: Math.floor(g.qty) }))] };
        if (await save([...bundles, offer])) { setName(''); setLines([NEW_LINE]); setGives(1); setMoreGives([]); setPrice(''); setRegion(lockRegion); }
    };
    const remove = async (b) => {
        if (!(await confirmAction(`Remove the offer "${b.name}"? Salesmen stop seeing it in BUNDLES.`))) return;
        await save(bundles.filter(x => x.id !== b.id));
    };

    return (
        <div className="space-y-2" data-guide="promo-bundles">
            <p className="text-[var(--shell-orange-ink)] font-bold">FACTORY OFFERS · GIVE THIS FREE</p>
            {mine.length === 0 && <p className="text-[var(--duke-ink-8)] leading-relaxed">No offer yet. Example: TAWANG BUNDLE = buy 1 Bal TAWANG, get 1 {promo.name} free.</p>}
            {loadResults && mine.length > 0 && (
                <button type="button" onClick={seeResults} disabled={loading} className="w-full min-h-[44px] lg:min-h-0 lg:py-1.5 font-bold border border-[var(--duke-veil-edge-2)] text-[var(--duke-ink-hi)] hover:bg-[var(--duke-veil)] disabled:opacity-50">
                    {loading ? 'LOADING SALES...' : results ? 'REFRESH RESULTS · LAST 30 DAYS' : 'SEE RESULTS · LAST 30 DAYS'}
                </button>)}
            {shown.map((b, i) => (
                <div key={b.id} className="flex items-start gap-2 p-2 border border-[var(--duke-veil-edge-2)] bg-[var(--duke-veil)]">
                    <span className="flex-1 min-w-0 leading-snug text-[var(--duke-ink-hi)]">
                        <span className="block font-bold">{b.name} <span className="font-normal text-[var(--duke-ink-8)]">· {b.region ? `${b.region} only` : 'all areas'}{b.by ? ` · by ${b.by}` : ''}</span></span>
                        <span className="text-[var(--duke-ink-8)]">Buy {(b.lines || []).map(l => `${l.qty} ${l.unit} ${products.find(p => p.id === l.productId)?.name || l.name}`).join(' + ')} · get {(b.gives || []).map(g => `${g.qty} pcs ${g.name}`).join(' + ')} free</span>
                        {Number(b.price) > 0 && <span className="block font-bold text-[var(--duke-ink-hi)] tabular-nums">Bundle price {rp(b.price)}</span>}
                        {results && <span className="block mt-1 font-bold text-[var(--shell-orange-ink)] tabular-nums" data-guide="offer-result">{results[b.id]
                            ? `${i === 0 ? 'BEST · ' : ''}${count(results[b.id].sales, 'sale')} · ${count(results[b.id].shops, 'shop')} · ${rp(results[b.id].rp)}`
                            : 'Not used in the last 30 days'}</span>}
                    </span>
                    <button type="button" disabled={busy} onClick={() => remove(b)} className="shrink-0 px-3 min-h-[44px] lg:min-h-0 lg:py-1 border border-red-500 text-red-400 font-bold hover:bg-red-500/10 disabled:opacity-50">REMOVE</button>
                </div>
            ))}
            <div className="space-y-2 p-2 border border-dashed border-[var(--duke-veil-edge-2)]">
                <div><label htmlFor="bundleName" className="text-[var(--duke-ink-8)] block mb-1">OFFER NAME</label>
                    <input id="bundleName" value={name} maxLength={30} onKeyDown={noEnter} onChange={(e) => setName(e.target.value)} placeholder="TAWANG BUNDLE" className={`${field} uppercase`} /></div>
                {lockRegion ? <p className="text-[var(--duke-ink-8)]">WHERE: <span className="text-[var(--duke-ink-hi)] font-bold">{lockRegion} only</span> - your team</p> : (
                <div><label htmlFor="bundleRegion" className="text-[var(--duke-ink-8)] block mb-1">WHERE</label>
                    <select id="bundleRegion" value={region} onChange={(e) => setRegion(e.target.value)} className={field}>
                        <option value="">All areas (every salesman)</option>
                        {regions.map(r => <option key={r} value={r}>{r} only</option>)}
                    </select></div>)}
                <div className="space-y-2"><span className="text-[var(--duke-ink-8)] block">THE SHOP BUYS</span>
                    {lines.map((l, i) => (
                        <div key={i} className="flex gap-2" data-guide="bundle-buy-row">
                            <input type="number" inputMode="numeric" min="1" aria-label="How many" value={l.qty} onKeyDown={noEnter} onChange={(e) => setLine(i, 'qty', whole(e.target.value))} className={`${field} !w-16 text-center tabular-nums`} />
                            <select aria-label="Unit" value={l.unit} onChange={(e) => setLine(i, 'unit', e.target.value)} className={`${field} !w-24`}>
                                {['Karton', 'Bal', 'Slop', 'Bks'].map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            <select aria-label="Cigarette" value={l.productId} onChange={(e) => setLine(i, 'productId', e.target.value)} className={`${field} min-w-0`}>
                                <option value="">-- pick --</option>
                                {products.map(p => <option key={p.id} value={p.id} disabled={lines.some((x, j) => j !== i && x.productId === p.id)}>{p.name}</option>)}
                            </select>
                            {lines.length > 1 && <button type="button" aria-label="Remove this cigarette" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className={dropBtn}>✕</button>}
                        </div>
                    ))}
                    {lines.length < 4 && <button type="button" onClick={() => setLines(ls => [...ls, NEW_LINE])} className={rowBtn}>+ ANOTHER CIGARETTE</button>}
                </div>
                <div className="space-y-2"><span className="text-[var(--duke-ink-8)] block">GETS FREE</span>
                    <div className="flex gap-2 items-center">
                        <input id="bundleGives" type="number" inputMode="numeric" min="1" aria-label={`Pcs of ${promo.name}`} value={gives} onKeyDown={noEnter} onChange={(e) => setGives(whole(e.target.value))} className={`${field} !w-16 text-center tabular-nums`} />
                        <span className="flex-1 min-w-0 p-2 border border-[var(--duke-veil-edge-2)] text-[var(--duke-ink-hi)] truncate">pcs {promo.name}</span>
                    </div>
                    {moreGives.map((g, i) => (
                        <div key={i} className="flex gap-2" data-guide="bundle-give-row">
                            <input type="number" inputMode="numeric" min="1" aria-label="How many pcs" value={g.qty} onKeyDown={noEnter} onChange={(e) => setGive(i, 'qty', whole(e.target.value))} className={`${field} !w-16 text-center tabular-nums`} />
                            <select aria-label="Promo goods" value={g.productId} onChange={(e) => setGive(i, 'productId', e.target.value)} className={`${field} min-w-0`}>
                                <option value="">-- pick --</option>
                                {otherPromos.map(p => <option key={p.id} value={p.id} disabled={moreGives.some((x, j) => j !== i && x.productId === p.id)}>{p.name}</option>)}
                            </select>
                            <button type="button" aria-label="Remove this promo item" onClick={() => setMoreGives(gs => gs.filter((_, j) => j !== i))} className={dropBtn}>✕</button>
                        </div>
                    ))}
                    {moreGives.length < otherPromos.length && <button type="button" onClick={() => setMoreGives(gs => [...gs, { productId: '', qty: 1 }])} className={rowBtn}>+ ANOTHER PROMO ITEM</button>}
                </div>
                {canSetPrice && (
                    <div><label htmlFor="bundlePrice" className="text-[var(--duke-ink-8)] block mb-1">BUNDLE PRICE (RP) · EMPTY = EACH SHOP'S NORMAL PRICE</label>
                        <input id="bundlePrice" type="number" inputMode="numeric" min="0" placeholder="e.g. 950000" value={price} onKeyDown={noEnter} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} className={`${field} tabular-nums`} /></div>)}
                <button type="button" onClick={add} disabled={busy || !ready}
                    className="w-full min-h-[44px] font-bold border border-[var(--duke-amber-edge)] text-[var(--duke-amber-ink)] hover:bg-[var(--duke-amber-edge)]/10 disabled:opacity-40 disabled:cursor-not-allowed">
                    {busy ? 'SAVING...' : '+ ADD OFFER'}
                </button>
            </div>
        </div>
    );
}
