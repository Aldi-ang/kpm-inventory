/* LAB ONLY - the REAL Command Center (DashboardView) fed with exactly what the demo reset writes
   (api/_demoCompany.js buildDemoCompany over demo/seed.json), so the demo's omset can be LOOKED at without
   signing in to the live demo. Nothing here ships.
     /tools/demo-omset-lab.html[?at=2026-10-31]
   at = the reset's day (WIB morning); default today. Built 2026-10-31 for his "add the total sales into milyar omset". */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import DashboardView from '../src/components/DashboardView.jsx';
import { buildDemoCompany } from '../api/_demoCompany.js';
import seed from '../demo/seed.json';

const q = new URLSearchParams(window.location.search);
const now = q.get('at') ? new Date(`${q.get('at')}T05:00:00Z`) : new Date();
const company = buildDemoCompany(seed, now, { pin: 'lab', recoveryHash: 'lab' });
const of = (kind) => company.docs.filter((d) => d.path.split('/').slice(-2, -1)[0] === kind).map((d) => ({ id: d.path.split('/').pop(), ...d.data }));

createRoot(document.getElementById('root')).render(
  <div className="min-h-screen bg-[var(--sunk)] p-2">
    <DashboardView isAdmin transactions={of('transactions')} inventory={of('products')} customers={of('customers')}
      motorists={of('motorists')} appSettings={company.docs.find((d) => d.path.endsWith('/settings/general'))?.data || {}} setActiveTab={() => {}} handleSaveDashboardTargets={() => {}} />
  </div>
);
