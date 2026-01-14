import React, { useState, useEffect } from 'react';

const ReturnModal = ({ transaction, onClose, onConfirm }) => {
  const [returnQtys, setReturnQtys] = useState({});

  useEffect(() => {
    const initial = {};
    if(transaction.items) {
        transaction.items.forEach(item => initial[item.productId] = 0);
    }
    setReturnQtys(initial);
  }, [transaction]);

  const handleQtyChange = (productId, val, max) => {
    let newQty = parseInt(val) || 0;
    if (newQty < 0) newQty = 0;
    if (newQty > max) newQty = max;
    setReturnQtys(prev => ({ ...prev, [productId]: newQty }));
  };

  const handleConfirm = () => {
    onConfirm(returnQtys);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scale-in">
         <h2 className="text-xl font-bold dark:text-white mb-2">Process Return / Adjustment</h2>
         <p className="text-sm text-slate-500 mb-4">Specify quantity returning to your inventory.</p>
         <div className="space-y-3 max-h-[60vh] overflow-y-auto mb-4">
            {transaction.items && transaction.items.map(item => (
               <div key={item.productId} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                  <div>
                      <p className="font-bold text-sm dark:text-white">{item.name}</p>
                      <p className="text-xs text-slate-500">Max Return: {item.qty} {item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="text-xs text-orange-500 font-bold">Qty:</span>
                      <input type="number" value={returnQtys[item.productId] || 0} onChange={(e) => handleQtyChange(item.productId, e.target.value, item.qty)} className="w-16 p-1 rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white text-center"/>
                  </div>
               </div>
            ))}
         </div>
         <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white">Cancel</button>
            <button onClick={handleConfirm} className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-bold">Confirm</button>
         </div>
      </div>
    </div>
  );
};

export default ReturnModal;