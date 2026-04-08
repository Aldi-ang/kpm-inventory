import React, { useState, useMemo, useEffect } from 'react';
import { X, ArrowRight, Printer, Calendar, User, Folder, Store, Wallet, Package, Pencil, Trash2, Camera, FileText, MessageSquare } from 'lucide-react'; // 🚀 Added MessageSquare
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { formatRupiah, convertToBks, getCurrentDate } from '../utils/helpers';

export default function HistoryReportView({ transactions, inventory, onDeleteFolder, onDeleteTransaction, isAdmin, user, appId, db, appSettings, userRole, agentProfileId }) {
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [reportView, setReportView] = useState(false);
    const [rangeType, setRangeType] = useState('daily');
    const [targetDate, setTargetDate] = useState(getCurrentDate());
    const [editingTrans, setEditingTrans] = useState(null);
    const [viewingReceipt, setViewingReceipt] = useState(null); 
    const [viewingPhoto, setViewingPhoto] = useState(null); 
    const [printFormat, setPrintFormat] = useState('thermal'); 
    const [printScale, setPrintScale] = useState(100); // 🚀 NEW: Dynamic Print Scaling

    // 1. RBAC & FOLDER STRUCTURE ENGINE
    const reportData = useMemo(() => {
        const structure = {};
        transactions.forEach(t => {
            if (userRole !== 'ADMIN' && agentProfileId && t.agentId !== agentProfileId) return;
            
            const agent = t.agentName || 'Admin';
            let cust = (t.customerName || 'Walk-in Customer').trim();
            
            const isWalkIn = cust.toLowerCase().includes('walk-in') || !t.customerName;
            const isEcer = t.items?.some(i => i.priceTier === 'Ecer');
            
            if (isWalkIn || isEcer) {
                cust = "Individuals (Ecer)";
            }

            if (!structure[agent]) structure[agent] = { name: agent, total: 0, count: 0, customers: {}, lastDate: t.date };
            structure[agent].total += (t.total || t.amountPaid || 0);
            structure[agent].count += 1;
            if (t.date > structure[agent].lastDate) structure[agent].lastDate = t.date;

            if (!structure[agent].customers[cust]) structure[agent].customers[cust] = { name: cust, count: 0, total: 0, lastDate: t.date, history: [] };
            
            structure[agent].customers[cust].count += 1;
            structure[agent].customers[cust].total += (t.total || t.amountPaid || 0);
            if (t.date > structure[agent].customers[cust].lastDate) structure[agent].customers[cust].lastDate = t.date;
            
            structure[agent].customers[cust].history.push(t);
        });
        return structure;
    }, [transactions, userRole, agentProfileId]);

    useEffect(() => {
        if (userRole !== 'ADMIN') {
            const agents = Object.keys(reportData);
            if (agents.length > 0 && !selectedAgent) setSelectedAgent(agents[0]);
        }
    }, [userRole, reportData, selectedAgent]);

    // 2. ANALYTICS FILTERING
    const filteredTransactions = useMemo(() => {
        const target = new Date(targetDate);
        return transactions.filter(t => {
            if (userRole !== 'ADMIN' && agentProfileId && t.agentId !== agentProfileId) return false;
            if (userRole === 'ADMIN' && selectedAgent && (t.agentName || 'Admin') !== selectedAgent) return false;

            const tDate = new Date(t.date);
            if (rangeType === 'daily') return t.date === targetDate;
            if (rangeType === 'weekly') {
                const start = new Date(target); start.setDate(target.getDate() - target.getDay()); 
                const end = new Date(start); end.setDate(start.getDate() + 6);
                return tDate >= start && tDate <= end;
            }
            if (rangeType === 'monthly') return tDate.getMonth() === target.getMonth() && tDate.getFullYear() === target.getFullYear();
            if (rangeType === 'yearly') return tDate.getFullYear() === target.getFullYear();
            return false;
        }).sort((a,b) => (b.timestamp?.seconds||0) - (a.timestamp?.seconds||0));
    }, [transactions, rangeType, targetDate, isAdmin, user, userRole, agentProfileId, selectedAgent]);

    const stats = useMemo(() => {
        const totalRev = filteredTransactions.reduce((sum, t) => {
            if (t.type === 'RETUR') return sum - Math.abs(t.total || 0);
            return sum + (t.total || t.amountPaid || 0);
        }, 0);
        
        const totalProfit = filteredTransactions.reduce((sum, t) => sum + (t.totalProfit || 0), 0);
        const count = filteredTransactions.length;
        const items = {};
        const payments = { Cash: 0, QRIS: 0, Transfer: 0, Titip: 0 };

        filteredTransactions.forEach(t => {
            const method = t.paymentType || 'Cash';
            const value = t.total || t.amountPaid || 0;
            
            if (t.type === 'RETUR') {
                payments['Cash'] -= Math.abs(value);
            } else {
                if (payments[method] !== undefined) payments[method] += value;
                else payments['Cash'] += value;
            }

            if(t.items) t.items.forEach(i => {
                const product = inventory.find(p => p.id === i.productId);
                const bksQty = convertToBks(i.qty, i.unit, product || {});
                if(!items[i.name]) items[i.name] = { qty: 0, val: 0 };
                items[i.name].qty += bksQty;
                items[i.name].val += (i.calculatedPrice * i.qty);
            });
        });
        return { totalRev, totalProfit, count, items, payments, transactions: filteredTransactions };
    }, [filteredTransactions, inventory]);

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if(!editingTrans || !user) return;
        const formData = new FormData(e.target);
        try {
            await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, editingTrans.id), {
                date: formData.get('date'),
                customerName: formData.get('customerName'),
                total: parseFloat(formData.get('total')) || 0,
                updatedAt: serverTimestamp()
            });
            setEditingTrans(null);
        } catch(err) { alert(err.message); }
    };

    return (
        <div className="print-reset animate-fade-in max-w-5xl mx-auto pb-20 relative">
            
            {/* GLOBAL MODALS */}
            {viewingPhoto && (
                 <div className="fixed inset-0 z-[600] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in">
                     <button onClick={() => setViewingPhoto(null)} className="absolute top-6 right-6 text-white hover:text-red-500 z-50 bg-black/50 p-2 rounded-full transition-colors"><X size={32}/></button>
                     <div className="bg-white p-2 rounded-xl shadow-2xl max-w-2xl w-full relative">
                         <img src={viewingPhoto.photo || viewingPhoto} className="w-full h-auto max-h-[80vh] object-contain rounded-lg" alt="Delivery Proof" />
                     </div>
                     {viewingPhoto.latitude && (
                         <div className="text-white mt-4 font-mono text-xs text-center bg-black/60 px-6 py-3 rounded-xl border border-white/10 shadow-lg">
                             <p className="font-bold text-emerald-400 mb-1">GPS VERIFIED LOCATION</p>
                             <p>LAT/LNG: {viewingPhoto.latitude.toFixed(5)}, {viewingPhoto.longitude.toFixed(5)}</p>
                             <p>TIME: {new Date(viewingPhoto.capturedAt).toLocaleString('id-ID')}</p>
                         </div>
                     )}
                 </div>
             )}

            {editingTrans && (
                 <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                         <h3 className="font-bold text-lg mb-4 dark:text-white">Edit Transaction</h3>
                         <form onSubmit={handleEditSubmit} className="space-y-4">
                             <div><label className="text-xs font-bold text-slate-500">Date</label><input name="date" type="date" defaultValue={editingTrans.date} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"/></div>
                             <div><label className="text-xs font-bold text-slate-500">Customer</label><input name="customerName" defaultValue={editingTrans.customerName} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"/></div>
                             <div><label className="text-xs font-bold text-slate-500">Total Value (Rp)</label><input name="total" type="number" defaultValue={editingTrans.total || editingTrans.amountPaid} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"/></div>
                             <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setEditingTrans(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg font-bold">Cancel</button><button className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-bold">Save Changes</button></div>
                         </form>
                     </div>
                 </div>
             )}

            {viewingReceipt && (() => {
                const activeTier = viewingReceipt.items?.[0]?.priceTier || 'Retail';
                const isGrosir = activeTier === 'Grosir' || activeTier === 'Distributor';
                const unitLabel = isGrosir ? 'SLOP' : 'BKS';

                const catalogRows = inventory.map(invItem => {
                    const packsPerSlop = invItem.packsPerSlop || 10;
                    let basePrice = invItem.priceRetail || 0;
                    if (activeTier === 'Grosir') basePrice = invItem.priceGrosir || 0;
                    if (activeTier === 'Ecer') basePrice = invItem.priceEcer || 0;
                    
                    const displayPrice = isGrosir ? (basePrice * packsPerSlop) : basePrice;

                    const boughtItem = viewingReceipt.items?.find(i => i.productId === invItem.id);
                    let displayQty = 0;
                    let rowTotal = 0;
                    
                    if (boughtItem) {
                        let qtyInBks = boughtItem.qty;
                        if (boughtItem.unit === 'Slop') qtyInBks = boughtItem.qty * packsPerSlop;
                        if (boughtItem.unit === 'Bal') qtyInBks = boughtItem.qty * (invItem.slopsPerBal || 20) * packsPerSlop;
                        if (boughtItem.unit === 'Karton') qtyInBks = boughtItem.qty * (invItem.balsPerCarton || 4) * (invItem.slopsPerBal || 20) * packsPerSlop;
                        
                        displayQty = isGrosir ? (qtyInBks / packsPerSlop) : qtyInBks;
                        rowTotal = boughtItem.calculatedPrice * boughtItem.qty;
                    }
                    return { name: invItem.name, displayPrice, displayQty, total: rowTotal, isBought: !!boughtItem };
                });

                viewingReceipt.items?.forEach(boughtItem => {
                    if (!inventory.find(i => i.id === boughtItem.productId)) {
                        let qtyInBks = boughtItem.unit === 'Bks' ? boughtItem.qty : boughtItem.qty * 10;
                        let bksPrice = boughtItem.unit === 'Bks' ? boughtItem.calculatedPrice : boughtItem.calculatedPrice / 10;
                        
                        let displayQty = isGrosir ? (qtyInBks / 10) : qtyInBks;
                        let displayPrice = isGrosir ? (bksPrice * 10) : bksPrice;
                        
                        catalogRows.push({ name: boughtItem.name + " (Discontinued)", displayPrice, displayQty, total: boughtItem.calculatedPrice * boughtItem.qty, isBought: true });
                    }
                });

                let receiptDateStr = viewingReceipt.date || '';
                let receiptTimeStr = '';
                if (viewingReceipt.timestamp) {
                    const dateObj = new Date(viewingReceipt.timestamp.seconds * 1000);
                    receiptDateStr = dateObj.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
                    receiptTimeStr = dateObj.toLocaleTimeString('id-ID');
                } else if (receiptDateStr.includes(',')) {
                    const parts = receiptDateStr.split(', ');
                    receiptDateStr = parts[0];
                    receiptTimeStr = parts[1] || '';
                }

                return (
                    <div className="print-modal-wrapper fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-4">
                        <div className={`print-receipt format-${printFormat} !bg-white !text-black w-full ${printFormat === 'thermal' ? 'max-w-sm' : 'max-w-4xl'} shadow-2xl relative flex flex-col text-sm border-t-8 ${printFormat === 'a4' ? '!border-blue-800' : '!border-slate-800'} animate-fade-in rounded-b-lg max-h-[90vh] overflow-y-auto custom-scrollbar`}>
                            
                            {/* --- THERMAL POS LAYOUT --- */}
                            {printFormat === 'thermal' && (
                                <div className="p-4 shrink-0 font-mono text-xs">
                                    <div className="text-center mb-4">
                                        <h2 className="text-base font-black uppercase tracking-widest !text-black">{appSettings?.companyName || "KPM INVENTORY"}</h2>
                                        <p className="text-[10px] font-bold mt-1 !text-slate-600">OFFICIAL SALES RECEIPT</p>
                                    </div>
                                    
                                    <div className="text-left mb-3 space-y-0.5 border-y border-dashed !border-slate-400 py-2">
                                        <div className="flex"><span className="w-12 font-bold">TGL</span><span>: {receiptDateStr}</span></div>
                                        <div className="flex"><span className="w-12 font-bold">JAM</span><span>: {receiptTimeStr}</span></div>
                                        <div className="flex"><span className="w-12 font-bold">CUST</span><span className="uppercase break-words flex-1">: {viewingReceipt.customerName}</span></div>
                                        {viewingReceipt.agentName && viewingReceipt.agentName !== 'Admin' && <div className="flex"><span className="w-12 font-bold">SALES</span><span className="uppercase break-words flex-1">: {viewingReceipt.agentName}</span></div>}
                                        <div className="flex"><span className="w-12 font-bold">BAYAR</span><span className="uppercase">: {viewingReceipt.paymentType || 'Cash'}</span></div>
                                    </div>

                                    <div className="border-b border-dashed !border-slate-400 pb-2 mb-2 min-h-[100px]">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-dashed !border-slate-400">
                                                    <th className="pb-1 font-bold">ITEM</th>
                                                    <th className="pb-1 text-right font-bold">TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="align-top">
                                                {viewingReceipt.items && viewingReceipt.items.length > 0 ? viewingReceipt.items.map((item, i) => (
                                                    <tr key={i}>
                                                        <td className="py-1 pr-2">
                                                            <div className="font-bold uppercase break-words leading-tight">{item.name}</div>
                                                            <div className="text-[10px] !text-slate-600 mt-0.5">{item.qty} {item.unit} x {new Intl.NumberFormat('id-ID').format(item.calculatedPrice || 0)}</div>
                                                        </td>
                                                        <td className="py-1 text-right font-black whitespace-nowrap">
                                                            {new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}
                                                        </td>
                                                    </tr>
                                                )) : <tr><td colSpan="2" className="text-center py-4 text-[10px] italic !text-slate-400">No Itemized Data</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <div className="flex justify-between items-center text-sm font-black mb-4 !text-black">
                                        <span>TOTAL</span>
                                        <span>Rp {new Intl.NumberFormat('id-ID').format(viewingReceipt.total || viewingReceipt.amountPaid || 0)}</span>
                                    </div>
                                    
                                    <div className="text-center text-[10px] mb-2 font-bold !text-slate-500">
                                        <p>*** THANK YOU ***</p>
                                    </div>
                                </div>
                            )}

                            {/* --- A4 STANDARD INVOICE LAYOUT --- */}
                            {printFormat === 'a4' && (
                                <div className="w-full overflow-x-auto custom-scrollbar border-b !border-slate-300">
                                    <div className="a4-print-jail p-8 md:p-12 shrink-0 font-sans relative min-w-[800px] mx-auto" style={{ backgroundColor: '#ffffff', color: '#000000', boxSizing: 'border-box' }}>
                                        <div className="border-b-4 !border-blue-800 pb-4 mb-6 flex justify-between items-end gap-8">
                                            <div className="flex-1">
                                                <h1 className="text-2xl md:text-3xl font-black !text-blue-900 tracking-widest uppercase break-words">{appSettings?.companyName || "PT KARYAMEGA PUTERA MANDIRI"}</h1>
                                                <p className="text-xs md:text-sm font-bold !text-slate-700 mt-1 whitespace-pre-line">{appSettings?.companyAddress || 'Jl. Raya Magelang - Purworejo Km. 11, Palbapang, Mungkid, Magelang'}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <h2 className="text-xl md:text-2xl font-bold !text-blue-800 uppercase tracking-widest">NOTA PENJUALAN</h2>
                                                <p className="text-[10px] uppercase font-bold !text-slate-500 tracking-widest mt-1">REPRINT COPY</p>
                                            </div>
                                        </div>

                                        <div className="flex justify-between mb-8 text-sm">
                                            <table className="w-1/3">
                                                <tbody>
                                                    <tr><td className="font-bold py-1 w-24 !text-slate-600 uppercase align-top">Tanggal</td><td className="font-bold py-1 !text-slate-900">: {receiptDateStr}</td></tr>
                                                    {receiptTimeStr && <tr><td className="font-bold py-1 w-24 !text-slate-600 uppercase align-top">Waktu</td><td className="font-bold py-1 !text-slate-900">: {receiptTimeStr}</td></tr>}
                                                    <tr><td className="font-bold py-1 !text-slate-600 uppercase align-top">Tipe Harga</td><td className="font-bold py-1 !text-slate-900">: <span className="uppercase !bg-blue-100 !text-blue-800 px-2 py-0.5 rounded text-xs border !border-blue-200">{activeTier}</span></td></tr>
                                                    <tr><td className="font-bold py-1 !text-slate-600 uppercase align-top">Sales / Agent</td><td className="font-bold py-1 !text-slate-900 uppercase">: {viewingReceipt.agentName === 'Admin' ? (appSettings?.adminDisplayName || 'Admin') : (viewingReceipt.agentName || 'Sales')}</td></tr>
                                                    <tr><td className="font-bold py-1 !text-slate-600 uppercase align-top">Metode Bayar</td><td className="font-bold py-1 !text-slate-900 uppercase">: {viewingReceipt.paymentType || 'Cash'}</td></tr>
                                                </tbody>
                                            </table>
                                            <div className="w-1/3 border-2 !border-slate-800 p-3 rounded-lg bg-slate-50 shadow-sm flex flex-col justify-center">
                                                <p className="font-bold !text-slate-500 text-xs mb-1">KEPADA YTH,</p>
                                                <p className="text-xl font-black uppercase !text-slate-900">{viewingReceipt.customerName}</p>
                                            </div>
                                        </div>

                                        <table className="w-full text-sm border-collapse border-2 !border-slate-800 mb-8 shadow-sm">
                                            <thead className="!bg-blue-50 !text-blue-900">
                                                <tr>
                                                    <th className="border-2 !border-slate-800 p-3 text-center w-12 font-black">NO</th>
                                                    <th className="border-2 !border-slate-800 p-3 text-left font-black">MACAM BARANG (KATALOG)</th>
                                                    <th className="border-2 !border-slate-800 p-3 text-right w-40 font-black">HARGA / {unitLabel}</th>
                                                    <th className="border-2 !border-slate-800 p-3 text-center w-24 font-black">QTY ({unitLabel})</th>
                                                    <th className="border-2 !border-slate-800 p-3 text-right w-40 font-black">JUMLAH</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {catalogRows.map((item, i) => (
                                                    <tr key={i} className={item.isBought ? '!bg-blue-50/40' : ''}>
                                                        <td className="border-2 !border-slate-800 p-2 text-center !text-slate-600 font-bold">{i+1}</td>
                                                        <td className="border-2 !border-slate-800 p-2 font-bold !text-slate-900 uppercase">{item.name}</td>
                                                        <td className="border-2 !border-slate-800 p-2 text-right font-mono !text-slate-700">{new Intl.NumberFormat('id-ID').format(item.displayPrice)}</td>
                                                        <td className="border-2 !border-slate-800 p-2 text-center font-black text-lg !text-blue-700">{item.displayQty > 0 ? Number(item.displayQty.toFixed(2)) : ''}</td>
                                                        <td className="border-2 !border-slate-800 p-2 text-right font-black text-lg !text-slate-900">{item.total > 0 ? new Intl.NumberFormat('id-ID').format(item.total) : ''}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="!bg-blue-100">
                                                    <td colSpan="4" className="border-2 !border-slate-800 p-4 text-right font-black text-xl !text-blue-900 tracking-widest">GRAND TOTAL</td>
                                                    <td className="border-2 !border-slate-800 p-4 text-right font-black text-2xl !text-blue-900">Rp {new Intl.NumberFormat('id-ID').format(viewingReceipt.total || viewingReceipt.amountPaid || 0)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>

                                        <div className="flex justify-between items-start mt-12 pb-4">
                                            <div className="w-1/2">
                                                <div className="p-4 border-2 !border-blue-800 !bg-blue-50 rounded-xl inline-block shadow-md">
                                                    <p className="font-bold !text-blue-900 mb-1 text-[10px] uppercase tracking-widest">Pembayaran Transfer Ke:</p>
                                                    <p className="text-xl md:text-2xl font-black !text-blue-900 tracking-[0.1em] mt-2 leading-snug whitespace-pre-line">
                                                        {appSettings?.bankDetails || `BCA 0301138379\nA/N ABEDNEGO YB`}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-12 md:gap-20 text-center !text-slate-800 pt-4 pr-8">
                                                <div className="flex flex-col items-center">
                                                    <p className="font-bold text-sm mb-24 uppercase tracking-widest">Penerima,</p>
                                                    <div className="border-b-2 !border-slate-800 w-40 md:w-48"></div>
                                                    <p className="text-xs mt-2 uppercase font-bold">{viewingReceipt.customerName}</p>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <p className="font-bold text-sm mb-24 uppercase tracking-widest">Hormat Kami,</p>
                                                    <div className="border-b-2 !border-slate-800 w-40 md:w-48"></div>
                                                    <p className="text-xs mt-2 uppercase font-bold">{viewingReceipt.agentName === 'Admin' ? (appSettings?.adminDisplayName || 'Admin') : (viewingReceipt.agentName || 'Sales')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="no-print !bg-slate-100 p-3 flex justify-center gap-6 border-t !border-slate-300 shrink-0">
                                <label className="flex items-center gap-2 text-xs font-bold !text-slate-600 cursor-pointer hover:!text-black">
                                    <input type="radio" checked={printFormat === 'thermal'} onChange={() => setPrintFormat('thermal')} name="format" className="w-4 h-4 accent-slate-800"/>
                                    Thermal POS (58mm)
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold !text-blue-600 cursor-pointer hover:!text-blue-800">
                                    <input type="radio" checked={printFormat === 'a4'} onChange={() => setPrintFormat('a4')} name="format" className="w-4 h-4 accent-blue-600"/>
                                    Standard Invoice (A4)
                                </label>
                            </div>

                            <div className="no-print !bg-slate-200 p-4 flex gap-3 border-t !border-slate-300 mt-auto shrink-0">
                                
                                
                                <button onClick={() => {
    const receipt = document.querySelector('.print-receipt');
    if (!receipt) return;

    const clone = receipt.cloneNode(true);
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    clone.classList.remove('max-h-[90vh]', 'overflow-y-auto', 'shadow-2xl', 'rounded-b-lg', 'max-w-sm', 'max-w-4xl');

    let parentStyles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
        parentStyles += el.outerHTML;
    });

    const isThermal = clone.classList.contains('format-thermal');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute'; // 🚀 FIX 1: Anchor to absolute document flow
    iframe.style.top = '0'; // 🚀 FIX 2: Anchor to TOP so Chrome doesn't print empty space
    iframe.style.left = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>KPM Invoice</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${parentStyles}
            <style>
                @media print {
                    @page { margin: 0; }
                    html, body { 
                        background: #ffffff !important; 
                        color: #000000 !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        /* 🚀 FIX 3: 58mm paper only has a 48mm printable area! */
                        width: ${isThermal ? '48mm' : '210mm'} !important; 
                        height: auto !important; 
                        display: block !important; 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact; 
                    }
                    .print-receipt { 
                        width: ${isThermal ? '48mm' : '100%'} !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important; 
                        box-sizing: border-box !important;
                        box-shadow: none !important; 
                        border: none !important; 
                        page-break-after: avoid !important;
                    }
                    
                    /* Typography Polish */
                    .format-thermal { font-family: Arial, sans-serif !important; }
                    .format-thermal * { 
                        font-size: 11px !important; 
                        line-height: 1.2 !important; 
                        color: #000000 !important; 
                        font-weight: 800 !important; 
                    }
                    .format-thermal h2 { font-size: 14px !important; text-align: center !important; font-weight: 900 !important; }
                    .format-thermal table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; }
                    .format-thermal td, .format-thermal th { vertical-align: top !important; word-wrap: break-word !important; }
                    * { color: #000000 !important; border-color: #000000 !important; }
                }
                body { background: white; margin: 0; padding: 0; display: block; }
            </style>
        </head>
        <body>
            ${clone.outerHTML}
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.focus();
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 10000);

}} className="flex-1 !bg-slate-800 !text-white py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-slate-950 transition-colors tracking-widest text-[10px] shadow-md active:scale-95">
    <Printer size={14}/> Print Document
</button>




                                {/* 🚀 RESTORED WHATSAPP BUTTON 🚀 */}
                                <button onClick={() => {
                                    let text = `*${appSettings?.companyName || "KPM INVENTORY"}*\n*OFFICIAL RECEIPT*\n------------------------\nDate: ${receiptDateStr}\nTime: ${receiptTimeStr}\nCustomer: ${viewingReceipt.customerName}\nPayment: ${viewingReceipt.paymentType || 'Cash'}\n------------------------\n`;
                                    if (viewingReceipt.items && viewingReceipt.items.length > 0) {
                                        viewingReceipt.items.forEach(item => { text += `${item.qty} ${item.unit} ${item.name}\n   Rp ${new Intl.NumberFormat('id-ID').format((item.calculatedPrice||0) * item.qty)}\n`; });
                                    }
                                    text += `------------------------\n*TOTAL: Rp ${new Intl.NumberFormat('id-ID').format(viewingReceipt.total || viewingReceipt.amountPaid || 0)}*\n\nThank you for your business!`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                }} className="flex-1 !bg-[#25D366] !text-white py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-[#128C7E] transition-colors tracking-widest text-[10px] shadow-md active:scale-95">
                                    <MessageSquare size={14}/> Share
                                </button>

                            </div>

                            <button onClick={() => { setViewingReceipt(null); }} className="no-print w-full shrink-0 !bg-red-600 hover:!bg-red-700 !text-white py-4 font-black uppercase tracking-[0.2em] shadow-[0_-5px_20px_rgba(0,0,0,0.2)] active:scale-95 transition-transform rounded-b-lg flex items-center justify-center gap-2"><X size={20}/> CLOSE RECEIPT</button>
                        </div>
                    </div>
                );
            })()}

            {/* --- ANALYTICS DASHBOARD --- */}
            {reportView && (
                <div className="animate-fade-in relative z-10">
                     <div className="print:hidden mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <button onClick={() => setReportView(false)} className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Folders</button>
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border dark:border-slate-700">
                                {['daily', 'weekly', 'monthly', 'yearly'].map(t => (
                                    <button key={t} onClick={() => setRangeType(t)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${rangeType === t ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{t}</button>
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                                {/* 🚀 NEW: DYNAMIC SCALE SLIDER */}
                                <div className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border dark:border-slate-700 shadow-sm print:hidden">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scale</span>
                                    <input type="range" min="50" max="150" step="5" value={printScale} onChange={(e) => setPrintScale(Number(e.target.value))} className="w-20 accent-orange-500 cursor-pointer" />
                                    <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{printScale}%</span>
                                </div>

                                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold shadow-sm"/>
                                <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white p-2.5 rounded-xl shadow-sm tooltip" title="Print PDF"><Printer size={20}/></button>
                            </div>
                        </div>
                     </div>

                     {/* 🚀 MAGIC CSS INJECTION: Listens to the slider and scales the print view */}
                     <style>{`
                         @media print {
                             .print-container {
                                 zoom: ${printScale / 100} !important;
                                 -moz-transform: scale(${printScale / 100});
                                 -moz-transform-origin: top left;
                             }
                         }
                     `}</style>

                     <div className="print-container bg-white dark:bg-slate-800 dark:print:bg-white p-8 rounded-2xl shadow-xl border dark:border-slate-700 print:shadow-none print:border-none print:p-0">
                         
                         {/* HEADER (Compressed for Print) */}
                         <div className="flex justify-between items-end mb-8 print:mb-4 border-b-2 border-orange-500 pb-4 print:pb-2">
                             <div>
                                 <h1 className="text-3xl print:text-xl font-bold text-slate-900 dark:text-white dark:print:text-black uppercase tracking-tight">
                                     {userRole === 'ADMIN' ? (selectedAgent ? `${selectedAgent}'s Analytics` : 'Master Sales Analytics') : 'My Analytics'}
                                 </h1>
                                 <p className="text-slate-500 dark:print:text-slate-600 font-mono text-sm print:text-[10px] mt-1 uppercase">{rangeType} Recap • {new Date(targetDate).toLocaleDateString()}</p>
                             </div>
                             <div className="text-right"><p className="text-xs print:text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Revenue</p><h2 className="text-4xl print:text-2xl font-bold text-emerald-600 dark:print:text-emerald-700">{formatRupiah(stats.totalRev)}</h2></div>
                         </div>
                         
                         {/* MAIN STATS (Forced 3-columns and reduced padding on print) */}
                         <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-4 md:gap-6 print:gap-2 mb-8 print:mb-4">
                             <div className="p-4 print:p-2 bg-slate-50 dark:bg-slate-900 dark:print:bg-slate-100 rounded-xl border dark:border-slate-700 print:border-slate-200"><p className="text-xs print:text-[9px] uppercase text-slate-500 font-bold mb-1 print:mb-0">Transactions</p><p className="text-2xl print:text-base font-bold text-slate-800 dark:text-white dark:print:text-black">{stats.count}</p></div>
                             <div className="p-4 print:p-2 bg-slate-50 dark:bg-slate-900 dark:print:bg-slate-100 rounded-xl border dark:border-slate-700 print:border-slate-200"><p className="text-xs print:text-[9px] uppercase text-slate-500 font-bold mb-1 print:mb-0">Items Moved (Bks)</p><p className="text-2xl print:text-base font-bold text-blue-600">{Object.values(stats.items).reduce((a,b)=>a+b.qty,0)}</p></div>
                             <div className="p-4 print:p-2 bg-slate-50 dark:bg-slate-900 dark:print:bg-slate-100 rounded-xl border dark:border-slate-700 print:border-slate-200"><p className="text-xs print:text-[9px] uppercase text-slate-500 font-bold mb-1 print:mb-0">Net Profit (Cuan)</p><p className="text-2xl print:text-base font-bold text-emerald-500">{formatRupiah(stats.totalProfit)}</p></div>
                         </div>

                         {/* MONEY BREAKDOWN (Forced 4-columns to prevent vertical stacking on print) */}
                         <div className="mb-8 print:mb-4 p-6 print:p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 print:border-slate-200">
                            <h3 className="font-bold text-lg print:text-sm mb-4 print:mb-2 text-slate-800 dark:text-white dark:print:text-black flex items-center gap-2"><Wallet size={20} className="print:w-4 print:h-4 text-emerald-500"/> Money Breakdown</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-4 print:grid-cols-4 gap-4 print:gap-2">
                                {['Cash', 'QRIS', 'Transfer', 'Titip'].map(method => (
                                    <div key={method} className="bg-white dark:bg-slate-800 p-3 print:p-2 rounded-xl border dark:border-slate-700 shadow-sm">
                                        <p className="text-xs print:text-[9px] uppercase font-bold text-slate-400 mb-1 print:mb-0">{method}</p>
                                        <p className={`text-lg print:text-sm font-bold ${method === 'Titip' ? 'text-orange-500' : 'text-slate-800 dark:text-white dark:print:text-black'}`}>{formatRupiah(stats.payments[method])}</p>
                                    </div>
                                ))}
                            </div>
                         </div>

                         {/* PRODUCT TABLE (Tightened row heights and scaled down text) */}
                         <div className="mb-8 print:mb-0">
                             <h3 className="font-bold text-lg print:text-sm mb-4 print:mb-2 text-slate-800 dark:text-white dark:print:text-black flex items-center gap-2"><Package size={20} className="print:w-4 print:h-4 text-orange-500"/> Product Performance</h3>
                             <div className="overflow-x-auto pb-2">
                                 <table className="w-full text-sm print:text-[10px] text-left border-collapse min-w-[450px]">
                                    <thead className="text-slate-500 border-b-2 border-slate-100 dark:border-slate-700 dark:print:border-slate-300">
                                        <tr><th className="py-2 print:py-1 w-1/2">Product Name</th><th className="py-2 print:py-1 text-right pr-6 w-1/4">Qty (Bks)</th><th className="py-2 print:py-1 text-right w-1/4">Revenue</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 dark:print:divide-slate-200">
                                        {Object.entries(stats.items).sort((a,b) => b[1].val - a[1].val).map(([name, data]) => (
                                            <tr key={name} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                <td className="py-3 print:py-1.5 font-medium text-slate-700 dark:text-slate-200 dark:print:text-black">{name}</td>
                                                <td className="py-3 print:py-1.5 text-right pr-6 text-slate-600 dark:text-slate-400 dark:print:text-black font-mono">{data.qty}</td>
                                                <td className="py-3 print:py-1.5 text-right font-bold text-emerald-600">{formatRupiah(data.val)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                 </table>
                             </div>
                         </div>
                     </div>
                </div>
            )}

            {/* HIDE DOM LISTS DURING PRINT SO IOS SAFARI DOESN'T FREEZE OR BLOCK */}
            <div className="hide-on-print w-full">

            {/* --- LEVEL 0: AGENT SELECTION --- */}
            {!reportView && !selectedAgent && userRole === 'ADMIN' && (
                <div className="space-y-6 animate-fade-in relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><User size={24} className="text-blue-500"/> Team Reports</h2>
                        <button onClick={() => setReportView(true)} className="bg-blue-600 hover:bg-blue-500 border border-blue-400 px-6 py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 font-bold text-white transition-all group">
                            <div className="bg-white/20 p-2 rounded-lg text-white group-hover:scale-110 transition-transform"><Calendar size={20}/></div>
                            <span>Master Analytics</span>
                        </button>
                    </div>
                    {Object.keys(reportData).length === 0 ? (
                        <div className="text-center py-20 opacity-50"><Folder size={48} className="mx-auto mb-4"/><p className="text-lg font-bold tracking-widest uppercase text-slate-500">No Sales Recorded</p></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.values(reportData).sort((a,b) => b.total - a.total).map(a => (
                                <div key={a.name} onClick={() => setSelectedAgent(a.name)} className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-500 transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-blue-100 dark:bg-slate-700 rounded-lg text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors"><User size={24} /></div>
                                        <span className="text-xs font-mono text-slate-400">{a.lastDate}</span>
                                    </div>
                                    <h3 className="font-bold text-lg dark:text-white mb-2">{a.name}</h3>
                                    <div className="flex justify-between items-end">
                                        <div><p className="text-[10px] text-slate-500 uppercase tracking-widest">Revenue</p><p className="font-bold text-emerald-500 text-lg">{formatRupiah(a.total)}</p></div>
                                        <div className="text-right"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Sales</p><p className="font-bold dark:text-white text-lg">{a.count}</p></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- LEVEL 1: CUSTOMER SELECTION --- */}
            {!reportView && selectedAgent && !selectedCustomer && (
                <div className="space-y-6 animate-fade-in relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            {userRole === 'ADMIN' && <button onClick={() => setSelectedAgent(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/></button>}
                            <div>
                                <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Store size={24} className="text-orange-500"/> {userRole === 'ADMIN' ? `${selectedAgent}'s Routing` : 'My Routing'}</h2>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Select a destination to view receipts</p>
                            </div>
                        </div>
                        <button onClick={() => setReportView(true)} className="bg-orange-600 hover:bg-orange-500 border border-orange-400 px-6 py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 font-bold text-white transition-all group">
                            <div className="bg-white/20 p-2 rounded-lg text-white group-hover:scale-110 transition-transform"><Calendar size={20}/></div>
                            <span>{userRole === 'ADMIN' ? `${selectedAgent}'s Analytics` : 'My Analytics'}</span>
                        </button>
                    </div>

                    {!reportData[selectedAgent] ? (
                        <div className="text-center py-20 opacity-50"><Folder size={48} className="mx-auto mb-4"/><p className="text-lg font-bold tracking-widest uppercase text-slate-500">No Customers Visited</p></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.values(reportData[selectedAgent].customers).sort((a,b) => b.total - a.total).map(c => {
                                const isIndiv = c.name === "Individuals (Ecer)";
                                return (
                                    <div key={c.name} onClick={() => setSelectedCustomer(c.name)} className={`relative bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm cursor-pointer hover:shadow-md transition-all group ${isIndiv ? 'border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-500' : 'dark:border-slate-700 hover:border-orange-500'}`}>
                                        {isAdmin && (
                                            <button onClick={(e) => { e.stopPropagation(); onDeleteFolder(c.name, selectedAgent); }} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors z-10"><Trash2 size={16} /></button>
                                        )}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 rounded-lg transition-colors ${isIndiv ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-orange-100 dark:bg-slate-700 text-orange-600 group-hover:bg-orange-500 group-hover:text-white'}`}>
                                                {isIndiv ? <User size={24}/> : <Store size={24} />}
                                            </div>
                                            <span className="text-xs font-mono text-slate-400 mr-8">{c.lastDate}</span>
                                        </div>
                                        <h3 className="font-bold text-lg dark:text-white mb-1 truncate">{c.name}</h3>
                                        <div className="flex justify-between items-end mt-4">
                                            <div><p className="text-[10px] text-slate-500 uppercase tracking-widest">Total Value</p><p className={`font-bold ${isIndiv ? 'text-emerald-500' : 'text-orange-500'}`}>{formatRupiah(c.total)}</p></div>
                                            <div className="text-right"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Receipts</p><p className="font-bold dark:text-white">{c.count}</p></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* --- LEVEL 2: RECEIPT ARCHIVE --- */}
            {!reportView && selectedAgent && selectedCustomer && (
                <div className="animate-fade-in relative z-10">
                    <button onClick={() => setSelectedCustomer(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"><ArrowRight className="rotate-180" size={20}/> Back to Routing</button>
                    
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 overflow-hidden">
                        {(() => {
                            const cObj = reportData[selectedAgent]?.customers[selectedCustomer];
                            if (!cObj) return null;
                            
                            const grouped = cObj.history.reduce((g, t) => { 
                                const m = new Date(t.date).toLocaleString('default', { month: 'long', year: 'numeric' }); 
                                if (!g[m]) g[m] = []; g[m].push(t); return g; 
                            }, {});

                            return (
                                <>
                                    <div className="bg-slate-900 text-white p-6 md:p-8">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-orange-500 font-bold tracking-widest text-[10px] uppercase mb-1">Receipt Archive • {selectedAgent}</p>
                                                <h1 className="text-2xl md:text-3xl font-bold font-serif">{cObj.name}</h1>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase tracking-widest opacity-70">Total Value</p>
                                                <p className="text-xl md:text-2xl font-bold text-emerald-400">{formatRupiah(cObj.total)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 md:p-8">
                                        {Object.entries(grouped).map(([month, trans]) => (
                                            <div key={month} className="mb-8 last:mb-0">
                                                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b-2 border-orange-500 inline-block mb-4 pb-1 uppercase tracking-widest">{month}</h3>
                                                <div className="overflow-x-auto pb-2">
                                                    <table className="w-full text-sm text-left min-w-[500px]">
                                                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                                                            <tr><th className="p-3 rounded-l-lg">Time</th><th className="p-3">Type</th><th className="p-3">Details</th><th className="p-3 text-right">Amount</th><th className="p-3 rounded-r-lg text-center">Action</th></tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                            {trans.map(t => (
                                                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400 text-xs">{t.date}<br/><span className="text-[10px] opacity-70">{t.timestamp ? new Date(t.timestamp.seconds*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : ''}</span></td>
                                                                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold ${t.type === 'SALE' ? 'bg-emerald-100 text-emerald-700' : t.type === 'RETURN' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{t.type.replace('_', ' ')}</span></td>
                                                                    <td className="p-3 text-slate-600 dark:text-slate-300 text-xs leading-relaxed max-w-[200px] break-words">
                                                                        {t.items ? t.items.map(i => `${i.qty} ${i.unit} ${i.name}`).join(", ") : t.itemsPaid ? `Payment for ${t.itemsPaid.length} Items` : 'N/A'}
                                                                        {t.paymentType === 'Titip' && <span className="block mt-1 text-[9px] text-orange-500 font-bold tracking-wider border border-orange-500/30 w-fit px-1 rounded">(CONSIGNMENT)</span>}
                                                                        {t.paymentType !== 'Titip' && t.paymentType !== 'Cash' && t.paymentType && <span className="block mt-1 text-[9px] text-blue-500 font-bold tracking-wider">({t.paymentType.toUpperCase()})</span>}
                                                                    </td>
                                                                    <td className={`p-3 text-right font-bold ${t.total < 0 ? 'text-red-500' : 'text-emerald-500'}`}>{formatRupiah(t.amountPaid || t.total)}</td>
                                                                    <td className="p-3 text-center">
                                                                        <div className="flex justify-center gap-2">
                                                                            {t.deliveryProof && (
                                                                                <button onClick={() => setViewingPhoto(t.deliveryProof)} className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 rounded transition-colors" title="View Delivery Photo"><Camera size={14}/></button>
                                                                            )}
                                                                            <button onClick={() => setViewingReceipt(t)} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-orange-500 rounded transition-colors" title="View Receipt"><FileText size={14}/></button>
                                                                            {isAdmin && <button onClick={() => setEditingTrans(t)} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-500 rounded transition-colors" title="Edit"><Pencil size={14}/></button>}
                                                                            {isAdmin && <button onClick={() => onDeleteTransaction(t)} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-500 rounded transition-colors" title="Delete"><Trash2 size={14}/></button>}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}