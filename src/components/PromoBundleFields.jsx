import React, { useState } from 'react';
import { confirmAction } from './ConfirmGate';
import { bundleTiers, bundleRuleWords } from '../utils/vanBay';

/* FACTORY OFFERS on a promo item's edit panel (his 2026-10-26: "some strategy that factory offer is buy 1 bal of our
   product and we will give a t shirt for free"). Each offer is a recipe on settings/general.promoBundles - buy these
   cigarettes, get this item free - and shows in the Sales Terminal under the BUNDLES chip. The cigarettes keep the
   shop's price and the promo is a bonus, unless a bundle price is set (below).
   WHERE (his 2026-10-27 "bundle that are special for the regional location"): all areas, or one region from the roster.
   `lockRegion` (TEAM OFFERS, his 2026-10-27 "regional admin can make offers for his own"): WHERE is his region, no choice,
   and `by` names him on the offer so the boss sees who made it.
   Results are NOT here (his 2026-10-27 "the result dashboard should be somewhere else because this panel is just for
   adding the bundle"): REPORTS -> Offer Performance.
   MORE THAN ONE OF EACH (his 2026-10-27 "add option to add another product or promotional goods for the bundle not just
   for 1 on 1 goods"): up to 4 cigarettes and every other promo item; this one is always the first gift, so the offer
   lists under it. `canSetPrice` (his "a power on setting the price for the bundle ... tier 3 and above as default, put
   this on the matrix", key set_bundle_price): an optional price for the whole bundle; empty = each shop's normal price.
   The inputs carry no `name` and Enter does not submit, so the product form around this never saves them.
   THE RULES (his 2026-11-12, set here because "the setting is inside there on the first time"): each offer has an on/off
   switch (`canToggle`, key switch_bundle) and rules (`canSetRules`, key set_bundle_limit): which shops may take it
   (Retail and/or Grosir, never Ecer) and a limit per shop every N days / weeks / months, or once. Both default to tier 3
   and above. The terminal reads them through vanBay's bundleGate. */
const NEW_LINE = { productId: '', qty: 1, unit: 'Bal' };
const NEW_RULES = { shops: '', max: '', every: 1, unit: 'months' };   // shops '' = Retail and Grosir; max '' = no limit

export default function PromoBundleFields({ promo, bundles = [], products = [], promoItems = [], regions = [], lockRegion = '', by = '', canSetPrice = false, canToggle = false, canSetRules = false, onSave }) {
    const [rules, setRules] = useState(NEW_RULES);      // the new offer's rules
    const [editId, setEditId] = useState(null);         // the saved offer whose rules are open
    const [editRules, setEditRules] = useState(NEW_RULES);
    const [name, setName] = useState('');
    const [region, setRegion] = useState(lockRegion);   // '' = every area; a region = only salesmen whose location is that region
    const [lines, setLines] = useState([NEW_LINE]);     // the cigarettes the shop buys
    const [gives, setGives] = useState(1);              // pcs of THIS promo item
    const [moreGives, setMoreGives] = useState([]);     // other promo items given too: [{ productId, qty }]
    const [price, setPrice] = useState('');
    const [busy, setBusy] = useState(false);
    const mine = bundles.filter(b => (b.gives || []).some(g => g.productId === promo.id));
    const rp = (n) => `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(n))}`;
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
            ...(canSetRules ? rulesOf(rules) : {}),
            lines: buys.map(l => ({ productId: l.p.id, name: l.p.name, qty: Math.floor(l.qty), unit: l.unit })),
            gives: [{ productId: promo.id, name: promo.name, qty: Math.floor(gives) }, ...extras.map(g => ({ productId: g.p.id, name: g.p.name, qty: Math.floor(g.qty) }))] };
        if (await save([...bundles, offer])) { setName(''); setLines([NEW_LINE]); setGives(1); setMoreGives([]); setPrice(''); setRegion(lockRegion); setRules(NEW_RULES); }
    };
    // the rule fields as they are saved on an offer; an empty one is left off, so an old offer and a new one read the same
    const rulesOf = (r) => ({
        ...(r.shops ? { tiers: [r.shops] } : {}),
        ...(whole(r.max) > 0 ? { limit: r.unit === 'forever' ? { max: whole(r.max), unit: 'forever' } : { max: whole(r.max), n: Math.max(1, whole(r.every)), unit: r.unit } } : {}),
    });
    const change = (b, next) => save(bundles.map(x => (x.id === b.id ? next(x) : x)));
    const toggle = (b) => change(b, ({ off: _was, ...x }) => (b.off ? x : { ...x, off: true }));
    const openRules = (b) => {
        if (editId === b.id) return setEditId(null);
        const t = bundleTiers(b);
        setEditRules({ shops: t.length === 1 ? t[0] : '', max: b.limit?.max ? String(b.limit.max) : '', every: b.limit?.n || 1, unit: b.limit?.unit || 'months' });
        setEditId(b.id);
    };
    const saveRules = async (b) => {
        if (await change(b, ({ tiers: _t, limit: _l, ...x }) => ({ ...x, ...rulesOf(editRules) }))) setEditId(null);
    };
    const smallBtn = 'flex-1 px-3 min-h-[44px] lg:min-h-0 lg:py-1 border border-[var(--duke-veil-edge-2)] text-[var(--duke-ink-hi)] font-bold hover:border-[var(--duke-amber-edge)] disabled:opacity-50';
    const ruleFields = (r, set, id) => (<>
        <div><label htmlFor={`${id}Shops`} className="text-[var(--duke-ink-8)] block mb-1">WHICH SHOPS · NEVER ECER, NEVER AN UNREGISTERED SHOP</label>
            <select id={`${id}Shops`} value={r.shops} onChange={(e) => set({ ...r, shops: e.target.value })} className={field}>
                <option value="">Retail and Grosir shops</option>
                <option value="Retail">Retail shops only</option>
                <option value="Grosir">Grosir shops only</option>
            </select></div>
        <div><label htmlFor={`${id}Max`} className="text-[var(--duke-ink-8)] block mb-1">LIMIT PER SHOP · EMPTY = NO LIMIT</label>
            <div className="flex gap-2 items-center">
                <input id={`${id}Max`} type="number" inputMode="numeric" min="0" placeholder="1" value={r.max} onKeyDown={noEnter} onChange={(e) => set({ ...r, max: e.target.value.replace(/\D/g, '') })} className={`${field} !w-16 text-center tabular-nums`} />
                {r.unit !== 'forever' && <>
                    <span className="shrink-0 text-[var(--duke-ink-8)]">every</span>
                    <input type="number" inputMode="numeric" min="1" aria-label="How many days, weeks or months" value={r.every} onKeyDown={noEnter} onChange={(e) => set({ ...r, every: whole(e.target.value) })} className={`${field} !w-16 text-center tabular-nums`} />
                </>}
                <select aria-label="Period" value={r.unit} onChange={(e) => set({ ...r, unit: e.target.value })} className={`${field} min-w-0`}>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                    <option value="months">months</option>
                    <option value="forever">once, forever</option>
                </select>
            </div>
            <p className="mt-1 text-[var(--duke-ink-8)] leading-relaxed">Always: only the salesman assigned to a shop can sell it this offer. The count is the shop's own sales in that time; a return never gives one back.</p></div>
    </>);
    const remove = async (b) => {
        if (!(await confirmAction(`Remove the offer "${b.name}"? Salesmen stop seeing it in BUNDLES.`))) return;
        await save(bundles.filter(x => x.id !== b.id));
    };

    return (
        <div className="space-y-2" data-guide="promo-bundles">
            <p className="text-[var(--shell-orange-ink)] font-bold">FACTORY OFFERS · GIVE THIS FREE</p>
            {mine.length === 0 && <p className="text-[var(--duke-ink-8)] leading-relaxed">No offer yet. Example: TAWANG BUNDLE = buy 1 Bal TAWANG, get 1 {promo.name} free.</p>}
            {mine.map(b => (
                <div key={b.id} data-guide="offer-row" className="space-y-2 p-2 border border-[var(--duke-veil-edge-2)] bg-[var(--duke-veil)]">
                  <div className="flex items-start gap-2">
                    <span className="flex-1 min-w-0 leading-snug text-[var(--duke-ink-hi)]">
                        <span className="block font-bold">{b.name} <span className="font-normal text-[var(--duke-ink-8)]">· {b.region ? `${b.region} only` : 'all areas'}{b.by ? ` · by ${b.by}` : ''}</span></span>
                        <span className="text-[var(--duke-ink-8)]">Buy {(b.lines || []).map(l => `${l.qty} ${l.unit} ${products.find(p => p.id === l.productId)?.name || l.name}`).join(' + ')} · get {(b.gives || []).map(g => `${g.qty} pcs ${g.name}`).join(' + ')} free</span>
                        {Number(b.price) > 0 && <span className="block font-bold text-[var(--duke-ink-hi)] tabular-nums">Bundle price {rp(b.price)}</span>}
                    </span>
                    <button type="button" disabled={busy} onClick={() => remove(b)} className="shrink-0 px-3 min-h-[44px] lg:min-h-0 lg:py-1 border border-red-500 text-red-400 font-bold hover:bg-red-500/10 disabled:opacity-50">REMOVE</button>
                  </div>
                  {/* the switch and the rules: everyone reads the line, the buttons need their key */}
                  <p className="leading-snug text-[var(--duke-ink-8)]"><span className={`font-bold ${b.off ? 'text-red-400' : 'text-[var(--duke-ink-hi)]'}`}>{b.off ? 'OFF' : 'ON'}</span> · {bundleRuleWords(b)}</p>
                  {(canSetRules || canToggle) && (
                  <div className="flex gap-2">
                    {canSetRules && <button type="button" disabled={busy} aria-expanded={editId === b.id} onClick={() => openRules(b)} className={smallBtn}>{editId === b.id ? 'CLOSE RULES' : 'RULES'}</button>}
                    {canToggle && <button type="button" disabled={busy} onClick={() => toggle(b)} className={smallBtn}>{b.off ? 'SWITCH ON' : 'SWITCH OFF'}</button>}
                  </div>)}
                  {editId === b.id && (
                    <div className="space-y-2 pt-2 border-t border-dashed border-[var(--duke-veil-edge-2)]">
                        {ruleFields(editRules, setEditRules, `rules_${b.id}`)}
                        <button type="button" disabled={busy} onClick={() => saveRules(b)} className="w-full min-h-[44px] font-bold border border-[var(--duke-amber-edge)] text-[var(--duke-amber-ink)] hover:bg-[var(--duke-amber-edge)]/10 disabled:opacity-40">{busy ? 'SAVING...' : 'SAVE RULES'}</button>
                    </div>)}
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
                {canSetRules && ruleFields(rules, setRules, 'bundle')}
                <button type="button" onClick={add} disabled={busy || !ready}
                    className="w-full min-h-[44px] font-bold border border-[var(--duke-amber-edge)] text-[var(--duke-amber-ink)] hover:bg-[var(--duke-amber-edge)]/10 disabled:opacity-40 disabled:cursor-not-allowed">
                    {busy ? 'SAVING...' : '+ ADD OFFER'}
                </button>
            </div>
        </div>
    );
}
