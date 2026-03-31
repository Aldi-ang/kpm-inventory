import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, writeBatch, getDocs } from 'firebase/firestore';
import { Building2, Power, UserPlus, ShieldAlert, CheckCircle } from 'lucide-react';

export default function LandlordDashboard({ db, appId, user }) {
    const [tenants, setTenants] = useState([]);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `artifacts/${appId}/employee_directory`), where('role', '==', 'COMPANY_OWNER'));
        const unsub = onSnapshot(q, (snap) => {
            setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [db, appId, user]);

    const handleCreateTenant = async (e) => {
        e.preventDefault();
        const emailClean = newEmail.toLowerCase().trim();
        if (!emailClean || !newName) return;

        try {
            await setDoc(doc(db, `artifacts/${appId}/employee_directory`, emailClean), {
                email: emailClean,
                name: newName,
                role: 'COMPANY_OWNER',
                status: 'Active',
                subscriptionStatus: 'ACTIVE',
                bossUid: emailClean, // Temporary lock until first login
                createdAt: new Date().toISOString()
            });
            setNewEmail('');
            setNewName('');
            alert("Tenant created! They can now log in to initialize their vault.");
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

            // 1. Suspend the Boss
            const bossRef = doc(db, `artifacts/${appId}/employee_directory`, tenant.id);
            batch.update(bossRef, {
                subscriptionStatus: isSuspending ? 'SUSPENDED' : 'ACTIVE',
                status: isSuspending ? 'SUSPENDED' : 'Active'
            });

            // 2. Cascade Suspend to all Salesmen
            const actualBossUid = tenant.bossUid;
            const salesmenQ = query(collection(db, `artifacts/${appId}/employee_directory`), where('bossUid', '==', actualBossUid));
            const salesmenSnap = await getDocs(salesmenQ);

            salesmenSnap.forEach(sDoc => {
                batch.update(doc(db, `artifacts/${appId}/employee_directory`, sDoc.id), {
                    status: isSuspending ? 'SUSPENDED' : 'Active'
                });
            });

            await batch.commit();
        } catch (err) {
            console.error(err);
            alert("Failed to update subscription status.");
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

                <form onSubmit={handleCreateTenant} className="flex flex-col md:flex-row gap-3 mb-8 bg-black/60 p-5 rounded-lg border border-white/10 shadow-inner">
                    <input 
                        value={newName} onChange={e=>setNewName(e.target.value)} 
                        placeholder="TENANT DESIGNATION" 
                        className="flex-1 bg-black border border-white/20 p-3 text-white text-[10px] font-mono uppercase tracking-wider outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600" 
                        required 
                    />
                    <input 
                        type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} 
                        placeholder="ADMINISTRATOR IDENTIFIER (EMAIL)" 
                        className="flex-1 bg-black border border-white/20 p-3 text-white text-[10px] font-mono uppercase tracking-wider outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600" 
                        required 
                    />
                    <button type="submit" className="bg-red-900/30 border border-red-500 text-red-500 hover:bg-red-600 hover:text-white font-bold text-[10px] uppercase tracking-widest px-6 py-3 transition-all flex items-center justify-center gap-2">
                        <UserPlus size={16}/> Provision
                    </button>
                </form>

                <div className="space-y-3">
                    {tenants.map(t => (
                        <div key={t.id} className={`p-4 flex flex-col md:flex-row justify-between items-center transition-all bg-black/80 border-y md:border ${t.subscriptionStatus === 'ACTIVE' ? 'border-emerald-900/50 border-l-4 border-l-emerald-500 hover:bg-emerald-900/10' : 'border-red-900/50 border-l-4 border-l-red-500 hover:bg-red-900/10'}`}>
                            <div className="text-center md:text-left mb-4 md:mb-0">
                                <h3 className={`font-serif tracking-widest uppercase text-lg ${t.subscriptionStatus === 'ACTIVE' ? 'text-white' : 'text-slate-400'}`}>{t.name}</h3>
                                <p className="text-[10px] text-slate-500 font-mono tracking-wider mt-1 border border-white/5 inline-block px-2 py-0.5 bg-white/5">
                                    ID: <span className="text-slate-400">{t.bossUid}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-6">
                                {t.subscriptionStatus === 'ACTIVE' ? (
                                    <span className="flex items-center gap-2 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-widest"><CheckCircle size={14} className="animate-pulse"/> SECURE</span>
                                ) : (
                                    <span className="flex items-center gap-2 text-red-500 text-[10px] font-mono font-bold uppercase tracking-widest"><ShieldAlert size={14} className="animate-pulse"/> LOCKED</span>
                                )}
                                <button 
                                    onClick={() => toggleSubscription(t)} 
                                    className={`p-3 font-mono font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border ${t.subscriptionStatus === 'ACTIVE' ? 'bg-red-900/20 text-red-500 border-red-500/50 hover:bg-red-600 hover:text-white' : 'bg-emerald-900/20 text-emerald-500 border-emerald-500/50 hover:bg-emerald-600 hover:text-white'}`}
                                >
                                    <Power size={14} />
                                    {t.subscriptionStatus === 'ACTIVE' ? 'TERMINATE' : 'RESTORE'}
                                </button>
                            </div>
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