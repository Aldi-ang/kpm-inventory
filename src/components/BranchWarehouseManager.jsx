import React, { useState, useEffect, useMemo } from 'react';
import { Package, ArrowRight, CheckCircle, XCircle, AlertCircle, Clock, Send, Truck, ShieldCheck, Globe, MapPin, Pencil, MinusCircle, PlusCircle, User, FileText, Camera, ChevronDown, ChevronUp, Check, Eye, Save, X } from 'lucide-react';
import { collection, doc, onSnapshot, writeBatch, serverTimestamp, updateDoc, deleteDoc, runTransaction, increment } from 'firebase/firestore';
import { savePhotoAndGetReference, compressImageToBase64 } from '../utils/helpers';
/* Reused rather than rewritten: a Firestore Timestamp, an offline `{seconds}` and an unresolved
   serverTimestamp() are three different shapes, and this already handles all three. */
import { txSeconds } from '../utils/dayStats.js';
/* The supply maths is NOT rewritten here. `supplyByProduct` is the same function the dashboard
   readout runs on, so "di gudang / di tangan agen / terjual" on this screen and on the dashboard
   cannot drift into two different answers — which is the whole reason it lives in utils. His ask
   was literally *"just like what we have on the dashboard"*. */
import { supplyByProduct, warehouseList, MASTER, bufferDays } from '../utils/supply.js';
import { confirmAction } from './ConfirmGate.jsx';
import { notify } from './Toast.jsx';
import PonderButton from '../ponder/PonderButton.jsx';
/* The table below is rendered by the Ponder tutorial too, fed a fixed demo world. Same
   component in both places, so the tutorial cannot drift from the screen it teaches. */
import StockByWarehouseTable from '../ponder/stages/StockByWarehouseTable.jsx';
import ShipmentPlanTable from './ShipmentPlanTable.jsx';

/* ===========================================================================
   THE ARRIVAL CHECK — a count at the door, PARTIAL BLIND.

   Before this existed, `handleConfirmReceipt` was one yes/no button and the
   branch was credited whatever HQ SAID it shipped. A short shipment therefore
   became branch stock that does not physically exist, and it only surfaced
   weeks later at Stock Opname — as a mystery shortage that looks like theft at
   the branch. Wrong person blamed, and by then the claim against HQ or the
   courier is long dead: the industry rule is that a discrepancy must be filed
   BEFORE a clean receipt is signed.

   PARTIAL BLIND, on Aldi's decision 2026-08-23: the receiver sees WHICH
   products should be in the box but never HOW MANY. Same rule Stock Opname
   already uses for tiers below 3 — a number on screen anchors the count.
   Not FULLY blind (no product list either) because these products carry no
   barcodes, so a hand-written list would spawn "Cello Coffee" and "cello kopi"
   as two different things inside a week. Keeping the line visible also catches
   a product that is missing ENTIRELY — the receiver types 0 against it, where
   a fully blind count would simply never write that line.
   =========================================================================== */

/* One row per shipped line. `counted` stays null while the box is blank, which
   is what `receiptBlocked` refuses on — a blank is NOT a zero, and treating it
   as one would silently write off a whole product. */
export const receiptLines = (items, counts) => (items || []).map(item => {
    const entry = (counts || {})[item.productId] || {};
    const counted = parseInt(entry.counted, 10);
    const damaged = parseInt(entry.damaged, 10);
    const shipped = Number(item.qty) || 0;
    const hasCount = Number.isFinite(counted);
    return {
        productId: item.productId,
        name: item.name,
        shipped,
        counted: hasCount ? counted : null,
        damaged: Number.isFinite(damaged) ? damaged : 0,
        diff: hasCount ? counted - shipped : null
    };
});

/* Returns the reason it cannot be submitted, or null when it can. Message, not
   a boolean, so the screen can NAME the problem instead of just going grey. */
export const receiptBlocked = (lines) => {
    if (!lines || lines.length === 0) return 'this shipment has no items on it';
    if (lines.some(l => l.counted === null)) return 'count every line before you submit';
    if (lines.some(l => l.counted < 0 || l.damaged < 0)) return 'a count cannot be negative';
    const over = lines.find(l => l.damaged > l.counted);
    if (over) return `${over.name}: damaged cannot be more than what arrived`;
    return null;
};

/* Any difference at all, or any damage, makes it a dispute. NO TOLERANCE HERE,
   deliberately — Stock Opname tolerates one pack because selling in Batang
   leaves stock carrying a fraction of a pack, but a sealed shipment has no such
   fraction. A box is short or it is not. */
export const receiptDisputed = (lines) => (lines || []).some(l => l.diff !== 0 || l.damaged > 0);

/* ===========================================================================
   HOW OLD IS THE STOCK STANDING HERE — the freshness chain, read-only.

   Scoped by Aldi 2026-08-23: *"we just system that only care about the data
   related stuff on the company, as long as the product is sold its job done,
   company can take care of the item management inside the warehouse our app
   didnt need that much details for now"*. So this REPORTS age. It does not
   enforce which box leaves first, it does not warn, it does not block a
   shipment, and it asks him for no threshold. Handling stock in the warehouse
   is the company's job; the app's job is knowing.

   ⚠️ NO NEW WRITE PATH, AND NOTHING NEW TO TYPE. Every arrival is already on
   the shipment record — `receivedItems` and `receivedAt`, written by the
   arrival check — so this is pure arithmetic over documents that already exist,
   and it works on shipments received before it was built.

   The trick that keeps it honest: what is still on hand is DERIVED by
   subtraction against `stock`, never tracked separately. `stock` stays the one
   source of truth, so the ages cannot drift away from it — correct the stock at
   a weekly count and the ages correct themselves in the same breath.
   =========================================================================== */

/* Every arrival of one product at one branch, NEWEST FIRST.
   `counted` is preferred over `shipped` because the branch was credited what it
   counted; falling back to the shipped figure covers deliveries received before
   the arrival check existed, which would otherwise vanish from the history. */
export const productArrivals = (orders, branch, productId) => (orders || [])
    .filter(o => o && o.branch === branch && (o.status === 'DELIVERED' || o.status === 'DISPUTED'))
    .map(o => {
        const line = (o.receivedItems || []).find(r => r.productId === productId);
        const fallback = (o.fulfilledItems || o.requestedItems || o.items || [])
            .find(i => i.productId === productId);
        const qty = line ? Number(line.counted) - Number(line.damaged || 0)
                  : fallback ? Number(fallback.qty) : 0;
        return { orderId: o.id, at: txSeconds({ timestamp: o.receivedAt }), qty: Number(qty) || 0 };
    })
    .filter(a => a.qty > 0 && a.at != null)
    .sort((a, b) => b.at - a.at);

/* Which of those arrivals is still standing here, OLDEST FIRST.
   Walks newest-first spending the quantity on hand, so whatever the total does
   not stretch to is treated as long gone. `unexplained` is the remainder the
   records cannot account for — stock that arrived before any of this was
   recorded, or that came in some other way. It is reported rather than hidden:
   a age built on a number that does not add up is worse than no age at all. */
export const arrivalsOnHand = (arrivals, stock) => {
    let left = Math.max(0, Number(stock) || 0);
    const held = [];
    for (const a of (arrivals || [])) {
        if (left <= 0) break;
        const take = Math.min(left, a.qty);
        held.push({ ...a, qty: take });
        left -= take;
    }
    return { held: held.reverse(), unexplained: left };
};

/* Whole days since the oldest stock still standing here arrived. null when the
   records cannot say — never 0, because "brand new" and "we do not know" must
   not look the same. */
export const oldestStockDays = (held, nowSeconds) => {
    if (!held || held.length === 0) return null;
    const at = held[0].at;
    if (at == null) return null;
    return Math.max(0, Math.floor((nowSeconds - at) / 86400));
};

/* ===========================================================================
   HOW MANY SHOULD I ASK FOR (G3) — measured, never guessed, never automatic

   Today a branch admin picks a product and types a number into an empty box.
   Nothing on the screen tells them how fast it sells here, how long HQ takes,
   or that 500 of it is already on a truck — which is the classic way a branch
   orders twice and drowns.

   Everything below is DERIVED FROM RECORDS THAT ALREADY EXIST. No new setting,
   no new field, no lead-time number for anyone to type and forget. Two of the
   three inputs are measured from his own shipping history, and the third comes
   out by subtraction the same way the stock-age view works: everything that
   arrived is either still on the shelf or has left, so what left is the
   difference.

   ⛔ IT ONLY EVER SUGGESTS. Automatic reordering without a person is on his
   rejected list, and the box stays typeable — the suggestion is a button he can
   ignore. A check refuses any auto-fill.
   =========================================================================== */

const DAY = 86400;
const middle = (nums) => {
    const s = [...nums].sort((a, b) => a - b);
    if (!s.length) return null;
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/* THE BRANCH'S SHIPPING RHYTHM, both halves from the same list in one pass:
   `leadDays`   - how long HQ actually takes, ordered to arrived. The MEDIAN of
                  recent deliveries, not the mean: one shipment stuck for a month
                  should not drag the whole answer with it.
   `cadenceDays`- how often this branch orders at all, measured from the gaps
                  between its own requests. This is what stops the size of the
                  suggestion being a number somebody made up: a delivery has to
                  last until the NEXT order lands, and only his own history knows
                  how long that is.
   Both are null when there is not enough history, and null must stay null all
   the way to the screen — "we have not measured this yet" is the honest answer
   and it is different from zero. */
export const shipmentRhythm = (orders, branch, sample = 6) => {
    const mine = (orders || [])
        .filter(o => o && o.branch === branch)
        .map(o => ({
            asked: txSeconds({ timestamp: o.timestamp }),
            got: txSeconds({ timestamp: o.receivedAt })
        }))
        .filter(o => o.asked != null)
        .sort((a, b) => b.asked - a.asked);

    const leads = mine.filter(o => o.got != null && o.got >= o.asked)
        .slice(0, sample)
        .map(o => (o.got - o.asked) / DAY);
    /* Rounded up, and never below one: a shipment that arrived the same afternoon
       still cannot be relied on to arrive before you need it. */
    const leadDays = leads.length ? Math.max(1, Math.ceil(middle(leads))) : null;

    const gaps = [];
    for (let i = 0; i + 1 < mine.length && gaps.length < sample; i++) {
        gaps.push((mine[i].asked - mine[i + 1].asked) / DAY);
    }
    const cadenceDays = gaps.length ? Math.max(1, Math.round(middle(gaps))) : null;

    return { leadDays, cadenceDays, deliveries: leads.length, orders: mine.length };
};

/* Packs of this product already on their way here and NOT yet on the shelf.
   The single most useful number on the panel: ordering again while a truck is
   still moving is how a branch ends up with a year of stock.
   REJECTED and DELIVERED and DISPUTED are all settled — the first never arrives,
   the other two already did and are counted in the shelf figure. */
const SETTLED = ['DELIVERED', 'DISPUTED', 'REJECTED'];
export const inTransitQty = (orders, branch, productId) => (orders || [])
    .filter(o => o && o.branch === branch && !SETTLED.includes(o.status))
    .reduce((sum, o) => {
        const line = (o.fulfilledItems || o.requestedItems || o.items || [])
            .find(i => i && i.productId === productId);
        return sum + (Number(line?.qty) || 0);
    }, 0);

/* THE ADVICE. Everything it says, and why it can say it:

     rate      how many leave here a day. Everything that ever arrived is either
               still on the shelf or gone, so gone = arrived - stillHere, over
               the days since the first arrival. Needs two arrivals and a day of
               history before it will answer at all.
     daysLeft  what is on the shelf, at that rate.
     coverDays how long the delivery has to last: the wait for it PLUS the gap
               until he next places an order. Both measured. Neither invented.
               PLUS `spareDays`, which is the only term here he sets by hand.
     suggest   what to ask for so the shelf is not empty when the next one lands,
               minus what is here and what is already coming.

   Any missing input makes `suggest` null rather than a guess. A confident wrong
   number is worse than an empty box, because the empty box makes him think.

   ⚠️ `spareDays` DEFAULTS TO 0, and that is deliberate: every caller that existed
   before 2026-08-30 keeps the exact number it printed yesterday, so adding the
   cushion could not silently change the branch panel's advice at the same time as
   it added HQ's. Resolve it with `bufferDays(appSettings, branch)` from
   utils/supply.js — the ONE place that knows his per-cabang overrides. */
export const reorderAdvice = (arrivals, onHand, inTransit, rhythm, nowSeconds, spareDays = 0) => {
    const list = arrivals || [];
    const shelf = Math.max(0, Number(onHand) || 0);
    const coming = Math.max(0, Number(inTransit) || 0);
    const out = { ratePerDay: null, daysLeft: null, coverDays: null, suggest: null, spareDays: 0, shelf, coming };

    if (list.length < 2) return out;
    const oldest = list[list.length - 1].at;
    const days = (nowSeconds - oldest) / DAY;
    if (!(days >= 1)) return out;

    const arrived = list.reduce((s, a) => s + a.qty, 0);
    const { held } = arrivalsOnHand(list, shelf);
    const stillHere = held.reduce((s, a) => s + a.qty, 0);
    const gone = Math.max(0, arrived - stillHere);

    out.ratePerDay = gone / days;
    out.daysLeft = out.ratePerDay > 0 ? Math.floor(shelf / out.ratePerDay) : null;

    const lead = rhythm?.leadDays, cadence = rhythm?.cadenceDays;
    if (lead == null || cadence == null || out.ratePerDay <= 0) return out;

    const spare = Math.max(0, Number(spareDays) || 0);
    out.coverDays = lead + cadence + spare;
    out.spareDays = spare;
    out.suggest = Math.max(0, Math.ceil(out.ratePerDay * out.coverDays) - shelf - coming);
    return out;
};

export default function BranchWarehouseManager({ db, storage, appId, user, userRole, userLocation, isAdmin, masterUserId, globalInventory, triggerCapy, logAudit, appSettings, motorists = [], transactions = [], branchStockMap = {} }) {
    
    const isAreaAdmin = !isAdmin; // 🚀 THE FIX: Dynamically adapts to any custom Tier rank
    const branchLocation = userLocation || 'UNASSIGNED';

    const [requests, setRequests] = useState([]);
    const [branchStock, setBranchStock] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [requestCart, setRequestCart] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [requestQty, setRequestQty] = useState("");
    
    const [shippingAddress, setShippingAddress] = useState({
        jalan: "", kecamatan: "", kabupaten: "", provinsi: branchLocation !== 'UNASSIGNED' ? branchLocation : "", postalCode: ""
    });

    const [isProcessing, setIsProcessing] = useState(false);

    const [editingOrder, setEditingOrder] = useState(null);
    const [editSenderName, setEditSenderName] = useState(""); 
    const [editCourier, setEditCourier] = useState("");
    const [editTrackingNo, setEditTrackingNo] = useState("");
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);

    const [expandedRequest, setExpandedRequest] = useState(null);

    /* the arrival check. `receivingOrder` holds the order being counted; the
       counts live beside it keyed by productId so closing the panel throws the
       numbers away rather than half-writing them. */
    const [receivingOrder, setReceivingOrder] = useState(null);
    const [receiptCounts, setReceiptCounts] = useState({});

    /* Kept as the typed STRING, never coerced here. Coercing on every keystroke
       turns a half-typed "" into 0, and a 0 is a real answer — it would let a
       blank line pass the "count every line" guard. */
    const setReceiptCount = (productId, field, value) => setReceiptCounts(prev => ({
        ...prev, [productId]: { ...(prev[productId] || {}), [field]: value }
    }));

    /* Which branch HQ is looking at. Empty until it picks — an owner who lands on a
       branch he did not choose reads the numbers as company-wide. */

    /* Every branch that has ever asked HQ for stock, which is every branch that has any.
       Derived from the requests already on screen rather than read separately: there is no
       branch registry in this app, and inventing one to power a dropdown would be a second
       list to keep true. */

    /* ONE card, drawn the same way for the branch admin and for HQ. The age line below is the
       whole reason HQ needed this view, so it must not be a second copy that drifts. */
    /* ═══════════ GLOBAL LOGISTICS — where every pack is, per warehouse ═══════════
       His ask: *"show the regional warehouse current stock, on field, sold as well just like what
       we have on the dashboard, so HQ know how many bks should be send to them again"*.

       Four columns, and the collection behind each one is named on the screen because a number
       whose source cannot be named is a number nobody can check:
         di gudang       the branch's own inventory subcollection  (branchStockMap)
         di jalan        stock_requests not yet settled            (requests, via inTransitQty)
         di tangan agen  activeCanvas on that branch's vehicles    (motorists)
         terjual         SALE transactions, agent → roster → location

       ⚠️ TERJUAL IS SEVEN DAYS, NOT ALL TIME. The transactions listener is capped at seven days
       (useDatabaseSync.js — `where('timestamp', '>=', sevenDaysAgo)`), so an all-time total is not
       something this screen could compute even if it claimed to. The window is passed explicitly
       rather than inherited, so the heading stays true if that cap ever moves.
       ⚠️ MASTER has no "di jalan": stock_requests only ever run HQ → branch, so a figure there
       would be an empty sum dressed up as a measurement. It prints — instead. */
    const SEVEN_DAYS = 7;
    /* which warehouse row is opened out into its per-product detail. One at a time: this table is
       a comparison between warehouses, and three open drawers is no longer a comparison. */
    const [openGudang, setOpenGudang] = useState(null);
    const logistics = useMemo(() => {
        if (!isAdmin) return [];
        const since = new Date(Date.now() - SEVEN_DAYS * 86400000);
        /* narrowed to the warehouses the roster still lists — a branch that was removed keeps its
           last snapshot in the sync map, and counting it would quietly inflate every total. The
           dashboard narrows the same way, for the same reason. */
        const names = warehouseList(motorists);
        const live = Object.fromEntries(
            Object.entries(branchStockMap || {}).filter(([n]) => names.includes(n))
        );
        /* One rhythm per cabang, not one per product row. `shipmentRhythm` walks that cabang's whole
           request history, and it is the SAME answer for every product in it — computing it inside
           the per-product map would re-walk the list once per product for no different result. */
        const rhythms = new Map(names.map(nm => [nm, shipmentRhythm(requests, nm)]));
        const rhythmOf = (nm) => rhythms.get(nm);

        return names.map(name => {
            const rows = supplyByProduct({
                inventory: globalInventory, branchStock: live, motorists, transactions,
                since, warehouse: name,
            });
            const shelf = rows.reduce((s, r) => s + r.shelf, 0);
            const field = rows.reduce((s, r) => s + r.field, 0);
            const sold  = rows.reduce((s, r) => s + r.sold, 0);

            /* ── THE PER-PRODUCT DETAIL. His ask: *"so that i can see the full detail for every
                  single item status, not just all product as a whole"*. It costs nothing to build —
                  supplyByProduct already returns one row PER PRODUCT and the four totals above are
                  just that list summed. The drawer prints the list the totals came from.

               ⚠️ A PRODUCT CAN BE IN TRANSIT TO A WAREHOUSE THAT HOLDS NONE OF IT. supplyByProduct
                  drops any row whose shelf+field+sold is 0, which is right for a supply picture but
                  wrong here: a brand-new branch waiting on its first delivery has exactly that
                  shape, and it is the one case where "what is coming" is the whole answer. So the
                  in-transit products are UNIONED back in rather than looked up inside the list.
                  Bandung is that branch today, which is how this was noticed at all. */
            const byId = new Map(rows.map(p => [p.id, { id: p.id, name: p.name, shelf: p.shelf, field: p.field, sold: p.sold, transit: 0 }]));
            if (name !== MASTER) {
                (globalInventory || []).forEach(p => {
                    const q = inTransitQty(requests, name, p.id);
                    if (q <= 0) return;
                    if (!byId.has(p.id)) byId.set(p.id, { id: p.id, name: p.name, shelf: 0, field: 0, sold: 0, transit: 0 });
                    byId.get(p.id).transit = q;
                });
            }
            /* the age line "Isi Gudang Cabang" prints, carried over with the numbers — it is the
               half of that panel that is not already in the four columns, and it is the half that
               tells him WHICH stock to move first. MASTER has no stock_request arrivals to age
               against, so it comes back null there and simply does not print. */
            const nowSec = Math.floor(Date.now() / 1000);
            const detail = [...byId.values()]
                .map(p => {
                    /* 🔴 BRANCHES ONLY, and this was wrong on its first run. The whole arrivals
                       machinery matches shelf stock against the stock_requests that DELIVERED it —
                       and nothing is ever delivered to the master vault that way. It is stocked by
                       `procurements`, the surat jalan masuk on the desk above. So asking it to age
                       master stock returned "no arrivals", which `arrivalsOnHand` correctly reports
                       as unexplained — and every master row printed "10.900 TANPA ASAL" in danger
                       red. Perfectly working code, asked a question it has no data for, answering
                       in the loudest colour on the screen. Master gets no age line at all. */
                    /* PER ITEM, the same two figures the warehouse row shows — because "which
                       warehouse needs stock" is only half an answer. WHICH PRODUCT is the other
                       half, and a warehouse total hides a product that is about to run dry behind
                       four that are not. Both come off `sold`, which is a 7-day count, so the
                       monthly figure is an EXTRAPOLATION and is labelled ≈ on screen. */
                    const rate = p.sold / SEVEN_DAYS;
                    const money = {
                        perMonth: Math.round(rate * 30),
                        daysLeft: rate > 0 ? Math.floor(p.shelf / rate) : null,
                    };
                    if (name === MASTER) return { ...p, ...money, days: null, drops: 0, unexplained: 0, minimum: null };
                    const arrivals = productArrivals(requests, name, p.id);
                    const { held, unexplained } = arrivalsOnHand(arrivals, p.shelf);
                    /* ── MINIMAL KIRIM, the same floor the shipment form prints ──
                       His ask, 2026-08-30: a panel that shows the recommendation for every cabang
                       side by side, so a short production run can be split. Same function the Kirim
                       form calls, same per-cabang cushion — three screens, one answer.
                       ⚠️ MASTER gets null, not 0. The master vault is where shipments come FROM;
                       "how much should be sent to the source" is a question with no meaning, and a
                       0 there would read as "it needs nothing", which is a different claim. */
                    const minimum = reorderAdvice(arrivals, p.shelf, p.transit, rhythmOf(name), nowSec,
                                                  bufferDays(appSettings, name)).suggest;
                    return { ...p, ...money, days: oldestStockDays(held, nowSec), drops: held.length, unexplained, minimum };
                })
                .sort((a, b) => (b.shelf + b.transit + b.field + b.sold) - (a.shelf + a.transit + a.field + a.sold));

            /* summed from the SAME list the drawer prints, so the row total and its detail can
               never disagree. Nothing is ever in transit TO the master vault on a stock_request. */
            const transit = name === MASTER
                ? null
                : detail.reduce((s, p) => s + p.transit, 0);

            /* 🔴 THERE IS DELIBERATELY NO WAREHOUSE-LEVEL "days left", and there was one until
               2026-08-27. It divided TOTAL shelf by TOTAL sales rate, and Aldi caught it on
               screen: *"u cant just divide total with the average goods like that, these are
               different goods should have their own depleted number"*. He is right, and it is the
               classic ratio-of-sums error.

               The master vault read 348 days. That rate — 500 a week — was ENTIRELY Cello
               Chocolate; the other four products sold nothing at all. So 348 silently answered
               "how long until everything is gone, if any product could satisfy demand for any
               other". Nobody sells Cello Mmrapi to a customer who wants Chocolate. The real
               answer, one row down in the drawer, was 20 days — and the aggregate was seventeen
               times more comfortable than the truth, which is the worst direction for a restocking
               figure to be wrong in.

               Bks ADD across products, so `shelf`, `sold` and `perMonth` stay: a total pack count
               is a real quantity. Only the DIVISION is invalid, because it needs the numerator and
               denominator to describe the same fungible good. Days-left lives per product now. */
            const perDay = sold / SEVEN_DAYS;
            const perMonth = Math.round(perDay * 30);

            /* 🔴 THE WAREHOUSE-LEVEL MINIMUM *IS* A LEGITIMATE SUM, unlike days-left above, and the
               difference is worth stating because the two columns sit next to each other. Bks ADD:
               "send this cabang 440 packs in total" is a real quantity, and splitting it across
               products is what the drawer is for. Days-left is a DIVISION and needs its numerator
               and denominator to describe the same fungible good, which is why it has no
               warehouse-level answer. Summing quantities is fine; averaging rates is the error.

               null when nothing under it could be measured — a 0 would claim the cabang needs
               nothing, when the truth is that nobody knows yet. */
            const measured = detail.filter(p => p.minimum !== null && p.minimum !== undefined);
            const minimum = name === MASTER || measured.length === 0
                ? null
                : measured.reduce((s, p) => s + p.minimum, 0);

            return { name, shelf, transit, field, sold, perMonth, minimum, detail };
        });
    }, [isAdmin, motorists, transactions, branchStockMap, globalInventory, requests, appSettings]);

    const gTotal = (k) => logistics.reduce((s, r) => s + (Number(r[k]) || 0), 0);

    /* ═══════════ RENCANA KIRIM — the same floors, turned on their side ═══════════
       A TRANSPOSE, NOT A CALCULATION. Every number here already exists inside `logistics`; this
       flips it from one-row-per-warehouse to one-row-per-product so a short production run can be
       split across cabang. Re-deriving any of it would put a third implementation of "how many"
       on the screen, and three implementations is how three answers happen.

       `short` is the only genuinely new figure, and it is the reason the panel exists: what the
       master vault holds, measured against what every cabang needs. Nothing else in the app says
       "this cannot all be sent". */
    const shipmentPlan = useMemo(() => {
        const branches = logistics.filter(r => r.name !== MASTER).map(r => r.name);
        const master = logistics.find(r => r.name === MASTER);
        const hqOf = (id) => Number((master?.detail || []).find(p => p.id === id)?.shelf) || 0;

        /* Every product ANY cabang has an opinion about, master included so a product held only at
           HQ still shows its stock rather than vanishing from the plan. */
        const names = new Map();
        logistics.forEach(r => (r.detail || []).forEach(p => names.set(p.id, p.name)));

        return [...names.entries()].map(([id, name]) => {
            const byBranch = {};
            branches.forEach(b => {
                const row = logistics.find(r => r.name === b);
                const item = (row?.detail || []).find(p => p.id === id);
                byBranch[b] = item ? item.minimum : null;   // null = not measurable here yet
            });
            const measured = Object.values(byBranch).filter(v => v != null);
            /* null, never 0, when no cabang could be measured — "nobody knows" and "nobody needs
               any" are different answers and the screen must not merge them. */
            const needed = measured.length === 0 ? null : measured.reduce((s, v) => s + v, 0);
            const hq = hqOf(id);
            return { id, name, hq, byBranch, needed, short: needed == null ? null : Math.max(0, needed - hq) };
        }).sort((a, b) => (b.short || 0) - (a.short || 0) || (b.needed || 0) - (a.needed || 0));
    }, [logistics]);

    const planBranches = useMemo(
        () => logistics.filter(r => r.name !== MASTER).map(r => r.name), [logistics]);

    const stockCard = (item) => {
        const arrivals = productArrivals(requests, branchLocation, item.productId || item.id);
        const { held, unexplained } = arrivalsOnHand(arrivals, item.stock);
        const days = oldestStockDays(held, Math.floor(Date.now() / 1000));
        return (
            <div key={item.id} className="bg-black/40 p-3 sm:p-4 rounded-xl border border-line-2 shadow-inner">
                <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-white uppercase text-sm truncate">{item.name}</span>
                    <span className="text-lg font-black text-gold shrink-0">{item.stock} <span className="text-[10px] text-ink-muted font-bold">Bks</span></span>
                </div>
                {(days !== null || unexplained > 0) && (
                    <details className="group/age mt-2 pt-2 border-t border-line-2">
                        <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest text-ink-muted hover:text-ink">
                            <span className="tabular-nums">
                                {days !== null
                                    ? <>Paling lama di sini <b className="text-ink font-black">{days} hari</b></>
                                    : <>Umur belum tercatat</>}
                                {held.length > 1 && <span className="text-ink-muted"> · {held.length} kiriman</span>}
                            </span>
                            <ChevronDown size={12} className="group-open/age:rotate-180 transition-transform shrink-0"/>
                        </summary>
                        <div className="mt-2 space-y-1">
                            {held.map(h => (
                                <div key={h.orderId} className="flex justify-between gap-2 text-[10px] font-mono tabular-nums text-ink-muted">
                                    <span>{new Date(h.at * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                                    <span className="truncate opacity-60">{h.orderId}</span>
                                    <span className="text-ink font-bold shrink-0">{h.qty} Bks</span>
                                </div>
                            ))}
                            {/* Said out loud rather than hidden. Stock the shipment records cannot
                                account for is older than the records themselves — pretending it is
                                part of the newest delivery would make the age read younger than it is. */}
                            {unexplained > 0 && (
                                <div className="flex justify-between gap-2 text-[10px] font-mono tabular-nums text-ink-muted border-t border-line-2 pt-1 mt-1">
                                    <span className="italic">sebelum ada catatan</span>
                                    <span className="text-ink font-bold shrink-0">{unexplained} Bks</span>
                                </div>
                            )}
                        </div>
                    </details>
                )}
            </div>
        );
    };

    const getAdminName = () => appSettings?.adminDisplayName || user?.displayName || (user?.email || "").split('@')[0] || "HQ Admin";

    useEffect(() => {
        if (isAreaAdmin) {
            const savedAddress = localStorage.getItem(`kpm_address_${branchLocation}`);
            if (savedAddress) {
                try { setShippingAddress(JSON.parse(savedAddress)); } catch(e) {}
            }
        }
    }, [isAreaAdmin, branchLocation]);

    useEffect(() => {
        if (!masterUserId || !appId) return;
        setIsLoading(true);

        const reqRef = collection(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`);
        const unsubReq = onSnapshot(reqRef, (snap) => {
            let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (isAreaAdmin) data = data.filter(r => r.branch === branchLocation);
            setRequests(data.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
            setIsLoading(false);
        }, (err) => { console.warn("Restock requests listener:", err.code); setIsLoading(false); });

        /* Which warehouse's shelf to watch. The branch admin gets their own and has no choice;
           HQ gets whichever one it picked, and nothing until it picks — Aldi, 2026-08-23:
           *"i think tier 1 also need to see regional warehouse components that only regional
           admin could see because me as tier 1 cant see that"*. He owns the company and could
           not see his own branches' shelves. */
        /* branch-side only since the HQ picker was deleted — HQ reads every warehouse at once
           from `branchStockMap`, so it no longer needs a listener on one branch at a time. */
        const watching = isAreaAdmin ? branchLocation : '';
        let unsubStock = () => {};
        if (watching && watching !== 'UNASSIGNED') {
            const stockRef = collection(db, `artifacts/${appId}/users/${masterUserId}/branches/${watching}/inventory`);
            unsubStock = onSnapshot(stockRef, (snap) => {
                setBranchStock(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }, (err) => console.warn("Branch inventory listener:", err.code));
        } else {
            /* Cleared, not left behind. Switching branch must never show the previous
               branch's shelf under the new branch's name. */
            setBranchStock([]);
        }

        return () => { unsubReq(); unsubStock(); };
    }, [db, appId, masterUserId, isAreaAdmin, branchLocation]);

    const handleAddToCart = () => {
        if (!selectedProduct || !requestQty || Number(requestQty) <= 0) return notify("Select a product and valid quantity.");
        const product = globalInventory.find(p => p.id === selectedProduct);
        if (!product) return;

        setRequestCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item => item.productId === product.id ? { ...item, qty: item.qty + Number(requestQty) } : item);
            }
            return [...prev, { productId: product.id, name: product.name, qty: Number(requestQty), unit: 'Bungkus' }];
        });
        setRequestQty("");
        setSelectedProduct("");
    };

    const removeFromCart = (pid) => setRequestCart(prev => prev.filter(item => item.productId !== pid));

    const handleSubmitRequest = async () => {
        if (requestCart.length === 0) return;
        
        if (!shippingAddress.jalan || !shippingAddress.kecamatan || !shippingAddress.kabupaten || !shippingAddress.provinsi) {
            return notify("ALAMAT TIDAK LENGKAP!\n\nMohon lengkapi data alamat pengiriman (Jalan, Kecamatan, Kabupaten, Provinsi) agar HQ dapat memproses pengiriman.");
        }

        if (!await confirmAction(`Submit stock request to HQ for ${branchLocation}?`)) return;
        setIsProcessing(true);

        try {
            localStorage.setItem(`kpm_address_${branchLocation}`, JSON.stringify(shippingAddress));

            const batch = writeBatch(db);
            const reqId = `REQ_${Date.now()}`;
            const reqRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, reqId);
            
            batch.set(reqRef, {
                id: reqId,
                branch: branchLocation,
                requestedBy: user.email,
                requestedByName: user.displayName || (user.email || "").split('@')[0], 
                requestedItems: requestCart, 
                deliveryAddress: shippingAddress,
                status: 'PENDING',
                workflowTimeline: [{
                    status: 'PENDING',
                    time: new Date().toISOString(),
                    msg: 'Request submitted to HQ.'
                }],
                timestamp: serverTimestamp()
            });

            await batch.commit();
            triggerCapy(`Request sent to HQ! 🚀`);
            logAudit("STOCK_REQUEST", `${branchLocation} requested ${requestCart.length} items.`);
            setRequestCart([]);
            setIsProcessing(false);
        } catch (e) {
            notify("Failed to submit request: " + e.message);
            setIsProcessing(false);
        }
    };

    // 🚀 THE FIX: TRANSACTION READ BEFORE WRITE ENGINE 🚀
    const handleConfirmReceipt = async (order, lines) => {
        const blocked = receiptBlocked(lines);
        if (blocked) return notify(`BELUM BISA DISIMPAN\n\n${blocked}.`);

        const disputed = receiptDisputed(lines);
        const summary = lines
            .filter(l => l.diff !== 0 || l.damaged > 0)
            .map(l => `• ${l.name}: dikirim ${l.shipped}, diterima ${l.counted}${l.damaged > 0 ? `, rusak ${l.damaged}` : ''}`)
            .join('\n');

        const question = disputed
            ? `SELISIH DITEMUKAN — ${order.id}\n\n${summary}\n\nStok gudang ${branchLocation} akan bertambah sesuai HITUNGAN ANDA, bukan angka kiriman HQ, dan selisih ini dilaporkan ke HQ. Lanjutkan?`
            : `Semua cocok — ${order.id}\n\nBarang masuk ke gudang ${branchLocation}. Lanjutkan?`;

        if (!await confirmAction(question)) return;
        setIsProcessing(true);

        try {
            await runTransaction(db, async (t) => {
                // --- PHASE 1: EXECUTE ALL READS ---

                // 1. Read Order Document
                const orderRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, order.id);
                const orderSnap = await t.get(orderRef);
                if (!orderSnap.exists()) throw new Error("Order not found in database!");
                const orderData = orderSnap.data();

                /* 2. REFUSE A SECOND CREDIT. Read inside the transaction, not from
                   the `order` prop — the prop is a snapshot from the listener and a
                   second tap can reach here before it refreshes. Without this, two
                   taps credited the branch twice and invented stock out of nothing. */
                if (orderData.status === 'DELIVERED' || orderData.status === 'DISPUTED') {
                    throw new Error("Kiriman ini sudah diterima. Stok tidak ditambah dua kali.");
                }

                // 3. Read All Branch Inventory Documents
                const inventorySnaps = await Promise.all(lines.map(async (line) => {
                    const branchItemRef = doc(db, `artifacts/${appId}/users/${masterUserId}/branches/${order.branch}/inventory`, line.productId);
                    const snap = await t.get(branchItemRef);
                    return { ref: branchItemRef, snap, line };
                }));

                // --- PHASE 2: EXECUTE ALL WRITES ---

                /* 1. Write to Branch Inventory. THE WHOLE POINT OF THIS SCREEN IS
                   THIS LINE: the branch is credited what it COUNTED, never what HQ
                   claimed to have sent. Damaged units arrived, so they are real
                   stock — they just are not sellable, and go to `damagedStock`
                   exactly as Stock Opname already models them. */
                inventorySnaps.forEach(({ ref, snap, line }) => {
                    const current = snap.exists() ? snap.data() : {};
                    const good = line.counted - line.damaged;
                    t.set(ref, {
                        productId: line.productId,
                        name: line.name,
                        stock: (current.stock || 0) + good,
                        damagedStock: (current.damagedStock || 0) + line.damaged,
                        lastReceivedAt: serverTimestamp(),
                        lastReceivedFrom: order.id
                    }, { merge: true });
                });

                // 2. Write Order Update
                const receiverName = user.displayName || (user.email || "").split('@')[0];
                const updatedTimeline = [...(orderData.workflowTimeline || [])];
                updatedTimeline.push({
                    status: disputed ? 'DISPUTED' : 'DELIVERED',
                    time: new Date().toISOString(),
                    msg: disputed
                        ? `Dihitung ulang oleh ${receiverName} di gudang — ADA SELISIH:\n${summary}`
                        : `Dihitung oleh ${receiverName} di gudang — jumlah cocok dengan kiriman.`
                });

                t.update(orderRef, {
                    status: disputed ? 'DISPUTED' : 'DELIVERED',
                    /* what actually arrived, line by line, kept beside what was sent.
                       This is the OS&D record — the evidence a claim is made from. */
                    receivedItems: lines.map(l => ({
                        productId: l.productId, name: l.name,
                        shipped: l.shipped, counted: l.counted, damaged: l.damaged, diff: l.diff
                    })),
                    receiptVariance: disputed,
                    receivedAt: serverTimestamp(),
                    receivedBy: user.email,
                    workflowTimeline: updatedTimeline
                });
            });

            if (disputed) {
                notify(`SELISIH DILAPORKAN KE HQ\n\nGudang ${branchLocation} dikredit sesuai hitungan Anda. HQ melihat kiriman ${order.id} sebagai bersengketa.`);
                logAudit("STOCK_RECEIVE_VARIANCE", `${branchLocation} reported a variance on ${order.id}: ${summary.replace(/\n/g, ' | ')}`);
            } else {
                triggerCapy(`${branchLocation} Inventory updated! Thank you. ✅`);
                logAudit("STOCK_RECEIVE", `${branchLocation} confirmed receipt of ${order.id}`);
            }
            setReceivingOrder(null);
            setReceiptCounts({});
            setIsProcessing(false);
        } catch(e) {
            console.error(e);
            notify("Error confirming receipt: " + e.message);
            setIsProcessing(false);
        }
    };

    /* The fulfilment path — the queue, the shipping modal and the six handlers behind them —
       moved to the Restock Vault desk's Request tab on 2026-08-27. It answered a BRANCH request
       but it lived on the BRANCH screen, three screens away from the desk that owns every other
       surat jalan. This component is HQ's warehouse readout now, not HQ's outbox. */

    const handleStartEditingOrder = (order) => {
        setEditingOrder(order);
        setEditSenderName(order.senderName || getAdminName());
        setEditCourier(order.courier || "");
        setEditTrackingNo(order.trackingNo || "");
    };

    const handleSaveOrderEdit = async () => {
        if (!editingOrder) return;
        if (!editCourier || !editTrackingNo || !editSenderName) return notify("Sender Name, Logistic Company, and Tracking No are required.");
        
        setIsProcessingOrder(true);
        try {
            const orderRef = doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, editingOrder.id);
            
            const updatedTimeline = [...(editingOrder.workflowTimeline || [])];
            updatedTimeline.push({
                status: 'SYSTEM_EDIT',
                time: new Date().toISOString(),
                msg: `HQ Admin (${getAdminName()}) updated shipping info.\nOld: ${editingOrder.courier} (${editingOrder.trackingNo}) by ${editingOrder.senderName || 'N/A'}\nNew: ${editCourier} (${editTrackingNo}) by ${editSenderName}`
            });

            await updateDoc(orderRef, {
                senderName: editSenderName, 
                courier: editCourier,
                trackingNo: editTrackingNo,
                workflowTimeline: updatedTimeline
            });
            
            triggerCapy("Shipping data updated successfully! 📝");
            logAudit("STOCK_EDIT_LOG", `Admin edited shipping info for ${editingOrder.id}`);
            setEditingOrder(null);
            setIsProcessingOrder(false);
        } catch (e) {
            notify("Failed to edit record: " + e.message);
            setIsProcessingOrder(false);
        }
    };

    const handleDeleteRequest = async (orderId) => {
        if (!await confirmAction(`⚠️ WARNING: DELETE RECORD?\n\nAre you sure you want to permanently delete Order: ${orderId}?\n\nNote: This only deletes the history paper-trail. It will NOT automatically refund or reverse warehouse math.`)) return;
        
        setIsProcessing(true);
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${masterUserId}/stock_requests`, orderId));
            triggerCapy(`Record ${orderId} deleted permanently. 🗑️`);
            logAudit("STOCK_DELETE_LOG", `Admin deleted request ${orderId}`);
            setIsProcessing(false);
        } catch(e) {
            notify("Failed to delete record: " + e.message);
            setIsProcessing(false);
        }
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            'PENDING': 'bg-raised text-orange border border-orange/50',
            'REJECTED': 'bg-danger-well text-danger-text border border-danger/50',
            'IN_TRANSIT': 'bg-raised text-gold border border-gold/50 animate-pulse',
            'DELIVERED': 'bg-verified-fill text-verified border border-verified/50',
            /* DISPUTED is a real outcome, not a failure — the goods ARE in the
               warehouse and the count IS filed. Red because HQ still owes an
               answer, never grey: a grey chip reads as "nothing to do here". */
            'DISPUTED': 'bg-danger-well text-danger-text border border-danger/50',
            'SYSTEM_EDIT': 'bg-raised text-ink-muted border border-line-3',
        };
        const icons = {
            'PENDING': <Clock size={12}/>,
            'REJECTED': <XCircle size={12}/>,
            'IN_TRANSIT': <Truck size={12}/>,
            'DELIVERED': <CheckCircle size={12}/>,
            'DISPUTED': <AlertCircle size={12}/>,
            'SYSTEM_EDIT': <Pencil size={12}/>,
        };
        const labels = {
            'PENDING': 'Menunggu Konfirmasi',
            'REJECTED': 'Ditolak',
            'IN_TRANSIT': 'Dalam Pengiriman',
            'DELIVERED': 'Diterima',
            'DISPUTED': 'Diterima — Ada Selisih',
            'SYSTEM_EDIT': 'Sistem Edit',
        }
        return (
            <span className={`text-[11px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1.5 shadow-inner ${styles[status] || 'bg-raised'} whitespace-nowrap`}>
                {icons[status] || null} {labels[status] || status}
            </span>
        );
    };

    const OrderTrackingModule = ({ order }) => {
        /* DISPUTED counts as delivered: the goods are physically in the warehouse
           and the count is filed. What is still open is HQ's answer, not the
           receipt — so the receive button must not come back and offer a second
           credit. */
        const isDelivered = order.status === 'DELIVERED' || order.status === 'DISPUTED';
        const isFulfillableByTier3 = isAreaAdmin && order.status === 'IN_TRANSIT';

        return (
            <div className="bg-black/50 rounded-2xl border border-line-2 p-4 sm:p-6 animate-fade-in mt-2 mb-4">
                <div className="flex flex-col lg:flex-row gap-6 mb-8 border-b border-line-2 pb-6">
                    <div className="flex-1 bg-panel p-4 sm:p-5 rounded-xl border border-line-2 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Truck size={80} className="text-gold"/></div>
                        
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Informasi Pengiriman (TMS)</h4>
                            {isAdmin && (order.status === 'IN_TRANSIT' || order.status === 'DELIVERED') && (
                                <button onClick={(e) => { e.stopPropagation(); handleStartEditingOrder(order); }} className="text-[11px] bg-raised hover:bg-line-2 text-gold px-2 py-1 rounded border border-line-3 font-bold uppercase flex items-center gap-1 transition-colors relative z-10 shadow-lg">
                                    <Pencil size={10}/> Edit Data
                                </button>
                            )}
                        </div>

                        {order.status === 'PENDING' ? (
                            <div className="text-center py-5 text-ink-muted italic text-xs relative z-10">Menunggu HQ Mempersiapkan Barang...</div>
                        ) : order.status === 'REJECTED' ? (
                            <div className="text-center py-5 text-danger-text font-bold text-xs uppercase tracking-widest relative z-10">PERMINTAAN DITOLAK HQ</div>
                        ) : (
                            <div className="space-y-2.5 relative z-10">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm gap-1 sm:gap-0">
                                    <span className="text-ink-muted flex items-center gap-2"><User size={14}/> Dikirim Oleh (Sender)</span>
                                    <span className="font-bold text-orange uppercase">{order.senderName || order.fulfilledBy?.split('@')[0] || 'HQ Admin'}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm gap-1 sm:gap-0">
                                    <span className="text-ink-muted flex items-center gap-2"><Truck size={14}/> Logistic Company</span>
                                    <span className="font-bold text-white uppercase">{order.courier || 'N/A'}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm gap-1 sm:gap-0">
                                    <span className="text-ink-muted flex items-center gap-2"><FileText size={14}/> No. Resi</span>
                                    <span className="font-bold text-gold uppercase font-mono tracking-wider bg-black/50 px-2 py-0.5 rounded border border-line-2 self-start sm:self-auto">{order.trackingNo || 'N/A'}</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Opens the arrival check. The count panel itself is rendered OUTSIDE
                            this component on purpose — `OrderTrackingModule` is declared inside
                            `BranchWarehouseManager`, so it is a new function on every render and
                            React remounts it. An input living in here would lose focus after
                            every single keystroke. */}
                        {isFulfillableByTier3 && (
                            <button onClick={() => { setReceivingOrder(order); setReceiptCounts({}); }} disabled={isProcessing} className="w-full mt-5 py-3.5 bg-gold hover:bg-gold/90 text-gold-ink rounded-lg font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 relative z-10">
                                <Package size={18}/>
                                HITUNG & TERIMA BARANG
                            </button>
                        )}
                        {isDelivered && (
                            <div className={`mt-5 py-3 rounded-lg text-center text-xs font-bold flex items-center justify-center gap-2 relative z-10 border ${order.receiptVariance ? 'bg-danger-well border-danger/50 text-danger-text' : 'bg-verified-fill border-verified/50 text-verified'}`}>
                                {order.receiptVariance
                                    ? <><AlertCircle size={16}/> Diterima dengan Selisih — Dilaporkan ke HQ</>
                                    : <><Check size={16}/> Barang Sudah Diterima Branch</>}
                            </div>
                        )}
                        {/* What actually arrived, beside what was sent. This is the OS&D record:
                            the evidence the branch argues a claim from, so it stays on the card
                            forever rather than living only in the timeline text. */}
                        {isDelivered && Array.isArray(order.receivedItems) && order.receivedItems.length > 0 && (
                            <div className="mt-3 bg-black/40 rounded-lg border border-line-2 p-3 relative z-10">
                                <h5 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2">Hasil Hitung di Gudang</h5>
                                <div className="space-y-1.5">
                                    {order.receivedItems.map(r => (
                                        <div key={r.productId} className="flex justify-between items-center gap-3 text-[11px]">
                                            <span className="text-ink font-bold uppercase truncate">{r.name}</span>
                                            <span className="font-mono shrink-0 tabular-nums">
                                                <span className="text-ink-muted">{r.shipped}</span>
                                                <span className="text-ink-muted mx-1">→</span>
                                                <span className={r.diff === 0 ? 'text-ink' : 'text-danger-text font-black'}>{r.counted}</span>
                                                {r.diff !== 0 && <span className="text-danger-text font-black ml-1">({r.diff > 0 ? '+' : ''}{r.diff})</span>}
                                                {r.damaged > 0 && <span className="text-danger-text ml-2">rusak {r.damaged}</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-full lg:w-56 shrink-0 bg-panel p-3 rounded-xl border border-line-2 shadow-xl flex flex-col items-center relative z-10">
                        <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Bukti Pengiriman (HQ)</h4>
                        {order.packagePhotoUrl ? (
                            <a href={order.packagePhotoUrl} target="_blank" rel="noreferrer" className="block group w-full">
                                <img src={order.packagePhotoUrl} alt="Shipment Proof" className="w-full h-40 object-cover rounded-lg border-2 border-line-2 group-hover:border-gold transition-colors shadow-inner" />
                                <span className="text-[11px] text-ink-muted mt-1 block text-center uppercase tracking-widest group-hover:text-gold">Click to Enlarge <Eye size={10} className="inline ml-1"/></span>
                            </a>
                        ) : (
                            <div className="w-full h-40 bg-black/30 rounded-lg border border-dashed border-line-2 flex flex-col items-center justify-center text-ink-muted text-[10px] text-center p-4">
                                <Camera size={24} className="mb-2 opacity-30"/>
                                Awaiting HQ Photo Proof
                            </div>
                        )}
                    </div>
                </div>

                <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-5">History Order Timeline</h4>
                <div className="space-y-6 relative pl-6">
                    <div className="absolute left-[7px] top-1 bottom-1 w-[2px] bg-raised"></div> 
                    {(order.workflowTimeline || []).map((ev, idx) => {
                        const isLatest = idx === order.workflowTimeline.length - 1;
                        let circleColor = isLatest ? 'bg-gold shadow-[0_0_10px_rgba(212,175,55,0.6)]' : 'bg-line-3';
                        if (ev.status === 'SYSTEM_EDIT') circleColor = 'bg-line-3';
                        
                        return (
                            <div key={idx} className="flex gap-4 relative">
                                <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${circleColor} relative z-10 border-2 border-line`}></div>
                                <div>
                                    <p className={`font-bold text-xs uppercase tracking-wider ${isLatest ? 'text-gold' : 'text-ink'} ${ev.status === 'SYSTEM_EDIT' ? 'text-ink-muted' : ''}`}>{ev.status}</p>
                                    <p className={`text-sm font-medium ${isLatest ? 'text-white' : 'text-ink-muted'} mt-0.5 whitespace-pre-line`}>{ev.msg}</p>
                                    <p className="text-[10px] text-ink-muted font-mono mt-1">
                                        {ev.time ? new Date(ev.time).toLocaleString('id-ID') : 'Time data missing'}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in space-y-6 relative">
            
            {/* ====== HEADER ======
                HQ does not get one. His call, 2026-08-27: *"erase the global logistic command,
                not cool and elegant"*. "GLOBAL LOGISTICS COMMAND / ALL BRANCHES NATIONWIDE" was a
                banner that named the screen you had just clicked into and then said nothing — two
                lines of chrome above the only thing on the page worth reading. Sebaran Stok is the
                title now, and it carries real numbers.
                A BRANCH user keeps theirs, because for them it is not decoration: it names WHICH
                hub they are looking at and who the admin is, and neither is obvious from the rest
                of the screen. */}
            {!isAdmin && (
            <div className="flex flex-col justify-between items-start border-b border-white/10 pb-6 mb-6">
                <div className="w-full">
                    {/* Responsive Text Size for Mobile */}
                    <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-widest flex items-center gap-3 break-words w-full">
                        {isAdmin ? <ShieldCheck className="text-orange shrink-0" size={32}/> : <Globe className="text-gold shrink-0" size={32}/>}
                        <span className="leading-tight">{isAdmin ? 'Global Logistics Command' : `${branchLocation} Hub Logistics`}</span>
                    </h2>
                    <p className="text-[10px] text-ink-muted uppercase tracking-widest mt-2 flex items-center gap-2 flex-wrap">
                        {isAdmin ? <><MapPin size={10}/> All Branches nationwide.</> : <><User size={10}/> Admin: {appSettings?.adminDisplayName || user?.displayName || user?.email?.split('@')[0]} • Assigned Area: {branchLocation}</>}
                    </p>
                </div>
            </div>
            )}

            {/* ====== AREA ADMIN VIEW ====== */}
            {isAreaAdmin && (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr,380px] gap-6">
                    
                    {/* LEFT COLUMN: INVENTORY & HISTORY */}
                    <div className="space-y-6 flex flex-col">
                        <details className="group" open>
                            <summary className="bg-raised/50 p-4 sm:p-5 rounded-2xl border border-line-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-raised transition-colors flex justify-between items-center shadow-lg">
                                <h3 className="text-base sm:text-lg font-black text-gold uppercase tracking-widest flex items-center gap-2"><MapPin size={20}/> My Current Branch Inventory</h3>
                                <ChevronDown size={20} className="text-ink-muted group-open:rotate-180 transition-transform shrink-0"/>
                            </summary>
                            <div className="p-3 sm:p-4 bg-black/30 rounded-xl mt-3 border border-line-2 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-slide-down">
                                {branchStock.length === 0 ? (
                                    <div className="col-span-full text-center p-8 bg-black/20 rounded-xl border border-dashed border-line-2 text-ink-muted text-xs uppercase tracking-widest">
                                        Warehouse is empty. Request stock from HQ using the form below.
                                    </div>
                                ) : branchStock.map(stockCard)}
                            </div>
                        </details>

                        <div className="bg-raised/50 p-4 sm:p-6 rounded-2xl border border-line-2 flex-1 flex flex-col shadow-lg">
                            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2"><Truck size={20}/> Status Pengiriman & Reorder</h3>
                            
                            {isLoading ? (
                                <div className="text-center p-10 text-ink-muted animate-pulse italic text-xs uppercase tracking-widest">Loading Logistics Logs...</div>
                            ) : requests.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-line-2 rounded-xl bg-black/20">
                                    <Package size={48} className="text-line-3 mb-3 opacity-50"/>
                                    <p className="text-ink-muted font-bold text-sm">No reorder history found for {branchLocation}.</p>
                                    <p className="text-ink-muted text-[10px] mt-1 uppercase tracking-widest">Submit a new request using the form.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* ===== THE ARRIVAL CHECK =====
                                        Lives out here, not inside OrderTrackingModule, because that
                                        component is redeclared every render and its children remount —
                                        an input in there would lose focus on every keystroke. */}
                                    {receivingOrder && (() => {
                                        const items = receivingOrder.fulfilledItems || receivingOrder.requestedItems || receivingOrder.items || [];
                                        const lines = receiptLines(items, receiptCounts);
                                        const blocked = receiptBlocked(lines);
                                        const disputed = receiptDisputed(lines);
                                        const counted = lines.filter(l => l.counted !== null).length;

                                        return (
                                            <div className="bg-panel rounded-2xl border border-gold/60 p-4 sm:p-5 shadow-2xl">
                                                <div className="flex justify-between items-start gap-3 border-b border-line-2 pb-3 mb-4">
                                                    <div className="min-w-0">
                                                        <h4 className="text-xs font-black text-gold uppercase tracking-widest flex items-center gap-2"><Package size={14}/> Hitung Barang Datang</h4>
                                                        <p className="text-[10px] text-ink-muted font-mono tracking-widest uppercase mt-1 truncate">{receivingOrder.id}</p>
                                                    </div>
                                                    <button onClick={() => { setReceivingOrder(null); setReceiptCounts({}); }} className="text-ink-muted hover:text-white shrink-0 p-1"><X size={18}/></button>
                                                </div>

                                                {/* Says WHY the number is missing. Without this line the screen
                                                    just looks broken, and a counter who thinks it is broken goes
                                                    looking for the surat jalan — which is the one thing this
                                                    whole screen exists to keep out of their hands. */}
                                                <div className="bg-raised border border-line-3 rounded-lg p-3 mb-4 text-[11px] text-ink-muted leading-relaxed">
                                                    <span className="font-black text-ink uppercase tracking-widest block mb-1">Hitung dulu, jangan lihat surat jalan.</span>
                                                    Jumlah kiriman HQ sengaja disembunyikan sampai Anda selesai menghitung. Isi apa yang benar-benar ada di dalam kardus. Kalau satu produk tidak ada sama sekali, tulis <span className="font-black text-ink">0</span>.
                                                </div>

                                                <div className="space-y-3">
                                                    {lines.map(line => {
                                                        const entry = receiptCounts[line.productId] || {};
                                                        const bad = line.counted !== null && line.damaged > line.counted;
                                                        return (
                                                            <div key={line.productId} className={`rounded-xl border p-3 ${bad ? 'border-danger/60 bg-danger-well' : 'border-line-2 bg-black/40'}`}>
                                                                <p className="text-[11px] font-black text-ink uppercase tracking-wide mb-2.5 break-words">{line.name}</p>
                                                                <div className="grid grid-cols-2 gap-2.5">
                                                                    <label className="block">
                                                                        <span className="text-[9px] font-bold text-ink-muted uppercase tracking-widest block mb-1">Diterima (Bks)</span>
                                                                        <input
                                                                            type="number" inputMode="numeric" min="0" placeholder="—"
                                                                            value={entry.counted ?? ''}
                                                                            onChange={e => setReceiptCount(line.productId, 'counted', e.target.value)}
                                                                            className="w-full bg-black/50 border border-line-3 rounded-lg p-2.5 text-center font-black text-lg text-gold outline-none focus:border-gold tabular-nums"
                                                                        />
                                                                    </label>
                                                                    <label className="block">
                                                                        <span className="text-[9px] font-bold text-ink-muted uppercase tracking-widest block mb-1">Rusak (Bks)</span>
                                                                        <input
                                                                            type="number" inputMode="numeric" min="0" placeholder="0"
                                                                            value={entry.damaged ?? ''}
                                                                            onChange={e => setReceiptCount(line.productId, 'damaged', e.target.value)}
                                                                            className="w-full bg-black/50 border border-line-3 rounded-lg p-2.5 text-center font-black text-lg text-danger-text outline-none focus:border-danger tabular-nums"
                                                                        />
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="mt-4 pt-3 border-t border-line-2">
                                                    <p className="text-[10px] text-ink-muted uppercase tracking-widest text-center mb-3 tabular-nums">{counted} dari {lines.length} produk sudah dihitung</p>
                                                    {blocked ? (
                                                        <div className="py-3 px-3 rounded-lg bg-raised border border-line-3 text-center text-[11px] font-bold text-ink-muted uppercase tracking-wide">{blocked}</div>
                                                    ) : (
                                                        <button onClick={() => handleConfirmReceipt(receivingOrder, lines)} disabled={isProcessing}
                                                            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm ${disputed ? 'bg-danger text-ink-inverse hover:bg-danger/90' : 'bg-gold text-gold-ink hover:bg-gold/90'}`}>
                                                            {isProcessing ? <Clock size={18} className="animate-spin"/> : disputed ? <AlertCircle size={18}/> : <Check size={18}/>}
                                                            {disputed ? 'Simpan & Laporkan Selisih' : 'Simpan — Jumlah Cocok'}
                                                        </button>
                                                    )}
                                                    {/* Tells them a difference was found WITHOUT naming it. The size of
                                                        the gap is HQ's to see; a counter who knows they are 5 short is
                                                        a counter who "finds" 5 more. */}
                                                    {!blocked && disputed && (
                                                        <p className="text-[10px] text-danger-text uppercase tracking-widest text-center mt-2 font-bold">Hitungan Anda tidak sama dengan kiriman HQ</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {requests.map(req => {
                                        const isExpanded = expandedRequest === req.id;
                                        const itemsToProcess = req.fulfilledItems || req.requestedItems || req.items || [];
                                        
                                        return (
                                            <div key={req.id} className={`p-3 sm:p-4 rounded-2xl border transition-colors ${isExpanded ? 'bg-panel border-line-3 shadow-2xl' : 'bg-black/40 border-line-2 hover:bg-raised'}`}>
                                                
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-line-2 pb-3 mb-3">
                                                    <div className="w-full sm:w-auto mb-2 sm:mb-0">
                                                        <span className="text-[10px] text-ink-muted font-mono tracking-widest uppercase block truncate">{req.id} • REQ BY: {req.requestedByName || (req.requestedBy || "").split('@')[0]}</span>
                                                        <p className="text-[11px] text-ink-muted font-mono mt-0.5 mb-1.5">Time: {new Date(req.timestamp?.seconds*1000).toLocaleString()}</p>
                                                        {/* 🚀 THE FIX: LIST ALL ITEM DETAILS RIGHT ON THE CARD
                                                            ...EXCEPT THE QUANTITIES, WHILE THE BOX IS STILL IN TRANSIT.
                                                            The arrival check is partial blind: a number printed here would
                                                            anchor the count at the door and the whole check becomes a
                                                            rubber stamp. Product names stay — they are what makes a
                                                            missing product countable as 0 instead of invisible. Every
                                                            figure comes back the moment the count is filed, because that
                                                            is when the branch needs them to argue a claim. */}
                                                        <div className="text-[10px] text-ink font-medium">
                                                            {req.status === 'IN_TRANSIT' ? (
                                                                <>
                                                                    <span className="font-bold text-orange mr-1">📦 {itemsToProcess.length} JENIS BARANG:</span>
                                                                    <span className="text-ink-muted">{itemsToProcess.map(i => i.name).join(', ')}</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="font-bold text-orange mr-1">📦 {itemsToProcess.reduce((sum,i)=>sum+Number(i.qty),0)} Bks:</span>
                                                                    <span className="text-ink-muted">{itemsToProcess.map(i => `${i.qty} ${i.name}`).join(', ')}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                                                        <StatusBadge status={req.status}/>
                                                        <button onClick={() => setExpandedRequest(isExpanded ? null : req.id)} className="bg-raised hover:bg-line-2 text-ink-muted hover:text-white p-2.5 rounded-lg flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors shadow-sm ml-auto sm:ml-0">
                                                            {isExpanded ? <XCircle size={14}/> : <Eye size={14}/>}
                                                            {isExpanded ? 'Tutup' : 'Lihat Status'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {isExpanded && <OrderTrackingModule order={req} />}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: REORDER FORM */}
                    <div className="bg-panel p-4 sm:p-6 rounded-2xl border border-gold/30 shadow-xl relative flex flex-col w-full h-fit">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-1 relative z-10">Reorder Stock</h3>
                        <p className="text-[10px] text-gold uppercase tracking-widest mb-6 relative z-10">Request stock from HQ Master Vault.</p>
                        
                        <div className="flex flex-col gap-4 mb-6 relative z-10">
                            {/* ITEM SELECTOR */}
                            <div className="bg-black/30 p-3 sm:p-4 rounded-xl border border-line-2">
                                <label className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">1. Select Items to Request</label>
                                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white font-bold outline-none focus:border-gold transition-colors mb-3">
                                    <option value="">-- Choose Product --</option>
                                    {globalInventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                {/* ===== HOW MANY SHOULD I ASK FOR (G3) =====
                                    Sits between choosing the product and typing the number,
                                    because that is the second the question is actually asked.
                                    Everything here is measured from his own shipping history —
                                    see the note above `shipmentRhythm`. It never fills the box
                                    by itself; PAKAI is a button, and Add is still a second press. */}
                                {selectedProduct && (() => {
                                    const now = Math.floor(Date.now() / 1000);
                                    const shelfRow = branchStock.find(s => (s.productId || s.id) === selectedProduct);
                                    const arrivals = productArrivals(requests, branchLocation, selectedProduct);
                                    const rhythm = shipmentRhythm(requests, branchLocation);
                                    /* The cushion is his, per cabang, and the branch asking for stock
                                       gets the same one HQ sees — two different answers to "how many"
                                       on the two ends of one shipment is how an argument starts. */
                                    const advice = reorderAdvice(arrivals, shelfRow?.stock || 0,
                                        inTransitQty(requests, branchLocation, selectedProduct), rhythm, now,
                                        bufferDays(appSettings, branchLocation));
                                    /* The one sentence worth the whole panel: at this speed the shelf
                                       runs dry BEFORE a shipment ordered today could land. */
                                    const tooLate = advice.daysLeft != null && rhythm.leadDays != null
                                        && advice.daysLeft < rhythm.leadDays;
                                    return (
                                        <div className="mb-3 rounded-xl border border-line-2 bg-black/40 p-3 text-[11px] font-bold tabular-nums">
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-ink-muted uppercase tracking-widest">
                                                <span>Di gudang <b className="text-ink font-black">{advice.shelf}</b></span>
                                                <span>Di jalan <b className={`font-black ${advice.coming > 0 ? 'text-gold' : 'text-ink'}`}>{advice.coming}</b></span>
                                                <span>Keluar {advice.ratePerDay != null
                                                    ? <b className="text-ink font-black">± {advice.ratePerDay.toFixed(1)}/hari</b>
                                                    : <b className="text-ink font-black">belum terukur</b>}</span>
                                            </div>

                                            {advice.daysLeft != null && (
                                                <p className={`mt-2 pt-2 border-t border-line-2 uppercase tracking-widest ${tooLate ? 'text-danger-text' : 'text-ink-muted'}`}>
                                                    Habis dalam ± <b className="font-black">{advice.daysLeft} hari</b>
                                                    {tooLate && rhythm.leadDays != null &&
                                                        <> — kiriman butuh ± {rhythm.leadDays} hari, <b className="font-black">pesan sekarang</b></>}
                                                </p>
                                            )}

                                            {advice.suggest != null ? (
                                                <div className="mt-2 pt-2 border-t border-line-2 flex items-center justify-between gap-3">
                                                    <span className="text-ink-muted uppercase tracking-widest">
                                                        Saran <b className="text-gold font-black text-sm">{advice.suggest}</b> Bks
                                                        <span className="block mt-0.5 normal-case tracking-normal text-[10px] font-normal">
                                                            cukup ± {advice.coverDays} hari — kirim ± {rhythm.leadDays}, pesan tiap ± {rhythm.cadenceDays}
                                                        </span>
                                                    </span>
                                                    <button type="button" onClick={() => setRequestQty(String(advice.suggest))}
                                                        className="shrink-0 px-3 py-2 rounded-lg border border-gold/60 text-gold uppercase tracking-widest text-[10px] font-black hover:bg-gold hover:text-gold-ink transition-colors">
                                                        Pakai
                                                    </button>
                                                </div>
                                            ) : (
                                                /* Say WHY there is no number rather than showing nothing. */
                                                <p className="mt-2 pt-2 border-t border-line-2 text-ink-muted normal-case text-[10px] font-normal leading-snug">
                                                    Belum bisa menyarankan jumlah — butuh minimal dua pengiriman produk ini
                                                    {rhythm.leadDays == null && ' dan satu penerimaan yang tercatat'}
                                                    {rhythm.cadenceDays == null && ' dan dua permintaan untuk mengukur jarak pesan'}.
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="grid grid-cols-[1fr,auto] gap-2 w-full">
                                    <input type="number" min="1" placeholder="Qty (Bks)" value={requestQty} onChange={e => setRequestQty(e.target.value)} className="w-full bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white font-bold outline-none focus:border-gold text-center transition-colors"/>
                                    <button onClick={handleAddToCart} className="bg-gold hover:bg-gold/90 text-gold-ink px-4 font-bold uppercase tracking-widest rounded-lg shadow-lg shrink-0 whitespace-nowrap text-xs transition-colors flex items-center justify-center gap-1.5">
                                        <PlusCircle size={14}/> Add
                                    </button>
                                </div>
                            </div>

                            {/* ADDRESS INPUTS */}
                            <div className="bg-black/30 p-3 sm:p-4 rounded-xl border border-line-2">
                                <label className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-2 flex items-center gap-1"><MapPin size={12}/> 2. Detail Alamat Pengiriman</label>
                                <div className="space-y-3">
                                    <input placeholder="Jalan / Gedung / Patokan" className="w-full bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white outline-none focus:border-gold" value={shippingAddress.jalan} onChange={e=>setShippingAddress({...shippingAddress, jalan: e.target.value})}/>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input placeholder="Kecamatan" className="w-full bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white outline-none focus:border-gold" value={shippingAddress.kecamatan} onChange={e=>setShippingAddress({...shippingAddress, kecamatan: e.target.value})}/>
                                        <input placeholder="Kabupaten" className="w-full bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white outline-none focus:border-gold" value={shippingAddress.kabupaten} onChange={e=>setShippingAddress({...shippingAddress, kabupaten: e.target.value})}/>
                                    </div>
                                    <div className="grid grid-cols-[1fr,auto] gap-3">
                                        <input placeholder="Provinsi" className="w-full bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white outline-none focus:border-gold" value={shippingAddress.provinsi} onChange={e=>setShippingAddress({...shippingAddress, provinsi: e.target.value})}/>
                                        <input placeholder="Kode Pos" type="number" className="w-24 bg-black/50 border border-line-3 rounded-lg p-3 text-sm text-white outline-none focus:border-gold text-center" value={shippingAddress.postalCode} onChange={e=>setShippingAddress({...shippingAddress, postalCode: e.target.value})}/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {requestCart.length > 0 && (
                            <div className="bg-black/40 rounded-2xl p-4 sm:p-5 border border-line-2 mt-auto flex flex-col relative z-10 shadow-inner">
                                <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-4 border-b border-line-2 pb-2 flex items-center gap-2"><Package size={14}/> Request Draft Cart ({requestCart.length})</h4>
                                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2.5 mb-5 pr-2">
                                    {requestCart.map(item => (
                                        <div key={item.productId} className="flex justify-between items-center text-sm bg-raised p-3 rounded-lg border border-line-2">
                                            <span className="text-ink font-bold uppercase truncate pr-3">{item.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gold font-black shrink-0">{item.qty} Bks</span>
                                                <button onClick={() => removeFromCart(item.productId)} className="text-ink-muted hover:text-danger-text shrink-0"><MinusCircle size={16}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleSubmitRequest} disabled={isProcessing} className="w-full py-4 bg-gold hover:bg-gold/90 text-gold-ink rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm relative">
                                    {isProcessing ? <Clock size={18} className="animate-spin"/> : <Send size={18}/>} SUBMIT TO HQ
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============ WHAT IS ON A BRANCH'S SHELF — HQ SIDE ============
                Aldi, 2026-08-23: *"i think tier 1 also need to see regional warehouse components
                that only regional admin could see because me as tier 1 cant see that"*. He owns
                the company and could not look at his own branches' shelves; `isAreaAdmin` was a
                hard either/or, so HQ saw the pipeline and nothing else.

                READ-ONLY on purpose. HQ picks a branch and sees its shelf and its stock ages —
                the same card the branch admin sees, drawn by the same function so the two cannot
                drift apart. It does NOT get the request form or the receive button: a shipment
                must still be asked for by the branch that needs it and counted by the branch that
                receives it, or the separation the arrival check exists to create is gone. */}

            {/* ════════ WHERE EVERY PACK IS — one row per warehouse ════════
                The panel this screen is named after. It used to be a branch picker that showed one
                warehouse's shelf and nothing else, so the question it exists to answer — "who needs
                a delivery?" — took as many clicks as there are branches.

                ⚠️ THE BAR SHOWS WHERE PACKS ARE, SO IT LEAVES OUT `terjual`. Sold packs are not
                anywhere any more; putting them in a "where is it" bar would shrink every other
                segment in proportion to how well a branch is doing, which reads as the exact
                opposite of the truth. Sold gets a column, never a segment.

                ⚠️ LAID OUT ON A GRID, NOT A <table>, and that is not a style preference. His
                report, 2026-08-27: *"formatting is really bad, it looks cutted"*. A table wide
                enough to need `min-w` sat inside a rounded panel and its row rules ran straight
                into the corner radius, so every separator was visibly sliced at the right edge.
                Rows are grid rows inside a padded track now: the rules stop where the padding
                stops, nothing meets the curve, and one COLS constant keeps the header, the
                warehouse rows, the drawer rows and the total on the same columns — a table's one
                real advantage, kept without its clipping.

                ⚠️ AND THE DRAWER ANIMATES ON grid-template-rows, 0fr → 1fr. Height cannot be
                transitioned from `auto`, and a <tr> cannot be transitioned at all, which is why
                the first version simply appeared. This costs one wrapper and needs no measured
                pixel height, so it stays smooth whatever the drawer contains. */}
            {isAdmin && logistics.length > 0 && (() => {
                /* The columns, the rows, the drawer and the total now live in
                   `ponder/stages/StockByWarehouseTable.jsx`. Only the maths stayed here. The
                   tutorial renders that same component against a fixed demo world, which is the
                   one arrangement where a tutorial cannot fall out of date with its screen. */
                return (
                <section className="mb-6 rounded-2xl border border-line-2 bg-panel overflow-hidden shadow-[0_1px_1px_rgba(0,0,0,0.20),0_18px_40px_-28px_rgba(0,0,0,0.85)]">

                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-5 pt-5 pb-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="h-10 w-10 rounded-xl bg-raised border border-line-2 flex items-center justify-center shrink-0">
                                <Globe size={18} className="text-accent-ink"/>
                            </span>
                            <div className="min-w-0">
                                <h3 className="font-display text-xl sm:text-2xl font-black text-ink uppercase tracking-[0.14em] leading-none">Stock by Warehouse</h3>
                                <div className="h-[3px] w-10 bg-orange rounded-full mt-2"/>
                                <p className="font-mono text-[10px] text-ink-muted tracking-widest mt-2">every warehouse · in Bks</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            <p className="font-mono text-[10px] text-ink-muted tracking-widest">sales figures cover the last 7 days</p>
                            <PonderButton sceneId="stock-by-warehouse" />
                        </div>
                    </div>

                    <StockByWarehouseTable
                        rows={logistics}
                        totals={{ shelf: gTotal('shelf'), transit: gTotal('transit'), field: gTotal('field'),
                                  sold: gTotal('sold'), perMonth: gTotal('perMonth'),
                                  /* null, not 0, when NO cabang could be measured — `gTotal` coerces
                                     null to 0 and a 0 here would claim the company needs to ship
                                     nothing anywhere, which is the opposite of "not known yet". */
                                  minimum: logistics.some(r => r.minimum != null) ? gTotal('minimum') : null }}
                        openGudang={openGudang}
                        onToggle={setOpenGudang}
                    />

                    {/* 🔴 THE FOOTNOTE IS GONE, AND IT DID NOT EVAPORATE. His call, 2026-08-27:
                        *"we can delete this ... i mean the instruction below company total"*.
                        Five paragraphs of small print under a table is where an explanation goes
                        to be skipped. Every sentence of it now lives in the TUTORIAL, in
                        Indonesian, beat by beat, next to the column it is about —
                        `src/ponder/scenes/stock-by-warehouse.js`, opened by the chip in this
                        panel's header or by the book in the top bar.
                        ⚠️ Audit check 631 MOVED onto the scene file rather than being deleted.
                        A check removed to let a change pass is how the thing it protected comes
                        back, and what it protects here is the two divisions being shown at all. */}
                </section>
                );
            })()}

            {/* ════════ RENCANA KIRIM — one row per product, one column per cabang ════════
                His ask, 2026-08-30: *"i think we should made one more panel for product shipping
                quantity recommendation"*, alongside the column above rather than instead of it.

                ⚠️ IT SITS BELOW SEBARAN STOK ON PURPOSE. Sebaran Stok answers "does this cabang need
                a delivery"; this answers "I do not have enough for everyone, who gets it". The second
                question only exists once the first has been asked, and only when stock is short —
                which is exactly the case he described the factory not covering. */}
            {isAdmin && logistics.length > 0 && (
                <section className="mb-6 rounded-2xl border border-line-2 bg-panel overflow-hidden shadow-[0_1px_1px_rgba(0,0,0,0.20),0_18px_40px_-28px_rgba(0,0,0,0.85)]">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-5 pt-5 pb-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="h-10 w-10 rounded-xl bg-raised border border-line-2 flex items-center justify-center shrink-0">
                                <Truck size={18} className="text-accent-ink"/>
                            </span>
                            <div className="min-w-0">
                                <h3 className="font-display text-xl sm:text-2xl font-black text-ink uppercase tracking-[0.14em] leading-none">Rencana Kirim</h3>
                                <div className="h-[3px] w-10 bg-orange rounded-full mt-2"/>
                                <p className="font-mono text-[10px] text-ink-muted tracking-widest mt-2">minimal per barang, per cabang · in Bks</p>
                            </div>
                        </div>
                        <p className="font-mono text-[10px] text-ink-muted tracking-widest shrink-0">
                            Kurang = stok gudang pusat tidak cukup untuk semua cabang
                        </p>
                    </div>
                    <ShipmentPlanTable rows={shipmentPlan} branches={planBranches} />
                </section>
            )}

            {/* "Isi Gudang Cabang" stood here — a picker that showed ONE branch's shelf and
                nothing else. Deleted 2026-08-27 on his call after the Sebaran Stok drawer replaced
                it: that shows every warehouse at once, and per product it adds di jalan, di tangan
                agen and terjual, which this never had. What went with it is the per-SHIPMENT
                breakdown — `stockCard`'s <details>, naming each individual kiriman. He was told
                that and chose the delete. `stockCard` itself stays: the branch-side view still
                renders it for a user's own warehouse. */}

            {/* ====== MODALS ====== */}
            {isProcessing && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm">
                    <div className="text-center p-6">
                        <Package className="text-gold animate-bounce mx-auto mb-4" size={48}/>
                        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-widest">PROSES DATA...</h2>
                        <p className="text-ink-muted mt-2 text-xs uppercase tracking-widest animate-pulse">Sedang update database cloud...</p>
                    </div>
                </div>
            )}

        </div>
    );
}