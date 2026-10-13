/* THE DEMO PEOPLE'S FACES - cartoon drawings made here, never a photo of a real person (his 2026-10-13 "sure cartoon
   face that u make is also fine"; an anime set was tried the same day and he turned it down: "i dont like the anime
   face model just switch back to cartoon like before"). Each face is a small SVG written straight into the motorist
   record's `profileImage`, the same field the app's own photo upload fills with a base64 picture when photo storage is
   off - so nothing has to be uploaded to Cloud Storage (which the demo's free plan may not have).

   Palette law: slate + the app's gold (--gold #D08A2E), skin and hair tones; no blue, no green
   (logicFixes "palette law on the faces" reads every colour in here). */

const SKIN = { light: ['#E8B98F', '#C98F66'], tan: ['#C98B5E', '#A86F47'], brown: ['#A9714A', '#86563A'] };
const BG = ['#1E2229', '#262B33', '#2E333C'];
const GOLD = '#D08A2E';

const HAIR = {
    short: (c) => `<path d="M29 41c0-15 8-23 19-23s19 8 19 23c-3-7-9-11-19-11s-16 4-19 11z" fill="${c}"/>`,
    side: (c) => `<path d="M28 43c-2-17 9-25 21-25 11 0 19 7 19 21-7-7-15-9-25-7-7 2-11 6-15 11z" fill="${c}"/>`,
    crew: (c) => `<path d="M30 37c2-11 9-17 18-17s16 6 18 17c-5-4-11-6-18-6s-13 2-18 6z" fill="${c}"/>`,
    wavy: (c) => `<path d="M28 44c-3-16 6-26 20-26s23 10 20 26c-2-5-4-8-7-9 1 3 0 5-2 6-1-4-4-7-11-7s-10 3-11 7c-2-1-3-3-2-6-3 1-5 4-7 9z" fill="${c}"/>`,
};

/* one face: { skin, hair, cut, shirt, bg, hijab, glasses, moustache, peci } */
const face = ({ skin = 'tan', hair = '#17120E', cut = 'short', shirt = '#3A404B', bg = 0, hijab, glasses, moustache, peci }) => {
    const [s, shade] = SKIN[skin];
    const head = hijab
        ? `<path d="M20 96c0-17 11-29 28-29s28 12 28 29z" fill="${hijab}"/><path d="M48 15c-15 0-25 11-25 27 0 11 4 19 9 25h32c5-6 9-14 9-25 0-16-10-27-25-27z" fill="${hijab}"/>`
          + `<ellipse cx="48" cy="44" rx="16" ry="19" fill="${s}"/><path d="M32 33c4-6 9-9 16-9s12 3 16 9c-5-3-10-4-16-4s-11 1-16 4z" fill="${hijab}" opacity=".85"/>`
        : `<path d="M14 96c2-18 16-26 34-26s32 8 34 26z" fill="${shirt}"/><path d="M40 72l8 10 8-10" fill="none" stroke="${GOLD}" stroke-width="3" stroke-linejoin="round"/>`
          + `<rect x="42" y="58" width="12" height="14" rx="4" fill="${shade}"/><circle cx="29" cy="45" r="4" fill="${shade}"/><circle cx="67" cy="45" r="4" fill="${shade}"/>`
          + `<ellipse cx="48" cy="42" rx="19" ry="22" fill="${s}"/>${peci ? '' : HAIR[cut](hair)}`
          + (peci ? `<path d="M29 33l2-15q17-5 34 0l2 15q-19-4-38 0z" fill="#15120F"/>` : '');
    const eyeY = hijab ? 45 : 44;
    const feat = `<path d="M37 ${eyeY - 6}q4-2 7 0M52 ${eyeY - 6}q4-2 7 0" stroke="#1B1410" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
        + `<ellipse cx="40.5" cy="${eyeY}" rx="2.2" ry="2.6" fill="#1B1410"/><ellipse cx="55.5" cy="${eyeY}" rx="2.2" ry="2.6" fill="#1B1410"/>`
        + `<path d="M47 ${eyeY + 3}q1.5 4 -1 5" stroke="${shade}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
        + (moustache ? `<path d="M40 ${eyeY + 10}q8-4 16 0q-8 2-16 0z" fill="${hair}"/>` : '')
        + `<path d="M41 ${eyeY + 12}q7 6 14 0" stroke="#6E3328" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
        + `<circle cx="36" cy="${eyeY + 8}" r="3" fill="#C2554A" opacity=".18"/><circle cx="60" cy="${eyeY + 8}" r="3" fill="#C2554A" opacity=".18"/>`
        + (glasses ? `<g fill="none" stroke="#1B1410" stroke-width="1.8"><rect x="33.5" y="${eyeY - 4.5}" width="13" height="9" rx="3"/><rect x="49.5" y="${eyeY - 4.5}" width="13" height="9" rx="3"/><path d="M46.5 ${eyeY - 1}h3"/></g>` : '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="${BG[bg]}"/><circle cx="48" cy="48" r="44" fill="none" stroke="${GOLD}" stroke-opacity=".22" stroke-width="2"/>${head}${feat}</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/* keyed by the person's record id (motorists/<id>); master_owner = the owner's own profile */
export const FACES = {
    master_owner: face({ skin: 'tan', hair: '#8C8478', cut: 'side', shirt: '#1A1D22', bg: 2, glasses: true, moustache: true }),
    'demo-agent-6': face({ skin: 'light', hijab: '#7A3E3A', bg: 1 }),                       /* Rina - HQ sales manager */
    'demo-agent-7': face({ skin: 'brown', peci: true, shirt: '#2F343D', moustache: true, hair: '#17120E', bg: 0 }), /* Hendra - HQ regional admin */
    'demo-agent-1': face({ skin: 'tan', cut: 'wavy', shirt: '#454B57', bg: 1 }),             /* Agus - Bandung canvas */
    'demo-agent-2': face({ skin: 'brown', cut: 'crew', shirt: '#3A404B', bg: 2 }),           /* Dika - HQ motorist */
    'demo-agent-3': face({ skin: 'tan', cut: 'short', shirt: '#2F343D', glasses: true, bg: 0 }), /* Budi - HQ canvas */
    'demo-agent-4': face({ skin: 'light', cut: 'side', shirt: '#454B57', bg: 2 }),           /* Ari - Bandung motorist */
    'demo-agent-5': face({ skin: 'tan', hijab: '#A0703A', bg: 0 }),                          /* Dewi - Bandung regional admin */
};
