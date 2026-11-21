import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Camera, Check, ChevronRight, Edit3, GitMerge, Inbox, List, Plus, Search, Shield, SlidersHorizontal, Tag, Trash2, ArrowLeftRight } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { notify } from './Toast.jsx';
import { formatRupiah } from '../utils/helpers';
import { isPendingUndo, scheduleDelayedWrite, usePendingUndo } from '../utils/delayedWrite.js';
import { findDuplicateCategory } from '../utils/productCategories';
import {
    CUST_TYPES, SHELF_OPTIONS, PROMO_OPTIONS, SPEED_OPTIONS, regionKeyOf, normRivalName, findNearRival,
    cleanPriceEntry, regionGapCount, ourPriceOf, priceVerdict, buildReport,
} from '../utils/competitors.js';
import { canManageCompetitors, canReportCompetitor, canSeeAllCompetitorRegions, canManageCategories } from '../config/permissions';

/* COMPETITORS GLOBAL SCREEN (Step 2 / Task 108), built to the approved picture .claude/drafts/competitors-pro.html.
   4 tabs: Rival products, Compare, Reports, Manage. Region rule: T1-T3 see every region; T4-T6 only their own
   (the data hook never even asks for the others - firestore.rules CHANGE 30 would refuse it). Deleting a price,
   a rival or rejecting a report waits 8 seconds with the Undo bar before anything is written. */

const rp = (n) => formatRupiah(Math.round(Number(n) || 0));
const dateOf = (ts) => {
    const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : null);
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-CA') : '';
};
const errText = (err) => (err?.code === 'permission-denied' ? 'Missing permission (check Settings > Permissions).' : (err?.message || 'unknown error'));

function usePhone() {
    const q = '(max-width: 760px)';
    const [ph, setPh] = useState(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches);
    useEffect(() => {
        if (!window.matchMedia) return undefined;
        const m = window.matchMedia(q);
        const on = () => setPh(m.matches);
        m.addEventListener ? m.addEventListener('change', on) : m.addListener(on);
        return () => (m.removeEventListener ? m.removeEventListener('change', on) : m.removeListener(on));
    }, []);
    return ph;
}

/* portalled to <body>: a transformed ancestor (the shell's fade-in) would otherwise trap a fixed overlay */
function Overlay({ onClose, children, small, label }) {
    const ref = useRef(null);
    useEffect(() => {
        /* Esc closes only the top overlay (the picker over a form closes alone) */
        const onKey = (e) => {
            const all = document.querySelectorAll('.kpm-comp-ov');
            if (e.key === 'Escape' && all[all.length - 1] === ref.current) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return createPortal(
        <div ref={ref} className="kpm-comp-ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={`kpm-comp-dlg ${small ? 'sm' : ''}`} role="dialog" aria-label={label}>{children}</div>
        </div>,
        document.body
    );
}

function PickButton({ label, sub, onClick, disabled }) {
    return (
        <button type="button" className="kpm-comp-pick" onClick={onClick} disabled={disabled}>
            <span className="pk-txt"><span className="pk-name">{label}</span>{sub ? <span className="pk-sub">{sub}</span> : null}</span>
            <span className="pk-ic"><Search size={14} />Change</span>
        </button>
    );
}

/* searchable picker that replaces native selects for products (no browser blue highlight) */
function Picker({ title, sections, current, onPick, onClose }) {
    const [q, setQ] = useState('');
    const k = q.trim().toLowerCase();
    const shown = sections.map((s) => ({ ...s, items: s.items.filter((it) => !k || s.always || `${it.name} ${it.sub || ''}`.toLowerCase().includes(k)) }))
        .filter((s) => s.items.length && (!k || !s.always));
    return (
        <Overlay small onClose={onClose} label={title}>
            <div className="kpm-comp-dlg-h"><h4>{title}</h4><button type="button" className="kpm-comp-btn q xs" onClick={onClose}>Close</button></div>
            <label className="kpm-comp-search"><Search size={15} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product or category..." /></label>
            <div className="kpm-comp-pop">
                {shown.length ? shown.map((s) => (
                    <React.Fragment key={s.title}>
                        <div className="pop-grp">{s.title}</div>
                        {s.items.map((it) => (
                            <button type="button" key={it.id || '__none'} className={`pop-opt ${current === it.id ? 'on' : ''}`} onClick={() => onPick(it.id)}>
                                <div className="min-w-0"><b>{it.name}</b>{it.sub ? <span>{it.sub}</span> : null}</div>
                                {it.right ? <b className="r">{it.right}</b> : null}
                            </button>
                        ))}
                    </React.Fragment>
                )) : <div className="kpm-comp-empty">No products match "{q}".</div>}
            </div>
        </Overlay>
    );
}

export default function CompetitorsView({
    db, appId, userId, user, userRole, logAudit,
    competitors = [], rivalPrices = {}, reports = [], inventory = [], productCategories = [],
    regions = [], myRegion = '', onSaveCategory,
}) {
    usePendingUndo();   // re-render when an 8 s Undo starts or ends
    const ph = usePhone();
    const seesAll = canSeeAllCompetitorRegions(userRole);
    const canManage = canManageCompetitors(userRole);
    const canReport = canReportCompetitor(userRole);
    const canCats = canManageCategories(userRole) && typeof onSaveCategory === 'function';
    const myReg = regionKeyOf(myRegion);
    const actor = user?.name || user?.displayName || user?.email || 'unknown';
    const base = `artifacts/${appId}/users/${userId}`;

    const [tabPicked, setTab] = useState('rivals');
    const [q, setQ] = useState('');
    const [selRival, setSelRival] = useState('');
    const [phDetail, setPhDetail] = useState(false);
    const [openGroups, setOpenGroups] = useState(() => new Set());
    const [cmp, setCmp] = useState({ ours: '', rival: '', region: '', ct: 'Retail' });
    const [modal, setModal] = useState(null);     // { kind, ...form }
    const [picker, setPicker] = useState(null);   // { title, sections, current, onPick }
    const [busy, setBusy] = useState(false);
    const tab = !canManage && tabPicked === 'manage' ? 'rivals' : tabPicked;

    /* ---------- derived ---------- */
    const cats = productCategories || [];
    const catLabel = (catId, subId) => {
        const c = cats.find((x) => x.id === catId);
        const s = c?.subs?.find((x) => x.id === subId);
        return c ? (s ? `${c.name} › ${s.name}` : c.name) : 'No category';
    };
    const ours = useMemo(() => (inventory || []).filter((p) => p && p.name), [inventory]);
    const ourById = (id) => ours.find((o) => o.id === id) || null;
    const rivalById = (id) => competitors.find((r) => r.id === id) || null;

    /* prices as shown: a price inside its 8 s Undo window reads as "not set yet" */
    const priceOf = (rid, reg, ct) => {
        if (isPendingUndo(`rivalPrice:${rid}:${reg}:${ct}`)) return 0;
        return Number(rivalPrices?.[rid]?.[reg]?.[ct]) || 0;
    };
    const entryOf = (rid, reg) => rivalPrices?.[rid]?.[reg] || null;
    const shownPrices = (() => {
        const out = {};
        competitors.forEach((r) => {
            out[r.id] = {};
            Object.keys(rivalPrices?.[r.id] || {}).forEach((reg) => {
                out[r.id][reg] = Object.fromEntries(CUST_TYPES.map((ct) => [ct, priceOf(r.id, reg, ct)]));
            });
        });
        return out;
    })();   // cheap; recomputed each render so Undo state is honoured

    const regs = useMemo(() => {
        if (!seesAll) return myReg ? [myReg] : [];
        const set = new Set((regions || []).map(regionKeyOf).filter(Boolean));
        Object.values(rivalPrices || {}).forEach((m) => Object.keys(m || {}).forEach((k) => set.add(k)));
        reports.forEach((r) => r?.region && set.add(regionKeyOf(r.region)));
        return [...set].sort();
    }, [seesAll, myReg, regions, rivalPrices, reports]);

    const waitReps = reports.filter((r) => r.status === 'pending' && !isPendingUndo(`report:${r.id}`)
        && (seesAll || regionKeyOf(r.region) === myReg));
    const myReps = reports.filter((r) => r.reportedByUid === user?.uid && r.status !== 'pending').slice(0, 8);

    const k = q.trim().toLowerCase();
    const list = competitors.filter((r) => !k || String(r.name || '').toLowerCase().includes(k) || catLabel(r.categoryId, r.subCategoryId).toLowerCase().includes(k));
    const groups = (() => {
        const m = new Map();
        list.forEach((r) => {
            const gk = `${r.categoryId || ''}::${r.subCategoryId || ''}`;
            if (!m.has(gk)) m.set(gk, { key: gk, label: catLabel(r.categoryId, r.subCategoryId), items: [] });
            m.get(gk).items.push(r);
        });
        return [...m.values()].sort((a, b) => a.label.localeCompare(b.label));
    })();
    const active = list.find((r) => r.id === selRival) || list[0] || null;
    useEffect(() => {
        if (active && !selRival) {
            setSelRival(active.id);
            setOpenGroups((s) => new Set(s).add(`${active.categoryId || ''}::${active.subCategoryId || ''}`));
        }
    }, [active?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

    const gapCount = seesAll ? regionGapCount(competitors, shownPrices) : null;

    /* ---------- pickers ---------- */
    const ourSectionsFor = (refCatId, allowEmpty) => {
        const item = (o) => ({ id: o.id, name: o.name, sub: catLabel(o.categoryId, o.subCategoryId), right: o.priceRetail ? rp(o.priceRetail) : '' });
        const same = ours.filter((o) => refCatId && o.categoryId === refCatId).map(item);
        const other = ours.filter((o) => !refCatId || o.categoryId !== refCatId).map(item);
        const out = [];
        if (same.length) out.push({ title: 'Same category', items: same });
        if (other.length) out.push({ title: same.length ? 'Other categories' : 'Our products', items: other });
        if (allowEmpty) out.push({ title: 'Clear', always: true, items: [{ id: '', name: 'No Cello pair', sub: 'Unlink the pair' }] });
        return out;
    };
    const rivalSections = (withNew, reg, ct) => {
        const out = [];
        if (withNew) out.push({ title: 'New product', always: true, items: [{ id: '', name: '+ New product (not on the list yet)', sub: 'Type the rival name on the report form' }] });
        const m = new Map();
        competitors.forEach((r) => {
            const t = catLabel(r.categoryId, r.subCategoryId).split(' › ')[0];
            if (!m.has(t)) m.set(t, []);
            const v = reg ? priceOf(r.id, reg, ct) : 0;
            m.get(t).push({ id: r.id, name: r.name, sub: catLabel(r.categoryId, r.subCategoryId), right: v ? rp(v) : '' });
        });
        [...m.keys()].sort().forEach((t) => out.push({ title: t, items: m.get(t) }));
        return out;
    };

    /* ---------- writes ---------- */
    const meta = () => ({ updatedAt: serverTimestamp(), updatedBy: actor, updatedByUid: user?.uid || '' });
    const priceRef = (rid, reg) => doc(db, `${base}/competitors/${rid}/region_prices`, reg);
    const writePriceEntry = (batchOrNull, rid, reg, next, sourceReportId = null) => {
        const clean = cleanPriceEntry(next);
        const ref = priceRef(rid, reg);
        if (!Object.keys(clean).length) return batchOrNull ? batchOrNull.delete(ref) : deleteDoc(ref);
        const payload = { region: reg, ...clean, ...meta(), sourceReportId };
        return batchOrNull ? batchOrNull.set(ref, payload) : setDoc(ref, payload);
    };
    const currentEntry = (rid, reg) => {
        const e = entryOf(rid, reg) || {};
        return Object.fromEntries(CUST_TYPES.map((ct) => [ct, Number(e[ct]) || 0]));
    };
    const mayEditRegion = (reg) => canManage && (seesAll || (myReg && reg === myReg));

    const savePair = async (rival, oid) => {
        try {
            await updateDoc(doc(db, `${base}/competitors`, rival.id), { pairedProductId: oid || null, ...meta() });
            const o = ourById(oid);
            notify(o ? `Saved pair: ${rival.name} ↔ ${o.name}` : `Cleared Cello pair for ${rival.name}`);
        } catch (err) { notify('Failed to save pair: ' + errText(err)); }
    };

    const savePrice = async () => {
        const f = modal;
        const val = Math.round(Number(f.price));
        if (!val || val <= 0) return notify('Enter a valid price in Rp.');
        setBusy(true);
        try {
            await writePriceEntry(null, f.rid, f.region, { ...currentEntry(f.rid, f.region), [f.ct]: val });
            logAudit?.('COMPETITOR_PRICE', `${f.rivalName}: ${f.region} ${f.ct} set to ${rp(val)}.`);
            notify(`Updated ${f.region} ${f.ct} price to ${rp(val)}.`);
            setModal(null);
        } catch (err) { notify('Failed to save price: ' + errText(err)); }
        setBusy(false);
    };

    const deletePrice = (f) => {
        const next = { ...currentEntry(f.rid, f.region), [f.ct]: 0 };
        setModal(null);
        scheduleDelayedWrite({
            key: `rivalPrice:${f.rid}:${f.region}:${f.ct}`,
            label: `${f.region} ${f.ct} price`,
            commit: async () => {
                try {
                    await writePriceEntry(null, f.rid, f.region, next);
                    logAudit?.('COMPETITOR_PRICE_DELETE', `${f.rivalName}: deleted ${f.region} ${f.ct} price.`);
                } catch (err) { notify('Failed to delete price: ' + errText(err)); }
            },
        });
    };

    const deleteRival = (r) => {
        setModal(null);
        const regKeys = Object.keys(rivalPrices?.[r.id] || {});
        scheduleDelayedWrite({
            key: `rival:${r.id}`,
            label: r.name,
            onOptimistic: () => { if (selRival === r.id) setSelRival(''); },
            commit: async () => {
                try {
                    const b = writeBatch(db);
                    regKeys.forEach((reg) => b.delete(priceRef(r.id, reg)));
                    b.delete(doc(db, `${base}/competitors`, r.id));
                    await b.commit();
                    logAudit?.('COMPETITOR_DELETE', `Deleted rival "${r.name}" and ${regKeys.length} region price${regKeys.length === 1 ? '' : 's'}.`);
                } catch (err) { notify('Failed to delete rival: ' + errText(err)); }
            },
        });
    };

    /* category for a new rival: an existing Category › Sub, or a new shared one (via Master Vault's own save) */
    const resolveCategory = async (f) => {
        if (f.catMode !== 'new') return { categoryId: f.catId || '', subCategoryId: f.subId || '' };
        const cn = String(f.newCatName || '').trim();
        if (!cn) { notify('Enter the new category name.'); return null; }
        if (!canCats) { notify('Only staff allowed to manage categories can add one. Pick an existing category.'); return null; }
        const sn = String(f.newSubName || '').trim() || `${cn} Standard`;
        const subId = `sub_${Date.now().toString(36)}`;
        const id = await onSaveCategory({ name: cn, subs: [{ id: subId, name: sn }] });
        return id ? { categoryId: id, subCategoryId: subId } : null;
    };

    const newRivalDoc = (name, cat, pair) => ({
        name, brand: '', normName: normRivalName(name), categoryId: cat.categoryId, subCategoryId: cat.subCategoryId,
        pairedProductId: pair || null, createdAt: serverTimestamp(), ...meta(),
    });

    const saveRival = async () => {
        const f = modal, name = String(f.name || '').trim();
        if (!name) return notify('Enter the rival product name.');
        setBusy(true);
        try {
            const cat = await resolveCategory(f);
            if (!cat) { setBusy(false); return; }
            const ref = doc(collection(db, `${base}/competitors`));
            const b = writeBatch(db);
            b.set(ref, newRivalDoc(name, cat, f.pair));
            const start = cleanPriceEntry({ Retail: f.retail, Grosir: f.grosir, Ecer: f.ecer });
            if (Object.keys(start).length && f.region && mayEditRegion(f.region)) writePriceEntry(b, ref.id, f.region, start);
            await b.commit();
            logAudit?.('COMPETITOR_ADD', `Added rival "${name}" (${catLabel(cat.categoryId, cat.subCategoryId)}).`);
            notify(`Added "${name}".`);
            setSelRival(ref.id);
            setOpenGroups((s) => new Set(s).add(`${cat.categoryId}::${cat.subCategoryId}`));
            setModal(null);
        } catch (err) { notify('Failed to add rival: ' + errText(err)); }
        setBusy(false);
    };

    const submitReport = async () => {
        const f = modal;
        const built = buildReport({ ...f, newRivalName: f.newName }, { region: myReg || f.region, uid: user?.uid, name: actor, createdAt: serverTimestamp() });
        if (built.error) return notify(built.error);
        setBusy(true);
        try {
            await addDoc(collection(db, `${base}/competitor_reports`), built.data);
            notify('Report sent for approval.');
            setModal(null); setTab('reports');
        } catch (err) { notify('Failed to send report: ' + errText(err)); }
        setBusy(false);
    };

    const review = () => ({ reviewedBy: actor, reviewedByUid: user?.uid || '', reviewedAt: serverTimestamp() });
    const confirmApprove = async () => {
        const f = modal, rep = reports.find((x) => x.id === f.repId);
        if (!rep) return setModal(null);
        const reg = regionKeyOf(rep.region);
        setBusy(true);
        try {
            const b = writeBatch(db);
            const repRef = doc(db, `${base}/competitor_reports`, rep.id);
            const targetId = rep.rivalId || f.mergeId || '';
            if (targetId) {
                if (f.priceAction === 'update') {
                    writePriceEntry(b, targetId, reg, { ...currentEntry(targetId, reg), [rep.customerType]: rep.price }, rep.id);
                    b.update(repRef, { status: 'approved_price', priceAction: 'update', rejectReason: '', ...review() });
                } else b.update(repRef, { status: 'approved_note', priceAction: 'note', rejectReason: '', ...review() });
            } else {
                const name = String(f.rivalName || '').trim();
                if (!name) { setBusy(false); return notify('Enter the rival product name.'); }
                const cat = await resolveCategory(f);
                if (!cat) { setBusy(false); return; }
                const ref = doc(collection(db, `${base}/competitors`));
                b.set(ref, newRivalDoc(name, cat, f.pair));
                writePriceEntry(b, ref.id, reg, { [rep.customerType]: rep.price }, rep.id);
                b.update(repRef, { status: 'approved_price', priceAction: 'update', rejectReason: '', ...review() });
            }
            await b.commit();
            logAudit?.('COMPETITOR_REPORT_APPROVE', `Approved ${rep.shopName || 'shop'} report (${reg} ${rep.customerType} ${rp(rep.price)}).`);
            notify(f.priceAction === 'note' && targetId ? 'Approved and kept as a shop note only.' : `Approved: ${reg} ${rep.customerType} price set to ${rp(rep.price)}.`);
            setModal(null);
        } catch (err) { notify('Failed to approve: ' + errText(err)); }
        setBusy(false);
    };

    const confirmReject = () => {
        const f = modal, rep = reports.find((x) => x.id === f.repId);
        const reason = String(f.reason || '').trim();
        if (!reason) return notify('Enter a short reason before rejecting.');
        if (!rep) return setModal(null);
        setModal(null);
        scheduleDelayedWrite({
            key: `report:${rep.id}`,
            label: `${rep.shopName || 'shop'} report (rejected)`,
            commit: async () => {
                try {
                    await updateDoc(doc(db, `${base}/competitor_reports`, rep.id), { status: 'rejected', priceAction: null, rejectReason: reason, ...review() });
                    logAudit?.('COMPETITOR_REPORT_REJECT', `Rejected ${rep.shopName || 'shop'} report: ${reason}`);
                } catch (err) { notify('Failed to reject: ' + errText(err)); }
            },
        });
    };

    const saveCat = async () => {
        const f = modal, nm = String(f.name || '').trim();
        if (!nm) return notify('Enter a name.');
        setBusy(true);
        const c = cats.find((x) => x.id === f.cid);
        let ok = null;
        if (f.mode === 'add-cat') ok = await onSaveCategory({ name: nm, subs: [{ name: `${nm} Standard` }] });
        else if (f.mode === 'ren-cat' && c) ok = await onSaveCategory({ id: c.id, name: nm, subs: c.subs || [] });
        else if (f.mode === 'add-sub' && c) ok = await onSaveCategory({ id: c.id, name: c.name, subs: [...(c.subs || []), { name: nm }] });
        setBusy(false);
        if (ok) setModal(null);
    };

    /* ---------- open helpers ---------- */
    const firstCat = cats[0];
    const catForm = () => ({ catMode: cats.length ? 'existing' : 'new', catId: firstCat?.id || '', subId: firstCat?.subs?.[0]?.id || '', newCatName: '', newSubName: '' });
    const openReport = (rid = '') => setModal({ kind: 'report', rivalId: rid || active?.id || '', newName: '', shopName: '', price: '', customerType: 'Retail', shelf: SHELF_OPTIONS[0], promo: 'None', speed: 'Medium', photo: false, note: '', region: regs[0] || '' });
    const openAddRival = () => setModal({ kind: 'addRival', name: '', pair: '', ...catForm(), region: regs.find(mayEditRegion) || '', retail: '', grosir: '', ecer: '' });
    const openApprove = (rep) => {
        const near = rep.rivalId ? null : findNearRival(competitors, rep.newRivalName);
        setModal({ kind: 'approve', repId: rep.id, rivalName: rep.newRivalName || '', ...catForm(), pair: '', priceAction: 'update', mergeId: '', near: near?.id || '' });
    };
    const jumpCompare = (r) => {
        setCmp((c) => ({ ...c, rival: r.id, ours: r.pairedProductId || ours.find((o) => o.categoryId === r.categoryId)?.id || ours[0]?.id || '' }));
        setTab('compare');
    };
    const pickRival = (r) => {
        setSelRival(r.id);
        setOpenGroups((s) => new Set(s).add(`${r.categoryId || ''}::${r.subCategoryId || ''}`));
        if (ph) setPhDetail(true);
    };
    const setF = (patch) => setModal((m) => (m ? { ...m, ...patch } : m));

    /* ---------- tabs ---------- */
    const allOpen = groups.length > 0 && groups.every((g) => openGroups.has(g.key));
    const rivalsTab = () => {
        const showList = !ph || !phDetail;
        const showDetail = !ph || phDetail;
        const r = active;
        const pair = r ? ourById(r.pairedProductId) : null;
        return (
            <div className="kpm-comp-work">
                {showList && (
                    <aside className="kpm-comp-list" aria-label="Rival catalog">
                        <label className="kpm-comp-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rival or category..." /></label>
                        <div className="list-tools">
                            <span className="dim">{groups.length} groups · {list.length} products</span>
                            <button type="button" className="kpm-comp-btn q xs" onClick={() => setOpenGroups(allOpen ? new Set() : new Set(groups.map((g) => g.key)))}>{allOpen ? 'Collapse all' : 'Expand all'}</button>
                        </div>
                        {groups.map((g) => {
                            const open = k.length > 0 || openGroups.has(g.key);
                            return (
                                <div className="grp-card" key={g.key}>
                                    <button type="button" className="grp-h" aria-expanded={open} onClick={() => setOpenGroups((s) => { const n = new Set(s); n.has(g.key) ? n.delete(g.key) : n.add(g.key); return n; })}>
                                        <span className="chev"><ChevronRight size={15} /><span>{g.label}</span></span>
                                        <span className="kpm-comp-st">{g.items.length}</span>
                                    </button>
                                    {open && g.items.map((it) => {
                                        const pr = ourById(it.pairedProductId);
                                        const regP = regs[0] ? priceOf(it.id, regs[0], 'Retail') : 0;
                                        const vals = regs.map((rg) => priceOf(it.id, rg, 'Retail')).filter((v) => v > 0);
                                        const varies = seesAll && new Set(vals).size > 1;
                                        return (
                                            <button type="button" key={it.id} className={`rrow ${r && it.id === r.id ? 'sel' : ''}`} onClick={() => pickRival(it)}>
                                                <div className="min-w-0"><b>{it.name}</b><span className="s">{pr ? `Paired: ${pr.name}` : 'No Cello pair yet'}</span></div>
                                                <div className="r"><b>{regP ? rp(regP) : '—'}</b><div>{varies ? <span className="kpm-comp-st g">varies</span> : <span className="dim xs">{regP ? 'Retail' : 'not set yet'}</span>}</div></div>
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })}
                        {!list.length && <div className="kpm-comp-card"><div className="kpm-comp-empty">{competitors.length ? `No rival products match "${q}".` : (canManage ? 'No rival products yet. Press "Add rival product" to start the list.' : 'No rival products yet. Send a field report and your admin can add it.')}</div></div>}
                    </aside>
                )}
                {showDetail && r && (
                    <section className="kpm-comp-detail" aria-label="Rival region prices">
                        {ph && <div><button type="button" className="kpm-comp-btn q" onClick={() => setPhDetail(false)}><ArrowLeft size={15} />All rival products</button></div>}
                        <div className="kpm-comp-card">
                            <div className="dh">
                                <div className="dh-t">
                                    <h3>{r.name}</h3>
                                    <p>{catLabel(r.categoryId, r.subCategoryId)}{pair ? <> · paired with <b>{pair.name}</b></> : ' · no Cello pair set'}</p>
                                </div>
                                {pair && pair.categoryId !== r.categoryId && <span className="kpm-comp-st g">Different category pair</span>}
                                <button type="button" className="kpm-comp-btn" onClick={() => jumpCompare(r)}><ArrowLeftRight size={15} />Compare side by side</button>
                            </div>
                        </div>
                        <div className="sec-wrap">
                            <div className="sec-lbl"><span>Region × customer type prices</span><span>{seesAll ? 'shaded cells differ across regions' : (myReg ? `scoped to ${myReg}` : 'your profile has no region yet')}</span></div>
                            <div className="kpm-comp-card flush">
                                <div className="tblw">
                                    <table className="kpm-comp-pt">
                                        <thead><tr><th>Customer type</th>{regs.map((rg) => <th key={rg} className="r">{rg}</th>)}<th className="r">Our pair{pair ? ` (${pair.name})` : ''}</th></tr></thead>
                                        <tbody>
                                            {CUST_TYPES.map((ct) => {
                                                const vals = regs.map((rg) => priceOf(r.id, rg, ct));
                                                const set = vals.filter((v) => v > 0);
                                                const varies = regs.length > 1 && new Set(set).size > 1;
                                                const minV = set.length ? Math.min(...set) : 0;
                                                const ourP = pair ? ourPriceOf(pair, ct) : 0;
                                                const v0 = vals[0] || 0;
                                                const verdict = priceVerdict(ourP, v0, rp);
                                                return (
                                                    <tr key={ct}>
                                                        <td><b>{ct}</b></td>
                                                        {regs.map((rg, i) => {
                                                            const val = vals[i];
                                                            const e = entryOf(r.id, rg);
                                                            return (
                                                                <td key={rg} className={`r ${varies && val > 0 ? 'diff' : ''}`}>
                                                                    <div className="cell">
                                                                        {varies && val > 0 && val === minV && <span className="kpm-comp-st bad">lowest</span>}
                                                                        <b>{val ? rp(val) : '—'}</b>
                                                                        {mayEditRegion(rg) && <button type="button" className="kpm-comp-btn q xs icon" aria-label={`Edit ${rg} ${ct} price`} onClick={() => setModal({ kind: 'price', rid: r.id, rivalName: r.name, region: rg, ct, price: val || '', hasExisting: val > 0 })}><Edit3 size={14} /></button>}
                                                                    </div>
                                                                    <span className="pmeta">{val && e ? `by ${e.updatedBy || '—'} · ${dateOf(e.updatedAt)}` : 'not set yet'}</span>
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="r"><b>{ourP ? rp(ourP) : '—'}</b><span className="pmeta">{verdict ? verdict.text : '—'}</span></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {!regs.length && <div className="kpm-comp-empty">No region to show. {seesAll ? 'Add a branch to the roster first.' : 'Ask your admin to set your location.'}</div>}
                            </div>
                        </div>
                        <div className="sec-wrap">
                            <div className="sec-lbl"><span>Paired Cello product</span><span>{canManage ? 'same category first · any product allowed' : 'read only'}</span></div>
                            <div className="kpm-comp-card">
                                <div className="row-wrap">
                                    <div className="grow">
                                        {canManage
                                            ? <PickButton label={pair ? pair.name : 'Pick Cello pair...'} sub={pair ? catLabel(pair.categoryId, pair.subCategoryId) : 'Same category shown first'}
                                                onClick={() => setPicker({ title: 'Pick paired Cello product', sections: ourSectionsFor(r.categoryId, true), current: r.pairedProductId || '', onPick: (id) => savePair(r, id) })} />
                                            : <b>{pair ? pair.name : 'None'}</b>}
                                    </div>
                                    {canReport && <button type="button" className="kpm-comp-btn q" onClick={() => openReport(r.id)}><Camera size={15} />Report field price</button>}
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        );
    };

    const compareTab = () => {
        const r = rivalById(cmp.rival) || active;
        if (!r) return <div className="kpm-comp-pane"><div className="kpm-comp-card"><div className="kpm-comp-empty">No rival products to compare yet.</div></div></div>;
        const o = ourById(cmp.ours) || ourById(r.pairedProductId) || ours.find((x) => x.categoryId === r.categoryId) || ours[0] || null;
        const reg = regs.includes(cmp.region) ? cmp.region : (regs[0] || '');
        const ct = cmp.ct;
        const ourP = o ? ourPriceOf(o, ct) : 0;
        const rivP = reg ? priceOf(r.id, reg, ct) : 0;
        const e = reg ? entryOf(r.id, reg) : null;
        const v = priceVerdict(ourP, rivP, rp);
        const top = Math.max(ourP, rivP, 1);
        const ladder = [
            ...competitors.filter((x) => x.categoryId === r.categoryId && x.subCategoryId === r.subCategoryId && reg && priceOf(x.id, reg, ct) > 0)
                .map((x) => ({ key: `r${x.id}`, name: x.name, p: priceOf(x.id, reg, ct), cls: x.id === r.id ? 'pick' : '' })),
            ...ours.filter((x) => (x.categoryId && x.categoryId === r.categoryId && x.subCategoryId === r.subCategoryId) || x.id === o?.id)
                .filter((x) => ourPriceOf(x, ct) > 0).map((x) => ({ key: `o${x.id}`, name: `${x.name} (ours)`, p: ourPriceOf(x, ct), cls: 'me' })),
        ].sort((a, b) => a.p - b.p);
        return (
            <div className="kpm-comp-pane">
                <div className="kpm-comp-card">
                    <div className="row-wrap">
                        <span className="lbl-sm">Region</span>
                        <div className="kpm-comp-seg" role="group" aria-label="Region">
                            {regs.map((rg) => <button type="button" key={rg} aria-pressed={rg === reg} onClick={() => setCmp((c) => ({ ...c, region: rg }))}>{rg}</button>)}
                        </div>
                        <span className="lbl-sm">Customer type</span>
                        <div className="kpm-comp-seg" role="group" aria-label="Customer type">
                            {CUST_TYPES.map((t) => <button type="button" key={t} aria-pressed={ct === t} onClick={() => setCmp((c) => ({ ...c, ct: t }))}>{t}</button>)}
                        </div>
                        {o && <span className={`kpm-comp-st ${o.categoryId !== r.categoryId ? 'g' : ''}`}>{o.categoryId !== r.categoryId ? 'Different category' : 'Same category'}</span>}
                    </div>
                </div>
                <div className="kpm-comp-duel">
                    <div className="dcol mine">
                        <span className="lbl-sm">Our product{o ? ` · ${catLabel(o.categoryId, o.subCategoryId)}` : ''}</span>
                        <PickButton label={o ? o.name : 'Pick our product'} sub={o ? catLabel(o.categoryId, o.subCategoryId) : ''}
                            onClick={() => setPicker({ title: 'Pick our product', sections: ourSectionsFor(r.categoryId, false), current: o?.id || '', onPick: (id) => { setCmp((c) => ({ ...c, ours: id })); setPicker(null); } })} />
                        <div className="bigp">{ourP ? rp(ourP) : '—'}</div>
                        <span className="dim">Master Vault {ct} price</span>
                        {canManage && o && (r.pairedProductId === o.id
                            ? <span className="kpm-comp-st g self-start">Saved default pair</span>
                            : <button type="button" className="kpm-comp-btn q xs self-start" onClick={() => savePair(r, o.id)}><Check size={14} />Save as pair for this rival</button>)}
                    </div>
                    <div className="dcol">
                        <span className="lbl-sm">Rival product · {catLabel(r.categoryId, r.subCategoryId)}</span>
                        <PickButton label={r.name} sub={catLabel(r.categoryId, r.subCategoryId)}
                            onClick={() => setPicker({ title: 'Pick rival product', sections: rivalSections(false, reg, ct), current: r.id, onPick: (id) => { const nr = rivalById(id); setCmp((c) => ({ ...c, rival: id, ours: nr?.pairedProductId || c.ours })); setPicker(null); } })} />
                        <div className="bigp them">{rivP ? rp(rivP) : '—'}</div>
                        <span className="dim">{reg ? `${reg} ${ct}` : 'no region'} · {rivP && e ? `by ${e.updatedBy || '—'} · ${dateOf(e.updatedAt)}` : 'not set yet'}</span>
                    </div>
                </div>
                <div className="kpm-comp-bfly">
                    <div className="bar l"><span className="us" style={{ width: `${Math.round((ourP / top) * 100)}%` }} /></div>
                    <span className={`kpm-comp-st ${v?.side === 'rival' ? 'bad' : 'g'}`}>{v ? (v.pct ? `${v.text} · ${v.pct}%` : v.text) : 'Rival price not set yet'}</span>
                    <div className="bar"><span className="them" style={{ width: `${rivP ? Math.round((rivP / top) * 100) : 0}%` }} /></div>
                </div>
                <div className="sec-wrap">
                    <div className="sec-lbl"><span>Price ladder · {catLabel(r.categoryId, r.subCategoryId)} ({reg || '—'} · {ct})</span><span>cheapest first</span></div>
                    <div className="kpm-comp-card flush">
                        {ladder.length ? ladder.map((x, i) => <div key={x.key} className={`lad ${x.cls}`}><span className="dim">{i + 1}</span><span>{x.name}</span><b>{rp(x.p)}</b></div>)
                            : <div className="kpm-comp-empty">No prices in this group yet.</div>}
                    </div>
                </div>
            </div>
        );
    };

    const statusWord = { approved_price: 'Approved · price updated', approved_note: 'Approved · kept as a note', rejected: 'Rejected' };
    const reportsTab = () => (
        <div className="kpm-comp-pane">
            <div className="row-between">
                <div><b>Reports waiting for approval ({waitReps.length})</b> <span className="dim">· {seesAll ? 'all regions' : (myReg ? `${myReg} only` : 'no region on your profile')}</span></div>
                {canReport && <button type="button" className="kpm-comp-btn" onClick={() => openReport()}><Plus size={15} />Submit field report</button>}
            </div>
            {waitReps.length ? waitReps.map((rep) => {
                const ex = rep.rivalId ? rivalById(rep.rivalId) : null;
                const near = !ex ? findNearRival(competitors, rep.newRivalName) : null;
                const reg = regionKeyOf(rep.region);
                const cur = ex ? priceOf(ex.id, reg, rep.customerType) : 0;
                const mayApprove = canManage && (seesAll || reg === myReg);
                return (
                    <div className="kpm-comp-card" key={rep.id}>
                        <div className="row-between top">
                            <div>
                                <b className="t14">{ex ? ex.name : (rep.newRivalName || (rep.rivalId ? 'Deleted rival' : 'New product'))}</b>
                                {!rep.rivalId && <span className="kpm-comp-st g ml">New product</span>}
                                <span className="kpm-comp-st ml">{reg} · {rep.customerType}</span>
                            </div>
                            <b className="t16 them">{rp(rep.price)}</b>
                        </div>
                        <div className="qmeta">
                            <span>Shop: <b>{rep.shopName || '—'}</b></span>
                            <span>By: <b>{rep.reportedByName || '—'}</b></span>
                            <span>Shelf: {rep.shelf}</span>
                            <span>Promo: {rep.promo === 'None' ? 'No promo' : rep.promo}</span>
                            <span>Selling: {rep.speed}</span>
                            <span>{rep.photo ? 'Photo attached' : 'No photo'}</span>
                            <span>{dateOf(rep.createdAt)}</span>
                        </div>
                        {cur > 0 && <div className="dim">Current {reg} {rep.customerType} price: <b>{rp(cur)}</b> ({rep.price === cur ? 'same price' : rep.price < cur ? `${rp(cur - rep.price)} lower` : `${rp(rep.price - cur)} higher`})</div>}
                        {rep.note && <div className="dim">Note: {rep.note}</div>}
                        {near && <div className="kpm-comp-warn"><span><b>Looks like {near.name}</b> (same name once case, spaces, dots and dashes are ignored). You can merge it when you approve.</span></div>}
                        <div className="row-end">
                            {mayApprove ? <>
                                <button type="button" className="kpm-comp-btn d" onClick={() => setModal({ kind: 'reject', repId: rep.id, reason: '' })}>Reject</button>
                                <button type="button" className="kpm-comp-btn" onClick={() => openApprove(rep)}><Check size={15} />Approve</button>
                            </> : <span className="dim">Waiting for the {reg} admin or Tier 3+ to approve</span>}
                        </div>
                    </div>
                );
            }) : <div className="kpm-comp-card"><div className="kpm-comp-empty">No reports waiting for approval.</div></div>}
            {myReps.length > 0 && (
                <div className="sec-wrap">
                    <div className="sec-lbl"><span>Your recent reports</span><span>what happened to them</span></div>
                    <div className="kpm-comp-card flush">
                        {myReps.map((rep) => (
                            <div className="lad wide" key={rep.id}>
                                <span className="min-w-0">{rivalById(rep.rivalId)?.name || rep.newRivalName || 'Rival'} · {rep.shopName || '—'} · {rp(rep.price)}</span>
                                <span className={`kpm-comp-st ${rep.status === 'rejected' ? 'bad' : 'g'}`}>{statusWord[rep.status] || rep.status}</span>
                                {rep.status === 'rejected' && rep.rejectReason ? <span className="dim full">Reason: {rep.rejectReason}</span> : null}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const manageTab = () => (
        <div className="kpm-comp-pane">
            <div className="row-between">
                <div><b>Shared categories &amp; rival catalog</b> <span className="dim">· one category list shared with Master Vault</span></div>
                <div className="row-wrap">
                    {canCats && <button type="button" className="kpm-comp-btn q" onClick={() => setModal({ kind: 'cat', mode: 'add-cat', title: 'Add shared category', name: '' })}><Tag size={15} />Add category</button>}
                    <button type="button" className="kpm-comp-btn" onClick={openAddRival}><Plus size={15} />Add rival product</button>
                </div>
            </div>
            <div className="sec-wrap">
                <div className="sec-lbl"><span>Shared category list ({cats.length})</span><span>used by Master Vault + Competitors</span></div>
                <div className="kpm-comp-card">
                    {cats.length ? cats.map((c) => {
                        const ourCnt = ours.filter((o) => o.categoryId === c.id).length;
                        const rivCnt = competitors.filter((r) => r.categoryId === c.id).length;
                        return (
                            <div className="mrow" key={c.id}>
                                <div className="grow">
                                    <b>{c.name}</b>
                                    {ourCnt === 0 ? <span className="kpm-comp-st g ml">competitors only · 0 of ours</span> : <span className="dim ml">{ourCnt} ours · {rivCnt} rivals</span>}
                                    <div className="dim">Subs: {(c.subs || []).map((s) => s.name).join(' · ') || '—'}</div>
                                </div>
                                {canCats && <>
                                    <button type="button" className="kpm-comp-btn q xs" onClick={() => setModal({ kind: 'cat', mode: 'ren-cat', cid: c.id, title: 'Rename category', name: c.name })}><Edit3 size={14} />Rename</button>
                                    <button type="button" className="kpm-comp-btn q xs" onClick={() => setModal({ kind: 'cat', mode: 'add-sub', cid: c.id, title: `Add sub-category under ${c.name}`, name: '' })}><Plus size={14} />Add sub</button>
                                </>}
                            </div>
                        );
                    }) : <div className="kpm-comp-empty">No shared categories yet.</div>}
                </div>
            </div>
            <div className="sec-wrap">
                <div className="sec-lbl"><span>Rival pairs ({competitors.length})</span><span>change any pair · same category listed first</span></div>
                <div className="kpm-comp-card">
                    {competitors.length ? competitors.map((r) => {
                        const pair = ourById(r.pairedProductId);
                        return (
                            <div className="mrow" key={r.id}>
                                <div className="grow"><b>{r.name}</b><div className="dim">{catLabel(r.categoryId, r.subCategoryId)}</div></div>
                                <div className="pickcol">
                                    <PickButton label={pair ? pair.name : 'No pair set'} sub={pair ? catLabel(pair.categoryId, pair.subCategoryId) : 'Tap to pick Cello pair'}
                                        onClick={() => setPicker({ title: 'Pick paired Cello product', sections: ourSectionsFor(r.categoryId, true), current: r.pairedProductId || '', onPick: (id) => savePair(r, id) })} />
                                </div>
                                {seesAll && <button type="button" className="kpm-comp-btn d xs" onClick={() => setModal({ kind: 'delRival', rival: r })}><Trash2 size={14} />Delete</button>}
                            </div>
                        );
                    }) : <div className="kpm-comp-empty">No rival products yet.</div>}
                </div>
            </div>
        </div>
    );

    /* ---------- modals ---------- */
    const catFields = (f) => {
        const cat = cats.find((c) => c.id === f.catId) || firstCat;
        const nearCat = f.catMode === 'new' ? (findDuplicateCategory(cats, f.newCatName) || null) : null;
        return <>
            <div className="kpm-comp-two">
                <button type="button" className={`opt ${f.catMode === 'existing' ? 'on' : ''}`} disabled={!cats.length} onClick={() => setF({ catMode: 'existing' })}><b>Add to an existing category</b><span>Pick Category › Sub from the shared list</span></button>
                <button type="button" className={`opt ${f.catMode === 'new' ? 'on' : ''}`} disabled={!canCats} onClick={() => setF({ catMode: 'new' })}><b>Add a new category</b><span>{canCats ? 'Shared with Master Vault ("competitors only · 0 of ours")' : 'Needs the category permission'}</span></button>
            </div>
            {f.catMode === 'existing' ? (
                <div className="kpm-comp-fg">
                    <label>Category<select className="kpm-comp-inp" value={f.catId} onChange={(e) => { const c = cats.find((x) => x.id === e.target.value); setF({ catId: e.target.value, subId: c?.subs?.[0]?.id || '' }); }}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                    <label>Sub-category<select className="kpm-comp-inp" value={f.subId} onChange={(e) => setF({ subId: e.target.value })}><option value="">—</option>{(cat?.subs || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                </div>
            ) : <>
                <div className="kpm-comp-fg">
                    <label>New category name<input className="kpm-comp-inp" value={f.newCatName} onChange={(e) => setF({ newCatName: e.target.value })} placeholder="e.g. Capsule" /></label>
                    <label>New sub-category name<input className="kpm-comp-inp" value={f.newSubName} onChange={(e) => setF({ newSubName: e.target.value })} placeholder="e.g. Berry 16" /></label>
                </div>
                {nearCat && <div className="kpm-comp-warn"><span>Duplicate warning: <b>{nearCat.name}</b> already exists. Pick it under "existing" instead.</span></div>}
            </>}
        </>;
    };

    const renderModal = () => {
        if (!modal) return null;
        const close = () => setModal(null);
        const f = modal;
        if (f.kind === 'price') return (
            <Overlay small onClose={close} label="Edit region price">
                <h4>Edit {f.region} · {f.ct} price</h4>
                <p><b>{f.rivalName}</b> · saved with your name and today's date.</p>
                <label className="kpm-comp-lbl">New price (Rp)<input className="kpm-comp-inp" type="number" inputMode="numeric" min="1" autoFocus value={f.price} onChange={(e) => setF({ price: e.target.value })} /></label>
                <div className="kpm-comp-dlg-row between">
                    {f.hasExisting ? <button type="button" className="kpm-comp-btn d" onClick={() => setF({ kind: 'delPrice' })}><Trash2 size={15} />Delete price</button> : <span />}
                    <div className="row-wrap"><button type="button" className="kpm-comp-btn q" onClick={close}>Cancel</button><button type="button" className="kpm-comp-btn" disabled={busy} onClick={savePrice}><Check size={15} />Save price</button></div>
                </div>
            </Overlay>
        );
        if (f.kind === 'delPrice') return (
            <Overlay small onClose={close} label="Delete rival price">
                <h4>Delete {f.region} · {f.ct} price?</h4>
                <p>Removes the saved price for <b>{f.rivalName}</b> so the cell returns to "not set yet". You can undo for 8 seconds after deleting.</p>
                <div className="kpm-comp-dlg-row"><button type="button" className="kpm-comp-btn q" onClick={close}>Keep price</button><button type="button" className="kpm-comp-btn d" onClick={() => deletePrice(f)}><Trash2 size={15} />Delete price</button></div>
            </Overlay>
        );
        if (f.kind === 'delRival') return (
            <Overlay small onClose={close} label="Delete rival product">
                <h4>Delete "{f.rival.name}"?</h4>
                <p>Removes this rival product and its saved prices in every region. You can undo for 8 seconds after deleting.</p>
                <div className="kpm-comp-dlg-row"><button type="button" className="kpm-comp-btn q" onClick={close}>Keep product</button><button type="button" className="kpm-comp-btn d" onClick={() => deleteRival(f.rival)}><Trash2 size={15} />Delete</button></div>
            </Overlay>
        );
        if (f.kind === 'reject') return (
            <Overlay small onClose={close} label="Reject report">
                <h4>Reject salesman report</h4>
                <p>Give a short reason so the salesman knows why this report was not added.</p>
                <label className="kpm-comp-lbl">Reason<input className="kpm-comp-inp" autoFocus value={f.reason} onChange={(e) => setF({ reason: e.target.value })} placeholder="e.g. Blurred price tag, promo already ended" /></label>
                <div className="kpm-comp-dlg-row"><button type="button" className="kpm-comp-btn q" onClick={close}>Cancel</button><button type="button" className="kpm-comp-btn d" onClick={confirmReject}>Reject report</button></div>
            </Overlay>
        );
        if (f.kind === 'cat') {
            const near = f.mode === 'add-cat' ? findDuplicateCategory(cats, f.name) : (f.mode === 'ren-cat' ? findDuplicateCategory(cats, f.name, f.cid) : null);
            return (
                <Overlay small onClose={close} label={f.title}>
                    <h4>{f.title}</h4>
                    <label className="kpm-comp-lbl">Name<input className="kpm-comp-inp" autoFocus value={f.name} onChange={(e) => setF({ name: e.target.value })} placeholder="Type name..." /></label>
                    {near && <div className="kpm-comp-warn"><span>Duplicate warning: <b>{near.name}</b> already exists.</span></div>}
                    <div className="kpm-comp-dlg-row"><button type="button" className="kpm-comp-btn q" onClick={close}>Cancel</button><button type="button" className="kpm-comp-btn" disabled={busy} onClick={saveCat}><Check size={15} />Save</button></div>
                </Overlay>
            );
        }
        if (f.kind === 'addRival') {
            const nearR = findNearRival(competitors, f.name);
            const pairObj = ourById(f.pair);
            const editRegs = regs.filter(mayEditRegion);
            return (
                <Overlay onClose={close} label="Add rival product">
                    <h4>Add rival product</h4>
                    <div className="kpm-comp-fg">
                        <label>Rival product name<input className="kpm-comp-inp" autoFocus value={f.name} onChange={(e) => setF({ name: e.target.value })} placeholder="e.g. Rival Mild Berry 16" /></label>
                        <div><span className="kpm-comp-lbl">Paired Cello product</span>
                            <PickButton label={pairObj ? pairObj.name : 'No pair yet'} sub={pairObj ? catLabel(pairObj.categoryId, pairObj.subCategoryId) : 'Same category shown first'}
                                onClick={() => setPicker({ title: 'Pick paired Cello product', sections: ourSectionsFor(f.catMode === 'existing' ? f.catId : '', true), current: f.pair, onPick: (id) => { setF({ pair: id }); setPicker(null); } })} />
                        </div>
                    </div>
                    {nearR && <div className="kpm-comp-warn"><span>Duplicate warning: looks like <b>{nearR.name}</b> already exists.</span></div>}
                    {catFields(f)}
                    {editRegs.length ? <>
                        <p>Starting prices for <b>{f.region}</b> (leave blank for "not set yet"; other regions stay unset):</p>
                        {editRegs.length > 1 && <label className="kpm-comp-lbl">Region for starting price<select className="kpm-comp-inp" value={f.region} onChange={(e) => setF({ region: e.target.value })}>{editRegs.map((rg) => <option key={rg} value={rg}>{rg}</option>)}</select></label>}
                        <div className="kpm-comp-fg three">
                            {[['retail', 'Retail'], ['grosir', 'Grosir'], ['ecer', 'Ecer']].map(([key, lbl]) => <label key={key}>{lbl} (Rp)<input className="kpm-comp-inp" type="number" inputMode="numeric" min="1" value={f[key]} onChange={(e) => setF({ [key]: e.target.value })} placeholder="optional" /></label>)}
                        </div>
                    </> : <p>No region to price yet - you can add prices later from the price table.</p>}
                    <div className="kpm-comp-dlg-row"><button type="button" className="kpm-comp-btn q" onClick={close}>Cancel</button><button type="button" className="kpm-comp-btn" disabled={busy} onClick={saveRival}><Check size={15} />Save rival product</button></div>
                </Overlay>
            );
        }
        if (f.kind === 'report') {
            const selRv = f.rivalId ? rivalById(f.rivalId) : null;
            return (
                <Overlay onClose={close} label="Report a rival">
                    <h4>Report a rival (sends to admin approval)</h4>
                    <div><span className="kpm-comp-lbl">Rival product</span>
                        <PickButton label={selRv ? selRv.name : '+ New product (not on the list yet)'} sub={selRv ? catLabel(selRv.categoryId, selRv.subCategoryId) : 'Type the new rival name below'}
                            onClick={() => setPicker({ title: 'Pick rival product', sections: rivalSections(true, myReg || f.region, f.customerType), current: f.rivalId, onPick: (id) => { setF({ rivalId: id }); setPicker(null); } })} />
                    </div>
                    <div className="kpm-comp-fg">
                        {!selRv && <label>New product name<input className="kpm-comp-inp" value={f.newName} onChange={(e) => setF({ newName: e.target.value })} placeholder="Type rival name..." /></label>}
                        <label>Shop name<input className="kpm-comp-inp" value={f.shopName} onChange={(e) => setF({ shopName: e.target.value })} placeholder="e.g. AMANAH BARU" /></label>
                        <label>Price seen (Rp)<input className="kpm-comp-inp" type="number" inputMode="numeric" min="1" value={f.price} onChange={(e) => setF({ price: e.target.value })} /></label>
                        <label>Customer type<select className="kpm-comp-inp" value={f.customerType} onChange={(e) => setF({ customerType: e.target.value })}>{CUST_TYPES.map((ct) => <option key={ct}>{ct}</option>)}</select></label>
                        <label>Shelf<select className="kpm-comp-inp" value={f.shelf} onChange={(e) => setF({ shelf: e.target.value })}>{SHELF_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></label>
                        <label>Promo<select className="kpm-comp-inp" value={f.promo} onChange={(e) => setF({ promo: e.target.value })}>{PROMO_OPTIONS.map((x) => <option key={x} value={x}>{x === 'None' ? 'No promo' : x}</option>)}</select></label>
                        <label>Selling speed<select className="kpm-comp-inp" value={f.speed} onChange={(e) => setF({ speed: e.target.value })}>{SPEED_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></label>
                        {!myReg && regs.length > 0 && <label>Region<select className="kpm-comp-inp" value={f.region} onChange={(e) => setF({ region: e.target.value })}>{regs.map((rg) => <option key={rg}>{rg}</option>)}</select></label>}
                    </div>
                    <label className="kpm-comp-lbl">Note<input className="kpm-comp-inp" value={f.note} onChange={(e) => setF({ note: e.target.value })} placeholder="Stock level, what the owner said..." /></label>
                    <div className="kpm-comp-dlg-row between">
                        <button type="button" className={`kpm-comp-btn ${f.photo ? '' : 'q'}`} onClick={() => setF({ photo: !f.photo })}><Camera size={15} />{f.photo ? 'Shelf photo taken' : 'I took a shelf photo'}</button>
                        <div className="row-wrap"><button type="button" className="kpm-comp-btn q" onClick={close}>Cancel</button><button type="button" className="kpm-comp-btn" disabled={busy} onClick={submitReport}><Check size={15} />Send for approval</button></div>
                    </div>
                </Overlay>
            );
        }
        if (f.kind === 'approve') {
            const rep = reports.find((x) => x.id === f.repId);
            if (!rep) return null;
            const reg = regionKeyOf(rep.region);
            const isNew = !rep.rivalId && !f.mergeId;
            const near = f.near ? rivalById(f.near) : null;
            const dup = isNew ? findNearRival(competitors, f.rivalName) : null;
            const pairObj = ourById(f.pair);
            const merged = f.mergeId ? rivalById(f.mergeId) : null;
            return (
                <Overlay onClose={close} label="Approve salesman report">
                    <h4>Approve report · {rep.shopName || 'shop'} ({reg})</h4>
                    <p>Salesman <b>{rep.reportedByName || '—'}</b> saw <b>{rp(rep.price)}</b> ({rep.customerType}) · {rep.speed} selling. Only <b>{reg} · {rep.customerType}</b> can change; other cells stay as they are.</p>
                    {!rep.rivalId && near && (
                        <div className="kpm-comp-warn">
                            <span>{merged ? <>Merging into <b>{merged.name}</b>.</> : <><b>Looks like {near.name}</b> already exists.</>}</span>
                            <button type="button" className="kpm-comp-btn xs" onClick={() => setF({ mergeId: merged ? '' : near.id })}><GitMerge size={14} />{merged ? 'Add as a new product instead' : 'Merge into existing'}</button>
                        </div>
                    )}
                    {isNew ? <>
                        <label className="kpm-comp-lbl">Rival product name<input className="kpm-comp-inp" value={f.rivalName} onChange={(e) => setF({ rivalName: e.target.value })} /></label>
                        {dup && dup.id !== near?.id && <div className="kpm-comp-warn"><span><b>Looks like {dup.name}</b> already exists.</span></div>}
                        {catFields(f)}
                        <div><span className="kpm-comp-lbl">Paired Cello product (optional · same category shown first)</span>
                            <PickButton label={pairObj ? pairObj.name : 'No pair yet'} sub={pairObj ? catLabel(pairObj.categoryId, pairObj.subCategoryId) : 'Tap to choose pair'}
                                onClick={() => setPicker({ title: 'Pick paired Cello product', sections: ourSectionsFor(f.catMode === 'existing' ? f.catId : '', true), current: f.pair, onPick: (id) => { setF({ pair: id }); setPicker(null); } })} />
                        </div>
                    </> : (
                        <div className="kpm-comp-two">
                            <button type="button" className={`opt ${f.priceAction === 'update' ? 'on' : ''}`} onClick={() => setF({ priceAction: 'update' })}><b>Update the region price</b><span>Sets {reg} {rep.customerType} to {rp(rep.price)} for every shop in this region</span></button>
                            <button type="button" className={`opt ${f.priceAction === 'note' ? 'on' : ''}`} onClick={() => setF({ priceAction: 'note' })}><b>Keep as a note only</b><span>Region price stays unchanged; the shop's report stays on record</span></button>
                        </div>
                    )}
                    <div className="kpm-comp-dlg-row"><button type="button" className="kpm-comp-btn q" onClick={close}>Cancel</button><button type="button" className="kpm-comp-btn" disabled={busy} onClick={confirmApprove}><Check size={15} />Confirm approval</button></div>
                </Overlay>
            );
        }
        return null;
    };

    /* ---------- shell ---------- */
    const tabs = [
        { id: 'rivals', label: 'Rival products', Icon: List, count: list.length },
        { id: 'compare', label: 'Compare', Icon: ArrowLeftRight },
        { id: 'reports', label: 'Reports', Icon: Inbox, count: waitReps.length },
        ...(canManage ? [{ id: 'manage', label: 'Manage', Icon: SlidersHorizontal }] : []),
    ];
    return (
        <div className="kpm-comp">
            <div className="kpm-comp-top">
                <b className="t">Competitors</b>
                <span className="sub">{seesAll ? `All regions · ${regs.length} shown` : (myReg ? `${myReg} only` : 'No region on your profile')}</span>
                <span className="sp" />
                {canReport && <button type="button" className="kpm-comp-btn q" onClick={() => openReport()}><Camera size={15} />{ph ? 'Report' : 'Report rival'}</button>}
                {canManage && <button type="button" className="kpm-comp-btn" onClick={openAddRival}><Plus size={15} />{ph ? 'Add' : 'Add rival product'}</button>}
            </div>
            <div className="kpm-comp-kpi">
                <div><span className="lbl">Rival products</span><b className="val">{competitors.length}</b><i>across {new Set(competitors.map((r) => r.categoryId || '')).size} categories</i></div>
                <div><span className="lbl">Regions shown</span><b className="val">{regs.length}</b><i>{seesAll ? 'Tier 3+ see all' : (myReg || 'none')}</i></div>
                <button type="button" className="click" onClick={() => setTab('reports')}><span className="lbl">Reports waiting</span><b className="val acc">{waitReps.length}</b><i>{canManage ? 'tap to approve' : 'sent to your admin'}</i></button>
                <div><span className="lbl">Region price gaps</span><b className={`val ${gapCount ? 'bad' : ''}`}>{gapCount === null ? '—' : gapCount}</b><i>{seesAll ? 'rivals priced differently by region' : 'Tier 3+ compares regions'}</i></div>
            </div>
            <div className="kpm-comp-tabs-wrap">
                <nav className="kpm-comp-tabs" role="tablist" aria-label="Competitors sections">
                    {tabs.map(({ id, label, Icon, count }) => (
                        <button type="button" key={id} role="tab" className="tab" aria-selected={tab === id} onClick={() => { setTab(id); setPhDetail(false); }}>
                            <Icon size={15} />{label}{count !== undefined ? <span className="cnt">{count}</span> : null}
                        </button>
                    ))}
                </nav>
            </div>
            {tab === 'rivals' && rivalsTab()}
            {tab === 'compare' && compareTab()}
            {tab === 'reports' && reportsTab()}
            {tab === 'manage' && canManage && manageTab()}
            <div className="kpm-comp-note">
                <Shield size={14} />
                <span><b>Permission defaults:</b></span>
                <span>See prices in all regions: <b>Tier 1–3</b></span>
                <span>· Approve reports &amp; edit prices: <b>Tier 1–4</b> (own region for Tier 4)</span>
                <span>· Report a rival: <b>every tier</b></span>
            </div>
            {renderModal()}
            {picker && <Picker {...picker} onClose={() => setPicker(null)} onPick={(id) => { const fn = picker.onPick; setPicker(null); fn(id); }} />}
        </div>
    );
}
