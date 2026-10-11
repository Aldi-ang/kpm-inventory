import { promptAction, confirmAction } from './ConfirmGate.jsx';
import { notify } from './Toast.jsx';
import { waNumber, waUrl } from '../utils/whatsapp.js';

/* The receipt's Share button (his "WhatsApp = A", 2026-10-12 - why: utils/whatsapp.js). The shop's number known ->
   straight into that chat. Not known -> the app's own box asks for it first (empty = pick a chat like before, Cancel =
   nothing); and when the caller can save (`savePhone`), it offers to keep the typed number on the shop, so the next
   receipt goes straight there. Every outcome reports. */
export async function shareReceipt(text, shop, savePhone) {
    const known = waNumber(shop?.phone);
    if (known) { window.open(waUrl(known, text), '_blank'); return; }
    const name = shop?.name || 'this shop';
    const typed = await promptAction(`WhatsApp number for ${name}? (for example 0812 3456 7890)\nLeave it empty to pick a chat yourself.`, '', 'Open WhatsApp');
    if (typed === null) return;
    const num = waNumber(typed);
    if (typed.trim() && !num) { notify(`"${typed.trim()}" is not a phone number - the receipt was not sent.`); return; }
    window.open(waUrl(num, text), '_blank');
    if (!num || !savePhone || !shop?.id) return;
    if (!(await confirmAction(`Save ${typed.trim()} as the WhatsApp number of ${name}? The next receipt then goes straight to it.`))) return;
    try { await savePhone(typed.trim()); notify(`Saved - ${name}'s number is ${typed.trim()}.`); }
    catch (e) { notify(`Could not save the number on ${name}: ${e?.code === 'permission-denied' ? 'your account cannot edit this shop' : e?.message || e}`); }
}
