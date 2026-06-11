import React, { useMemo } from 'react';
import { Trophy, Medal, Star, Flame, Zap, Target, Crown, ShieldCheck, User } from 'lucide-react';
import { checkUnlockedBadges } from './config/achievements';

const IconMap = { Flame, Zap, Target, Crown, ShieldCheck };

export default function HallOfFameView({ motorists = [], transactions = [], rpgData = {} }) {
    
    // 🧠 UPGRADED CALCULATION ENGINE: Perfectly syncs with Agent Profile manual EXP & multipliers
    const leaderboardData = useMemo(() => {
        const statsMap = {};

        motorists.forEach(m => {
            if (m.id !== 'master_owner') {
                statsMap[m.id] = { ...m, totalOmset: 0, totalTransactions: 0 };
            }
        });

        transactions.forEach(trx => {
            if (trx.type === 'SALE' && statsMap[trx.agentId]) {
                statsMap[trx.agentId].totalTransactions += 1;
                statsMap[trx.agentId].totalOmset += (trx.totalAmount || trx.total || 0);
            }
        });

        const sortedRanks = [...(rpgData.ranks || [])].sort((a,b) => Number(a.min) - Number(b.min));

        return Object.values(statsMap).map(agent => {
            // SYNCED EXP MATH
            const lifetimeEXP = (agent.totalOmset * (rpgData.expMultiplier || 1)) + (agent.manualExp || 0);
            
            let currentTier = sortedRanks[0] || { name: 'Unranked', hex: '#64748b', min: 0 }; 
            let nextTier = sortedRanks[1] || null;
            
            for (let i = sortedRanks.length - 1; i >= 0; i--) {
                if (lifetimeEXP >= Number(sortedRanks[i].min)) { 
                    currentTier = sortedRanks[i]; 
                    nextTier = sortedRanks[i + 1] || null; 
                    break; 
                }
            }

            const progress = nextTier ? Math.min(100, Math.max(0, ((lifetimeEXP - currentTier.min) / (nextTier.min - currentTier.min)) * 100)) : 100;
            const badges = checkUnlockedBadges({ totalOmset: agent.totalOmset, totalTransactions: agent.totalTransactions });

            return { ...agent, lifetimeEXP, currentTier, nextTier, progress, badges };
        }).sort((a, b) => b.lifetimeEXP - a.lifetimeEXP);

    }, [motorists, transactions, rpgData]);

    return (
        <div className="max-w-6xl mx-auto pb-10 animate-fade-in-up">
            <div className="mb-8 border-b border-slate-700 pb-4 text-center md:text-left">
                <h2 className="text-3xl font-black text-amber-500 uppercase tracking-[0.2em] flex items-center justify-center md:justify-start gap-3 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                    <Trophy size={32}/> Global Leaderboard
                </h2>
                <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mt-2">Active Field Operator Rankings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leaderboardData.map((agent, index) => {
                    const rankHex = agent.currentTier?.hex || '#64748b';
                    let rankGlow = "border-slate-700 bg-slate-900";
                    let rankMedal = null;
                    if (index === 0) { rankGlow = "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] bg-gradient-to-b from-amber-950/40 to-slate-900/80 scale-[1.02]"; rankMedal = <Medal className="text-amber-500 animate-pulse" size={24}/>; }
                    else if (index === 1) { rankGlow = "border-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.1)] bg-slate-800/80"; rankMedal = <Medal className="text-slate-300" size={24}/>; }
                    else if (index === 2) { rankGlow = "border-amber-700 shadow-[0_0_15px_rgba(180,83,9,0.1)] bg-slate-800/80"; rankMedal = <Medal className="text-amber-700" size={24}/>; }

                    return (
                        <div key={agent.id} className={`rounded-2xl p-5 border-2 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${rankGlow}`}>
                            <div className="absolute top-0 right-0 bg-black/60 backdrop-blur-md rounded-bl-2xl px-4 py-2 border-b border-l border-inherit flex items-center gap-2">
                                <span className="text-xs font-black text-white uppercase tracking-widest">Rank #{index + 1}</span>
                                {rankMedal}
                            </div>

                            <div className="flex items-center gap-4 mb-6 mt-2">
                                <div className="w-16 h-16 rounded-full bg-black border-[3px] flex items-center justify-center overflow-hidden shadow-lg" style={{ borderColor: rankHex }}>
                                    {agent.profileImage ? <img src={agent.profileImage} className="w-full h-full object-cover"/> : <User size={32} className="opacity-50" style={{ color: rankHex }} />}
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-lg uppercase tracking-wider truncate max-w-[150px]">{agent.name}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: rankHex }}>
                                        {agent.currentTier?.logo ? <img src={agent.currentTier.logo} className="w-3 h-3 object-contain"/> : <Star size={10}/>} 
                                        {agent.currentTier?.name}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    <span>{new Intl.NumberFormat('id-ID').format(agent.lifetimeEXP)} XP</span>
                                    <span>Next: {agent.nextTier ? agent.nextTier.name : 'MAXED'}</span>
                                </div>
                                <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-slate-700">
                                    <div className="h-full transition-all duration-1000" style={{ width: `${agent.progress}%`, backgroundColor: rankHex, boxShadow: `0 0 10px ${rankHex}` }}></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-black/30 p-2 rounded border border-slate-800/50">
                                    <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Total Omset</p>
                                    <p className="text-xs font-bold text-emerald-400">Rp {new Intl.NumberFormat('id-ID', { notation: "compact", maximumFractionDigits: 1 }).format(agent.totalOmset)}</p>
                                </div>
                                <div className="bg-black/30 p-2 rounded border border-slate-800/50">
                                    <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Transactions</p>
                                    <p className="text-xs font-bold text-blue-400">{agent.totalTransactions} closed</p>
                                </div>
                            </div>

                            <div className="border-t border-slate-700/50 pt-4">
                                <div className="flex flex-wrap gap-2">
                                    {agent.badges.length > 0 ? (
                                        agent.badges.map(badge => {
                                            const BadgeIcon = IconMap[badge.icon] || Star;
                                            return (
                                                <div key={badge.id} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider border shadow-inner ${badge.bg} ${badge.color} ${badge.border}`} title={badge.description}>
                                                    <BadgeIcon size={12}/> {badge.title}
                                                </div>
                                            );
                                        })
                                    ) : <p className="text-[10px] text-slate-600 font-mono italic">No badges earned.</p>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}