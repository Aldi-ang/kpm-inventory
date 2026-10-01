/* LAB ONLY — the two-part bell, drawn for his pick (2026-10-02, the notification redesign).
   tools/ponder-lab.config.mjs aliases BiohazardTheme's `./NotificationBell` to this file, so the
   proposals sit in the REAL header at the real bell's spot. With no `?bell=a|b` it renders the
   real bell untouched — every other lab mount is unchanged.
     ?shell&bell          today's bell, fed LAB_BELL_NEEDS
     ?shell&bell=a        A: one box, a two-part switch (Needs you | Missed)   &side=missed
     ?shell&bell=b        B: both lists at once — stacked on the phone, side by side on the PC
   Nothing here is app code. The build after his pick moves the chosen one into NotificationBell. */
import React from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import RealBell from '../src/components/NotificationBell.jsx';

const q = new URLSearchParams(window.location.search);
const at = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return { seconds: Math.floor(d / 1000) }; };
const hhmm = (ts) => new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* "Needs you" = what the bell already holds today (App.jsx combinedNotifications): Firestore
   notifications for this person + the virtual logistics ones. Titles and wording from App.jsx. */
export const LAB_BELL_NEEDS = [
  { id: 'n1', title: '🤝 Hand-off Request', message: 'Budi Santoso wants to transfer Toko Berkah Jaya to you.', timestamp: at(14, 2), read: false },
  { id: 'logistics_r1', title: '📦 REQ: BANDUNG', message: 'sari requested 400 Bks.', timestamp: at(13, 40), read: false },
  { id: 'n2', title: '🛡️ Transfer Needs Approval', message: 'Sari accepted the hand-off for Toko Sinar Jaya. Awaiting your authorization.', timestamp: at(11, 15), read: false },
  { id: 'n3', title: '💰 EOD Submitted', message: 'Budi Santoso submitted an EOD report. Pending your verification.', timestamp: at(9, 30), read: true },
  { id: 'n4', title: '📉 Low Stock Warning', message: 'Still low after EOD return: Djarum Coklat 12.', timestamp: at(8, 5), read: true },
];
/* "Missed" = every top strip and capybara line, as said. A repeat is one row with a count. */
const LAB_MISSED = [
  { id: 'm1', text: '⚠️ BOSS! Sampoerna Mild 16 is critically low (3 Bks left). Restock needed!', ts: at(14, 5), count: 4, bad: true, fresh: true },
  { id: 'm2', text: 'Failed to save record: the connection dropped.', ts: at(13, 58), bad: true, fresh: true },
  { id: 'm3', text: '✅ Sync Complete! 12 items secured in Master Vault.', ts: at(13, 31), fresh: true },
  { id: 'm4', text: 'Transfer request for Toko Berkah Jaya sent to Budi Santoso!', ts: at(13, 12), fresh: true },
  { id: 'm5', text: 'EOD Report submitted! Admin has been notified.', ts: at(12, 40) },
  { id: 'm6', text: '📡 SIGNAL ACQUIRED! Pushing 12 offline records to HQ...', ts: at(12, 39) },
];
const isUnread = (n) => !n.read && n.isRead !== true;

/* the bell's plate lights for "Needs you" only; "Missed" is a quieter gold-rim count under it */
function TwoCountBell({ needs, missed, btnRef, onClick }) {
  return (
    <button ref={btnRef} onClick={onClick} aria-label={`Inbox: ${needs} need you, ${missed} missed`}
      className={`kpm-chip kpm-bell relative ${needs > 0 ? 'on' : ''}`}>
      <Bell size={22} />
      {needs > 0 && (
        <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-[0_0_10px_red]">{needs}</span>
      )}
      {missed > 0 && (
        <span className="absolute bottom-0 right-0 min-w-4 h-4 px-1 rounded-full border border-[var(--duke-amber-edge)] bg-[var(--duke-fill-deep)] text-[var(--duke-amber-ink)] text-[10px] font-black leading-none flex items-center justify-center">{missed}</span>
      )}
    </button>
  );
}

const Count = ({ n, tone }) => n > 0 && (
  <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-black leading-none flex items-center justify-center ${tone === 'red'
    ? 'bg-red-600 text-white' : 'border border-[var(--duke-amber-edge)] text-[var(--duke-amber-ink)] bg-[var(--duke-fill-deep)]'}`}>{n}</span>
);

/* today's row, kept — only the message goes 10 -> 12 px (his "bigger small type", 2026-08-16) */
function NeedsRow({ n }) {
  const unread = isUnread(n);
  return (
    <div className={`p-3 rounded-lg border ${unread ? 'bg-[#1a1510] border-[var(--duke-edge-5)]' : 'bg-black/30 border-[var(--duke-edge-1)] opacity-50'}`}>
      <div className="flex justify-between items-start gap-2 mb-1">
        <h4 className={`text-[11px] font-black uppercase tracking-wider ${unread ? 'text-[var(--duke-amber-ink)]' : 'text-slate-400'}`}>{n.title}</h4>
        <span className="text-[11px] text-slate-400 shrink-0">{hhmm(n.timestamp)}</span>
      </div>
      <p className="text-[12px] text-slate-300 leading-relaxed font-sans">{n.message}</p>
    </div>
  );
}

/* a Missed row reads as the strip it came from: the strip's ink, its edge colour (red for a
   failure), and a ×N when the same line came back */
function MissedRow({ m }) {
  return (
    <div className={`flex items-start gap-3 border-l-[3px] px-3 py-2.5 ${m.fresh ? 'bg-[#14100e]' : 'opacity-55'}`}
      style={{ borderLeftColor: m.bad ? '#b4524a' : m.fresh ? '#ff9d00' : 'transparent' }}>
      <p className="min-w-0 flex-1 whitespace-pre-line break-words text-[12px] leading-snug text-[#cfc6ba]">{m.text}</p>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-[11px] text-[var(--duke-ink-3)] tabular-nums">{hhmm(m.ts)}</span>
        {m.count > 1 && <span className="px-1.5 rounded border border-[var(--duke-edge-2)] text-[10px] font-black text-[var(--duke-ink-2)]">×{m.count}</span>}
      </div>
    </div>
  );
}

function MissedList() {
  const fresh = LAB_MISSED.filter((m) => m.fresh), old = LAB_MISSED.filter((m) => !m.fresh);
  return (
    <>
      <div className="flex items-center justify-between pl-3 pr-1 border-b border-[var(--duke-edge-1)]">
        <span className="text-[10px] uppercase tracking-widest text-[var(--duke-ink-3)]">Kept 7 days</span>
        <button className="h-11 px-3 text-[11px] font-black uppercase tracking-widest text-[var(--duke-ink-2)]">Clear all</button>
      </div>
      <div className="divide-y divide-[var(--duke-edge-1)]">{fresh.map((m) => <MissedRow key={m.id} m={m} />)}</div>
      <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest text-[var(--duke-ink-3)]">Earlier</div>
      <div className="divide-y divide-[var(--duke-edge-1)]">{old.map((m) => <MissedRow key={m.id} m={m} />)}</div>
    </>
  );
}

const Title = ({ children, n, tone, right }) => (
  <div className="flex items-center gap-2 min-h-11 pl-3 pr-1 bg-black/60 border-b border-[var(--duke-edge-1)]">
    <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--duke-ink-1)]">{children}</h3>
    <Count n={n} tone={tone} />
    <span className="ml-auto">{right}</span>
  </div>
);

function BellProposal({ layout }) {
  const btnRef = React.useRef(null);
  const [open, setOpen] = React.useState(q.has('open'));
  const [side, setSide] = React.useState(q.get('side') === 'missed' ? 'missed' : 'needs');
  const [pos, setPos] = React.useState(null);
  const needs = LAB_BELL_NEEDS.filter(isUnread).length;
  const missed = LAB_MISSED.filter((m) => m.fresh).length;
  React.useLayoutEffect(() => {
    if (!open) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 12, right: Math.max(8, window.innerWidth - r.right) });
  }, [open]);
  const phone = window.innerWidth < 1024;
  const width = layout === 'b' && !phone ? 680 : 380;
  const panel = open && pos && createPortal((
    <div data-lab-panel style={{ position: 'fixed', top: pos.top, right: phone ? 8 : pos.right, left: phone ? 8 : 'auto', width: phone ? 'auto' : width, maxHeight: 'min(72vh, 600px)' }}
      className="z-[9999] flex flex-col overflow-hidden rounded-xl border border-[var(--duke-edge-2)] bg-[#0f0e0d] shadow-[0_10px_40px_rgba(0,0,0,0.8)] font-mono">
      {layout === 'a' ? (
        <>
          <div className="p-2 bg-black/60 border-b border-[var(--duke-edge-1)]">
            <div role="tablist" className="relative grid grid-cols-2 h-12 rounded-lg border border-[var(--duke-edge-1)] bg-black/50">
              <span aria-hidden="true" className="absolute top-1 bottom-1 left-1 rounded-md border border-[var(--duke-amber-edge)] bg-[var(--duke-fill-panel)] shadow-[inset_0_1px_0_rgba(255,228,175,.15),0_0_12px_rgba(255,157,0,.18)] transition-transform duration-200"
                style={{ width: 'calc(50% - 4px)', transform: side === 'missed' ? 'translateX(100%)' : 'none' }} />
              {[['needs', 'Needs you', needs, 'red'], ['missed', 'Missed', missed, 'gold']].map(([k, label, n, tone]) => (
                <button key={k} role="tab" aria-selected={side === k} onClick={() => setSide(k)}
                  className={`relative z-10 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest ${side === k ? 'text-[var(--duke-amber-ink)]' : 'text-[var(--duke-ink-3)]'}`}>
                  {label}<Count n={n} tone={tone} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {side === 'needs'
              ? <div className="p-2 space-y-2">{LAB_BELL_NEEDS.map((n) => <NeedsRow key={n.id} n={n} />)}</div>
              : <MissedList />}
          </div>
        </>
      ) : (
        <div className={`flex-1 min-h-0 flex ${phone ? 'flex-col overflow-y-auto' : 'flex-row'} custom-scrollbar`}>
          <section className={`${phone ? '' : 'w-1/2 overflow-y-auto border-r border-[var(--duke-edge-1)]'} custom-scrollbar`}>
            <Title n={needs} tone="red">Needs you</Title>
            <div className="p-2 space-y-2">{LAB_BELL_NEEDS.map((n) => <NeedsRow key={n.id} n={n} />)}</div>
          </section>
          <section data-lab-missed className={`${phone ? '' : 'w-1/2 overflow-y-auto'} custom-scrollbar`}>
            <Title n={missed} tone="gold">Missed</Title>
            <MissedList />
          </section>
        </div>
      )}
    </div>
  ), document.body);
  return (
    <div className="relative">
      <TwoCountBell needs={needs} missed={missed} btnRef={btnRef} onClick={() => setOpen((o) => !o)} />
      {panel}
    </div>
  );
}

export default function LabBell(props) {
  const v = q.get('bell');
  return v === 'a' || v === 'b' ? <BellProposal layout={v} /> : <RealBell {...props} />;
}
