// image ops in headless Chrome canvas. node img.mjs prep <in.png> <out.png> <size>   |   node img.mjs cut <in.png> <out.png> <size> [tol]
import { open } from './cdp.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const [, , op, inp, out, size = '1024', tol = '38'] = process.argv;
const p = await open('about:blank', process.cwd() + '/prof', 400, 400);
const src = 'data:image/png;base64,' + readFileSync(inp).toString('base64');
const res = await p.ev(`(async () => { const im = new Image(); im.src = ${JSON.stringify(src)}; await im.decode(); const N = ${+size};
  const c = document.createElement('canvas'); const x = c.getContext('2d', { willReadFrequently: true });
  if ('${op}' === 'prep') { c.width = c.height = N; x.fillStyle = '#fff'; x.fillRect(0, 0, N, N); x.imageSmoothingQuality = 'high';
    const s = N * .9 / Math.max(im.width, im.height); x.drawImage(im, (N - im.width * s) / 2, (N - im.height * s) / 2, im.width * s, im.height * s); return c.toDataURL('image/png'); }
  /* cut: flood-fill near-white from the edges to transparent, crop to the figure, fit it in an N x N square standing on the bottom edge */
  c.width = im.width; c.height = im.height; x.drawImage(im, 0, 0); const W = c.width, H = c.height, d = x.getImageData(0, 0, W, H), a = d.data, T = ${+tol};
  const bg = (i) => a[i] > 255 - T && a[i + 1] > 255 - T && a[i + 2] > 255 - T, seen = new Uint8Array(W * H), st = [];
  for (let i = 0; i < W; i++) st.push(i, (H - 1) * W + i); for (let j = 0; j < H; j++) st.push(j * W, j * W + W - 1);
  while (st.length) { const k = st.pop(); if (seen[k]) continue; seen[k] = 1; if (!bg(k * 4)) continue; a[k * 4 + 3] = 0;
    const px = k % W, py = (k / W) | 0; if (px > 0) st.push(k - 1); if (px < W - 1) st.push(k + 1); if (py > 0) st.push(k - W); if (py < H - 1) st.push(k + W); }
  /* soften the fringe: a pixel next to the cleared area that is still near-white becomes half transparent */
  for (let k = 0; k < W * H; k++) { if (a[k * 4 + 3] === 0) continue; const px = k % W, py = (k / W) | 0; let n = 0;
    for (const q of [k - 1, k + 1, k - W, k + W]) if (q >= 0 && q < W * H && a[q * 4 + 3] === 0) n++;
    if (n && a[k * 4] > 200 && a[k * 4 + 1] > 200 && a[k * 4 + 2] > 200) a[k * 4 + 3] = 90; }
  x.putImageData(d, 0, 0); let l = W, t = H, r = 0, b = 0;
  for (let k = 0; k < W * H; k++) if (a[k * 4 + 3] > 40) { const px = k % W, py = (k / W) | 0; l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); b = Math.max(b, py); }
  const o = document.createElement('canvas'); o.width = o.height = N; const y = o.getContext('2d'); y.imageSmoothingQuality = 'high';
  const bw = r - l + 1, bh = b - t + 1, s = Math.min(N * .96 / bw, N * .97 / bh);
  y.drawImage(c, l, t, bw, bh, (N - bw * s) / 2, N - bh * s - N * .01, bw * s, bh * s); return o.toDataURL('image/png'); })()`);
if (typeof res !== 'string' || !res.startsWith('data:')) { console.log('FAIL', res); } else { writeFileSync(out, Buffer.from(res.split(',')[1], 'base64')); console.log('ok', out); }
p.close(); process.exit(0);
