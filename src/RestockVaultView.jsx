import React, { useState, useMemo } from 'react';
import { PackagePlus, Receipt, Calculator, Calendar, UploadCloud, CheckCircle, AlertCircle, FileText, Search, Plus, Save } from 'lucide-react';

const RestockVaultView = ({ inventory = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    
    // --- PROCUREMENT STATE ---
    const [poData, setPoData] = useState({
        supplierName: '',
        poNumber: `PO-${Date.now().toString().slice(-6)}`,
        qtyOrdered: 0,
        qtyReceived: 0,
        basePriceTotal: 0,
        shippingCost: 0,
        exciseTax: 0,
        laborCost: 0,
        expiryDate: '',
    });

    const [receiptFile, setReceiptFile] = useState(null);

    // --- PINPOINT LANDED COST CALCULATION ---
    const calculations = useMemo(() => {
        const ordered = parseFloat(poData.qtyOrdered) || 0;
        const received = parseFloat(poData.qtyReceived) || 0;
        const base = parseFloat(poData.basePriceTotal) || 0;
        const shipping = parseFloat(poData.shippingCost) || 0;
        const tax = parseFloat(poData.exciseTax) || 0;
        const labor = parseFloat(poData.laborCost) || 0;

        const discrepancyQty = ordered - received;
        const discrepancyPct = ordered > 0 ? ((discrepancyQty / ordered) * 100).toFixed(1) : 0;
        
        const totalLandedCost = base + shipping + tax + labor;
        const costPerUnit = received > 0 ? (totalLandedCost / received) : 0;

        return { discrepancyQty, discrepancyPct, totalLandedCost, costPerUnit };
    }, [poData]);

    const filteredInventory = inventory.filter(item => 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleProcessRestock = () => {
        if (!selectedProduct || poData.qtyReceived <= 0) return alert("Select a product and enter received quantity.");
        
        const batchId = `BCH-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${selectedProduct.id.slice(0,3).toUpperCase()}`;
        
        const restockPayload = {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            batchId,
            ...poData,
            ...calculations,
            timestamp: new Date().toISOString(),
            hasReceipt: !!receiptFile
        };

        console.log("PROCUREMENT LOGGED:", restockPayload);
        alert(`Vault Updated!\nBatch: ${batchId}\nLanded Cost: Rp ${calculations.costPerUnit.toLocaleString('id-ID')}/unit`);
        
        // Reset form
        setSelectedProduct(null);
        setPoData({ supplierName: '', poNumber: `PO-${Date.now().toString().slice(-6)}`, qtyOrdered: 0, qtyReceived: 0, basePriceTotal: 0, shippingCost: 0, exciseTax: 0, laborCost: 0, expiryDate: '' });
        setReceiptFile(null);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full text-slate-300 font-sans">
            
            {/* LEFT COLUMN: PRODUCT SELECTOR */}
            <div className="w-full lg:w-1/3 bg-[#0a0a0a] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl shrink-0">
                <div className="bg-orange-600/10 p-4 border-b border-orange-500/20 flex items-center gap-3">
                    <PackagePlus className="text-orange-500" />
                    <h2 className="text-lg font-bold text-orange-500 tracking-widest uppercase">Select Wares</h2>
                </div>
                <div className="p-4 border-b border-white/5">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Search inventory..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-orange-500 outline-none text-white transition-colors"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {filteredInventory.map(item => (
                        <div 
                            key={item.id} 
                            onClick={() => setSelectedProduct(item)}
                            className={`p-3 mb-2 rounded-xl cursor-pointer border transition-all flex items-center gap-4 ${selectedProduct?.id === item.id ? 'bg-orange-500/20 border-orange-500' : 'bg-black/40 border-white/5 hover:border-white/20'}`}
                        >
                            <div className="w-12 h-12 bg-black rounded flex items-center justify-center border border-white/10 shrink-0 overflow-hidden">
                                {item.images?.front ? <img src={item.images.front} className="w-full h-full object-contain" alt="ware"/> : <PackagePlus size={20} className="text-slate-600"/>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
                                <p className="text-[10px] text-slate-500 font-mono">Current Stock: <span className="text-emerald-400 font-bold">{item.stock}</span></p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT COLUMN: PROCUREMENT ENGINE */}
            <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
                {!selectedProduct ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                        <PackagePlus size={48} className="mb-4 opacity-20" />
                        <p className="tracking-widest uppercase text-sm font-bold opacity-50">Awaiting Target Selection</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-4">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-wider">{selectedProduct.name}</h2>
                                <p className="text-xs text-orange-500 font-mono tracking-widest mt-1">PROCUREMENT PROTOCOL INITIATED</p>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Auto-Generated PO</div>
                                <div className="font-mono text-emerald-400 font-bold bg-emerald-900/20 px-3 py-1 rounded border border-emerald-500/30 inline-block mt-1">{poData.poNumber}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* BLOCK 1: Goods Received Note (GRN) */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><CheckCircle size={14}/> 1. Goods Reception (GRN)</h3>
                                
                                <div><label className="text-[10px] text-slate-500 uppercase">Supplier / Factory</label><input type="text" value={poData.supplierName} onChange={e => setPoData({...poData, supplierName: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none" placeholder="e.g., PT Djarum Pusat"/></div>
                                
                                <div className="flex gap-4">
                                    <div className="flex-1"><label className="text-[10px] text-slate-500 uppercase">Qty Ordered</label><input type="number" value={poData.qtyOrdered || ''} onChange={e => setPoData({...poData, qtyOrdered: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 outline-none font-mono" placeholder="0"/></div>
                                    <div className="flex-1"><label className="text-[10px] text-slate-500 uppercase">Qty Received</label><input type="number" value={poData.qtyReceived || ''} onChange={e => setPoData({...poData, qtyReceived: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-emerald-500 outline-none font-mono" placeholder="0"/></div>
                                </div>

                                {calculations.discrepancyQty > 0 && (
                                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-3">
                                        <AlertCircle className="text-red-500 shrink-0" size={16} />
                                        <div>
                                            <p className="text-xs text-red-500 font-bold uppercase">Discrepancy Detected</p>
                                            <p className="text-[10px] text-red-400 font-mono">Missing {calculations.discrepancyQty} units ({calculations.discrepancyPct}% loss). Follow up with logistics.</p>
                                        </div>
                                    </div>
                                )}

                                <div><label className="text-[10px] text-slate-500 uppercase flex items-center gap-2 mt-2"><Calendar size={12}/> Expiry Date (FIFO Tag)</label><input type="date" value={poData.expiryDate} onChange={e => setPoData({...poData, expiryDate: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none font-mono"/></div>
                            </div>

                            {/* BLOCK 2: Landed Cost Engine */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Calculator size={14}/> 2. Landed Cost Engine</h3>
                                
                                <div><label className="text-[10px] text-slate-500 uppercase">Base Factory Price (Total)</label><input type="number" value={poData.basePriceTotal || ''} onChange={e => setPoData({...poData, basePriceTotal: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none font-mono" placeholder="Rp 0"/></div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] text-slate-500 uppercase">Shipping & Freight</label><input type="number" value={poData.shippingCost || ''} onChange={e => setPoData({...poData, shippingCost: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none font-mono" placeholder="Rp 0"/></div>
                                    <div><label className="text-[10px] text-slate-500 uppercase">Excise Tax / Cukai</label><input type="number" value={poData.exciseTax || ''} onChange={e => setPoData({...poData, exciseTax: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none font-mono" placeholder="Rp 0"/></div>
                                </div>
                                
                                <div><label className="text-[10px] text-slate-500 uppercase">Labor / Unloading Cost</label><input type="number" value={poData.laborCost || ''} onChange={e => setPoData({...poData, laborCost: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-orange-500 outline-none font-mono" placeholder="Rp 0"/></div>
                                
                                <div className="bg-orange-950/30 border border-orange-500/30 rounded-lg p-4 mt-4">
                                    <div className="flex justify-between items-center border-b border-orange-500/20 pb-2 mb-2">
                                        <span className="text-xs text-orange-400 font-bold uppercase">True Landed Cost / Unit</span>
                                        <span className="text-xl text-orange-500 font-black font-mono">Rp {calculations.costPerUnit.toLocaleString('id-ID', {maximumFractionDigits:0})}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 uppercase leading-relaxed text-right">This is your absolute break-even cost. Do not sell below this metric.</p>
                                </div>
                            </div>
                        </div>

                        {/* BLOCK 3: Digital Vault (Receipt) */}
                        <div className="mt-8 pt-8 border-t border-white/10">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Receipt size={14}/> 3. Digital Vault</h3>
                            <div className="border-2 border-dashed border-white/10 hover:border-orange-500/50 bg-black/50 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors relative">
                                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setReceiptFile(e.target.files[0])} />
                                {receiptFile ? (
                                    <>
                                        <FileText size={32} className="text-emerald-500 mb-2" />
                                        <p className="text-sm font-bold text-white">{receiptFile.name}</p>
                                        <p className="text-[10px] text-emerald-400 font-bold uppercase mt-1">Ready for upload</p>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud size={32} className="text-slate-600 mb-2" />
                                        <p className="text-sm font-bold text-white mb-1">Upload Factory Invoice or Receipt</p>
                                        <p className="text-xs text-slate-500">Drag & drop or click to browse (PDF, JPG, PNG)</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <div className="mt-8 flex justify-end">
                            <button 
                                onClick={handleProcessRestock}
                                className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold uppercase tracking-widest py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all flex items-center gap-2 active:scale-95"
                            >
                                <Save size={18} /> Lock to Vault
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RestockVaultView;