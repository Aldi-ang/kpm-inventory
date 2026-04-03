import React, { useMemo, useState, useEffect } from 'react';
import { Target, TrendingUp, Flame, Settings, X, Save } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatRupiah } from '../utils/helpers';

export default function DashboardBenchmarks({ transactions = [], inventory = [], appSettings, onSaveTargets, canEditGoals }) {
    
    const TARGET_MONTHLY_REVENUE = appSettings?.targetMonthlyRevenue || 500000000; 
    const TARGET_DAILY_BAL = appSettings?.targetDailyBal || 50; 
    const TARGET_FILTER_RATIO = appSettings?.targetFilterRatio || 60; 

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        targetMonthlyRevenue: TARGET_MONTHLY_REVENUE,
        targetDailyBal: TARGET_DAILY_BAL,
        targetFilterRatio: TARGET_FILTER_RATIO
    });

    useEffect(() => {
        if (isEditing) {
            setEditForm({
                targetMonthlyRevenue: appSettings?.targetMonthlyRevenue || 500000000,
                targetDailyBal: appSettings?.targetDailyBal || 50,
                targetFilterRatio: appSettings?.targetFilterRatio || 60
            });
        }
    }, [isEditing, appSettings]);

    const handleSave = (e) => {
        e.preventDefault();
        onSaveTargets({
            targetMonthlyRevenue: Number(editForm.targetMonthlyRevenue),
            targetDailyBal: Number(editForm.targetDailyBal),
            targetFilterRatio: Number(editForm.targetFilterRatio)
        });
        setIsEditing(false);
    };

    const metrics = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const todayStr = now.toLocaleDateString();

        let monthlyRevenue = 0;
        let dailyBalSold = 0;
        let filterSales = 0;
        let kretekSales = 0;

        transactions.forEach(t => {
            if (t.type !== 'SALE') return;
            const tDate = new Date(t.timestamp?.seconds ? t.timestamp.seconds * 1000 : t.date);
            
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
                monthlyRevenue += (t.total || 0);
            }

            if (tDate.toLocaleDateString() === todayStr) {
                (t.items || []).forEach(item => {
                    const prodData = inventory.find(p => p.id === item.productId) || {};
                    let bksQty = item.qty;
                    if (item.unit === 'Batang') bksQty = item.qty / (prodData.sticksPerPack || 16);
                    
                    let multToBal = 0;
                    const packsPerSlop = prodData.packsPerSlop || 10;
                    const slopsPerBal = prodData.slopsPerBal || 20;
                    const packsPerBal = packsPerSlop * slopsPerBal;

                    if (item.unit === 'Slop' || item.unit === 'Batang' || item.unit === 'Bks') {
                        multToBal = (item.unit === 'Slop' ? item.qty * packsPerSlop : bksQty) / packsPerBal;
                    } else if (item.unit === 'Bal') {
                        multToBal = item.qty;
                    } else if (item.unit === 'Karton') {
                        multToBal = item.qty * (prodData.balsPerCarton || 4);
                    }

                    dailyBalSold += multToBal;

                    const name = (item.name || '').toLowerCase();
                    const type = (item.type || '').toLowerCase();
                    const isFilter = name.includes('filter') || type.includes('skm') || name.includes('mild');
                    
                    if (isFilter) filterSales += multToBal;
                    else kretekSales += multToBal; 
                });
            }
        });

        const totalProportionSales = filterSales + kretekSales;
        const filterPercent = totalProportionSales > 0 ? Math.round((filterSales / totalProportionSales) * 100) : 0;
        const kretekPercent = totalProportionSales > 0 ? Math.round((kretekSales / totalProportionSales) * 100) : 0;

        return { monthlyRevenue, dailyBalSold: dailyBalSold.toFixed(1), filterPercent, kretekPercent };
    }, [transactions, inventory]);

    const pieData = [
        { name: 'Filter (SKM)', value: metrics.filterPercent, color: '#3b82f6' }, 
        { name: 'Kretek (SKT)', value: metrics.kretekPercent, color: '#f59e0b' }  
    ];

    return (
        <>
            {/* --- DASHBOARD WIDGETS --- */}
            <div className="relative mb-8 boot-1">
                <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-2">
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest">Executive Targets</h2>
                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em]">Live System Benchmarks</p>
                    </div>
                    {canEditGoals && (
                        <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors border border-white/10">
                            <Settings size={14}/> Adjust Goals
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-black/50 border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={80}/></div>
                        <h3 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Monthly Trajectory</h3>
                        <p className="text-2xl font-black text-white mb-4">{formatRupiah(metrics.monthlyRevenue)}</p>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-2">
                            <div className="bg-emerald-500 h-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: `${Math.min((metrics.monthlyRevenue / TARGET_MONTHLY_REVENUE) * 100, 100)}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase">
                            <span>{Math.round((metrics.monthlyRevenue / TARGET_MONTHLY_REVENUE) * 100)}% to Goal</span>
                            <span>Target: {formatRupiah(TARGET_MONTHLY_REVENUE)}</span>
                        </div>
                    </div>

                    <div className="bg-black/50 border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Target size={80}/></div>
                        <h3 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Daily Volume (Bal)</h3>
                        <div className="flex items-baseline gap-2 mb-4">
                            <p className="text-3xl font-black text-white leading-none">{metrics.dailyBalSold}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-0.5">/ {TARGET_DAILY_BAL} BAL</p>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-2">
                            <div className="bg-orange-500 h-full shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all duration-1000" style={{ width: `${Math.min((metrics.dailyBalSold / TARGET_DAILY_BAL) * 100, 100)}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase">
                            <span>Pace: {metrics.dailyBalSold >= TARGET_DAILY_BAL ? 'Target Met!' : 'Behind Schedule'}</span>
                            <span>{Math.max(0, TARGET_DAILY_BAL - metrics.dailyBalSold).toFixed(1)} Bal Remaining</span>
                        </div>
                    </div>

                    <div className="bg-black/50 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Flame size={12}/> Product Shift</h3>
                            <div className="space-y-2">
                                <div>
                                    <div className="flex justify-between text-[10px] font-bold mb-1"><span className="text-blue-400">Filter (SKM)</span><span className="text-white">{metrics.filterPercent}%</span></div>
                                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-500 h-full" style={{ width: `${metrics.filterPercent}%` }}></div></div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] font-bold mb-1"><span className="text-orange-400">Kretek (SKT)</span><span className="text-white">{metrics.kretekPercent}%</span></div>
                                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden"><div className="bg-orange-500 h-full" style={{ width: `${metrics.kretekPercent}%` }}></div></div>
                                </div>
                                <p className="text-[8px] font-mono text-slate-500 uppercase mt-2">Target Ratio: {TARGET_FILTER_RATIO}% Filter</p>
                            </div>
                        </div>
                        <div className="w-24 h-24 shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                                        {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MODAL (FREED FROM STACKING CONTEXT) --- */}
            {isEditing && (
                <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
                    <div className="bg-[#0a0a0a] border border-white/20 p-8 rounded-2xl w-full max-w-md shadow-2xl relative font-mono">
                        <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-slate-500 hover:text-red-500 transition-colors"><X size={24}/></button>
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3 uppercase tracking-widest"><Settings className="text-orange-500"/> Edit Goals</h2>
                        <form onSubmit={handleSave} className="space-y-5">
                            <div>
                                <label className="text-[10px] text-emerald-500 font-bold block mb-2 uppercase tracking-widest">Target Monthly Revenue (Rp)</label>
                                <input type="text" value={editForm.targetMonthlyRevenue} onChange={(e) => setEditForm({...editForm, targetMonthlyRevenue: e.target.value.replace(/\D/g, '')})} className="w-full p-3 bg-black border border-emerald-500/30 text-white rounded outline-none focus:border-emerald-500" required/>
                            </div>
                            <div>
                                <label className="text-[10px] text-orange-500 font-bold block mb-2 uppercase tracking-widest">Target Daily Volume (Bal)</label>
                                <input type="text" value={editForm.targetDailyBal} onChange={(e) => setEditForm({...editForm, targetDailyBal: e.target.value.replace(/[^0-9.]/g, '')})} className="w-full p-3 bg-black border border-orange-500/30 text-white rounded outline-none focus:border-orange-500" required/>
                            </div>
                            <div>
                                <label className="text-[10px] text-blue-500 font-bold block mb-2 uppercase tracking-widest">Target Filter Proportion (%)</label>
                                <input type="text" maxLength={3} value={editForm.targetFilterRatio} onChange={(e) => setEditForm({...editForm, targetFilterRatio: e.target.value.replace(/\D/g, '')})} className="w-full p-3 bg-black border border-blue-500/30 text-white rounded outline-none focus:border-blue-500" required/>
                                <p className="text-[9px] text-slate-500 mt-2">Example: 60 = Aiming for 60% Filter / 40% Kretek.</p>
                            </div>
                            <button type="submit" className="w-full mt-4 bg-white/10 hover:bg-white text-white hover:text-black py-4 rounded font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                                <Save size={16}/> Save Master Targets
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}