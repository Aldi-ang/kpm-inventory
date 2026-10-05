import React, { useState } from 'react';
import { X, Printer, MessageSquare } from 'lucide-react';
import { WATERMARK_STYLE, WATERMARK_POSITION, watermarkFrom } from '../config/receiptWatermark';

/* ONE RECEIPT FOR A SALE, wherever it is opened: Reports (HistoryReportView) and the Day Replay on Journey Plan
   (his 2026-10-04 "button to review the receipt from that sales"). Moved here from HistoryReportView 2026-10-05 with
   only its indent changed; `tx` is the record shown, onClose closes it. The nota keeps the company theme (the palette
   law stops at the print block). */
export default function SaleReceipt({ tx: viewingReceipt, appSettings, onClose }) {
    const [printFormat, setPrintFormat] = useState('thermal');
    /* the mark printed in the corner of the A4 nota. Undefined when he has never set one, which
       is what keeps the nota unchanged for anyone who does not want a watermark. */
    const watermarkSrc = watermarkFrom(appSettings);
    const setViewingReceipt = () => onClose();
    let receiptDateStr = viewingReceipt.date || '';
    let receiptTimeStr = '';
    if (viewingReceipt.timestamp) {
        const dateObj = new Date(viewingReceipt.timestamp.seconds * 1000);
        receiptDateStr = dateObj.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
        receiptTimeStr = dateObj.toLocaleTimeString('id-ID');
    } else if (receiptDateStr.includes(',')) {
        const parts = receiptDateStr.split(', ');
        receiptDateStr = parts[0]; receiptTimeStr = parts[1] || '';
    }
    
    const isNormalSale = viewingReceipt.type !== 'CONSIGNMENT_PAYMENT';
    const isReturReceipt = viewingReceipt.type === 'RETUR' || viewingReceipt.paymentType === 'Retur/BS';
    const displayTotal = viewingReceipt.total || viewingReceipt.amountPaid || 0;
    
    return (
        <div className="print-modal-wrapper fixed inset-0 z-[500] bg-[var(--panel)] flex items-center justify-center p-4">
            <div className={`print-receipt format-${printFormat} !bg-[var(--raised)] !text-[var(--ink)] w-full ${printFormat === 'thermal' ? 'max-w-sm' : 'max-w-4xl'} shadow-2xl relative flex flex-col text-sm border-t-8 ${printFormat === 'a4' ? '!border-[var(--accent-edge)]' : '!border-[var(--line)]'} animate-fade-in rounded-b-lg max-h-[90vh] overflow-y-auto custom-scrollbar`}>
                {printFormat === 'thermal' && (
                    <div className="p-4 shrink-0 font-mono text-xs">
                        <div className="text-center mb-4">
                            <h2 className="text-base font-black uppercase tracking-widest !text-[var(--ink)]">{appSettings?.companyName || "KPM INVENTORY"}</h2>
                            <p className="text-[10px] font-bold mt-1 !text-[var(--ink-muted)]">
                                {viewingReceipt.type === 'CONSIGNMENT_PAYMENT' ? 'STORE AUDIT' : 
                                 isReturReceipt ? 'RETURN RECEIPT' : 
                                 viewingReceipt.paymentType === 'Tukar Ganti' ? 'EXCHANGE RECEIPT' : 'SALES RECEIPT'}
                            </p>
                        </div>
                        <div className="text-left mb-3 space-y-0.5 border-y border-dashed !border-[var(--line-2)] py-2">
                            <div className="flex"><span className="w-12 font-bold">TGL</span><span>: {receiptDateStr}</span></div>
                            <div className="flex"><span className="w-12 font-bold">JAM</span><span>: {receiptTimeStr}</span></div>
                            <div className="flex"><span className="w-12 font-bold">CUST</span><span className="uppercase break-words flex-1">: {viewingReceipt.customerName}</span></div>
                            {viewingReceipt.agentName && viewingReceipt.agentName !== 'Admin' && <div className="flex"><span className="w-12 font-bold">SALES</span><span className="uppercase break-words flex-1">: {viewingReceipt.agentName}</span></div>}
                            <div className="flex"><span className="w-12 font-bold">TYPE</span><span className={`font-black uppercase ${isReturReceipt ? '!text-[var(--danger-text)]' : viewingReceipt.paymentType === 'Tukar Ganti' ? '!text-[var(--ink)]' : '!text-[var(--ink)]'}`}>: {viewingReceipt.paymentType || 'Cash'}</span></div>
                        </div>
                        <div className="border-b border-dashed !border-[var(--line-2)] pb-2 mb-2 min-h-[100px]">
                            {isNormalSale && (
                                <div className="w-full text-left">
                                    <div className="flex justify-between border-b border-dashed !border-[var(--line-2)] pb-1 mb-2 font-bold">
                                        <span>ITEM</span><span>TOTAL</span>
                                    </div>
                                    <div>
                                        {viewingReceipt.items && viewingReceipt.items.length > 0 ? viewingReceipt.items.map((item, i) => (
                                            <div key={i} className="mb-2">
                                                <div className="font-bold uppercase text-xs !text-[var(--ink)] flex flex-wrap gap-1 items-center">
                                                    {item.name}
                                                    {item.condition === 'DAMAGED' && <span className="text-[11px] bg-[var(--danger-well)] !text-[var(--danger-text)] border !border-[var(--danger)] px-1 rounded shadow-sm">DAMAGED</span>}
                                                    {item.fulfillment === 'IOU' && <span className="text-[11px] bg-[var(--raised)] !text-[var(--ink)] border !border-[var(--accent-edge)] px-1 rounded shadow-sm">UTANG BARANG</span>}
                                                    {item.isIouFulfillment && <span className="text-[11px] bg-[var(--verified-fill)] !text-[var(--verified)] border !border-[var(--line-2)] px-1 rounded shadow-sm">UTANG BARANG LUNAS</span>}
                                                </div>
                                                {item.condition === 'DAMAGED' && item.returnReason && (
                                                    <div className="text-[11px] italic !text-[var(--ink-muted)] mb-0.5 mt-0.5">Reason: {item.returnReason === 'Other' ? item.otherReasonDetail : item.returnReason}</div>
                                                )}
                                                <div className="flex justify-between text-xs mt-0.5">
                                                    <span className="!text-[var(--ink-muted)]">{item.qty} {item.unit} x {new Intl.NumberFormat('id-ID').format(item.calculatedPrice || 0)}</span>
                                                    <span className={`font-black ${isReturReceipt && item.calculatedPrice > 0 ? '!text-[var(--danger-text)]' : '!text-[var(--ink)]'}`}>
                                                        {isReturReceipt && item.calculatedPrice > 0 ? '-' : ''}{new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}
                                                    </span>
                                                </div>
                                            </div>
                                        )) : <div className="text-center py-4 text-[10px] italic !text-[var(--ink-muted)]">No Itemized Data</div>}
                                    </div>
                                </div>
                            )}
                            {!isNormalSale && (
                                <div className="space-y-4"><div className="font-black text-center uppercase tracking-widest border-b border-dashed !border-[var(--line-2)] pb-1 mb-2">AUDIT BREAKDOWN</div>
                                    {(viewingReceipt.itemsPaid || []).concat(viewingReceipt.itemsReturned || [], viewingReceipt.itemsRemaining || []).reduce((acc, curr) => { if (!acc.find(i => i.productId === curr.productId)) acc.push(curr); return acc; }, []).map((item, i) => {
                                        const paidItem = (viewingReceipt.itemsPaid || []).find(p => p.productId === item.productId); const returItem = (viewingReceipt.itemsReturned || []).find(r => r.productId === item.productId); const remainItem = (viewingReceipt.itemsRemaining || []).find(s => s.productId === item.productId);
                                        if (!paidItem && !returItem && !remainItem) return null;
                                        return (
                                            <div key={i} className="mb-3"><div className="font-bold uppercase break-words leading-tight">{item.name}</div><div className="text-[10px] !text-[var(--ink)] font-bold border-b border-dashed !border-[var(--line-2)] pb-0.5 mb-1">Total Consigned: {(paidItem?.qty || 0) + (returItem?.qty || 0) + (remainItem?.qty || 0)} Bks</div><div className="pl-2 space-y-0.5 text-[10px] !text-[var(--ink-muted)] font-mono">
                                                    {paidItem && paidItem.qty > 0 && <div className="flex justify-between"><span>• Sold: {paidItem.qty}</span><span className="font-black !text-[var(--ink)]">Rp {new Intl.NumberFormat('id-ID').format((paidItem.calculatedPrice || 0) * paidItem.qty)}</span></div>}
                                                    {returItem && returItem.qty > 0 && <div className="flex justify-between"><span>• Retur: {returItem.qty}</span><span>-</span></div>}
                                                    {remainItem && remainItem.qty > 0 && <div className="flex justify-between"><span>• Sisa: {remainItem.qty}</span><span>-</span></div>}
                                                </div></div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center text-sm font-black mb-4 !text-[var(--ink)]">
                            <span>TOTAL</span>
                            <span className={isReturReceipt && displayTotal > 0 ? '!text-[var(--danger-text)]' : '!text-[var(--ink)]'}>
                                {isReturReceipt && displayTotal > 0 ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(displayTotal)}
                            </span>
                        </div>
                        <div className="text-center text-[10px] mb-2 font-bold !text-[var(--ink-muted)]"><p>*** THANK YOU ***</p></div>
                    </div>
                )}

                {printFormat === 'a4' && (
                    <div className="w-full overflow-x-auto custom-scrollbar border-b !border-[var(--line-2)]">
                        <div className="a4-print-jail p-8 md:p-12 shrink-0 font-sans relative min-w-[800px] mx-auto" style={{ backgroundColor: '#ffffff', color: '#000000', boxSizing: 'border-box' }}>
                            {/* ── THE WATERMARK ──────────────────────────────────────
                                INSIDE the sheet, not on the modal shell around it. It
                                was on `.print-receipt` first, which for A4 is only the
                                outer wrapper — that put the mark level with the action
                                buttons instead of on the paper. `.a4-print-jail` is the
                                page, and it is already `relative`.
                                A4 only, by construction: this branch never runs for the
                                48mm thermal slip, which has no corner to spare and would
                                print a grey mark as mud.
                                ⚠️ NOT APP UI — the nota keeps KPM company blue and the
                                palette law stops at this block's edge. Geometry lives in
                                config/receiptWatermark.js so the Settings preview cannot
                                drift away from what actually prints. */}
                            {watermarkSrc && (
                                <img src={watermarkSrc} alt="" className={WATERMARK_POSITION} style={WATERMARK_STYLE} />
                            )}
                            <div className="border-b-4 !border-[var(--accent-edge)] pb-4 mb-6 flex justify-between items-end gap-8">
                                <div className="flex-1">
                                    <h1 className="text-2xl md:text-3xl font-black !text-[var(--ink)] tracking-widest uppercase break-words">{appSettings?.companyName || "PT KARYAMEGA PUTERA MANDIRI"}</h1>
                                    <p className="text-xs md:text-sm font-bold !text-[var(--ink)] mt-1 whitespace-pre-line">{appSettings?.companyAddress || 'Jl. Raya Magelang - Purworejo Km. 11'}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <h2 className="text-xl md:text-2xl font-bold !text-[var(--ink)] uppercase tracking-widest">
                                        {viewingReceipt.type === 'CONSIGNMENT_PAYMENT' ? 'STORE AUDIT REPORT' : 
                                         isReturReceipt ? 'NOTA RETUR' : 
                                         viewingReceipt.paymentType === 'Tukar Ganti' ? 'NOTA TUKAR GANTI' : 'NOTA PENJUALAN'}
                                    </h2>
                                    <p className="text-[10px] uppercase font-bold !text-[var(--ink-muted)] tracking-widest mt-1">REPRINT COPY</p>
                                </div>
                            </div>
                            <div className="flex justify-between mb-8 text-sm">
                                <table className="w-1/3"><tbody>
                                    <tr><td className="font-bold py-1 w-24 !text-[var(--ink-muted)] uppercase align-top">Tanggal</td><td className="font-bold py-1 !text-[var(--ink)]">: {receiptDateStr}</td></tr>
                                    {receiptTimeStr && <tr><td className="font-bold py-1 w-24 !text-[var(--ink-muted)] uppercase align-top">Waktu</td><td className="font-bold py-1 !text-[var(--ink)]">: {receiptTimeStr}</td></tr>}
                                    <tr><td className="font-bold py-1 !text-[var(--ink-muted)] uppercase align-top">Sales / Agent</td><td className="font-bold py-1 !text-[var(--ink)] uppercase">: {viewingReceipt.agentName === 'Admin' ? (appSettings?.adminDisplayName || 'Admin') : (viewingReceipt.agentName || 'Sales')}</td></tr>
                                    <tr><td className="font-bold py-1 !text-[var(--ink-muted)] uppercase align-top">Tipe Transaksi</td><td className="font-bold py-1 !text-[var(--ink)] uppercase">: {viewingReceipt.paymentType || 'Cash'}</td></tr>
                                </tbody></table>
                                <div className="w-1/3 border-2 !border-[var(--line)] p-3 rounded-lg bg-[var(--raised)] shadow-sm flex flex-col justify-center">
                                    <p className="font-bold !text-[var(--ink-muted)] text-xs mb-1">KEPADA YTH,</p><p className="text-xl font-black uppercase !text-[var(--ink)]">{viewingReceipt.customerName}</p>
                                </div>
                            </div>
                            {isNormalSale ? (
                                <table className="w-full text-sm border-collapse border-2 !border-[var(--line)] mb-8 shadow-sm">
                                    <thead className="!bg-[var(--raised)] !text-[var(--ink)]"><tr><th className="border-2 !border-[var(--line)] p-3 text-center w-12 font-black">NO</th><th className="border-2 !border-[var(--line)] p-3 text-left font-black">MACAM BARANG (KATALOG)</th><th className="border-2 !border-[var(--line)] p-3 text-center w-24 font-black">QTY</th><th className="border-2 !border-[var(--line)] p-3 text-right w-40 font-black">JUMLAH</th></tr></thead>
                                    <tbody>{viewingReceipt.items?.map((item, i) => (
                                        <tr key={i}>
                                            <td className="border-2 !border-[var(--line)] p-2 text-center !text-[var(--ink-muted)] font-bold align-top">{i+1}</td>
                                            <td className="border-2 !border-[var(--line)] p-2 font-bold !text-[var(--ink)] uppercase align-top">
                                                <div className="flex flex-wrap gap-1 items-center mb-1">
                                                    {item.name}
                                                    {item.condition === 'DAMAGED' && <span className="text-[11px] bg-[var(--danger-well)] !text-[var(--danger-text)] border !border-[var(--danger)] px-1 rounded">DAMAGED</span>}
                                                    {item.fulfillment === 'IOU' && <span className="text-[11px] bg-[var(--raised)] !text-[var(--ink)] border !border-[var(--accent-edge)] px-1 rounded">UTANG BARANG</span>}
                                                    {item.isIouFulfillment && <span className="text-[11px] bg-[var(--verified-fill)] !text-[var(--verified)] border !border-[var(--line-2)] px-1 rounded">UTANG BARANG LUNAS</span>}
                                                </div>
                                                {item.condition === 'DAMAGED' && item.returnReason && (
                                                    <div className="text-[10px] italic !text-[var(--ink-muted)] font-normal">Reason: {item.returnReason === 'Other' ? item.otherReasonDetail : item.returnReason}</div>
                                                )}
                                            </td>
                                            <td className="border-2 !border-[var(--line)] p-2 text-center font-black text-lg !text-[var(--ink)] align-top">{item.qty} <span className="text-sm font-bold">{item.unit}</span></td>
                                            <td className="border-2 !border-[var(--line)] p-2 text-right font-black text-lg !text-[var(--ink)] align-top">
                                                {isReturReceipt && item.calculatedPrice > 0 ? '-' : ''}{new Intl.NumberFormat('id-ID').format((item.calculatedPrice || 0) * item.qty)}
                                            </td>
                                        </tr>
                                    ))}</tbody>
                                    <tfoot><tr className="!bg-[var(--raised)]"><td colSpan="3" className="border-2 !border-[var(--line)] p-4 text-right font-black text-xl !text-[var(--ink)] tracking-widest">GRAND TOTAL</td><td className={`border-2 !border-[var(--line)] p-4 text-right font-black text-2xl ${isReturReceipt && displayTotal > 0 ? '!text-[var(--danger-text)]' : '!text-[var(--ink)]'}`}>{isReturReceipt && displayTotal > 0 ? '-' : ''}Rp {new Intl.NumberFormat('id-ID').format(displayTotal)}</td></tr></tfoot>
                                </table>
                            ) : (
                                <table className="w-full text-sm border-collapse border-2 !border-[var(--line)] mb-8 shadow-sm">
                                    <thead className="!bg-[var(--raised)] !text-[var(--ink)]"><tr><th className="border-2 !border-[var(--line)] p-3 text-center w-12 font-black">NO</th><th className="border-2 !border-[var(--line)] p-3 text-left font-black">AUDITED PRODUCT</th><th className="border-2 !border-[var(--line)] p-3 text-center w-24 font-black">INITIAL STOCK</th><th className="border-2 !border-[var(--line)] p-3 text-center w-32 font-black">BREAKDOWN</th><th className="border-2 !border-[var(--line)] p-3 text-right w-40 font-black">TAGIHAN (Rp)</th></tr></thead>
                                    <tbody>
                                        {(viewingReceipt.itemsPaid || []).concat(viewingReceipt.itemsReturned || [], viewingReceipt.itemsRemaining || []).reduce((acc, curr) => { if (!acc.find(i => i.productId === curr.productId)) acc.push(curr); return acc; }, []).map((item, i) => {
                                            const paidItem = (viewingReceipt.itemsPaid || []).find(p => p.productId === item.productId); const returItem = (viewingReceipt.itemsReturned || []).find(r => r.productId === item.productId); const remainItem = (viewingReceipt.itemsRemaining || []).find(s => s.productId === item.productId);
                                            if (!paidItem && !returItem && !remainItem) return null; const initialQty = (paidItem?.qty || 0) + (returItem?.qty || 0) + (remainItem?.qty || 0);
                                            return (
                                                <tr key={i}><td className="border-2 !border-[var(--line)] p-2 text-center !text-[var(--ink-muted)] font-bold align-top">{i+1}</td><td className="border-2 !border-[var(--line)] p-2 font-bold !text-[var(--ink)] uppercase align-top">{item.name}</td><td className="border-2 !border-[var(--line)] p-2 text-center font-bold !text-[var(--ink)] align-top">{initialQty} Bks</td>
                                                    <td className="border-2 !border-[var(--line)] p-2 text-[10px] font-mono align-top">
                                                        {paidItem && paidItem.qty > 0 && <div className="text-[var(--verified)] font-bold mb-1">• LAKU: {paidItem.qty}</div>}
                                                        {returItem && returItem.qty > 0 && <div className="text-[var(--danger-text)] font-bold mb-1">• RETUR: {returItem.qty}</div>}
                                                        {remainItem && remainItem.qty > 0 && <div className="!text-[var(--ink-muted)] font-bold">• SISA: {remainItem.qty}</div>}
                                                    </td>
                                                    <td className="border-2 !border-[var(--line)] p-2 text-right font-black text-lg !text-[var(--ink)] align-bottom">{paidItem ? new Intl.NumberFormat('id-ID').format((paidItem.calculatedPrice || 0) * paidItem.qty) : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot><tr className="!bg-[var(--verified-fill)]"><td colSpan="4" className="border-2 !border-[var(--line)] p-4 text-right font-black text-xl !text-[var(--verified)] tracking-widest">TOTAL TAGIHAN COLLECTED</td><td className="border-2 !border-[var(--line)] p-4 text-right font-black text-2xl !text-[var(--verified)]">Rp {new Intl.NumberFormat('id-ID').format(displayTotal)}</td></tr></tfoot>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                <div className="no-print !bg-[var(--raised)] p-3 flex justify-center gap-6 border-t !border-[var(--line-2)] shrink-0">
                    <label className="flex items-center gap-2 text-xs font-bold !text-[var(--ink-muted)] cursor-pointer hover:!text-[var(--ink)]"><input type="radio" checked={printFormat === 'thermal'} onChange={() => setPrintFormat('thermal')} name="format" className="w-4 h-4 accent-slate-800"/>Thermal POS (58mm)</label>
                    <label className="flex items-center gap-2 text-xs font-bold !text-[var(--ink)] cursor-pointer hover:!text-[var(--ink)]"><input type="radio" checked={printFormat === 'a4'} onChange={() => setPrintFormat('a4')} name="format" className="w-4 h-4 accent-blue-600"/>Standard Invoice (A4)</label>
                </div>
                
                <div className="no-print !bg-[var(--raised)] p-4 flex gap-3 border-t !border-[var(--line-2)] mt-auto shrink-0">
                    <button onClick={() => {
                        const receipt = document.querySelector('.print-receipt'); if (!receipt) return;
                        const clone = receipt.cloneNode(true); clone.querySelectorAll('.no-print').forEach(el => el.remove()); clone.classList.remove('max-h-[90vh]', 'overflow-y-auto', 'shadow-2xl', 'rounded-b-lg', 'max-w-sm', 'max-w-4xl');
                        let parentStyles = ''; document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => { parentStyles += el.outerHTML; });
                        const isThermal = clone.classList.contains('format-thermal');
                        const iframe = document.createElement('iframe'); iframe.style.position = 'absolute'; iframe.style.top = '0'; iframe.style.left = '0'; iframe.style.width = '1px'; iframe.style.height = '1px'; iframe.style.opacity = '0'; iframe.style.pointerEvents = 'none'; iframe.style.border = 'none'; document.body.appendChild(iframe);
                        const doc = iframe.contentWindow.document; doc.open();
                        doc.write(`<!DOCTYPE html><html><head><title>KPM Invoice</title><meta name="viewport" content="width=device-width, initial-scale=1.0">${parentStyles}<style>@media print { @page { margin: 0; } html, body { background: #ffffff !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; width: ${isThermal ? '48mm' : '210mm'} !important; height: max-content !important; min-height: 0 !important; overflow: hidden !important; display: block !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print-receipt { width: ${isThermal ? '48mm' : '100%'} !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; box-shadow: none !important; border: none !important; page-break-after: avoid !important; } .format-thermal { font-family: 'Courier New', Courier, monospace !important; } .format-thermal * { font-size: 11px !important; line-height: 1.2 !important; color: #000000 !important; } .format-thermal .font-bold { font-weight: bold !important; } .format-thermal .font-black { font-weight: 900 !important; } .format-thermal table { width: 100% !important; border-collapse: collapse !important; } .format-thermal th, .format-thermal td { padding: 2px 0 !important; } .format-thermal .text-right { text-align: right !important; } .format-thermal .text-center { text-align: center !important; } .format-thermal .border-dashed { border-style: dashed !important; border-color: #000000 !important; } .format-thermal .border-y { border-top: 1px dashed #000000 !important; border-bottom: 1px dashed #000000 !important; } .format-thermal .border-b { border-bottom: 1px dashed #000000 !important; border-top: none !important; border-left: none !important; border-right: none !important; } .format-thermal .flex { display: flex !important; } .format-thermal .justify-between { justify-content: space-between !important; } .format-thermal h2 { font-size: 14px !important; text-align: center !important; font-weight: 900 !important; } } body { background: white; margin: 0; padding: 0; display: block; }</style></head><body>${clone.outerHTML}<script>window.onload = () => { setTimeout(() => { window.focus(); window.print(); }, 500); };</script></body></html>`);
                        doc.close(); setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 10000);
                    }} className="flex-1 !bg-[var(--raised)] !text-[var(--ink)] py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-[var(--panel)] transition-colors tracking-widest text-[10px] shadow-md active:scale-95">
                        <Printer size={14}/> Print Document
                    </button>
                    
                    <button onClick={() => {
                        let text = `*${appSettings?.companyName || "KPM INVENTORY"}*\n*OFFICIAL RECEIPT*\n------------------------\nDate: ${receiptDateStr}\nTime: ${receiptTimeStr}\nCustomer: ${viewingReceipt.customerName}\nPayment: ${viewingReceipt.paymentType || 'Cash'}\n------------------------\n`;
                        if (viewingReceipt.items && viewingReceipt.items.length > 0) {
                            viewingReceipt.items.forEach(item => { 
                                text += `${item.qty} ${item.unit} ${item.name}`;
                                if (item.condition === 'DAMAGED') text += ` [DAMAGED]`;
                                if (item.fulfillment === 'IOU') text += ` [UTANG BARANG]`;
                                if (item.isIouFulfillment) text += ` [IOU FULFILLED]`;
                                text += `\n   Rp ${new Intl.NumberFormat('id-ID').format((item.calculatedPrice||0) * item.qty)}\n`; 
                            });
                        }
                        if (viewingReceipt.itemsPaid && viewingReceipt.itemsPaid.length > 0) {
                            viewingReceipt.itemsPaid.forEach(item => { text += `[LAKU] ${item.qty} ${item.unit} ${item.name}\n   Rp ${new Intl.NumberFormat('id-ID').format((item.calculatedPrice||0) * item.qty)}\n`; });
                        }
                        text += `------------------------\n*TOTAL: ${isReturReceipt && displayTotal > 0 ? '-' : ''}Rp ${new Intl.NumberFormat('id-ID').format(displayTotal)}*\n\nThank you for your business!`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }} className="flex-1 !bg-[#25D366] !text-[var(--ink)] py-3 rounded-lg uppercase font-bold flex items-center justify-center gap-2 hover:!bg-[#128C7E] transition-colors tracking-widest text-[10px] shadow-md active:scale-95">
                        <MessageSquare size={14}/> Share
                    </button>
                </div>
                
                <button onClick={() => { setViewingReceipt(null); }} className="no-print w-full shrink-0 !bg-[var(--danger-plate)] hover:!bg-[var(--danger-plate)] !text-[var(--ink)] py-4 font-black uppercase tracking-[0.2em] shadow-[0_-5px_20px_rgba(0,0,0,0.2)] active:scale-95 transition-transform rounded-b-lg flex items-center justify-center gap-2"><X size={20}/> CLOSE RECEIPT</button>
            </div>
        </div>
    );
}
