import React, { useState } from 'react';
import { Store, Phone, MapPin, Edit, Trash2 } from 'lucide-react';
import { updateDoc, doc, addDoc, collection, deleteDoc, serverTimestamp } from "firebase/firestore";

const CustomerManagement = ({ customers, db, appId, user, logAudit, triggerCapy }) => {
    const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
    const [editingId, setEditingId] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        
        try {
            if (editingId) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', editingId), {
                    ...formData,
                    name: formData.name.trim(),
                    updatedAt: serverTimestamp()
                });
                await logAudit("CUSTOMER_UPDATE", `Updated customer: ${formData.name}`);
                triggerCapy("Customer updated successfully!");
                setEditingId(null);
            } else {
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'customers'), {
                    ...formData,
                    name: formData.name.trim(),
                    createdAt: serverTimestamp()
                });
                await logAudit("CUSTOMER_ADD", `Added customer: ${formData.name}`);
                triggerCapy("Customer added to directory!");
            }
            setFormData({ name: '', phone: '', address: '' });
        } catch (err) { console.error(err); }
    };

    const handleEdit = (customer) => {
        setFormData({ name: customer.name, phone: customer.phone, address: customer.address });
        setEditingId(customer.id);
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };

    const handleDelete = async (id, name) => {
        if (window.confirm("Delete this customer profile?")) {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', id));
            logAudit("CUSTOMER_DELETE", `Deleted customer: ${name}`);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Store size={24} className="text-orange-500"/> Customer Directory</h2>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-sm text-slate-500 uppercase">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>
                        {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({name:'', phone:'', address:''}); }} className="text-xs text-red-500 hover:underline">Cancel Edit</button>}
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="text-xs font-bold text-slate-500 uppercase">Store Name</label>
                            <input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="e.g. Toko Aneka" required/>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                            <input value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="0812..." />
                        </div>
                        <div className="flex-[2] w-full">
                            <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                            <input value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="Jl. Sudirman No. 1" />
                        </div>
                        <button className={`text-white px-6 py-2 rounded-lg font-bold h-10 ${editingId ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
                            {editingId ? 'Update' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.map(c => (
                    <div key={c.id} className={`bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 shadow-sm flex justify-between items-start ${editingId === c.id ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-slate-700' : ''}`}>
                        <div>
                            <h3 className="font-bold text-lg dark:text-white">{c.name}</h3>
                            {c.phone && <p className="text-sm text-slate-500 flex items-center gap-1"><Phone size={12}/> {c.phone}</p>}
                            {c.address && <p className="text-sm text-slate-500 flex items-center gap-1 mt-1"><MapPin size={12}/> {c.address}</p>}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(c)} className="text-slate-400 hover:text-blue-500"><Edit size={16}/></button>
                            <button onClick={() => handleDelete(c.id, c.name)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CustomerManagement;