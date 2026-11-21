/* LAB ONLY (Task 108): mounts the real CompetitorsView with fixture data. ?as=T4|T6 ?light ?tab=compare|reports|manage ?open=approve|report|addRival */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import CompetitorsView from '../src/components/CompetitorsView.jsx';
import { ToastHost } from '../src/components/Toast.jsx';

const q = new URLSearchParams(window.location.search);
if (q.has('light')) document.documentElement.classList.add('light');
if (q.has('lite')) document.documentElement.classList.add('lite-mode');
const role = { T2: 'COMPANY_OWNER', T3: 'AREA_ADMIN', T4: 'FLEET_CAPTAIN', T6: 'ROOKIE' }[q.get('as') || 'T2'];
const ts = (d) => ({ seconds: Date.parse(d) / 1000 });
const cats = [
    { id: 'skm', name: 'SKM', subs: [{ id: 'skm-12', name: 'SKM 12' }, { id: 'skm-16', name: 'SKM 16' }, { id: 'skm-flav', name: 'SKM Flavour' }] },
    { id: 'mild', name: 'Mild', subs: [{ id: 'mild-16', name: 'Mild 16' }, { id: 'mild-menthol', name: 'Mild Menthol' }] },
    { id: 'putih', name: 'Rokok Putih', subs: [{ id: 'putih-12', name: 'Putih 12' }] },
];
const inv = [
    { id: 'cof', name: 'Cello Coffee & Caramel', categoryId: 'skm', subCategoryId: 'skm-flav', priceRetail: 8500, priceGrosir: 8000, priceEcer: 9500 },
    { id: 'choc', name: 'Cello Chocolate', categoryId: 'skm', subCategoryId: 'skm-flav', priceRetail: 10000, priceGrosir: 9500, priceEcer: 11000 },
    { id: 'mm', name: 'Cello Mmrapi', categoryId: 'mild', subCategoryId: 'mild-16', priceRetail: 8500, priceGrosir: 8000, priceEcer: 9500 },
];
const rivals = [
    { id: 'r1', name: 'Rival Kretek 12 (example)', categoryId: 'skm', subCategoryId: 'skm-12', pairedProductId: 'cof' },
    { id: 'r2', name: 'Rival Mild 16 (example)', categoryId: 'mild', subCategoryId: 'mild-16', pairedProductId: 'mm' },
    { id: 'r3', name: 'Rival Filter 12 (example)', categoryId: 'putih', subCategoryId: 'putih-12', pairedProductId: null },
];
const e = (reg, R, G, E, by, d) => ({ id: reg, region: reg, Retail: R, Grosir: G, Ecer: E, updatedBy: by, updatedAt: ts(d) });
const allPrices = {
    r1: { BANDUNG: e('BANDUNG', 11000, 10400, 12000, 'Hendra', '2026-11-16'), MUNTILAN: e('MUNTILAN', 10500, 10000, 11500, 'Hartono', '2026-11-15') },
    r2: { BANDUNG: e('BANDUNG', 18500, 17800, 20000, 'Hendra', '2026-11-17'), MUNTILAN: e('MUNTILAN', 18500, 17800, 20000, 'Hartono', '2026-11-16') },
    r3: { BANDUNG: e('BANDUNG', 14000, 0, 15000, 'Hendra', '2026-11-14') },
};
const own = q.get('as') === 'T4' || q.get('as') === 'T6';
const prices = own ? Object.fromEntries(Object.entries(allPrices).map(([k, v]) => [k, v.BANDUNG ? { BANDUNG: v.BANDUNG } : {}])) : allPrices;
const reports = [
    { id: 'rep1', rivalId: 'r1', newRivalName: '', region: 'BANDUNG', shopName: 'AMANAH BARU', customerType: 'Retail', price: 10500, shelf: 'Eye level', promo: 'Discount', speed: 'Fast', photo: true, note: 'Supplier dropped wholesale bonus', status: 'pending', reportedByUid: 'u5', reportedByName: 'Budi Santoso', createdAt: ts('2026-11-18') },
    { id: 'rep2', rivalId: null, newRivalName: 'rival-kretek.12', region: 'BANDUNG', shopName: 'ANEKA BARU', customerType: 'Retail', price: 11200, shelf: 'Counter / till', promo: 'Poster', speed: 'Medium', photo: false, note: '', status: 'pending', reportedByUid: 'u6', reportedByName: 'Agus', createdAt: ts('2026-11-18') },
    ...(own ? [] : [{ id: 'rep3', rivalId: 'r2', newRivalName: '', region: 'MUNTILAN', shopName: 'ASYIFA MART', customerType: 'Grosir', price: 17000, shelf: 'Top shelf', promo: 'None', speed: 'Fast', photo: false, note: '', status: 'pending', reportedByUid: 'u7', reportedByName: 'Dika', createdAt: ts('2026-11-18') }]),
];

function Lab() {
    React.useEffect(() => {
        const t = q.get('tab'); const o = q.get('open');
        setTimeout(() => {
            if (t) [...document.querySelectorAll('.kpm-comp-tabs .tab')].find((b) => b.textContent.toLowerCase().startsWith(t))?.click();
            setTimeout(() => {
                if (o === 'approve') [...document.querySelectorAll('.kpm-comp-btn')].find((b) => b.textContent === 'Approve')?.click();
                if (o === 'report') [...document.querySelectorAll('.kpm-comp-btn')].find((b) => /^Report/.test(b.textContent))?.click();
                if (o === 'addRival') [...document.querySelectorAll('.kpm-comp-btn')].find((b) => /^Add/.test(b.textContent))?.click();
                if (o === 'price') document.querySelector('.kpm-comp-pt .kpm-comp-btn')?.click();
            }, 80);
        }, 80);
    }, []);
    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: 8, background: 'var(--page, #0b0a09)' }}>
            <CompetitorsView db={{}} appId="lab" userId="boss" user={{ uid: 'u2', name: 'Aldi' }} userRole={role} logAudit={() => {}}
                competitors={rivals} rivalPrices={prices} reports={reports} inventory={inv} productCategories={cats}
                regions={['Bandung', 'Muntilan']} myRegion={own ? 'Bandung' : ''} onSaveCategory={async () => 'x'} />
            <ToastHost />
        </div>
    );
}
createRoot(document.getElementById('root')).render(<Lab />);
