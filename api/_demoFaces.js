/* THE DEMO PEOPLE'S FACES - anime-style drawings made here, never a photo of a real person (his 2026-10-13 "sure
   cartoon face that u make is also fine", then "can u do anime style for the character"). Each face is a small SVG
   written straight into the motorist record's `profileImage`, the same field the app's own photo upload fills with a
   base64 picture when photo storage is off - so nothing is uploaded to Cloud Storage (the demo's free plan may not have it).

   Palette law: slate + the app's gold (--gold #D08A2E), skin, hair and warm eye tones; no blue, no green
   (logicFixes "palette law on the faces" reads every colour in here). */

const SKIN = { light: ['#F2C9A6', '#D9A07E'], tan: ['#D9A378', '#B97E57'], brown: ['#B57A4F', '#935C38'] };
const BG = ['#1E2229', '#262B33', '#2E333C'];
const GOLD = '#D08A2E', INK = '#140E0A';

/* front hair (bangs) - drawn over the forehead; each a closed anime shape with spikes */
const BANGS = {
    spiky: 'M27 45Q23 21 46 17Q71 15 69 43L66 35L63 41L60 30L56 39L52 28L48 37L44 27L40 38L36 29L33 40L30 33Z',
    neat: 'M28 44Q25 19 48 18Q71 19 68 44L66 35Q61 28 51 29L55 24Q44 32 35 30L33 39L30 33Z',
    messy: 'M28 43Q26 22 47 19Q69 18 68 42L65 36L62 39L60 31L55 36L53 29L48 35L45 29L41 36L38 30L34 38L31 34Z',
    swept: 'M27 46Q24 19 49 18Q70 19 69 40L67 34Q60 33 54 39L57 31Q47 36 38 43L40 33L33 42L31 35Z',
    back: 'M29 38Q28 18 48 17Q68 18 67 38Q60 25 48 26Q36 25 29 38Z',
};

const eye = (x, iris, lash) => `<ellipse cx="${x}" cy="47" rx="5" ry="6.2" fill="#FFF"/><ellipse cx="${x}" cy="48" rx="4" ry="5.3" fill="${iris}"/>`
    + `<ellipse cx="${x}" cy="48.8" rx="2" ry="2.8" fill="${INK}"/><circle cx="${x - 1.6}" cy="45.6" r="1.7" fill="#FFF"/><circle cx="${x + 1.5}" cy="50.8" r=".8" fill="#FFF" opacity=".85"/>`
    + `<path d="M${x - 5.8} 44.8Q${x} 39.4 ${x + 5.8} 44.8" stroke="${INK}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`
    + (lash ? `<path d="M${x + (x < 48 ? -5.4 : 5.4)} 44.4l${x < 48 ? -2.2 : 2.2} -1.8" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>` : '');

/* one face: { skin, hair, cut, shirt, bg, iris, hijab, glasses, moustache, peci, lash } */
const face = ({ skin = 'tan', hair = '#1A1410', cut = 'neat', shirt = '#3A404B', bg = 0, iris = '#6B3E1F', hijab, glasses, moustache, peci, lash }) => {
    const [s, shade] = SKIN[skin];
    const body = hijab
        ? `<path d="M48 13Q22 13 22 45Q22 62 31 70L20 96H76L65 70Q74 62 74 45Q74 13 48 13Z" fill="${hijab}"/>`
          + `<path d="M31 70Q48 80 65 70L60 66Q48 73 36 66Z" fill="#000" opacity=".18"/>`
        : `<path d="M12 96c3-17 17-24 36-24s33 7 36 24z" fill="${shirt}"/><path d="M41 73l7 9 7-9" fill="none" stroke="${GOLD}" stroke-width="3" stroke-linejoin="round"/>`;
    const head = `<path d="M42 60h12v13q-6 4-12 0z" fill="${s}"/><path d="M42 62h12v5q-6 3.5-12 0z" fill="${shade}"/>`
        + (hijab ? '' : `<path d="M29.5 44q-4.5-.5-3.5 5t4.5 4.5zM66.5 44q4.5-.5 3.5 5t-4.5 4.5z" fill="${s}"/>`)
        + `<path d="M29 40Q29 21 48 21T67 40Q67 49 64 55Q59 67 48 70Q37 67 32 55Q29 49 29 40Z" fill="${s}"/>`
        + `<path d="M31 37Q48 44 65 37L65 41Q48 48 31 41Z" fill="${shade}" opacity=".45"/>`;
    const top = hijab
        ? `<path d="M28 42Q29 21 48 21Q67 21 68 42Q61 29 48 29Q35 29 28 42Z" fill="${hijab}"/><path d="M30 37Q48 25 66 37" stroke="#000" stroke-opacity=".22" stroke-width="2.4" fill="none"/>`
        : peci
            ? `<path d="M28 44Q27 30 33 28L35 40Q31 40 28 44ZM68 44Q69 30 63 28L61 40Q65 40 68 44Z" fill="${hair}"/><path d="M29 32L31 15Q48 10 65 15L67 32Q48 27 29 32Z" fill="#15120F"/><path d="M33 18Q48 14 63 18" stroke="#FFF" stroke-opacity=".18" stroke-width="1.6" fill="none"/>`
            : `<path d="${BANGS[cut]}" fill="${hair}"/><path d="M38 22Q46 19 54 21" stroke="#FFF" stroke-opacity=".22" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    const brow = hijab ? hijab : hair;
    const feat = eye(40, iris, lash) + eye(56, iris, lash)
        + `<path d="M35.5 39.4q4.5-2.2 9 0M51.5 39.4q4.5-2.2 9 0" stroke="${brow === hair ? hair : INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`
        + `<path d="M48.8 53.6l-1.1 1.7" stroke="${shade}" stroke-width="1.3" stroke-linecap="round"/>`
        + `<ellipse cx="35.5" cy="54" rx="3.4" ry="1.7" fill="#E07A6A" opacity=".35"/><ellipse cx="60.5" cy="54" rx="3.4" ry="1.7" fill="#E07A6A" opacity=".35"/>`
        + (moustache ? `<path d="M43 57.4q2.5-1.7 5 0q2.5-1.7 5 0q-2.5 1.3-5 .5q-2.5.8-5-.5z" fill="${hair}"/>` : '')
        + `<path d="M44.2 59.4Q48 63.6 51.8 59.4Z" fill="#7A3328"/>`
        + (glasses ? `<g fill="none" stroke="#2A211B" stroke-width="1.3"><rect x="33.4" y="41" width="13.2" height="13" rx="4"/><rect x="49.4" y="41" width="13.2" height="13" rx="4"/><path d="M46.6 46.5h2.8"/></g>` : '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="${BG[bg]}"/>`
        + `<circle cx="48" cy="48" r="44" fill="none" stroke="${GOLD}" stroke-opacity=".22" stroke-width="2"/>${body}${head}${top}${feat}</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/* keyed by the person's record id (motorists/<id>); master_owner = the owner's own profile */
export const FACES = {
    master_owner: face({ skin: 'tan', hair: '#8F877C', cut: 'back', shirt: '#1A1D22', bg: 2, glasses: true, moustache: true, iris: '#4A2C17' }),
    'demo-agent-6': face({ skin: 'light', hijab: '#7A3E3A', bg: 1, iris: '#8A5527', lash: true }),          /* Rina - HQ sales manager */
    'demo-agent-7': face({ skin: 'brown', peci: true, hair: '#1A1410', shirt: '#2F343D', moustache: true, bg: 0, iris: '#4A2C17' }), /* Hendra - HQ regional admin */
    'demo-agent-1': face({ skin: 'tan', cut: 'spiky', shirt: '#454B57', bg: 1, iris: '#A0662E' }),             /* Agus - Bandung canvas */
    'demo-agent-2': face({ skin: 'brown', cut: 'messy', shirt: '#3A404B', bg: 2, iris: '#6B3E1F' }),           /* Dika - HQ motorist */
    'demo-agent-3': face({ skin: 'tan', cut: 'neat', hair: '#2B1D14', shirt: '#2F343D', glasses: true, bg: 0, iris: '#5A3319' }), /* Budi - HQ canvas */
    'demo-agent-4': face({ skin: 'light', cut: 'swept', shirt: '#454B57', bg: 2, iris: '#8A5527' }),           /* Ari - Bandung motorist */
    'demo-agent-5': face({ skin: 'tan', hijab: '#A0703A', bg: 0, iris: '#6B3E1F', lash: true }),               /* Dewi - Bandung regional admin */
};
