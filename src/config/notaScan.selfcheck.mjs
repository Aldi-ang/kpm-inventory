/* The nota scan (helpers.scanPixels) on a SYNTHETIC nota: grey paper with a shadow running
   left to right, a lamp's hot spot, and two lines of ink. What CamScanner's "magic colour" has
   to do: paper → white everywhere, shadow and hot spot included; ink → dark; and the shadow
   edge must not be mistaken for ink. Aldi, 2026-09-15: "scan the nota and make it clear instead
   of just normal photo". Run: node src/config/notaScan.selfcheck.mjs */
import { scanPixels, deskewAngle, findPaper, warpQuad, homography } from '../utils/helpers.js';

let pass = 0, fail = 0;
const ok = (name, cond, why = '') => { cond ? pass++ : fail++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${cond || !why ? '' : ' — ' + why}`); };

const W = 160, H = 80;
const data = new Uint8ClampedArray(W * H * 4);
const isInk = (x, y) => x >= 10 && x < 140 && ((y >= 20 && y < 24) || (y >= 50 && y < 54));
const isHot = (x, y) => (x - 130) ** 2 + (y - 12) ** 2 < 8 ** 2;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const paper = 120 + Math.round((x / (W - 1)) * 90);          // shadow: 120 on the left, 210 on the right
    let v = isHot(x, y) ? 245 : paper;
    if (isInk(x, y)) v = paper - 70;                               // pen: 70 below the paper around it
    const i = (y * W + x) * 4;
    data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
}
scanPixels(data, W, H);

let paperWhite = 0, paperTotal = 0, inkSum = 0, inkN = 0, hotWhite = 0, hotN = 0, worstPaper = 255;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = data[(y * W + x) * 4];
    if (isInk(x, y)) { inkSum += v; inkN++; }
    else if (isHot(x, y)) { hotN++; if (v === 255) hotWhite++; }
    else { paperTotal++; if (v === 255) paperWhite++; worstPaper = Math.min(worstPaper, v); }
}
console.log('\nNOTA SCAN — paper white, ink dark, shadow ignored');
ok('every paper pixel is white, shadow and all', paperWhite === paperTotal, `${paperWhite}/${paperTotal}, darkest paper ${worstPaper}`);
ok('the lamp hot spot is plain white, not a grey blob', hotWhite === hotN, `${hotWhite}/${hotN}`);
ok('the ink is dark (mean under 60 of 255)', inkN > 0 && inkSum / inkN < 60, `mean ${(inkSum / inkN).toFixed(1)}`);
ok('the output is grey — every channel equal, alpha solid', (() => { for (let i = 0; i < data.length; i += 4) if (data[i] !== data[i + 1] || data[i] !== data[i + 2] || data[i + 3] !== 255) return false; return true; })());
{ /* a page with no ink at all must come out blank white, not speckled */
    const blank = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < blank.length; i += 4) { const v = 100 + ((i / 4) % W); blank[i] = blank[i + 1] = blank[i + 2] = v; blank[i + 3] = 255; }
    scanPixels(blank, W, H);
    let white = 0; for (let i = 0; i < blank.length; i += 4) if (blank[i] === 255) white++;
    ok('a blank shaded page scans to a blank white page', white === W * H, `${white}/${W * H}`); }

/* THE TILT FINDER on a scanned page: eight lines of "text" (rows of ink 3 px tall, 30 px apart)
   rotated by a known angle, canvas-style (x' = x·cos − y·sin, y' = x·sin + y·cos). deskewAngle
   must hand back that angle, so scanNotaToBase64 can rotate by its negative and level the page.
   Aldi, 2026-09-15: "make the photo upright so that its easier to read". */
console.log('\nNOTA SCAN — the tilt is found and has the right sign');
const page = (deg) => {
    const PW = 480, PH = 360, d = new Uint8ClampedArray(PW * PH * 4).fill(255);
    const rad = deg * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
    for (let line = 0; line < 8; line++) for (let y0 = 0; y0 < 3; y0++) for (let x0 = 0; x0 < 300; x0++) {
        const x = x0 - 150, y = (line * 30 - 105) + y0;           // centred, then rotated
        const px = Math.round(x * c - y * s + PW / 2), py = Math.round(x * s + y * c + PH / 2);
        if (px < 0 || py < 0 || px >= PW || py >= PH) continue;
        const i = (py * PW + px) * 4; d[i] = d[i + 1] = d[i + 2] = 0;
    }
    return { d, PW, PH };
};
for (const deg of [0, 4, -7, 11.5]) {
    const { d, PW, PH } = page(deg);
    const found = deskewAngle(d, PW, PH);
    ok(`a page tilted ${deg}° is read as ${deg}° (found ${found}°)`, Math.abs(found - deg) <= 0.5);
}
{ const { d, PW, PH } = page(0);
  for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255;   // wipe the ink
  ok('a page with no ink is left alone (0°)', deskewAngle(d, PW, PH) === 0); }

/* THE PAPER IS FOUND AND SQUARED. Aldi, 2026-09-15, with a phone screenshot of the first real scan
   (~40° crooked, in perspective): "make the scanner automatically align and make sure the receipt
   to be square and 2D like in plain paper". A tilt finder that looks ±15° cannot do that — a
   photo taken at an angle is not a rotation. findPaper hands back the four corners of the bright
   sheet on the dark table; warpQuad pulls that quad flat into a rectangle; only THEN does the
   text sit level enough for deskewAngle. Checked on synthetic photos with the corners known. */
console.log('\nNOTA SCAN — the paper is found by its corners');
const FW = 320, FH = 240;
const inside = (q, x, y) => {                                   // convex quad, corners in order
    for (let i = 0; i < 4; i++) { const [ax, ay] = q[i], [bx, by] = q[(i + 1) % 4]; if ((bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0) return false; }
    return true;
};
const photo = (quad, paper = 220, ground = 40) => {              // the bright sheet on a dark table, a little noise on both
    const d = new Uint8ClampedArray(FW * FH * 4);
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
        const v = (quad && inside(quad, x + 0.5, y + 0.5) ? paper : ground) + ((x * 7 + y * 13) % 11) - 5;
        const i = (y * FW + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    return d;
};
const Q = [[60, 30], [270, 50], [250, 210], [40, 190]];
const near = (a, b, tol = 3) => a && b && a.every((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1]) <= tol);
{ const got = findPaper(photo(Q), FW, FH);
  ok(`the four corners come back within 3 px, in order tl tr br bl (${got ? got.map((p) => p.map(Math.round).join(',')).join(' ') : 'null'})`, near(got, Q)); }
{ /* a few lines of ink on the paper are holes in the bright blob, never new corners */
  const d = photo(Q);
  for (let y = 80; y < 180; y += 25) for (let x = 90; x < 220; x++) { const i = (y * FW + x) * 4; d[i] = d[i + 1] = d[i + 2] = 30; }
  ok('ink on the paper does not move the corners', near(findPaper(d, FW, FH), Q)); }
ok('a frame with no bright sheet returns null (dark table, nothing on it)', findPaper(photo(null), FW, FH) === null);
ok('a sheet under 15% of the frame returns null (too small to be the nota)', findPaper(photo([[140, 100], [180, 100], [180, 140], [140, 140]]), FW, FH) === null,
   'a bright sticker on the table must not become the page');
ok('a sheet that fills the frame returns null (nothing to square — the old path is right)', findPaper(photo([[0, 0], [FW, 0], [FW, FH], [0, FH]]), FW, FH) === null);
{ /* a cluttered table: the bright region is an L, not a sheet — its best quad covers too little of its hull */
  const d = photo(null);
  const L = (x, y) => (x >= 20 && x < 300 && y >= 20 && y < 60) || (x >= 20 && x < 60 && y >= 20 && y < 220);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (L(x, y)) { const i = (y * FW + x) * 4; d[i] = d[i + 1] = d[i + 2] = 220; }
  ok('an L-shaped bright region is not mistaken for a sheet', findPaper(d, FW, FH) === null); }

console.log('\nNOTA SCAN — the paper is pulled flat and its text sits level');
/* a page of level text (page(0) above) photographed at ~30° with perspective: every page pixel is
   pushed through the unit-square → quad homography into a 640x480 frame on a dark table. warpQuad
   with the quad must give the page back level — deskewAngle within 1°, where on the photo itself
   the tilt is far past the ±15° it can see. */
const PQ = [[245, 70], [500, 215], [392, 405], [135, 260]];
const shot = (() => {
    const W2 = 640, H2 = 480, d = new Uint8ClampedArray(W2 * H2 * 4);
    for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = 40; d[i + 3] = 255; }
    const { d: flat, PW, PH } = page(0);
    const H = homography(PQ);
    for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) {
        const v = flat[(py * PW + px) * 4];
        for (const [su, sv] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
            const u = (px + su) / PW, w = (py + sv) / PH, den = H[6] * u + H[7] * w + 1;
            const x = Math.round((H[0] * u + H[1] * w + H[2]) / den), y = Math.round((H[3] * u + H[4] * w + H[5]) / den);
            if (x >= 0 && y >= 0 && x < W2 && y < H2) { const i = (y * W2 + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; }
        }
    }
    return { d, W: W2, H: H2 };
})();
{ const flat = warpQuad(shot.d, shot.W, shot.H, PQ);
  const deg = deskewAngle(flat.data, flat.width, flat.height);
  ok(`warped with the known corners, the text is level (deskewAngle ${deg}°, output ${flat.width}x${flat.height})`, Math.abs(deg) <= 1);
  ok('the output is the paper only: its edges are paper, not table', (() => {
      let dark = 0; const { data: o, width: ow, height: oh } = flat;
      for (let x = 0; x < ow; x++) { if (o[x * 4] < 128) dark++; if (o[((oh - 1) * ow + x) * 4] < 128) dark++; }
      return dark < ow * 0.3;                                    // a jagged edge at most, never a black band (2 rows = 100%)
  })());
  const found = findPaper(shot.d, shot.W, shot.H);
  ok(`the same corners are FOUND on the photo (${found ? found.map((p) => p.map(Math.round).join(',')).join(' ') : 'null'})`, near(found, PQ, 4));
  if (found) { const auto = warpQuad(shot.d, shot.W, shot.H, found); const ad = deskewAngle(auto.data, auto.width, auto.height);
      ok(`found → warped → level, the whole automatic path (deskewAngle ${ad}°)`, Math.abs(ad) <= 1); } }
{ /* turning the corner order one step is a 90° turn of the output — what PUTAR 90° does */
  const turned = warpQuad(shot.d, shot.W, shot.H, [PQ[3], PQ[0], PQ[1], PQ[2]]);
  const straight = warpQuad(shot.d, shot.W, shot.H, PQ);
  ok('cycling the corners once turns the output 90° (width and height swap)', turned.width === straight.height && turned.height === straight.width); }
ok('the output is capped at 800 wide', warpQuad(shot.d, shot.W, shot.H, [[0, 0], [2000, 0], [2000, 1000], [0, 1000]]).width === 800);

console.log(`\n${'='.repeat(58)}\n${pass} passed, ${fail} failed, ${pass + fail} checks`);
process.exit(fail ? 1 : 0);
