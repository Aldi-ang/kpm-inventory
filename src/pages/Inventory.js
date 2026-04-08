// src/pages/Inventory.js
import React, { useState } from 'react';
import { Search, Download, Plus, Settings, Trash2, Package, Lock, Upload, Crop, Replace } from 'lucide-react';
import { doc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, appId } from '../firebase'; // Import from configured firebase file
import { formatRupiah, getCurrentDate } from '../utils';

export default function Inventory({ inventory, setInventory, isAdmin, user, logAudit, triggerCapy, setEditingProduct, setExaminingProduct, editingProduct, tempImages, setTempImages, boxDimensions, setBoxDimensions, useFrontForBack, setUseFrontForBack }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- GLOBAL PRODUCT SAVE ---
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Number conversions
        ['stock', 'priceRetail', 'priceGrosir', 'priceEcer'].forEach(field => data[field] = Number(data[field]) || 0);
        
        // Admin-only fields (Preserve existing if user is not admin)
        if (!isAdmin && editingProduct) {
            data.name = editingProduct.name;
            data.description = editingProduct.description;
            data.type = editingProduct.type;
            data.taxStamp = editingProduct.taxStamp;
            // Non-admins cannot change images or dims
            data.images = editingProduct.images; 
            data.dimensions = editingProduct.dimensions;
        } else {
            data.images = { ...(editingProduct?.images || {}), ...tempImages };
            data.dimensions = { ...boxDimensions };
            data.useFrontForBack = useFrontForBack;
        }

        data.updatedAt = serverTimestamp();
        data.lastModifiedBy = user.email; // Track who changed it

        // PATH CHANGE: GLOBAL PRODUCTS
        if (editingProduct?.id) {
            await updateDoc(doc(db, `artifacts/${appId}/products`, editingProduct.id), data);
            await logAudit("PRODUCT_UPDATE", `Updated product: ${data.name} (Global)`);
            triggerCapy("Product updated globally!");
        } else {
            // Only Admin can add new
            if(!isAdmin) { alert("Only Admin can add new products."); return; }
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, `artifacts/${appId}/products`), data);
            await logAudit("PRODUCT_ADD", `Added new product: ${data.name} (Global)`);
            triggerCapy("New global product added!");
        }
        setEditingProduct(null);
    } catch (err) {
        console.error(err);
        triggerCapy("Error saving product!");
    }
  };

  const deleteProduct = async (id) => {
      if(!isAdmin) { alert("Access Denied: Only Admin can delete products."); return; }
      if (window.confirm("Delete this product for ALL users?")) {
          try {
              await deleteDoc(doc(db, `artifacts/${appId}/products`, id));
              logAudit("PRODUCT_DELETE", `Deleted product ID: ${id}`);
          } catch(e) { alert(e.message); }
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex gap-4">
            <input className="flex-1 bg-white dark:bg-slate-800 p-2.5 rounded-xl border dark:border-slate-700 dark:text-white" placeholder="Search global products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            {isAdmin && (
                <button onClick={() => { setEditingProduct({}); setTempImages({}); }} className="bg-orange-500 text-white px-4 rounded-xl flex items-center gap-2"><Plus size={20}/> Add</button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInventory.map(item => (
                <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700 shadow-sm p-4 relative">
                    {!isAdmin && <div className="absolute top-2 right-2 text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">Read Only Mode</div>}
                    <div className="flex gap-3 mb-4">
                        <div className="w-16 h-16 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                            {(item.images?.front || item.image) ? <img src={item.images?.front || item.image} className="w-full h-full object-cover"/> : <Package className="w-full h-full p-4 text-slate-400"/>}
                        </div>
                        <div>
                            <h3 className="font-bold leading-tight dark:text-white">{item.name}</h3>
                            <p className="text-emerald-500 font-bold mt-1">{item.stock} Bks</p>
                            <p className="text-xs text-slate-400">{formatRupiah(item.priceRetail)}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setExaminingProduct(item)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-2 rounded-lg text-sm font-medium dark:text-white">Examine</button>
                        <button onClick={() => { setEditingProduct(item); setTempImages(item.images||{}); setBoxDimensions(item.dimensions||{w:55,h:90,d:22}); }} className="p-2 text-slate-400 hover:text-orange-500"><Settings size={18}/></button>
                        {isAdmin && <button onClick={() => deleteProduct(item.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>}
                    </div>
                </div>
            ))}
        </div>

        {/* EDIT MODAL */}
        {editingProduct && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
                    <div className="flex justify-between mb-4"><h2 className="text-xl font-bold dark:text-white">Product Details</h2><button onClick={() => setEditingProduct(null)}><X className="dark:text-white"/></button></div>
                    
                    {!isAdmin && <div className="mb-4 bg-blue-50 text-blue-600 p-3 rounded-lg text-sm flex items-center gap-2"><Lock size={16}/> You can only edit Stock and Price.</div>}

                    <form onSubmit={handleSaveProduct}>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                {/* Disabled for non-admins */}
                                <input name="name" defaultValue={editingProduct.name} disabled={!isAdmin} className={`w-full p-2 border rounded dark:bg-slate-700 dark:text-white ${!isAdmin && 'opacity-50 cursor-not-allowed'}`} placeholder="Name"/>
                                <textarea name="description" defaultValue={editingProduct.description} disabled={!isAdmin} className={`w-full p-2 border rounded dark:bg-slate-700 dark:text-white h-20 ${!isAdmin && 'opacity-50'}`} placeholder="Description"/>
                                {/* Only Admin sees 3D texture controls */}
                                {isAdmin && <div className="p-4 border-2 border-dashed border-slate-300 rounded text-center text-slate-400 text-xs">3D Texture Controls (Admin Only)</div>}
                            </div>
                            <div className="space-y-3">
                                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700">
                                    <p className="text-xs font-bold text-orange-500 mb-2">PRICES & STOCK (Editable)</p>
                                    <label className="text-xs text-slate-400">Stock (Global)</label>
                                    <input name="stock" type="number" defaultValue={editingProduct.stock} className="w-full mb-2 p-1 border border-emerald-500 rounded dark:bg-slate-800 dark:text-white font-bold"/>
                                    
                                    <label className="text-xs text-slate-400">Retail Price</label>
                                    <input name="priceRetail" type="number" defaultValue={editingProduct.priceRetail} className="w-full mb-2 p-1 border rounded dark:bg-slate-800 dark:text-white"/>
                                    
                                    <label className="text-xs text-slate-400">Grosir Price</label>
                                    <input name="priceGrosir" type="number" defaultValue={editingProduct.priceGrosir} className="w-full mb-2 p-1 border rounded dark:bg-slate-800 dark:text-white"/>
                                </div>
                            </div>
                        </div>
                        <button className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold mt-6">SAVE CHANGES (GLOBAL)</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}