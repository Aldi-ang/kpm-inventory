import React, { useMemo } from 'react';
import { ShieldAlert, AlertCircle, ShieldCheck, Users, Box, Activity, TrendingDown, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SafetyStatus from './SafetyStatus';
import { formatRupiah, getRandomColor } from '../utils/helpers';
import DashboardBenchmarks from './DashboardBenchmarks';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + entry.value, 0);
    return (
      <div className="bg-white dark:bg-panel p-4 border dark:border-line-3 shadow-xl rounded-xl text-sm">
        <p className="font-bold mb-2 border-b pb-1 dark:border-line-3 dark:text-white">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between items-center gap-4 mb-1">
             <span style={{ color: entry.color }} className="font-medium">{entry.name}:</span>
             <span className="font-mono dark:text-ink">{formatRupiah(entry.value)}</span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t dark:border-line-3 flex justify-between font-bold dark:text-white">
            <span>Total Sales:</span>
            <span>{formatRupiah(total)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardView({ 
    isAdmin, userRole, totalStockValue, transactions, isUsbSecure, 
    handleBackupData, lowStockItems, setActiveTab, chartData, 
    backupToast, sessionStatus, auditLogs,
    appSettings, handleSaveDashboardTargets,
    inventory, motorists, customers // 🚀 NOW RECEIVING THESE
}) {

    // --- AGENT LEADERBOARD ---
    const agentPerformance = useMemo(() => {
        const todayStr = new Date().toLocaleDateString();
        const perf = {};
        
        transactions.forEach(t => {
            if (t.type === 'SALE' && new Date(t.timestamp?.seconds ? t.timestamp.seconds * 1000 : t.date).toLocaleDateString() === todayStr) {
                const agent = t.agentName || 'Admin / Unknown';
                if (!perf[agent]) perf[agent] = { revenue: 0, profit: 0, count: 0 };
                perf[agent].revenue += (t.total || 0);
                perf[agent].profit += (t.totalProfit || 0);
                perf[agent].count += 1;
            }
        });
        return Object.entries(perf).map(([name, data]) => ({ name, ...data })).sort((a,b) => b.revenue - a.revenue);
    }, [transactions]);

    // --- VAULT VELOCITY ---
    const vaultVelocity = useMemo(() => {
        if (!inventory) return { fastest: [], slowest: [] }; // Safety check
        const salesCount = {};
        inventory.forEach(i => salesCount[i.id] = { name: i.name, soldBks: 0, stock: i.stock, isLow: i.stock <= (i.minStock || 5) });
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        transactions.forEach(t => {
            if (t.type === 'SALE') {
                const tDate = new Date(t.timestamp?.seconds ? t.timestamp.seconds * 1000 : t.date);
                if (tDate >= thirtyDaysAgo) {
                    (t.items || []).forEach(item => {
                        if (salesCount[item.productId]) {
                            let bksQty = item.qty;
                            const pData = inventory.find(p => p.id === item.productId) || {};
                            if (item.unit === 'Batang') bksQty = item.qty / (pData.sticksPerPack || 16);
                            if (item.unit === 'Slop') bksQty = item.qty * (pData.packsPerSlop || 10);
                            if (item.unit === 'Bal') bksQty = item.qty * (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10);
                            if (item.unit === 'Karton') bksQty = item.qty * (pData.balsPerCarton || 4) * (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10);
                            
                            salesCount[item.productId].soldBks += bksQty;
                        }
                    });
                }
            }
        });
        
        const sorted = Object.values(salesCount).sort((a,b) => b.soldBks - a.soldBks);
        return {
            fastest: sorted.slice(0, 5),
            slowest: sorted.filter(item => item.stock > 0).reverse().slice(0, 5) 
        };
    }, [transactions, inventory]);

    return (
        <div className="space-y-8 relative pb-20">
            <SafetyStatus auditLogs={auditLogs} sessionStatus={sessionStatus} />

            {/* --- ROW 1: THE NORTH STAR (BENCHMARKS) --- */}
            {isAdmin && (
                <DashboardBenchmarks 
                    transactions={transactions} 
                    inventory={inventory} 
                    appSettings={appSettings}
                    onSaveTargets={handleSaveDashboardTargets}
                    canEditGoals={isAdmin} 
                />
            )}

            {/* --- ROW 2: TOTAL ASSET CARDS --- */}
            <div key={`cards-${isAdmin}`} className="grid grid-cols-1 lg:grid-cols-3 gap-6 boot-2">
                <div className="border-l-4 border-white bg-white/5 p-6 backdrop-blur-sm shadow-lg">
                    <h3 className="text-ink-muted text-xs font-bold uppercase tracking-widest mb-1">Total Vault Assets</h3>
                    <p className="text-4xl font-bold text-white">{isAdmin ? formatRupiah(totalStockValue) : "****"}</p>
                </div>
                <div className="border-l-4 border-orange bg-white/5 p-6 backdrop-blur-sm shadow-lg">
                    <h3 className="text-orange text-xs font-bold uppercase tracking-widest mb-1">Global Revenue (All Time)</h3>
                    <p className="text-4xl font-bold text-white">{isAdmin ? formatRupiah(transactions.filter(t => t.type === 'SALE' || t.type === 'RETURN').reduce((acc, t) => acc + (t.total || 0), 0)) : "****"}</p>
                </div>
                <div className="border-l-4 border-verified bg-white/5 p-6 backdrop-blur-sm shadow-lg">
                    <h3 className="text-verified text-xs font-bold uppercase tracking-widest mb-1">Net Profit (All Time)</h3>
                    <p className="text-4xl font-bold text-white">{isAdmin ? formatRupiah(transactions.filter(t => t.type === 'SALE').reduce((acc, t) => acc + (t.totalProfit || 0), 0)) : "****"}</p>
                </div>
            </div>

            {/* --- ROW 3 & 4 CONTAINER: INTELLIGENCE SPLIT --- */}
            {isAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 boot-3">
                    
                    {/* LEADERBOARD WIDGET */}
                    <div className="bg-black/50 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                            <Users className="text-ink-muted" size={24}/>
                            <div>
                                <h3 className="text-white font-bold uppercase tracking-widest">Agent Leaderboard</h3>
                                <p className="text-[10px] text-ink-muted font-mono uppercase tracking-widest">Today's Live Performance</p>
                            </div>
                        </div>

                        {agentPerformance.length === 0 ? (
                            <p className="text-ink-muted text-xs italic text-center py-10 uppercase tracking-widest">No sales recorded today.</p>
                        ) : (
                            <div className="space-y-4">
                                {agentPerformance.map((agent, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-gold/20 text-gold border border-gold/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : idx === 1 ? 'bg-inset/20 text-ink border border-line-3/50' : idx === 2 ? 'bg-gold/20 text-gold border border-gold/50' : 'bg-white/5 text-ink-muted'}`}>
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm">{agent.name}</p>
                                                <p className="text-[11px] text-ink-muted font-mono uppercase">{agent.count} Invoices Processed</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-verified font-bold text-sm">{formatRupiah(agent.revenue)}</p>
                                            <p className="text-[11px] text-verified/70 font-mono uppercase tracking-widest">PROFIT: {formatRupiah(agent.profit)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* VAULT VELOCITY WIDGET */}
                    <div className="bg-black/50 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                            <Activity className="text-orange" size={24}/>
                            <div>
                                <h3 className="text-white font-bold uppercase tracking-widest">Vault Velocity</h3>
                                <p className="text-[10px] text-ink-muted font-mono uppercase tracking-widest">30-Day Product Movement</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-[10px] font-bold text-verified uppercase tracking-widest mb-3 flex items-center gap-2"><TrendingUp size={12}/> High Demand</h4>
                                <div className="space-y-2">
                                    {vaultVelocity.fastest.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-verified-fill/10 border border-verified/20 p-2 rounded-lg">
                                            <span className="text-xs text-white truncate max-w-[120px]">{item.name}</span>
                                            <div className="text-right shrink-0">
                                                <span className="text-xs font-bold text-verified">{Math.floor(item.soldBks)} <span className="text-[11px]">BKS</span></span>
                                                {item.isLow && <span className="block text-[11px] text-danger-text uppercase font-bold animate-pulse">Low Stock</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold text-danger-text uppercase tracking-widest mb-3 flex items-center gap-2"><TrendingDown size={12}/> Dead Stock Watch</h4>
                                <div className="space-y-2">
                                    {vaultVelocity.slowest.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-danger-well/10 border border-danger/20 p-2 rounded-lg">
                                            <span className="text-xs text-white truncate max-w-[120px]">{item.name}</span>
                                            <div className="text-right shrink-0">
                                                <span className="text-[11px] text-ink-muted uppercase block">Sold: {Math.floor(item.soldBks)}</span>
                                                <span className="text-xs font-bold text-danger-text">Vault: {Math.floor(item.stock)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CRITICAL ALERTS & PHYSICAL SECURITY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 boot-4">
                {isAdmin && lowStockItems.length > 0 && (
                    <div className="bg-danger-well/20 border border-danger/30 p-6 rounded-2xl shadow-lg relative overflow-hidden h-full">
                        <div className="absolute top-0 left-0 w-1 h-full bg-danger animate-pulse"></div>
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="text-danger-text animate-pulse" size={24}/>
                            <h3 className="text-danger-text font-bold uppercase tracking-widest text-sm">Critical Stock Alerts</h3>
                            <span className="bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{lowStockItems.length} Items</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {lowStockItems.slice(0, 4).map(item => ( 
                                <div key={item.id} className="bg-black/50 border border-danger/20 p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-danger-well/30 transition-colors" onClick={() => { setActiveTab('inventory'); }}>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white text-xs font-bold truncate">{item.name}</p>
                                    </div>
                                    <div className="text-right ml-2 shrink-0 bg-danger-well/50 px-2 py-1 rounded border border-danger-rail/50">
                                        <p className="text-danger-text font-black text-sm leading-none">{item.stock}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {lowStockItems.length > 4 && (
                            <button onClick={() => setActiveTab('inventory')} className="w-full mt-3 py-2 bg-danger-well/20 hover:bg-danger-well/40 text-danger-text text-[10px] font-bold rounded-lg border border-danger-rail/50 transition-colors uppercase tracking-widest">
                                View All {lowStockItems.length} Depleted Items
                            </button>
                        )}
                    </div>
                )}

                {isAdmin && !isUsbSecure && (
                    <div className="bg-orange/10 border border-orange/30 p-6 rounded-2xl flex flex-col justify-center items-center text-center animate-pulse h-full">
                        <ShieldAlert className="text-orange mb-3" size={32}/>
                        <h3 className="text-sm text-orange font-bold uppercase tracking-wider mb-1">Physical Security Protocol Required</h3>
                        <p className="text-[10px] text-orange/70 uppercase tracking-widest mb-4">No offline backup detected in last 7 days.</p>
                        <button onClick={handleBackupData} className="bg-orange hover:bg-orange text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95">
                            Run USB Safe Backup
                        </button>
                    </div>
                )}
            </div>

            {/* PERFORMANCE GRAPH (7-DAY HISTORY) */}
            <div key={`graph-${isAdmin}`} className="bg-black/40 border border-white/10 p-6 h-96 boot-4 mt-8 rounded-2xl">
                <h3 className="text-white mb-4 uppercase text-xs font-bold tracking-widest border-b border-white/10 pb-2">7-Day Revenue Graph</h3>
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                      <BarChart data={chartData.data}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#fff"/>
                          <XAxis dataKey="date" stroke="#666" fontSize={10} tick={{fill: '#999'}}/>
                          <YAxis stroke="#666" fontSize={10} tick={{fill: '#999'}}/>
                          <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.1)'}}/>
                          <Legend />
                          {chartData.keys.map((key) => (
                              <Bar key={key} dataKey={key} stackId="a" fill={getRandomColor(key)} />
                          ))}
                      </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}