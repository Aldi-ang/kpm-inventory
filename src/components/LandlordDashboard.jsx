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
        <div className="bg-gradient-to-br from-blue-900 to-black p-6 md:p-8 rounded-2xl shadow-2xl border-2 border-blue-500/50 mb-8 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Building2 size={150} /></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6 border-b border-blue-500/30 pb-4">
                    <Building2 className="text-blue-400" size={28} />
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-widest">SaaS Landlord Dashboard</h2>
                        <p className="text-[10px] text-blue-300 font-mono uppercase tracking-widest">Tier 1 Super Admin Controls</p>
                    </div>
                </div>

                <form onSubmit={handleCreateTenant} className="flex flex-col md:flex-row gap-3 mb-8 bg-black/50 p-4 rounded-xl border border-blue-500/20">
                    <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Company / Boss Name" className="flex-1 bg-black border border-blue-500/30 p-3 rounded-lg text-white outline-none focus:border-blue-500 text-sm" required />
                    <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="Boss Google Email" className="flex-1 bg-black border border-blue-500/30 p-3 rounded-lg text-white outline-none focus:border-blue-500 text-sm" required />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"><UserPlus size={18}/> Provision Tenant</button>
                </form>

                <div className="space-y-3">
                    {tenants.map(t => (
                        <div key={t.id} className={`p-4 rounded-xl flex flex-col md:flex-row justify-between items-center border transition-all ${t.subscriptionStatus === 'ACTIVE' ? 'bg-blue-900/20 border-blue-500/30 hover:border-blue-400' : 'bg-red-900/20 border-red-500/30 hover:border-red-400'}`}>
                            <div className="text-center md:text-left mb-3 md:mb-0">
                                <h3 className="font-bold text-white text-lg">{t.name}</h3>
                                <p className="text-[10px] text-slate-400 font-mono">{t.email} <br/> ID: {t.bossUid}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {t.subscriptionStatus === 'ACTIVE' ? (
                                    <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-500/50"><CheckCircle size={14}/> Active</span>
                                ) : (
                                    <span className="flex items-center gap-1 text-red-400 text-xs font-bold uppercase tracking-widest bg-red-900/30 px-3 py-1 rounded-full border border-red-500/50"><ShieldAlert size={14}/> Suspended</span>
                                )}
                                <button onClick={() => toggleSubscription(t)} className={`p-3 rounded-lg font-bold transition-all hover:scale-105 shadow-lg ${t.subscriptionStatus === 'ACTIVE' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                                    <Power size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {tenants.length === 0 && <p className="text-center text-blue-400/50 italic py-4 font-mono text-sm">No active tenants. Provision one above.</p>}
                </div>
            </div>
        </div>
    );
}