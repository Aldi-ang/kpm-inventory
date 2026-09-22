/* THE FINGERPRINT OF A SECRET — the master password and the recovery word (settings/admin: `pin`,
   `recoveryHash`). 2026-09-22, Aldi's "yes for A make sure that security for this app is top tier".

   Why a plain SHA-256 was not enough: every employee account can read settings/admin (the gate
   compares on the phone, so the rules must allow the read), and a plain hash of a LOWERCASED
   password can be guessed offline at millions a second. PBKDF2-SHA256 with a random 16-byte salt
   and 600.000 rounds (OWASP's figure for SHA-256) makes each guess cost what one sign-in costs:
   a fraction of a second for him, years for a guess list. The salt means a ready-made list of
   common passwords is useless — every fingerprint has to be attacked from scratch.

   Stored form: { algo: 'PBKDF2-SHA256', iterations, salt (hex), hash (hex) }. The OLD form is a
   64-char hex string, SHA-256 of the lowercased, trimmed secret. verifySecret still accepts it, so
   nobody is locked out by the update, and needsRehash tells the caller to save the new form on
   that sign-in. The password keeps its case from now on (the strength meter demands a capital
   letter; the old hash threw it away). The recovery word is lowercased BY THE CALLER, as before.

   `crypto.subtle` exists only in a secure context (HTTPS or localhost). The phone over plain http
   has none: the throw below is the one App.jsx's gate reads to say so. No hand-rolled crypto. */
const ITERATIONS = 600000;
const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (s) => new Uint8Array(s.match(/../g).map((h) => parseInt(h, 16)));
const subtle = () => {
    if (!globalThis.crypto?.subtle) throw new Error('SECURE_CONTEXT_REQUIRED');
    return globalThis.crypto.subtle;
};
const derive = async (secret, salt, iterations) => {
    const key = await subtle().importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits']);
    return hex(await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
};

export const hashSecret = async (secret) => {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return { algo: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: hex(salt), hash: await derive(secret, salt, ITERATIONS) };
};

export const verifySecret = async (secret, stored) => {
    if (typeof secret !== 'string' || !secret) return false;
    if (typeof stored === 'string') {
        // the old form: SHA-256 of the lowercased, trimmed secret
        if (!/^[0-9a-f]{64}$/.test(stored)) return false;
        return hex(await subtle().digest('SHA-256', new TextEncoder().encode(secret.toLowerCase().trim()))) === stored;
    }
    if (!stored || stored.algo !== 'PBKDF2-SHA256' || !/^([0-9a-f]{2})+$/.test(stored.salt || '') || !(stored.iterations > 0)) return false;
    return (await derive(secret, unhex(stored.salt), stored.iterations)) === stored.hash;
};

/* true for the old string form, and for a fingerprint made with fewer rounds than today's */
export const needsRehash = (stored) =>
    typeof stored === 'string' || (!!stored && typeof stored === 'object' && stored.iterations < ITERATIONS);
