import React, { useMemo } from 'react';
import { Trophy, Medal, Star, Flame, Zap, Target, Crown, ShieldCheck, ChevronRight, TrendingUp, User } from 'lucide-react';
import { calculateAgentLevel, checkUnlockedBadges } from './config/achievements';

// Map icon strings to actual Lucide components
const IconMap = { Flame, Zap, Target, Crown, ShieldCheck };

export default function HallOfFameView({ motorists = [], transactions = [] }) {
    
    // 🧠 The Calculation Engine: Loops through all agents and tallies their stats
    const leaderboardData = useMemo(() => {
        const statsMap = {};

        // Initialize everyone
        motorists.forEach(m => {
            statsMap[m.id] = {
                ...m,
                totalOmset: 0,
                totalTransactions: 0,
            };
        });

        // Tally up the sales
        transactions.forEach(trx => {
            if (trx.type === 'SALE' && statsMap[trx.agentId]) {
                statsMap[trx.agentId].totalTransactions += 1;
                statsMap[trx.agentId].totalOmset += (trx.totalAmount || 0);
            }
        });

        // Calculate Levels & Badges, then sort by Level (highest first)
        return Object.values(statsMap).map(agent => {
            const levelData = calculateAgentLevel(agent.totalOmset);
            const badges = checkUnlockedBadges(agent);
            return { ...agent, ...levelData, badges };
        }).sort((a, b) => b.totalOmset - a.totalOmset);

    }, [motorists, transactions]);

    if (leaderboardData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 opacity-50">
                <Trophy size={48} className="mb-4 text-slate-500" />
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-400">No Legends Yet</h2>
                <p className="text-xs font-mono mt-2">Deploy agents and make sales to populate the Hall of Fame.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto pb-20 animate-fade-in">
            <div className="mb-8 border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-black text-amber-500 uppercase tracking-widest flex items-center gap-3">
                    <Trophy size={28}/> Hall of Fame
                </h2>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-1">Global Operator Rankings & Achievements</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leaderboardData.map((agent, index) => {
                    // Top 3 get special glowing borders
                    let rankGlow = "border-slate-700/50 bg-slate-900/50";
                    let rankMedal = null;
                    if (index === 0) { rankGlow = "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] bg-gradient-to-b from-amber-950/40 to-slate-900/80"; rankMedal = <Medal className="text-amber-500" size={24}/>; }
                    else if (index === 1) { rankGlow = "border-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.1)] bg-slate-800/80"; rankMedal = <Medal className="text-slate-300" size={24}/>; }
                    else if (index === 2) { rankGlow = "border-amber-700 shadow-[0_0_15px_rgba(180,83,9,0.1)] bg-slate-800/80"; rankMedal = <Medal className="text-amber-700" size={24}/>; }

                    return (
                        <div key={agent.id} className={`rounded-2xl p-5 border-2 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${rankGlow}`}>
                            
                            {/* RANK BADGE */}
                            <div className="absolute top-0 right-0 bg-black/40 backdrop-blur-md rounded-bl-2xl px-4 py-2 border-b border-l border-inherit flex items-center gap-2">
                                <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Rank #{index + 1}</span>
                                {rankMedal}
                            </div>

                            <div className="flex items-center gap-4 mb-6 mt-2">
                                <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center overflow-hidden">
                                    <User size={32} className="text-slate-500" />
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-lg uppercase tracking-wider truncate max-w-[150px]">{agent.name || agent.email.split('@')[0]}</h3>
                                    <p className="text-[10px] text-cyan-400 font-mono flex items-center gap-1"><Star size={10}/> Lvl {agent.level} Operator</p>
                                </div>
                            </div>

                            {/* EXP BAR */}
                            <div className="mb-6">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    <span>EXP Progress</span>
                                    <span>Next Level: Rp {(agent.nextLevelOmset / 1000000).toFixed(1)}M</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                    <div 
                                        className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all duration-1000" 
                                        style={{ width: `${Math.min(agent.progress, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* STATS */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-black/30 p-2 rounded border border-slate-800/50">
                                    <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Total Omset</p>
                                    <p className="text-xs font-bold text-emerald-400">Rp {agent.totalOmset.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="bg-black/30 p-2 rounded border border-slate-800/50">
                                    <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Transactions</p>
                                    <p className="text-xs font-bold text-blue-400">{agent.totalTransactions} closed</p>
                                </div>
                            </div>

                            {/* UNLOCKED BADGES */}
                            <div className="border-t border-slate-700/50 pt-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Unlocked Achievements</p>
                                <div className="flex flex-wrap gap-2">
                                    {agent.badges.length > 0 ? (
                                        agent.badges.map(badge => {
                                            const BadgeIcon = IconMap[badge.icon] || Star;
                                            return (
                                                <div key={badge.id} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider border ${badge.bg} ${badge.color} ${badge.border}`} title={badge.description}>
                                                    <BadgeIcon size={12}/> {badge.title}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-[10px] text-slate-600 font-mono italic">No badges unlocked yet.</p>
                                    )}
                                </div>
                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
    );
}
