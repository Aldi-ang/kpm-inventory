import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { FlaskConical, Lock, Check, RotateCcw } from 'lucide-react';
import { DEFAULT_BADGES, isUnlocked, totals, STAT_LABELS, statLabel } from '../config/career';

/*
 * 🧪 ACHIEVEMENT TESTER — developer tool, Tier 1 only.
 *
 * Answers one question: "if an agent's numbers were X, would the right badges light up?"
 * It loads the REAL badge config the company is using (settings/progression, same doc the
 * Achievement Config screen writes), then runs the REAL isUnlocked() from career.js against
 * numbers you type. So it tests your actual thresholds and the actual unlock logic.
 *
 * It writes NOTHING. No Firestore writes, no career docs touched, no real agent affected.
 * That is deliberate — you can hammer it as much as you like without polluting business data.
 *
 * ponytail: what this does NOT cover is the EOD-verify -> career-increment write path
 * (that one was live-tested separately). This covers config + unlock logic, which is where
 * a wrong threshold or a typo'd `source` actually hides.
 */

// Where each stat lives inside a career doc. totals() sums base+live for the first group,
// reads the second group from live only, the third from the doc root, and derives tenureDays
// from joinDate — so a fake career has to be assembled the same way or the test would lie.
const BASE_STATS = ['collected', 'itemsBks', 'titipCollected', 'daysVerified', 'cleanCukaiDays', 'storesServed'];
const LIVE_ONLY_STATS = ['cleanCounts', 'honestDamage', 'penalties', 'newOutlets'];
const ROOT_STATS = ['streakBest', 'awardCount'];

const buildFakeCareer = (stats) => {
    const base = {}, live = {}, root = {};
    BASE_STATS.forEach(k => { if (stats[k]) base[k] = Number(stats[k]) || 0; });
    LIVE_ONLY_STATS.forEach(k => { if (stats[k]) live[k] = Number(stats[k]) || 0; });
    ROOT_STATS.forEach(k => { if (stats[k]) root[k] = Number(stats[k]) || 0; });
    const days = Number(stats.tenureDays) || 0;
    return {
        base, live, ...root,
        joinDate: days > 0 ? new Date(Date.now() - days * 86400000).toISOString() : ''
    };
};

const fmtValue = (v, fmt) => {
    if (fmt === 'rp') return 'Rp ' + Number(v || 0).toLocaleString('id-ID');
    if (fmt === 'days') return Number(v || 0).toLocaleString('id-ID') + ' hari';
    return Number(v || 0).toLocaleString('id-ID');
};

export default function AchievementTester({ db, appId, userId }) {
    const [badges, setBadges] = useState(DEFAULT_BADGES);
    const [configSource, setConfigSource] = useState('bawaan');
    const [stats, setStats] = useState({});

    // Load the company's real badge config, same fallback chain the profile screen uses.
    useEffect(() => {
        if (!db || !appId || !userId) return;
        (async () => {
            try {
                const progRef = doc(db, `artifacts/${appId}/users/${userId}/settings/progression`);
                const progSnap = await getDoc(progRef);
                if (progSnap.exists() && Array.isArray(progSnap.data().badges) && progSnap.data().badges.length) {
                    setBadges(progSnap.data().badges);
                    setConfigSource('settings/progression');
                    return;
                }
                // Must match AgentProfileView's own fallback exactly — this used to point at
                // users/{userId}/settings/achievements, a path nothing in the app ever writes, so a
                // company still on the legacy shared doc saw DEFAULT_BADGES here while the profile
                // showed their real custom set. Two screens, two answers, same question.
                const oldRef = doc(db, `artifacts/${appId}/settings`, 'achievements');
                const oldSnap = await getDoc(oldRef);
                if (oldSnap.exists() && Array.isArray(oldSnap.data().badges) && oldSnap.data().badges.length) {
                    setBadges(oldSnap.data().badges);
                    setConfigSource('settings/achievements (lama)');
                }
            } catch (e) {
                console.error('AchievementTester: gagal memuat config badge', e);
            }
        })();
    }, [db, appId, userId]);

    // Only show an input for a stat some badge actually depends on — if you add a badge with a
    // new source in Achievement Config, its input appears here automatically.
    const usedSources = useMemo(
        () => [...new Set(badges.map(b => b.source).filter(Boolean))],
        [badges]
    );

    const fakeCareer = useMemo(() => buildFakeCareer(stats), [stats]);
    const currentTotals = useMemo(() => totals(fakeCareer), [fakeCareer]);
    const unlockedCount = badges.filter(b => isUnlocked(b, fakeCareer, {})).length;

    return (
        <div className="bg-black/40 border border-cyan-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <h3 className="text-lg font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <FlaskConical size={18} /> Tes Achievement
                </h3>
                <button
                    onClick={() => setStats({})}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold uppercase tracking-wider transition-colors"
                >
                    <RotateCcw size={12} /> Reset
                </button>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mb-1">
                Ketik angka, lihat badge mana yang menyala. <span className="text-emerald-400">Tidak menulis data apa pun</span> — aman dicoba berkali-kali.
            </p>
            <p className="text-[11px] text-slate-400 font-mono mb-4">
                Config badge dibaca dari: <span className="text-cyan-400">{configSource}</span> ({badges.length} badge)
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                {usedSources.map(src => {
                    // A source this tool can't route is a source no badge on it can ever unlock.
                    // Say so out loud instead of rendering a box that silently does nothing.
                    const known = !!STAT_LABELS[src];
                    const tracked = STAT_LABELS[src]?.tracked;
                    const broken = !known || !tracked;
                    return (
                        <div key={src}>
                            <label className={`block text-[11px] font-mono uppercase mb-1 ${broken ? 'text-amber-400' : 'text-slate-400'}`}>
                                {broken && '⚠ '}{statLabel(src)}
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={stats[src] ?? ''}
                                onFocus={e => e.target.select()}
                                onChange={e => setStats(s => ({ ...s, [src]: e.target.value }))}
                                placeholder="0"
                                disabled={broken}
                                className={`w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none ${broken
                                    ? 'bg-amber-950/30 border border-amber-500/40 text-amber-300 cursor-not-allowed'
                                    : 'bg-slate-900 border border-white/10 text-white focus:border-cyan-500'}`}
                            />
                            {broken && (
                                <p className="text-[10px] text-amber-400/80 font-mono mt-1 leading-tight">
                                    {known ? 'Belum dilacak aplikasi' : 'Sumber tidak dikenal'} — badge ini tidak akan pernah terbuka.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="text-[11px] font-mono text-slate-400 mb-3">
                Terbuka: <span className="text-cyan-400 font-black">{unlockedCount}</span> / {badges.length}
            </div>

            <div className="space-y-2">
                {badges.map(badge => {
                    const unlocked = isUnlocked(badge, fakeCareer, {});
                    const current = currentTotals[badge.source] || 0;
                    const pct = badge.target > 0 ? Math.min(100, Math.round((current / badge.target) * 100)) : 0;
                    return (
                        <div
                            key={badge.id}
                            className="flex items-center gap-3 p-2.5 rounded-lg border transition-colors"
                            style={{
                                borderColor: unlocked ? badge.hex : 'rgba(255,255,255,0.08)',
                                backgroundColor: unlocked ? `${badge.hex}18` : 'rgba(0,0,0,0.3)'
                            }}
                        >
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: unlocked ? badge.hex : '#1e293b', color: unlocked ? '#000' : '#64748b' }}
                            >
                                {unlocked ? <Check size={16} /> : <Lock size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold truncate" style={{ color: unlocked ? badge.hex : '#94a3b8' }}>
                                    {badge.title}
                                </p>
                                <p className="text-[11px] text-slate-400 font-mono truncate">
                                    {statLabel(badge.source)}: {fmtValue(current, badge.fmt)} / {fmtValue(badge.target, badge.fmt)} ({pct}%)
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
