/* LAB ONLY — fixtures for the two-part bell (2026-10-02). `?shell&bell` feeds the real header bell:
   LAB_BELL_NEEDS goes in as `notifications` (ShellLab), and seedLabBell() hands the Missed list to the
   real store through the same bindMissed() App.jsx uses - a listener that answers once, a save that
   writes nothing. window.__notify lets a walk raise a real strip and watch it fade into the list.
   Times are relative to now, so "new since he last looked" holds whenever the lab runs. */
import { bindMissed } from '../src/utils/missedLog.js';
import { notify } from '../src/components/Toast.jsx';

const ago = (min) => Date.now() - min * 60000;
const sec = (min) => ({ seconds: Math.floor(ago(min) / 1000) });

/* "Needs you" = what the bell already held (App.jsx combinedNotifications). Wording from App.jsx. */
export const LAB_BELL_NEEDS = [
  { id: 'n1', title: '🤝 Hand-off Request', message: 'Budi Santoso wants to transfer Toko Berkah Jaya to you.', timestamp: sec(4), read: false },
  { id: 'logistics_r1', title: '📦 REQ: BANDUNG', message: 'sari requested 400 Bks.', timestamp: sec(26), read: false },
  { id: 'n2', title: '🛡️ Transfer Needs Approval', message: 'Sari accepted the hand-off for Toko Sinar Jaya. Awaiting your authorization.', timestamp: sec(170), read: false },
  { id: 'n3', title: '💰 EOD Submitted', message: 'Budi Santoso submitted an EOD report. Pending your verification.', timestamp: sec(275), read: true },
  { id: 'n4', title: '📉 Low Stock Warning', message: 'Still low after EOD return: Djarum Coklat 12.', timestamp: sec(400), read: true },
];

const LAB_MISSED = [
  { text: '⚠️ BOSS! Sampoerna Mild 16 is critically low (3 Bks left). Restock needed!', ts: ago(2), count: 4, bad: true },
  { text: 'Failed to save record: the connection dropped.', ts: ago(9), count: 1, bad: true },
  { text: '✅ Sync Complete! 12 items secured in Master Vault.', ts: ago(21), count: 1, bad: false },
  { text: 'Transfer request for Toko Berkah Jaya sent to Budi Santoso!', ts: ago(33), count: 1, bad: false },
  { text: 'EOD Report submitted! Admin has been notified.', ts: ago(85), count: 1, bad: false },
  { text: '📡 SIGNAL ACQUIRED! Pushing 12 offline records to HQ...', ts: ago(86), count: 1, bad: false },
];

export function seedLabBell() {
  bindMissed({ listen: (cb) => { cb({ items: LAB_MISSED, seenAt: ago(40) }); return () => {}; }, save: () => {} });
  window.__notify = notify;
}
