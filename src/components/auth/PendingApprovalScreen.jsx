import React from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';

const PendingApprovalScreen = ({ email, onLogout }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-yellow-500">
      <ShieldCheck size={48} className="text-yellow-600 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-slate-800 mb-2">Account Pending</h2>
      <p className="text-slate-600 mb-6">Account <span className="font-mono bg-slate-100 px-1">{email}</span> is awaiting admin approval.</p>
      <button onClick={onLogout} className="text-slate-400 hover:text-red-500 font-medium text-sm flex items-center justify-center gap-2"><LogOut size={16}/> Sign Out</button>
    </div>
  </div>
);

export default PendingApprovalScreen;