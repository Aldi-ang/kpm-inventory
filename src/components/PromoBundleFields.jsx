import React, { useState } from 'react';
import { confirmAction } from './ConfirmGate';
import { offerResults } from '../utils/vanBay';

/* FACTORY OFFERS on a promo item's edit panel (his 2026-10-26: "some strategy that factory offer is buy 1 bal of our
   product and we will give a t shirt for free"). Each offer is a recipe on settings/general.promoBundles - buy these
   cigarettes, get this item free - and shows in the Sales Terminal under the BUNDLES chip. No price of its own: the
   cigarettes keep the shop's price, the promo is a bonus. One cigarette line per offer here; the stored shape takes more.
   WHERE (his 2026-10-27 "bundle that are special for the regional location"): all areas, or one region from the roster.
   `lockRegion` (TEAM OFFERS, his 2026-10-27 "regional admin can make offers for his own"): WHERE is his region, no choice,
   and `by` names him on the offer so the boss sees who made it.
   `loadResults` (his 2026-10-27 "sales record performance for the offer"): the last 30 days of sales, read only when
   SEE RESULTS is pressed; each offer then shows its sales, shops and rupiah, best first.
   The inputs carry no `name` and Enter does not submit, so the product form around this never saves them. */
export default function PromoBundleFields({ promo, bundles = [], products = [], regions = [], lockRegion = '', by = '', onSave, loadResults = null }) {
    const [results, setResults] = useState(null);   // null = not loaded yet
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [region, setRegion] = useState(lockRegion);   // '' = every area; a region = only salesmen whose location is that region
    const [qty, setQty] = useState(1);
    const [unit, setUnit] = useState('Bal');
    const [productId, setProductId] = useState('');
    const [gives, setGives] = useState(1);
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
    const noEnter = (e) => { if (e.key === 'Enter') e.preventDefault(); };
    const save = async (list) => { setBusy(true); try { return await onSave(list); } finally { setBusy(false); } };

    const add = async () => {
        const p = products.find(x => x.id === productId);
        if (!name.trim() || !p || !(qty > 0) || !(gives > 0)) return; // the button is disabled until all four are set
        const offer = { id: `b_${Date.now()}`, name: name.trim().toUpperCase(), ...(region ? { region } : {}), ...(by ? { by } : {}),
            lines: [{ productId: p.id, name: p.name, qty: Math.floor(qty), unit }],
            gives: [{ productId: promo.id, name: promo.name, qty: Math.floor(gives) }] };
        if (await save([...bundles, offer])) { setName(''); setQty(1); setGives(1); setProductId(''); setRegion(lockRegion); }
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
                <div><span className="text-[var(--duke-ink-8)] block mb-1">THE SHOP BUYS</span>
                    <div className="flex gap-2">
                        <input type="number" inputMode="numeric" min="1" aria-label="How many" value={qty} onKeyDown={noEnter} onChange={(e) => setQty(Math.max(0, parseInt(e.target.value, 10) || 0))} className={`${field} !w-16 text-center tabular-nums`} />
                        <select aria-label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={`${field} !w-24`}>
                            {['Karton', 'Bal', 'Slop', 'Bks'].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select aria-label="Cigarette" value={productId} onChange={(e) => setProductId(e.target.value)} className={`${field} min-w-0`}>
                            <option value="">-- pick --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div></div>
                <div><label htmlFor="bundleGives" className="text-[var(--duke-ink-8)] block mb-1">GETS FREE (PCS OF {String(promo.name || '').toUpperCase()})</label>
                    <input id="bundleGives" type="number" inputMode="numeric" min="1" value={gives} onKeyDown={noEnter} onChange={(e) => setGives(Math.max(0, parseInt(e.target.value, 10) || 0))} className={`${field} !w-24 text-center tabular-nums`} /></div>
                <button type="button" onClick={add} disabled={busy || !name.trim() || !productId || !(qty > 0) || !(gives > 0)}
                    className="w-full min-h-[44px] font-bold border border-[var(--duke-amber-edge)] text-[var(--duke-amber-ink)] hover:bg-[var(--duke-amber-edge)]/10 disabled:opacity-40 disabled:cursor-not-allowed">
                    {busy ? 'SAVING...' : '+ ADD OFFER'}
                </button>
            </div>
        </div>
    );
}
