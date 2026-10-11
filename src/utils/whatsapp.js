/* THE RECEIPT TO THE SHOP'S OWN WHATSAPP - his "is it possible to straight forward digital receipt straight to people
   phone through whatsapp number even when not registered inside the sales whatsapp?" (2026-10-12), then "WhatsApp = A".
   The Share buttons opened `wa.me/?text=` with NO number, so WhatsApp asked for a chat and only saved contacts were in
   that list. `wa.me/<number>?text=` opens a chat with ANY number, saved or not; the salesman still taps Send (WhatsApp
   never lets an app send from a personal number by itself). The button itself: components/shareReceipt.js.
   Vault: Brainstorm/2026-10-12_whatsapp-receipt.md */

/* any Indonesian shape -> 62..., the form wa.me needs: 0812-3456-7890, +62 812 3456 7890, 812 3456 7890. Too short or
   not a number -> '' (the link then opens the chat picker, as before) */
export const waNumber = (raw) => {
    const d = String(raw ?? '').replace(/\D/g, '').replace(/^0/, '62').replace(/^8/, '628');
    return /^62\d{8,12}$/.test(d) ? d : '';
};
export const waUrl = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
