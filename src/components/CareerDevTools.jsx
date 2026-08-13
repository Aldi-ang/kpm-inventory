import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, getDoc, getDocs, setDoc, collection } from 'firebase/firestore';
import { Wrench, Zap, Award, Undo2, AlertTriangle, Loader2, User } from 'lucide-react';
import { careerXP, DEFAULT_XP, DEFAULT_BADGES } from '../config/career';
import { RankBorder, RANK_BORDERS, BORDER_KEYFRAMES, BORDER_LOAD } from '../config/rankBorders';
import { formatNumber, parseGroupedNumber } from '../utils/helpers';
import { confirmAction } from './ConfirmGate.jsx';

/*
 * 🔧 CAREER DEV TOOLS — Tier 1 (platform architect) only.
 *
 * Unlike AchievementTester (pure simulation, writes nothing), this one WRITES to real career
 * docs. That is the point — it exists to force a real agent into a real state so the rank/badge
 * UI can be tested without waiting months for genuine EOD history.
 *
 * Everything it grants is recorded in `devGrant` on the same career doc, so "Undo" can subtract
 * exactly what the tools added and nothing else. It never touches `base` or `live` — those are
 * real business numbers, and Hitung Ulang Karir owns them.
 */

// `min` is in XP, not rupiah — see the same note in AgentProfileView's rank defaults. The old
// rupiah-scale numbers left every agent stuck at Bronze once the career ledger was switched on.
const DEFAULT_RANKS = [
    { id: '1', name: 'Bronze', min: 0, hex: '#d97706' },
    { id: '2', name: 'Silver', min: 5000, hex: '#94a3b8' },
    { id: '3', name: 'Gold', min: 20000, hex: '#facc15' },
    { id: '4', name: 'Platinum', min: 50000, hex: '#22d3ee' },
    { id: '5', name: 'Diamond', min: 100000, hex: '#c084fc' },
    { id: '6', name: 'Mythic', min: 250000, hex: '#f43f5e' }
];

// Was a local re-implementation of the same id-ID grouping helpers.js already exports. Aliased
// rather than replaced at ~15 call sites — one implementation, no churn.
const num = formatNumber;

export default function CareerDevTools({ db, appId, userId, triggerCapy }) {
    const [agents, setAgents] = useState([]);
    const [agentId, setAgentId] = useState('');
    const [career, setCareer] = useState(null);
    const [ranks, setRanks] = useState(DEFAULT_RANKS);
    const [badges, setBadges] = useState(DEFAULT_BADGES);
    const [xpInput, setXpInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');

    const basePath = `artifacts/${appId}/users/${userId}`;

    // roster + progression config
    useEffect(() => {
        if (!db || !appId || !userId) return;
        (async () => {
            try {
                const snap = await getDocs(collection(db, `${basePath}/motorists`));
                setAgents(snap.docs.map(d => ({ id: d.id, name: d.data().name || d.id })));
                const prog = await getDoc(doc(db, `${basePath}/settings/progression`));
                const legacy = prog.exists() ? null : await getDoc(doc(db, `${basePath}/settings/rpg_ranks`));
                const src = prog.exists() ? prog.data() : (legacy?.exists() ? legacy.data() : null);
                if (src?.ranks?.length) setRanks(src.ranks);
                if (src?.badges?.length) setBadges(src.badges);
            } catch (e) { console.error('CareerDevTools load failed', e); setMsg('Gagal memuat data: ' + e.message); }
        })();
    }, [db, appId, userId, basePath]);

    const loadCareer = useCallback(async (id) => {
        if (!id) { setCareer(null); return; }
        const snap = await getDoc(doc(db, `${basePath}/career/${id}`));
        setCareer(snap.exists() ? snap.data() : {});
    }, [db, basePath]);

    useEffect(() => { if (agentId) loadCareer(agentId); }, [agentId, loadCareer]);

    const currentXP = useMemo(() => career ? careerXP(career, DEFAULT_XP) : 0, [career]);
    const sortedRanks = useMemo(() => [...ranks].sort((a, b) => Number(a.min) - Number(b.min)), [ranks]);
    const currentRank = useMemo(
        () => [...sortedRanks].reverse().find(r => currentXP >= Number(r.min)) || sortedRanks[0],
        [sortedRanks, currentXP]
    );
    const unlocks = career?.unlocks || [];
    const devGrant = career?.devGrant || { bonusXP: 0, unlocks: [] };

    // Are the rank thresholds even on the same scale as careerXP? Rp 100.000 collected = 1 XP,
    // so a threshold in the tens of millions is a leftover from the old raw-rupiah formula and
    // can never be reached. Worth shouting about rather than letting it look like a dead feature.
    const topRankMin = Number(sortedRanks[sortedRanks.length - 1]?.min || 0);
    const scaleLooksWrong = topRankMin > 1000000;

    const write = async (data, note) => {
        setBusy(true); setMsg('');
        try {
            await setDoc(doc(db, `${basePath}/career/${agentId}`), data, { merge: true });
            await loadCareer(agentId);
            setMsg('✅ ' + note);
            triggerCapy?.('🔧 DEV: ' + note);
        } catch (e) { console.error(e); setMsg('❌ ' + e.message); }
        setBusy(false);
    };

    const addXP = (amount) => {
        if (!agentId || !amount) return;
        write({
            bonusXP: Number(career?.bonusXP || 0) + amount,
            devGrant: { ...devGrant, bonusXP: Number(devGrant.bonusXP || 0) + amount }
        }, `${amount > 0 ? '+' : ''}${num(amount)} XP untuk agen ini.`);
    };

    const jumpToRank = (rank) => {
        const delta = Number(rank.min) - currentXP;
        if (delta === 0) return;
        write({
            bonusXP: Number(career?.bonusXP || 0) + delta,
            devGrant: { ...devGrant, bonusXP: Number(devGrant.bonusXP || 0) + delta }
        }, `Naik ke ${rank.name} (${num(rank.min)} XP).`);
    };

    const toggleBadge = (badge) => {
        const has = unlocks.includes(badge.id);
        const nextUnlocks = has ? unlocks.filter(x => x !== badge.id) : [...unlocks, badge.id];
        const grantList = devGrant.unlocks || [];
        write({
            unlocks: nextUnlocks,
            devGrant: {
                ...devGrant,
                unlocks: has ? grantList.filter(x => x !== badge.id) : [...new Set([...grantList, badge.id])]
            }
        }, `${has ? 'Kunci lagi' : 'Buka'} badge "${badge.title}".`);
    };

    const undoAll = async () => {
        if (!await confirmAction('Batalkan SEMUA perubahan yang dibuat alat dev ini untuk agen ini? XP dan badge asli tidak tersentuh.')) return;
        const granted = Number(devGrant.bonusXP || 0);
        const grantedBadges = devGrant.unlocks || [];
        write({
            bonusXP: Number(career?.bonusXP || 0) - granted,
            unlocks: unlocks.filter(x => !grantedBadges.includes(x)),
            devGrant: { bonusXP: 0, unlocks: [] }
        }, `Dibatalkan: ${num(granted)} XP dan ${grantedBadges.length} badge.`);
    };

    const hasDevChanges = Number(devGrant.bonusXP || 0) !== 0 || (devGrant.unlocks || []).length > 0;

    return (
        /* No frame, no heading: it mounts inside a .kpm-shelf whose module head already names it. */
        <div className="flex flex-col gap-3">
            <style>{BORDER_KEYFRAMES}</style>
            <p className="text-[11px] text-accent-ink font-mono mb-4 flex items-start gap-1.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <span>Alat ini <b>menulis data asli</b>. Semua yang diberikan di sini bisa dibatalkan lewat tombol Undo — data EOD asli tidak pernah disentuh.</span>
            </p>

            {scaleLooksWrong && (
                <div className="mb-4 p-3 bg-danger-well/50 border border-danger/50">
                    <p className="text-[11px] text-danger-ink font-mono leading-relaxed">
                        <b>⚠️ Skala rank tidak cocok dengan Career Ledger.</b> Rank tertinggi butuh {num(topRankMin)} XP,
                        tapi Rp 100.000 yang tertagih = 1 XP. Artinya butuh Rp {num(topRankMin * DEFAULT_XP.rupiahPerXp)} untuk
                        mencapainya. Kalau "Use Career Ledger for Rank" dinyalakan sekarang, semua agen akan mentok di rank terendah.
                        Angka rank perlu diturunkan dulu di Rank Config.
                    </p>
                </div>
            )}

            {/* BORDER GALLERY — every style rendered live with the real component, so what you
                see here is exactly what the profile screen draws. Assign one per rank in
                Agent Profile → Rank Config → Border. */}
            <div className="mb-5">
                <h4 className="text-[11px] font-black text-accent-ink uppercase tracking-widest mb-1">Galeri Border Rank</h4>
                <p className="text-[11px] text-ink-muted font-mono mb-3">
                    Pilih border tiap rank di Agent Profile → Rank Config → Border.
                    Tiap frame punya bahannya sendiri (kayu, baja, emas, marmer), jadi warnanya
                    tidak lagi ikut warna rank.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {RANK_BORDERS.map((b, n) => {
                        const previewHex = sortedRanks[n % sortedRanks.length]?.hex || '#f97316';
                        return (
                            <div key={b.id} className="flex flex-col items-center text-center">
                                {/* 128px and square to match the frames themselves — Diamond and
                                    Mythic position their blocks at absolute pixel offsets, so a
                                    smaller box tears them off the frame edge. Well sits under the
                                    frame (z-0) because these are frames with a photo inside. */}
                                <div className="relative w-32 h-32 mb-2 shrink-0">
                                    <div className="absolute inset-[14px] bg-sunk z-0 overflow-hidden flex items-center justify-center">
                                        <User size={26} style={{ color: previewHex, opacity: 0.6 }} />
                                    </div>
                                    <RankBorder styleId={b.id} index={n} hex={previewHex} />
                                </div>
                                <span className="text-[11px] font-bold text-white leading-tight">{b.name}</span>
                                <span className="text-[10px] text-ink-muted font-mono">Beban: {BORDER_LOAD[b.cost] || b.cost}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <select
                value={agentId}
                onChange={e => setAgentId(e.target.value)}
                className="w-full bg-sunk border border-line px-3 py-2 text-sm text-white mb-4 focus:border-accent-edge focus:outline-none"
            >
                <option value="">— Pilih agen —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            {agentId && career && (
                <>
                    <div className="grid grid-cols-2 gap-3 mb-4 text-[11px] font-mono">
                        <div className="bg-sunk/60 p-3">
                            <div className="text-ink-muted uppercase">Total XP</div>
                            <div className="text-lg text-white font-black">{num(currentXP)}</div>
                        </div>
                        <div className="bg-sunk/60 p-3">
                            <div className="text-ink-muted uppercase">Rank sekarang</div>
                            <div className="text-lg font-black" style={{ color: currentRank?.hex }}>{currentRank?.name || '—'}</div>
                        </div>
                    </div>
                    <p className="text-[11px] text-ink-muted font-mono mb-4">
                        Bonus XP: {num(career.bonusXP)} · dari alat dev: <span className="text-accent-ink">{num(devGrant.bonusXP)}</span>
                        {' · '}badge dibuka paksa: <span className="text-accent-ink">{(devGrant.unlocks || []).length}</span>
                    </p>

                    {/* EXP MODIFIER */}
                    <div className="mb-5">
                        <h4 className="text-[11px] font-black text-accent-ink uppercase tracking-widest mb-2 flex items-center gap-1.5"><Zap size={12} /> Ubah EXP</h4>
                        <div className="flex gap-2 flex-wrap mb-2">
                            {[100, 1000, 10000, 100000].map(v => (
                                <button key={v} disabled={busy} onClick={() => addXP(v)}
                                    className="px-3 py-1.5 bg-verified-fill/40 border border-verified/40 text-verified text-[11px] font-bold hover:bg-verified-fill/50 disabled:opacity-40 transition-colors">
                                    +{num(v)}
                                </button>
                            ))}
                            {[-1000, -10000].map(v => (
                                <button key={v} disabled={busy} onClick={() => addXP(v)}
                                    className="px-3 py-1.5 bg-danger-well/40 border border-danger/40 text-danger-ink text-[11px] font-bold hover:bg-danger-rail/50 disabled:opacity-40 transition-colors">
                                    {num(v)}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            {/* Grouped while typing so a big XP figure stays readable; stored raw. */}
                            <input type="text" inputMode="numeric" value={xpInput ? num(xpInput) : ''} onFocus={e => e.target.select()}
                                onChange={e => setXpInput(parseGroupedNumber(e.target.value) || '')} placeholder="jumlah bebas"
                                className="flex-1 bg-sunk border border-line px-3 py-2 text-sm text-white font-mono focus:border-accent-edge focus:outline-none" />
                            <button disabled={busy || !xpInput} onClick={() => { addXP(Number(xpInput)); setXpInput(''); }}
                                className="px-4 bg-gold hover:bg-gold text-black text-[11px] font-black uppercase disabled:opacity-40 transition-colors">
                                Tambah
                            </button>
                        </div>
                    </div>

                    {/* LEVEL / RANK UNLOCK */}
                    <div className="mb-5">
                        <h4 className="text-[11px] font-black text-accent-ink uppercase tracking-widest mb-2">Loncat ke rank</h4>
                        <div className="flex gap-2 flex-wrap">
                            {sortedRanks.map(r => (
                                <button key={r.id || r.name} disabled={busy} onClick={() => jumpToRank(r)}
                                    className="px-3 py-1.5 border text-[11px] font-bold disabled:opacity-40 transition-colors"
                                    style={{ borderColor: `${r.hex}80`, color: r.hex, backgroundColor: currentRank?.name === r.name ? `${r.hex}25` : 'transparent' }}>
                                    {r.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* BADGE UNLOCK */}
                    <div className="mb-5">
                        <h4 className="text-[11px] font-black text-accent-ink uppercase tracking-widest mb-2 flex items-center gap-1.5"><Award size={12} /> Buka / kunci badge</h4>
                        <div className="space-y-1.5">
                            {badges.map(b => {
                                const on = unlocks.includes(b.id);
                                return (
                                    <button key={b.id} disabled={busy} onClick={() => toggleBadge(b)}
                                        className="w-full flex items-center justify-between gap-3 p-2.5 border text-left disabled:opacity-40 transition-colors"
                                        style={{ borderColor: on ? b.hex : 'rgba(255,255,255,0.08)', backgroundColor: on ? `${b.hex}18` : 'rgba(0,0,0,0.3)' }}>
                                        <span className="text-[12px] font-bold truncate" style={{ color: on ? b.hex : '#94a3b8' }}>{b.title}</span>
                                        <span className="text-[10px] font-mono uppercase shrink-0" style={{ color: on ? b.hex : '#64748b' }}>{on ? 'terbuka' : 'terkunci'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button disabled={busy || !hasDevChanges} onClick={undoAll}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-panel hover:bg-raised text-ink text-[11px] font-black uppercase tracking-widest disabled:opacity-30 transition-colors">
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />}
                        Batalkan semua perubahan dev
                    </button>

                    {msg && <p className="mt-3 text-[11px] font-mono text-ink">{msg}</p>}
                </>
            )}
        </div>
    );
}
