import React from 'react';
import { Lock, AlertCircle } from 'lucide-react';

const LoginScreen = ({ onLogin, error }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
      <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={40} className="text-orange-500" /></div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">KPM Inventory</h1>
      <p className="text-slate-500 mb-8">Secure Inventory Management System</p>
      
      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 text-left">
          <p className="font-bold flex items-center gap-2"><AlertCircle size={16}/> Login Error</p>
          <p className="mt-1">{error}</p>
          {error.includes("Domain") && <p className="mt-2 text-xs text-slate-500">Please add this domain to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains.</p>}
        </div>
      )}

      <button onClick={onLogin} className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" /> Sign in with Google
      </button>
    </div>
  </div>
);

export default LoginScreen;