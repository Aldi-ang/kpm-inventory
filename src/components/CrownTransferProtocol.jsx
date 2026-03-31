import React, { useState } from 'react';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { ShieldAlert, Key, Fingerprint, Mail, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function CrownTransferProtocol({ db, user, onClose, triggerCapy }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Form States
    const [pin, setPin] = useState('');
    const [phrase, setPhrase] = useState('');
    const [otp, setOtp] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState('');

    const showError = (msg) => {
        setError(msg);
        setTimeout(() => setError(''), 3000);
    };

    // STEP 1: Verify PIN against database
    const handleVerifyPin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Fetch the secure settings document where your hashed PIN/Phrase is stored
            const secRef = doc(db, 'settings', 'security');
            const secSnap = await getDoc(secRef);
            
            // In a real app, compare hashes. For this MVP, we assume a plain or simple match
            if (secSnap.exists() && secSnap.data().masterPin === pin) {
                setStep(2);
                triggerCapy("Security Level 1 Cleared.");
            } else {
                showError("INVALID MASTER PIN");
            }
        } catch (err) {
            showError("DATABASE CONNECTION ERROR");
        }
        setLoading(false);
    };

    // STEP 2: Verify Secret Phrase
    const handleVerifyPhrase = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const secRef = doc(db, 'settings', 'security');
            const secSnap = await getDoc(secRef);
            
            if (secSnap.exists() && secSnap.data().secretPhrase === phrase) {
                // Generate a random 6 digit OTP
                const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
                setGeneratedOtp(newOtp);
                
                // --- EMAIL JS TRIGGER ---
                // NOTE: Replace these with your actual EmailJS Service ID, Template ID, and Public Key
                await emailjs.send(
                    'service_b564nlp', 
                    'template_89lgavp', 
                    {
                        to_email: user.email,
                        otp_code: newOtp,
                        message: "CRITICAL: Crown Transfer Protocol Initiated."
                    }, 
                    'veSkmuEcR5qSImMSq'
                );

                setStep(3);
                triggerCapy("OTP Sent to Super Admin Email.");
            } else {
                showError("INVALID SECRET PHRASE");
            }
        } catch (err) {
            showError("FAILED TO SEND OTP");
        }
        setLoading(false);
    };

    // STEP 3: Verify OTP
    const handleVerifyOtp = (e) => {
        e.preventDefault();
        if (otp === generatedOtp) {
            setStep(4);
            triggerCapy("Final Authorization Required.");
        } else {
            showError("INVALID OTP CODE");
        }
    };

    // STEP 4: Execute Transfer
    const handleExecuteTransfer = async (e) => {
        e.preventDefault();
        if (newEmail.toLowerCase().trim() === user.email.toLowerCase().trim()) {
            return showError("CANNOT TRANSFER TO SELF");
        }
        
        if (!window.confirm(`CRITICAL WARNING: You are about to permanently transfer ownership of this entire system to ${newEmail}. This action CANNOT be undone. Proceed?`)) return;

        setLoading(true);
        try {
            // 1. Write the new owner to a pending invites collection so the Traffic Cop can assign them a UID when they log in
            await setDoc(doc(db, 'system_admins_invites', newEmail.toLowerCase().trim()), {
                email: newEmail.toLowerCase().trim(),
                assignedBy: user.email,
                timestamp: serverTimestamp()
            });

            // 2. Revoke current access
            await deleteDoc(doc(db, 'system_admins', user.uid));

            alert("TRANSFER COMPLETE. You will now be logged out. The new owner must log in with Google to claim the Crown.");
            window.location.reload(); // Force app to reload and kick the old admin out
        } catch (err) {
            showError("TRANSFER FAILED. FATAL ERROR.");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden">
                {/* Header */}
                <div className="bg-red-950/50 p-6 border-b border-red-500/30 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500 animate-pulse">
                        <ShieldAlert className="text-red-500" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-red-500 uppercase tracking-widest">Crown Transfer Protocol</h2>
                        <p className="text-xs text-red-400/70 font-mono tracking-widest">Tier 1 Authorization Required</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="flex px-6 pt-6">
                    {[1, 2, 3, 4].map(num => (
                        <div key={num} className="flex-1 flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step >= num ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_red]' : 'bg-transparent border-slate-700 text-slate-500'}`}>
                                {step > num ? <CheckCircle2 size={16}/> : num}
                            </div>
                            {num < 4 && <div className={`flex-1 h-1 mx-2 rounded ${step > num ? 'bg-red-600' : 'bg-slate-800'}`}></div>}
                        </div>
                    ))}
                </div>

                <div className="p-8">
                    {error && <div className="mb-6 p-3 bg-red-950 border border-red-500 text-red-500 text-xs font-mono font-bold text-center uppercase animate-shake">{error}</div>}

                    {step === 1 && (
                        <form onSubmit={handleVerifyPin} className="space-y-6 animate-fade-in">
                            <div className="text-center mb-6">
                                <Key className="mx-auto text-slate-500 mb-3" size={32} />
                                <p className="text-slate-400 font-mono text-sm">Enter Master Protocol PIN</p>
                            </div>
                            <input type="password" autoFocus value={pin} onChange={e=>setPin(e.target.value)} className="w-full bg-black border border-slate-700 text-center text-2xl tracking-[1em] p-4 rounded text-white outline-none focus:border-red-500 font-mono" required />
                            <button disabled={loading} type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded tracking-widest uppercase transition-colors">Verify PIN</button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyPhrase} className="space-y-6 animate-fade-in">
                            <div className="text-center mb-6">
                                <Fingerprint className="mx-auto text-slate-500 mb-3" size={32} />
                                <p className="text-slate-400 font-mono text-sm">Enter Secret Recovery Phrase</p>
                            </div>
                            <input type="password" autoFocus value={phrase} onChange={e=>setPhrase(e.target.value)} className="w-full bg-black border border-slate-700 text-center text-lg tracking-widest p-4 rounded text-white outline-none focus:border-red-500 font-mono" required />
                            <button disabled={loading} type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded tracking-widest uppercase transition-colors">Verify Phrase</button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fade-in">
                            <div className="text-center mb-6">
                                <Mail className="mx-auto text-red-500 mb-3 animate-pulse" size={32} />
                                <p className="text-slate-400 font-mono text-sm">A 6-digit OTP has been sent to your email.</p>
                            </div>
                            <input type="text" maxLength="6" autoFocus value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} className="w-full bg-black border border-slate-700 text-center text-3xl tracking-[0.5em] p-4 rounded text-white outline-none focus:border-red-500 font-mono" required />
                            <button disabled={loading} type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded tracking-widest uppercase transition-colors">Verify Email</button>
                        </form>
                    )}

                    {step === 4 && (
                        <form onSubmit={handleExecuteTransfer} className="space-y-6 animate-fade-in">
                            <div className="text-center mb-6">
                                <AlertTriangle className="mx-auto text-red-500 mb-3" size={40} />
                                <p className="text-red-400 font-bold text-sm uppercase tracking-widest">Final Step: Define New Architect</p>
                                <p className="text-slate-500 font-mono text-xs mt-2">Enter the Google Email of the new owner.</p>
                            </div>
                            <input type="email" autoFocus value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="new.owner@gmail.com" className="w-full bg-black border border-red-500/50 text-center text-lg p-4 rounded text-white outline-none focus:border-red-500 font-mono" required />
                            <button disabled={loading} type="submit" className="w-full bg-red-700 hover:bg-red-600 text-white font-black py-4 rounded tracking-widest uppercase transition-colors shadow-[0_0_20px_rgba(220,38,38,0.5)] flex justify-center items-center gap-2">Execute Transfer <ArrowRight size={18}/></button>
                        </form>
                    )}
                </div>

                <div className="p-4 bg-black border-t border-slate-800 text-center">
                    <button onClick={onClose} className="text-xs text-slate-500 hover:text-white uppercase tracking-widest font-bold">Cancel Protocol</button>
                </div>
            </div>
        </div>
    );
}