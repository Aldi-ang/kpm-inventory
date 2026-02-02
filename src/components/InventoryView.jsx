import React, { useState } from 'react';
import { Package, Plus, Download, Settings, Trash2, Search, Lock } from 'lucide-react';
import { formatRupiah } from '../utils';

export default function InventoryView({ inventory, onSave, onDelete, isAdmin, setEditingProduct }) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filtered = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex gap-4">
        <input 
            type="text" placeholder="Search global catalog..." 
            className="flex-1 bg-white dark:bg-slate-800 p-2.5 rounded-xl border dark:border-slate-700 dark:text-white"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
        />
        {/* Only Admin can add NEW products to the catalog */}
        {isAdmin && (
            <button 
                onClick={() => setEditingProduct({})} 
                className="bg-orange-500 text-white px-4 rounded-xl flex items-center gap-2"
            >
                <Plus size={20}/> New Catalog Item
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700 shadow-sm p-4">
            <div className="flex gap-3 mb-4">
              <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden shrink-0">
                {(item.images?.front || item.image) ? 
                    <img src={item.images?.front || item.image} className="w-full h-full object-cover"/> : 
                    <Package className="w-full h-full p-4 text-slate-400"/>
                }
              </div>
              <div>
                <h3 className="font-bold leading-tight dark:text-white">{item.name}</h3>
                <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full dark:text-slate-300">{item.type}</span>
                <p className="text-emerald-500 font-bold mt-1">
                    {/* Visual cue if using user's specific stock */}
                    {item.stock} Bks {item.hasUserOverride ? '(My Stock)' : '(Default)'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
                {/* Users click this to set THEIR stock/price */}
                <button 
                    onClick={() => setEditingProduct(item)} 
                    className="flex-1 bg-slate-100 dark:bg-slate-700 py-2 rounded-lg text-sm font-medium dark:text-white flex items-center justify-center gap-2"
                >
                    <Settings size={14}/> {isAdmin ? "Edit Catalog" : "Manage My Stock"}
                </button>
                
                {/* Only Admin can delete from Master Catalog */}
                {isAdmin && (
                    <button onClick={() => onDelete(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded">
                        <Trash2 size={18}/>
                    </button>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}