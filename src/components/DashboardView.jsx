import React from 'react';
import { ShieldAlert, AlertCircle, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SafetyStatus from './SafetyStatus';
import { formatRupiah, getRandomColor } from '../utils/helpers';
import DashboardBenchmarks from './DashboardBenchmarks';

// --- CUSTOM TOOLTIP FOR GRAPH ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + entry.value, 0);
    return (
      <div className="bg-white dark:bg-slate-800 p-4 border dark:border-slate-600 shadow-xl rounded-xl text-sm">
        <p className="font-bold mb-2 border-b pb-1 dark:border-slate-600 dark:text-white">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between items-center gap-4 mb-1">
             <span style={{ color: entry.color }} className="font-medium">{entry.name}:</span>
             <span className="font-mono dark:text-slate-300">{formatRupiah(entry.value)}</span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t dark:border-slate-600 flex justify-between font-bold dark:text-white">
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
    appSettings, handleSaveDashboardTargets // 🚀 Added these two
}) {
    return (
        <div className="space-y-8 relative">
            <SafetyStatus auditLogs={auditLogs} sessionStatus={sessionStatus} />

            {/* 🚀 INJECT THE NORTH STAR ROW HERE 🚀 */}
            {isAdmin && (
                <DashboardBenchmarks 
                    transactions={transactions} 
                    inventory={inventory} 
                    appSettings={appSettings}
                    onSaveTargets={handleSaveDashboardTargets}
                    canEditGoals={isAdmin} // 🔒 HARD LOCK: Only the Boss can edit this
                />
            )}

            
            {/* Summary Cards Grid */}
            <div key={`cards-${isAdmin}`} className="grid grid-cols-1 lg:grid-cols-3 gap-6 boot-1">
                <div className="border-l-4 border-white bg-white/5 p-6 backdrop-blur-sm">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total Assets</h3>
                    <p className="text-4xl font-bold text-white">{isAdmin ? formatRupiah(totalStockValue) : "****"}</p>
                </div>
                <div className="border-l-4 border-orange-500 bg-white/5 p-6 backdrop-blur-sm">
                    <h3 className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-1">Revenue</h3>
                    <p className="text-4xl font-bold text-white">{isAdmin ? formatRupiah(transactions.filter(t => t.type === 'SALE' || t.type === 'RETURN').reduce((acc, t) => acc + (t.total || 0), 0)) : "****"}</p>
                </div>
                <div className="border-l-4 border-emerald-500 bg-white/5 p-6 backdrop-blur-sm">
                    <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Net Profit</h3>
                    <p className="text-4xl font-bold text-white">{isAdmin ? formatRupiah(transactions.filter(t => t.type === 'SALE').reduce((acc, t) => acc + (t.totalProfit || 0), 0)) : "****"}</p>
                </div>
            </div>

            {/* PHYSICAL SECURITY BLOCK */}
            {isAdmin && !isUsbSecure && (
                <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl flex justify-between items-center animate-pulse">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="text-orange-500" size={20}/>
                        <p className="text-xs text-orange-200 font-bold uppercase tracking-wider">
                            Physical Security Protocol Required?
                        </p>
                    </div>
                    <button 
                        onClick={handleBackupData} 
                        className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-xl font-bold text-xs shadow-lg transition-all active:scale-95"
                    >
                        Run USB Safe Backup
                    </button>
                </div>
            )}

            {/* CRITICAL STOCK ALERT WIDGET */}
            {isAdmin && lowStockItems.length > 0 && (
                <div className="bg-red-950/20 border border-red-500/30 p-6 rounded-2xl shadow-lg relative overflow-hidden mb-6">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="text-red-500 animate-pulse" size={24}/>
                        <h3 className="text-red-400 font-bold uppercase tracking-widest text-sm">Critical Stock Alerts</h3>
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{lowStockItems.length} Items</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                        {lowStockItems.slice(0, 6).map(item => ( 
                            <div key={item.id} className="bg-black/50 border border-red-500/20 p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-red-900/30 transition-colors" onClick={() => { setActiveTab('inventory'); }}>
                                <div className="min-w-0 flex-1">
                                    <p className="text-white text-xs font-bold truncate">{item.name}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">Threshold: {item.minStock || 5}</p>
                                </div>
                                <div className="text-right ml-2 shrink-0 bg-red-950/50 p-2 rounded-lg border border-red-900/50">
                                    <p className="text-red-500 font-black text-lg leading-none">{item.stock}</p>
                                    <p className="text-[8px] text-red-400 uppercase tracking-widest mt-1">Left</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {lowStockItems.length > 6 && (
                        <button onClick={() => setActiveTab('inventory')} className="w-full mt-3 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-xs font-bold rounded-lg border border-red-900/50 transition-colors uppercase tracking-widest">
                            View All {lowStockItems.length} Depleted Items
                        </button>
                    )}
                </div>
            )}

            {/* Performance Graph Area */}
            <div key={`graph-${isAdmin}`} className="bg-black/40 border border-white/10 p-6 h-96 boot-2">
                <h3 className="text-white mb-4 uppercase text-xs font-bold tracking-widest border-b border-white/10 pb-2">Performance Graph</h3>
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

            {/* RE TERMINAL TOAST */}
            {backupToast && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1000] bg-black/90 border-2 border-emerald-500 text-emerald-500 px-10 py-5 rounded-none shadow-[0_0_30px_rgba(16,185,129,0.5)] font-mono flex flex-col items-center gap-2 animate-terminal-flicker">
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
                    <div className="flex items-center gap-3">
                        <ShieldCheck size={28} className="animate-pulse" />
                        <div className="text-lg font-black uppercase tracking-[0.3em]">Backup Initialized</div>
                    </div>
                    <div className="h-[1px] w-full bg-emerald-500/30"></div>
                    <div className="text-[10px] uppercase tracking-widest opacity-70">Physical Data Integrity Confirmed</div>
                </div>
            )}
        </div>
    );
}