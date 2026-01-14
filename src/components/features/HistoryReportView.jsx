import React, { useState, useMemo } from 'react';
import { FileText, Trash2, Folder, ArrowRight } from 'lucide-react';
import { formatRupiah } from '../../utils';

const HistoryReportView = ({ transactions, onDelete }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const customerStats = useMemo(() => {
    const stats = {};
    transactions.forEach(t => {
      const name = t.customerName || 'Unknown';
      if (!stats[name]) stats[name] = { name, count: 0, total: 0, lastDate: t.date, history: [] };
      stats[name].count += 1;
      if (t.type === 'SALE' || t.type === 'RETURN') {
         stats[name].total += t.total || 0; 
      }
      if (t.date > stats[name].lastDate) stats[name].lastDate = t.date;
      stats[name].history.push(t);
    });
    return Object.values(stats).sort((a,b) => b.total - a.total);
  }, [transactions]);

  if (!selectedCustomer) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><FileText size={24} className="text-orange-500"/> Transaction History Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customerStats.map(c => (
            <div key={c.name} onClick={() => setSelectedCustomer(c)} className="relative bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-orange-500 group">
              <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    onDelete(c.name); 
                }} 
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors z-10"
                title="Delete Folder & Data"
              >
                <Trash2 size={16} />
              </button>
              
              <div className="flex items-start justify-between mb-4">
                 <div className="p-3 bg-orange-100 dark:bg-slate-700 rounded-lg text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <Folder size={24} />
                 </div>
                 <span className="text-xs font-mono text-slate-400 mr-8">{c.lastDate}</span>
              </div>
              <h3 className="font-bold text-lg dark:text-white mb-1 truncate">{c.name}</h3>
              <div className="flex justify-between items-end mt-4">
                 <div>
                    <p className="text-xs text-slate-500 uppercase">Lifetime Value</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(c.total)}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase">Transactions</p>
                    <p className="font-bold dark:text-white">{c.count}</p>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const groupedByMonth = selectedCustomer.history.reduce((groups, t) => {
    const date = new Date(t.date);
    const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
    return groups;
  }, {});

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
       <button onClick={() => setSelectedCustomer(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors">
          <ArrowRight className="rotate-180" size={20}/> Back to Folders
       </button>

       <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 overflow-hidden">
          <div className="bg-slate-900 text-white p-8">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-orange-500 font-bold tracking-widest text-xs uppercase mb-1">Customer Performance Report</p>
                    <h1 className="text-3xl font-bold font-serif">{selectedCustomer.name}</h1>
                </div>
                <div className="text-right">
                    <p className="text-sm opacity-70">Total Lifetime Value</p>
                    <p className="text-2xl font-bold">{formatRupiah(selectedCustomer.total)}</p>
                </div>
             </div>
          </div>

          <div className="p-8">
             {Object.entries(groupedByMonth).map(([month, trans]) => (
                <div key={month} className="mb-8 last:mb-0">
                   <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 border-b-2 border-orange-500 inline-block mb-4 pb-1">{month}</h3>
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase text-xs font-bold">
                               <tr>
                                   <th className="p-3">Date</th>
                                   <th className="p-3">Type</th>
                                   <th className="p-3">Details</th>
                                   <th className="p-3 text-right">Amount</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                               {trans.map(t => (
                                   <tr key={t.id}>
                                       <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{t.date}</td>
                                       <td className="p-3">
                                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                               t.type === 'SALE' ? 'bg-emerald-100 text-emerald-700' :
                                               t.type === 'RETURN' ? 'bg-red-100 text-red-700' :
                                               'bg-blue-100 text-blue-700'
                                           }`}>
                                               {t.type.replace('_', ' ')}
                                           </span>
                                       </td>
                                       <td className="p-3 text-slate-600 dark:text-slate-300">
                                            {t.items ? `${t.items.length} Items` : t.itemsPaid ? `Payment for ${t.itemsPaid.length} Items` : 'N/A'}
                                            {t.paymentType === 'Titip' && <span className="ml-2 text-xs text-orange-500 font-bold">(Consignment)</span>}
                                       </td>
                                       <td className={`p-3 text-right font-bold ${t.total < 0 ? 'text-red-500' : 'text-slate-700 dark:text-white'}`}>
                                           {formatRupiah(t.amountPaid || t.total)}
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};

export default HistoryReportView;