import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, writeBatch, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { Power, UserPlus, ShieldAlert, CheckCircle, ShieldCheck, Edit, Trash2, Save, X } from 'lucide-react';

export default function LandlordDashboard({ db, appId, user }) {
    const [tenants, setTenants] = useState([]);
    
    // Provisioning State
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newTier, setNewTier] = useState(2); // DEFAULT TO TIER 2

    // Editing State
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editTier, setEditTier] = useState(2);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `artifacts/${appId}/employee_directory`), where('role', '==', 'COMPANY_OWNER'));
        const unsub = onSnapshot(q, (snap) => {
            setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [db, appId, user]);

    // --- UPGRADED: DATABASE SWEEPER FOR PROVISIONING ---
    const handleCreateTenant = async (e) => {
        e.preventDefault();
        const emailClean = newEmail.toLowerCase().trim();
        if (!emailClean || !newName) return;

        try {
            // 1. Search for any auto-generated Tier 4 ghost profiles
            const q = query(collection(db, `artifacts/${appId}/employee_directory`), where('email', '==', emailClean));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                // 2. If a ghost profile exists, upgrade it directly to Admin
                const batch = writeBatch(db);
                snap.docs.forEach(d => {
                    batch.update(d.ref, {
                        name: newName,
                        role: 'COMPANY_OWNER',
                        tier: Number(newTier),
                        status: 'Active',
                        subscriptionStatus: 'ACTIVE'
                    });
                });
                await batch.commit();
                alert(`✅ Ghost profile found & upgraded! ${emailClean} is now Tier ${newTier}.`);
            } else {
                // 3. If they have never logged in, pre-provision normally
                await setDoc(doc(db, `artifacts/${appId}/employee_directory`, emailClean), {
                    email: emailClean,
                    name: newName,
                    role: 'COMPANY_OWNER',
                    tier: Number(newTier), 
                    status: 'Active',
                    subscriptionStatus: 'ACTIVE',
                    bossUid: emailClean, 
                    createdAt: new Date().toISOString()
                });
                alert(`✅ Provisioned successfully! They are now assigned to Tier ${newTier}.`);
            }
            
            setNewEmail('');
            setNewName('');
            setNewTier(2);
        } catch (err) {
            console.error(err);
            alert("Failed to create tenant.");
        }
    };

    const toggleSubscription = async (tenant) => {
        const isSuspending = tenant.subscriptionStatus === 'ACTIVE';
        const confirmMsg = isSuspending
            ? `SUSPEND ${tenant.name}? This will instantly lock out the Boss AND all their active salesmen.`
            : `REACTIVATE ${tenant.name}?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            const batch = writeBatch(db);

            // 1. Suspend the Boss (Sweep by email to catch all linked docs)
            const q = query(collection(db, `artifacts/${appId}/employee_directory`), where('email', '==', tenant.email));
            const snap = await getDocs(q);
            snap.docs.forEach(d => {
                batch.update(d.ref, {
                    subscriptionStatus: isSuspending ? 'SUSPENDED' : 'ACTIVE',
                    status: isSuspending ? 'SUSPENDED' : 'Active'
                });
            });

            // 2. Cascade Suspend to all Salesmen
            const actualBossUid = tenant.bossUid;
            const salesmenQ = query(collection(db, `artifacts/${appId}/employee_directory`), where('bossUid', '==', actualBossUid));
            const salesmenSnap = await getDocs(salesmenQ);

            salesmenSnap.forEach(sDoc => {
                batch.update(sDoc.ref, {
                    status: isSuspending ? 'SUSPENDED' : 'Active'
                });
            });

            await batch.commit();
        } catch (err) {
            console.error(err);
            alert("Failed to update subscription status.");
        }
    };

    const handleEditClick = (tenant) => {
        setEditingId(tenant.id);
        setEditName(tenant.name);
        setEditTier(tenant.tier || 2);
    };

    // --- UPGRADED: DATABASE SWEEPER FOR EDITING ---
    const handleSaveEdit = async (tenant) => {
        if (!editName.trim()) return alert("Name cannot be empty");
        
        try {
            // Sweep for all documents matching the email and force the upgrade
            const q = query(collection(db, `artifacts/${appId}/employee_directory`), where('email', '==', tenant.email));
            const snap = await getDocs(q);
            
            const batch = writeBatch(db);
            
            if (!snap.empty) {
                snap.docs.forEach(d => {
                    batch.update(d.ref, {
                        name: editName.trim(),
                        tier: Number(editTier),
                        role: 'COMPANY_OWNER' // Force admin clearance
                    });
                });
            } else {
                // Fallback if no matching email array exists
                batch.update(doc(db, `artifacts/${appId}/employee_directory`, tenant.id), {
                    name: editName.trim(),
                    tier: Number(editTier),
                    role: 'COMPANY_OWNER'
                });
            }
            
            await batch.commit();
            setEditingId(null);
        } catch (err) {
            console.error(err);
            alert("Failed to save changes.");
        }
    };

    // --- UPGRADED: DATABASE SWEEPER FOR DELETING ---
    const handleDelete = async (tenant) => {
        if (window.confirm(`CRITICAL WARNING: Are you sure you want to permanently delete ${tenant.name}? This action cannot be undone.`)) {
            try {
                // Sweep and eradicate all ghost profiles matching this email
                const q = query(collection(db, `artifacts/${appId}/employee_directory`), where('email', '==', tenant.email));
                const snap = await getDocs(q);
                
                const batch = writeBatch(db);
                if (!snap.empty) {
                    snap.docs.forEach(d => batch.delete(d.ref));
                } else {
                    batch.delete(doc(db, `artifacts/${appId}/employee_directory`, tenant.id));
                }
                await batch.commit();
            } catch (err) {
                console.error(err);
                alert("Failed to delete record.");
            }
        }
    };

   return (
        <div className="bg-black/95 border border-red-900/50 p-6 md:p-8 rounded-xl shadow-[0_0_40px_rgba(220,38,38,0.1)] mb-8 animate-fade-in relative overflow-hidden">
            {/* BACKGROUND TEXTURE */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)', backgroundSize: '100% 4px' }}></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6 border-b border-red-900/50 pb-4">
                    <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-full">
                        <ShieldAlert className="text-red-500" size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-serif text-red-500 uppercase tracking-[0.2em] drop-shadow-lg">Architect Terminal</h2>
                        <p className="text-[10px] text-orange-400 font-mono uppercase tracking-widest mt-1">Tier 1 // Global Overseer Override</p>
                    </div>
                </div>

                {/* PROVISIONING FORM */}
                <form onSubmit={handleCreateTenant} className="flex flex-col md:flex-row gap-3 mb-8 bg-black/60 p-5 rounded-lg border border-white/10 shadow-inner">
                    <input 
                        value={newName} onChange={e=>setNewName(e.target.value)} 
                        placeholder="TENANT DESIGNATION" 
                        className="flex-1 bg-black border border-white/20 p-3 text-white text-[10px] font-mono uppercase tracking-wider outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600" 
                        required 
                    />
                    <input 
                        type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} 
                        placeholder="ADMIN IDENTIFIER (EMAIL)" 
                        className="flex-1 bg-black border border-white/20 p-3 text-white text-[10px] font-mono uppercase tracking-wider outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600" 
                        required 
                    />
                    
                    <select
                        value={newTier}
                        onChange={(e) => setNewTier(e.target.value)}
                        className="bg-black border border-white/20 text-white p-3 text-[10px] font-mono uppercase tracking-wider outline-none focus:border-orange-500 cursor-pointer"
                    >
                        <option value="1">TIER 1 (OVERSEER)</option>
                        <option value="2">TIER 2 (MANAGER)</option>
                    </select>

                    <button type="submit" className="bg-red-900/30 border border-red-500 text-red-500 hover:bg-red-600 hover:text-white font-bold text-[10px] uppercase tracking-widest px-6 py-3 transition-all flex items-center justify-center gap-2 whitespace-nowrap">
                        <UserPlus size={16}/> Provision
                    </button>
                </form>

                <div className="space-y-3">
                    {tenants.map(t => (
                        <div key={t.id} className={`p-4 flex flex-col md:flex-row justify-between items-center transition-all bg-black/80 border-y md:border ${t.subscriptionStatus === 'ACTIVE' ? 'border-emerald-900/50 border-l-4 border-l-emerald-500 hover:bg-emerald-900/10' : 'border-red-900/50 border-l-4 border-l-red-500 hover:bg-red-900/10'}`}>
                            
                            {editingId === t.id ? (
                                /* INLINE EDIT MODE */
                                <div className="w-full flex flex-col md:flex-row gap-3 items-center justify-between animate-fade-in">
                                    <div className="flex-1 flex gap-2 w-full">
                                        <input 
                                            value={editName} 
                                            onChange={e=>setEditName(e.target.value)} 
                                            className="flex-1 bg-black border border-blue-500/50 p-2 text-white text-[10px] font-mono uppercase outline-none focus:border-blue-400" 
                                            placeholder="Update Name"
                                        />
                                        <select 
                                            value={editTier} 
                                            onChange={e=>setEditTier(e.target.value)} 
                                            className="bg-black border border-blue-500/50 p-2 text-white text-[10px] font-mono uppercase outline-none focus:border-blue-400 cursor-pointer"
                                        >
                                            <option value="1">TIER 1</option>
                                            <option value="2">TIER 2</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                        <button onClick={() => handleSaveEdit(t)} className="flex-1 md:flex-none p-2 md:px-4 bg-emerald-900/30 text-emerald-500 hover:bg-emerald-600 hover:text-white border border-emerald-500/50 transition-all flex justify-center items-center gap-2 text-[10px] font-bold tracking-widest"><Save size={14}/> SAVE</button>
                                        <button onClick={() => setEditingId(null)} className="flex-1 md:flex-none p-2 md:px-4 bg-slate-900/30 text-slate-500 hover:bg-slate-600 hover:text-white border border-slate-500/50 transition-all flex justify-center items-center gap-2 text-[10px] font-bold tracking-widest"><X size={14}/> CANCEL</button>
                                    </div>
                                </div>
                            ) : (
                                /* NORMAL DISPLAY MODE */
                                <>
                                    <div className="text-center md:text-left mb-4 md:mb-0 w-full md:w-auto">
                                        <div className="flex flex-col md:flex-row items-center gap-3">
                                            <h3 className={`font-serif tracking-widest uppercase text-lg ${t.subscriptionStatus === 'ACTIVE' ? 'text-white' : 'text-slate-400'}`}>{t.name}</h3>
                                            
                                            <span className={`text-[9px] px-2 py-1 border flex items-center gap-1 tracking-widest ${
                                                t.tier === 1 
                                                ? 'border-red-900 text-red-500 bg-red-950/20' 
                                                : 'border-emerald-900 text-emerald-500 bg-emerald-950/20'
                                            }`}>
                                                {t.tier === 1 ? <ShieldAlert size={10}/> : <ShieldCheck size={10}/>}
                                                TIER {t.tier || 1}
                                            </span>
                                        </div>
                                        
                                        <p className="text-[10px] text-slate-500 font-mono tracking-wider mt-2 border border-white/5 inline-block px-2 py-0.5 bg-white/5">
                                            ID: <span className="text-slate-400">{t.email}</span>
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between w-full md:w-auto gap-4 border-t border-white/5 md:border-none pt-4 md:pt-0">
                                        <div className="hidden md:flex">
                                            {t.subscriptionStatus === 'ACTIVE' ? (
                                                <span className="flex items-center gap-2 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-widest"><CheckCircle size={14} className="animate-pulse"/> SECURE</span>
                                            ) : (
                                                <span className="flex items-center gap-2 text-red-500 text-[10px] font-mono font-bold uppercase tracking-widest"><ShieldAlert size={14} className="animate-pulse"/> LOCKED</span>
                                            )}
                                        </div>
                                        
                                        <div className="flex gap-2 w-full md:w-auto">
                                            <button 
                                                onClick={() => toggleSubscription(t)} 
                                                className={`flex-1 md:flex-none p-2 md:px-3 font-mono font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${t.subscriptionStatus === 'ACTIVE' ? 'bg-red-900/20 text-red-500 border-red-500/50 hover:bg-red-600 hover:text-white' : 'bg-emerald-900/20 text-emerald-500 border-emerald-500/50 hover:bg-emerald-600 hover:text-white'}`}
                                                title={t.subscriptionStatus === 'ACTIVE' ? "Suspend User" : "Restore User"}
                                            >
                                                <Power size={14} />
                                                <span className="md:hidden">{t.subscriptionStatus === 'ACTIVE' ? 'SUSPEND' : 'RESTORE'}</span>
                                            </button>

                                            <button 
                                                onClick={() => handleEditClick(t)} 
                                                className="p-2 md:px-3 bg-blue-900/20 text-blue-500 border-blue-500/50 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center"
                                                title="Edit User"
                                            >
                                                <Edit size={14} />
                                            </button>

                                            <button 
                                                onClick={() => handleDelete(t)} 
                                                className="p-2 md:px-3 bg-slate-900/20 text-slate-500 border-slate-500/50 hover:bg-red-600 hover:border-red-500 hover:text-white transition-all flex items-center justify-center"
                                                title="Permanently Delete User"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {tenants.length === 0 && (
                        <div className="text-center py-8 border border-white/5 bg-black/50">
                            <p className="text-orange-500/50 font-mono text-[10px] uppercase tracking-widest animate-pulse">Waiting for database population...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}