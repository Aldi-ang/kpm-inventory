import React, { useState, useMemo } from 'react';
import { 
    User, Activity, TrendingUp, ShieldCheck, DollarSign, Wallet, 
    Calendar, Truck, Award, Target, Zap, Lock, Crosshair
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';

const AgentProfileView = ({ motorists, transactions, inventory, userRole, agentProfileId }) => {
    // If Admin, show the first motorist by default. If Agent, strictly lock to their own profile.
    const [selectedId, setSelectedId] = useState(() => {
        if (userRole !== 'ADMIN' && userRole !== 'AREA_ADMIN' && agentProfileId) return agentProfileId;
        return motorists && motorists.length > 0 ? motorists[0].id : null;
    });

    const activeAgent = motorists?.find(m => m.id === selectedId);

    // RPG Tier Engine
    const tiers = [
        { name: 'Bronze', min: 0, hex: '#d97706', color: 'text-amber-600', bg: 'bg-amber-900/30', border: 'border-amber-600/50', glow: 'shadow-[0_0_20px_rgba(217,119,6,0.4)]' },
        { name: 'Silver', min: 25000000, hex: '#94a3b8', color: 'text-slate-300', bg: 'bg-slate-700/30', border: 'border-slate-400/50', glow: 'shadow-[0_0_20px_rgba(148,163,184,0.4)]' },
        { name: 'Gold', min: 100000000, hex: '#facc15', color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-400/50', glow: 'shadow-[0_0_20px_rgba(250,204,21,0.4)]' },
        { name: 'Platinum', min: 250000000, hex: '#22d3ee', color: 'text-cyan-400', bg: 'bg-cyan-900/30', border: 'border-cyan-400/50', glow: 'shadow-[0_0_20px_rgba(34,211,238,0.4)]' },
        { name: 'Diamond', min: 500000000, hex: '#c084fc', color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-400/50', glow: 'shadow-[0_0_20px_rgba(192,132,252,0.4)]' },
        { name: 'Mythic', min: 1000000000, hex: '#f43f5e', color: 'text-rose-500', bg: 'bg-rose-900/30', border: 'border-rose-500/50', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.4)]' }
    ];

    // Crunch all the math for the selected agent
    const stats = useMemo(() => {
        if (!activeAgent) return null;

        let lifetimeOmset = 0; let todayOmset = 0; let todayCash = 0; let titipIssued = 0; let titipCollected = 0;
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Setup Chart Data (Last 7 Days)
        const last7Days = Array.from({length: 7}, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (6 - i));
            return { date: d.toISOString().split('T')[0], shortDate: d.toLocaleDateString('id-ID', {weekday:'short'}), cash: 0, titip: 0 };
        });

        // 🏆 Achievement Trackers
        const uniqueStores = new Set();
        let perfectDays = 0; // Placeholder for EOD perfection

        (transactions || []).forEach(t => {
            if (t.agentId === activeAgent.id || (t.agentName && t.agentName.toLowerCase() === activeAgent.name?.toLowerCase())) {
                const txDate = t.date || (t.timestamp ? new Date(t.timestamp.seconds * 1000).toISOString().split('T')[0] : null);
                
                if (t.type === 'SALE') {
                    lifetimeOmset += (t.total || 0);
                    if (t.customerName) uniqueStores.add(t.customerName);

                    if (t.paymentType === 'Titip') titipIssued += (t.total || 0);
                    
                    if (txDate === todayStr) {
                        todayOmset += (t.total || 0);
                        if (t.paymentType !== 'Titip') todayCash += (t.total || 0);
                    }

                    // Populate Chart
                    const chartDay = last7Days.find(d => d.date === txDate);
                    if (chartDay) {
                        if (t.paymentType === 'Titip') chartDay.titip += (t.total || 0);
                        else chartDay.cash += (t.total || 0);
                    }
                }
                if (t.type === 'CONSIGNMENT_PAYMENT') titipCollected += (t.amountPaid || t.total || 0);
            }
        });

        const activeTitipResponsibility = Math.max(0, titipIssued - titipCollected);
        
        let canvasValue = 0;
        (activeAgent.activeCanvas || []).forEach(item => {
            const product = inventory?.find(p => p.id === item.productId);
            let price = product ? (product.priceEcer || product.priceRetail || 0) : item.calculatedPrice || 0;
            
            // Convert to base Bks for value calc
            let qtyInBks = item.qty;
            if (product) {
                if (item.unit === 'Slop') qtyInBks = item.qty * (product.packsPerSlop || 10);
                if (item.unit === 'Bal') qtyInBks = item.qty * (product.slopsPerBal || 20) * (product.packsPerSlop || 10);
                if (item.unit === 'Karton') qtyInBks = item.qty * (product.balsPerCarton || 4) * (product.slopsPerBal || 20) * (product.packsPerSlop || 10);
            }
            canvasValue += (qtyInBks * price);
        });

        let currentTier = tiers[0]; let nextTier = tiers[1];
        for (let i = tiers.length - 1; i >= 0; i--) {
            if (lifetimeOmset >= tiers[i].min) {
                currentTier = tiers[i]; nextTier = tiers[i + 1] || null; break;
            }
        }
        const progressPercent = nextTier ? Math.min(100, Math.max(0, ((lifetimeOmset - currentTier.min) / (nextTier.min - currentTier.min)) * 100)) : 100;

        return { 
            lifetimeOmset, todayOmset, todayCash, activeTitipResponsibility, canvasValue, 
            currentTier, nextTier, progressPercent, chartData: last7Days,
            achievements: { stores: uniqueStores.size, titipCollected }
        };
    }, [activeAgent, transactions, inventory]);

    if (!activeAgent || !stats) return <div className="p-8 text-white">No Agent Data Found.</div>;

    const formatRp = (num) => new Intl.NumberFormat('id-ID', { notation: "compact", maximumFractionDigits: 1 }).format(num);

    return (
        <div className="flex h-full min-h-screen bg-black font-sans">
            
            {/* LEFT SIDEBAR: AGENT DIRECTORY (ONLY VISIBLE TO ADMINS) */}
            {(userRole === 'ADMIN' || userRole === 'AREA_ADMIN') && (
                <div className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
                    <div className="p-5 border-b border-slate-800 bg-black sticky top-0 z-10">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target size={14} className="text-emerald-500"/> Agent Directory</h2>
                    </div>
                    <div className="p-3 space-y-2">
                        {(motorists || []).map(agent => (
                            <button 
                                key={agent.id} 
                                onClick={() => setSelectedId(agent.id)}
                                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${selectedId === agent.id ? 'bg-blue-900/20 border-blue-500/50 shadow-inner' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                            >
                                <div className={`w-10 h-10 rounded-full bg-slate-800 border ${selectedId === agent.id ? 'border-blue-400 text-blue-400' : 'border-slate-600 text-slate-500'} flex items-center justify-center shrink-0`}><User size={18}/></div>
                                <div className="overflow-hidden">
                                    <p className={`font-bold text-sm truncate ${selectedId === agent.id ? 'text-white' : 'text-slate-300'}`}>{agent.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">{agent.location || 'Field'}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* RIGHT MAIN PANEL: THE DOSSIER */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900 pb-12 relative">
                
                {/* 🛡️ SECTOR 1: THE IDENTITY & RANK CARD */}
                <div className="p-6 md:p-10 border-b-2 border-slate-800 bg-gradient-to-br from-slate-900 to-black relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className={`absolute bottom-0 left-0 w-[600px] h-[600px] ${stats.currentTier.bg} rounded-full blur-[120px] pointer-events-none opacity-30 transition-colors duration-1000`}></div>
                    
                    <div className="flex flex-col xl:flex-row gap-8 relative z-10">
                        {/* AVATAR & IDENTITY */}
                        <div className="flex items-center gap-6 min-w-[350px]">
                            <div className={`w-28 h-28 rounded-3xl flex items-center justify-center border-4 ${stats.currentTier.border} ${stats.currentTier.bg} ${stats.currentTier.glow} backdrop-blur-sm shrink-0 transition-all duration-500`}>
                                <User size={48} className={stats.currentTier.color}/>
                            </div>
                            <div>
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${stats.currentTier.border} ${stats.currentTier.color} mb-2 shadow-md bg-black/50`}>
                                    <TrendingUp size={12}/> {stats.currentTier.name} OPERATIVE
                                </div>
                                <h1 className="text-3xl lg:text-4xl font-black text-white leading-none uppercase tracking-wide truncate mb-2">{activeAgent.name}</h1>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <ShieldCheck size={16} className="text-emerald-500"/>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">ID: {activeAgent.id.substring(0,8)}</span>
                                    <span className="text-slate-600">|</span>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest"><MapPin size={10} className="inline mr-1 text-orange-500"/>{activeAgent.location || 'Field'}</span>
                                </div>
                            </div>
                        </div>

                        {/* XP PROGRESS BAR */}
                        <div className="flex-1 flex flex-col justify-center bg-black/40 p-6 rounded-2xl border border-slate-800 shadow-inner backdrop-blur-sm">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5"><Activity size={14} className="text-blue-500"/> Lifetime Career Omset</span>
                                <span className={`text-xl font-black ${stats.currentTier.color} drop-shadow-md`}>Rp {new Intl.NumberFormat('id-ID').format(stats.lifetimeOmset)}</span>
                            </div>
                            <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700 shadow-inner relative mb-2">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
                                <div className={`h-full ${stats.currentTier.bg.replace('/30','/80')} transition-all duration-1000 ease-out relative`} style={{ width: `${stats.progressPercent}%`, backgroundColor: stats.currentTier.hex }}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30"></div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stats.currentTier.name} RANK</span>
                                {stats.nextTier ? (
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next: {stats.nextTier.name} <span className="text-slate-600">(Rp {formatRp(stats.nextTier.min - stats.lifetimeOmset)} left)</span></span>
                                ) : (
                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">MAX RANK REACHED</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 💰 SECTOR 2: THE FINANCIAL & CONSIGNMENT LEDGER */}
                <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
                    
                    <div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><DollarSign size={14}/> Live Financial Ledger</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg flex items-center justify-between group transition-all hover:border-blue-500 hover:bg-slate-800">
                                <div>
                                    <p className="text-[10px] text-blue-400/80 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Truck size={12}/> Active Canvas Value</p>
                                    <p className="text-2xl font-black text-blue-400 font-mono drop-shadow-[0_0_10px_rgba(96,165,250,0.3)]">Rp {formatRp(stats.canvasValue)}</p>
                                </div>
                            </div>
                            
                            <div className="bg-orange-950/20 border border-orange-900/50 rounded-2xl p-5 shadow-lg flex items-center justify-between group cursor-help transition-all hover:border-orange-500 hover:bg-orange-900/20" title="Total unpaid Titip issued by this agent floating in the market">
                                <div>
                                    <p className="text-[10px] text-orange-500/80 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><AlertCircle size={12}/> Consignment Risk (Titip)</p>
                                    <p className="text-2xl font-black text-orange-500 font-mono drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]">Rp {formatRp(stats.activeTitipResponsibility)}</p>
                                </div>
                            </div>

                            <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-5 shadow-lg flex items-center justify-between group transition-all hover:border-emerald-500 hover:bg-emerald-900/20">
                                <div>
                                    <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Wallet size={12}/> Today's Total Omset</p>
                                    <p className="text-2xl font-black text-emerald-500 font-mono drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">Rp {formatRp(stats.todayOmset)}</p>
                                    <p className="text-[10px] text-emerald-600 uppercase tracking-widest mt-1 font-bold bg-emerald-900/30 px-2 py-0.5 rounded inline-block">Cash Generated: Rp {formatRp(stats.todayCash)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {/* 📈 SECTOR 4: PERFORMANCE MATRIX (CHART) */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><TrendingUp size={14}/> 7-Day Performance Matrix</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="shortDate" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            cursor={{fill: '#0f172a'}}
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}
                                            formatter={(value) => `Rp ${new Intl.NumberFormat('id-ID').format(value)}`}
                                        />
                                        <Bar dataKey="cash" name="Cash Sales" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="titip" name="Titip (Consign)" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-6 mt-4">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Cash Sales</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Consignment (Titip)</span>
                            </div>
                        </div>

                        {/* 🏆 SECTOR 3: THE TROPHY ROOM */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Award size={14}/> The Trophy Room</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {/* Achievement 1: The Pioneer */}
                                <div className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${stats.achievements.stores >= 10 ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-950 border-slate-800 opacity-50 grayscale'}`}>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${stats.achievements.stores >= 10 ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-600'}`}>
                                        <Target size={24}/>
                                    </div>
                                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${stats.achievements.stores >= 10 ? 'text-blue-400' : 'text-slate-500'}`}>The Pioneer</h4>
                                    <p className="text-[9px] text-slate-500 leading-tight">Secured transactions across 10 unique store locations.</p>
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                                        <div className="bg-blue-500 h-full" style={{ width: `${Math.min(100, (stats.achievements.stores / 10) * 100)}%`}}></div>
                                    </div>
                                </div>

                                {/* Achievement 2: The Debt Collector */}
                                <div className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${stats.achievements.titipCollected >= 5000000 ? 'bg-orange-900/20 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-slate-950 border-slate-800 opacity-50 grayscale'}`}>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${stats.achievements.titipCollected >= 5000000 ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-600'}`}>
                                        <Zap size={24}/>
                                    </div>
                                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${stats.achievements.titipCollected >= 5000000 ? 'text-orange-400' : 'text-slate-500'}`}>Debt Collector</h4>
                                    <p className="text-[9px] text-slate-500 leading-tight">Successfully collected Rp 5.000.000 in past-due Titip.</p>
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                                        <div className="bg-orange-500 h-full" style={{ width: `${Math.min(100, (stats.achievements.titipCollected / 5000000) * 100)}%`}}></div>
                                    </div>
                                </div>

                                {/* Achievement 3: Vault Keeper (Locked) */}
                                <div className="p-4 rounded-xl border bg-slate-950 border-slate-800 opacity-50 grayscale flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-slate-800 text-slate-600"><Lock size={20}/></div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-500">Vault Keeper</h4>
                                    <p className="text-[9px] text-slate-500 leading-tight">Execute 7 flawless EOD stock opnames. (Locked)</p>
                                </div>

                                {/* Achievement 4: Ghost Rider (Locked) */}
                                <div className="p-4 rounded-xl border bg-slate-950 border-slate-800 opacity-50 grayscale flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-slate-800 text-slate-600"><Crosshair size={20}/></div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-500">Ghost Rider</h4>
                                    <p className="text-[9px] text-slate-500 leading-tight">Complete 50 sales without an HQ GPS Bypass. (Locked)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AgentProfileView;