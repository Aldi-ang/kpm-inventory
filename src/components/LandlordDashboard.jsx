import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, writeBatch, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { Power, UserPlus, ShieldAlert, CheckCircle, ShieldCheck, Edit, Trash2, Save, X } from 'lucide-react';
import { commitInChunks, isSafeDocIdEmail } from '../utils/helpers';
import { confirmAction } from './ConfirmGate.jsx';
import { notify } from './Toast.jsx';

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

        // 🚀 FIX: Same failure mode as FleetCanvasManager.jsx's Authorize & Register —
        // emailClean gets used directly as a Firestore document ID below (line ~55). A
        // stray '/' in place of a '.' turns one ID into extra path segments and crashes
        // the write with a raw SDK error. Catch it here with a message the owner can act on.
        if (!isSafeDocIdEmail(emailClean)) return notify(`"${emailClean}" doesn't look like a valid email address. Check for a stray "/" or space — it should look like name@domain.com.`);

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
                        tier: 2, // 🚀 SECURED: Hardcoded to Tier 2 (Owner)
                        status: 'Active',
                        subscriptionStatus: 'ACTIVE'
                    });
                });
                await batch.commit();
                notify(`✅ Ghost profile found & upgraded! ${emailClean} is now Tier ${newTier}.`);
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
                notify(`✅ Provisioned successfully! They are now assigned to Tier ${newTier}.`);
            }
            
            setNewEmail('');
            setNewName('');
            setNewTier(2);
        } catch (err) {
            console.error(err);
            notify("Failed to create tenant.");
        }
    };

    const toggleSubscription = async (tenant) => {
        const isSuspending = tenant.subscriptionStatus === 'ACTIVE';
        const confirmMsg = isSuspending
            ? `SUSPEND ${tenant.name}? This will instantly lock out the Boss AND all their active salesmen.`
            : `REACTIVATE ${tenant.name}?`;

        if (!await confirmAction(confirmMsg)) return;

        try {
            const operations = [];

            // 1. Suspend the Boss (Sweep by email to catch all linked docs)
            const q = query(collection(db, `artifacts/${appId}/employee_directory`), where('email', '==', tenant.email));
            const snap = await getDocs(q);
            snap.docs.forEach(d => {
                operations.push({
                    type: 'update',
                    ref: d.ref,
                    data: {
                        subscriptionStatus: isSuspending ? 'SUSPENDED' : 'ACTIVE',
                        status: isSuspending ? 'SUSPENDED' : 'Active'
                    }
                });
            });

            // 2. Cascade Suspend to all Salesmen
            // 🚀 FIX: A big distributor can have hundreds of Tier 5/6 field salesmen under
            // one boss. Looping them all into a single manual batch risked hitting
            // Firestore's 500-write limit as the roster grows. commitInChunks splits this
            // safely (by count AND size) and commits sequentially instead of all at once.
            const actualBossUid = tenant.bossUid;
            const salesmenQ = query(collection(db, `artifacts/${appId}/employee_directory`), where('bossUid', '==', actualBossUid));
            const salesmenSnap = await getDocs(salesmenQ);

            salesmenSnap.forEach(sDoc => {
                operations.push({
                    type: 'update',
                    ref: sDoc.ref,
                    data: { status: isSuspending ? 'SUSPENDED' : 'Active' }
                });
            });

            await commitInChunks(db, writeBatch, operations);
        } catch (err) {
            console.error(err);
            notify("Failed to update subscription status.");
        }
    };

    const handleEditClick = (tenant) => {
        setEditingId(tenant.id);
        setEditName(tenant.name);
        setEditTier(tenant.tier || 2);
    };

    // --- UPGRADED: DATABASE SWEEPER FOR EDITING ---
    const handleSaveEdit = async (tenant) => {
        if (!editName.trim()) return notify("Name cannot be empty");
        
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
            notify("Failed to save changes.");
        }
    };

    // --- UPGRADED: DATABASE SWEEPER FOR DELETING ---
    const handleDelete = async (tenant) => {
        if (await confirmAction(`CRITICAL WARNING: Are you sure you want to permanently delete ${tenant.name}? This action cannot be undone.`)) {
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
                notify("Failed to delete record.");
            }
        }
    };

   return (
        /* NO FRAME AND NO HEADING OF ITS OWN. This renders inside a `.kpm-mod` whose rail already
           names it, and the old version opened with its own border, its own radius, its own
           shadow and an <h2> that outranked the tab's own name — a box inside a box, named twice. */
        <div className="kpm-body animate-fade-in">
            <p className="kpm-note">
                Every account here is a Tier 2 owner with its own separate company data.
                Suspending one locks that owner out immediately.
            </p>

            {/* PROVISIONING FORM — labels printed above the fields, not inside them: a
                placeholder disappears exactly when he wants to check what he typed. */}
            <form onSubmit={handleCreateTenant} className="flex flex-col gap-3 border border-line bg-sunk p-3">
                <div className="kpm-field">
                    <span>Company name</span>
                    <input value={newName} onChange={e=>setNewName(e.target.value)} required />
                </div>
                <div className="kpm-field">
                    <span>Owner email</span>
                    <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} required />
                </div>
                <div className="kpm-field">
                    <span>Tier</span>
                    <div className="fixed">Tier 2 · Owner (fixed)</div>
                </div>
                <button type="submit" className="kpm-btn key block">
                    <UserPlus size={16}/> Provision account
                </button>
            </form>

                <div className="flex flex-col gap-2">
                    {tenants.map(t => (
                        <div key={t.id} className={`kpm-rec ${t.subscriptionStatus === 'ACTIVE' ? '' : 'locked'}`}>

                            {editingId === t.id ? (
                                /* INLINE EDIT MODE */
                                <div className="animate-fade-in">
                                    <div className="who">
                                        <div className="kpm-field">
                                            <span>Company name</span>
                                            <input value={editName} onChange={e=>setEditName(e.target.value)} autoFocus />
                                        </div>
                                    </div>
                                    <div className="acts">
                                        <button type="button" className="kpm-btn key" onClick={() => handleSaveEdit(t)}><Save size={14}/> Save</button>
                                        <button type="button" className="kpm-btn" onClick={() => setEditingId(null)}><X size={14}/> Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                /* NORMAL DISPLAY MODE — identity above, actions below. At 375px a
                                   side-by-side row cannot hold three word buttons without shrinking
                                   them under the 44px touch minimum. */
                                <>
                                    <div className="who">
                                        <b>{t.name}</b>
                                        <code>{t.email}</code>
                                        <div className="flex items-center gap-2 mt-1">
                                            {/* ⚠️ NOT `hidden md:flex`. Whether an account is locked is the one
                                                fact this list exists to report, and it used to be desktop-only. */}
                                            <span className={`kpm-read ${t.subscriptionStatus === 'ACTIVE' ? '' : 'alert'}`}>
                                                {t.subscriptionStatus === 'ACTIVE'
                                                    ? <><CheckCircle size={10} className="inline mr-1"/>Active</>
                                                    : <><ShieldAlert size={10} className="inline mr-1"/>Locked out</>}
                                            </span>
                                            <span className="kpm-read">
                                                {t.tier === 1 ? <ShieldAlert size={10} className="inline mr-1"/> : <ShieldCheck size={10} className="inline mr-1"/>}
                                                Tier {t.tier || 1}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="acts">
                                        <button type="button" className={`kpm-btn ${t.subscriptionStatus === 'ACTIVE' ? 'hazard' : 'key'}`}
                                            onClick={() => toggleSubscription(t)}
                                            title={t.subscriptionStatus === 'ACTIVE' ? "Suspend this owner" : "Restore this owner"}>
                                            <Power size={14} /> {t.subscriptionStatus === 'ACTIVE' ? 'Suspend' : 'Restore'}
                                        </button>
                                        <button type="button" className="kpm-btn" onClick={() => handleEditClick(t)} title="Rename this account">
                                            <Edit size={14} /> Rename
                                        </button>
                                        <button type="button" className="kpm-btn hazard" onClick={() => handleDelete(t)} title="Permanently delete this account">
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {tenants.length === 0 && (
                        <div className="border border-line bg-sunk p-4">
                            <p className="kpm-note">No accounts yet. Provision one above and it appears here.</p>
                        </div>
                    )}
                </div>
        </div>
    );
}