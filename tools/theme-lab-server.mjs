/* theme-lab-server.mjs — a plain-HTTP window onto the app's real stylesheet.
   =============================================================================================
   Run:  node tools/theme-lab-server.mjs        ->  http://localhost:4180/

   ⚠️ THIS DOES NOT TOUCH THE DEV SERVER, AND MUST NOT. `npm run dev` is HTTPS on purpose — Aldi's
   phone needs a secure context for `crypto.subtle`, and that is a standing rule. This is a
   SECOND, separate, read-only server over `dist/`, so the lab can be opened by a browser that
   refuses a self-signed certificate while the real dev server keeps its own.

   It serves dist/ as static files, and serves tools/theme-lab.html at / with `__CSS__` replaced
   by whatever hashed stylesheet the last build actually produced. Nothing is written. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('dist');
const PORT = Number(process.env.PORT || 4180);
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
                '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2' };

if (!fs.existsSync(ROOT)) {
  console.error('dist/ is missing — run `npm run build` first. A stale dist is a stale lab.');
  process.exit(1);
}
/* ⚠️ RESOLVED PER REQUEST, NOT ONCE AT STARTUP. The first version cached the filename when the
   server booted; the next `npm run build` emitted a new hash, the <link> 404'd, and the lab
   measured an UNSTYLED page — every element inheriting the browser default. It reported "no
   failures" in both themes with identical numbers, which is exactly what a lab that has stopped
   looking at anything reports. A measuring tool that can silently measure nothing is worse than
   no tool, so the page now fails loudly instead. */
/* ⚠️ CHOSEN BY CONTENT, NOT BY TIMESTAMP OR SIZE. Vite code-splits CSS, so dist/assets holds
   several stylesheets and "the newest one" was a 124-rule chunk with no tokens in it — the lab
   loaded it happily and then reported that `--ground` did not exist. The main stylesheet is
   defined by the thing the lab actually needs: the one that declares the theme. */
const findCss = () => fs.readdirSync(path.join(ROOT, 'assets'))
  .filter(f => f.endsWith('.css'))
  .find(f => fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8').includes('--ground:'));
if (!findCss()) { console.error('no stylesheet in dist/assets declares --ground'); process.exit(1); }

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  /* `/` is the SHOWROOM — the page built for Aldi to look at and comment on.
     `/lab` is the measurement harness, kept lean so a sweep stays fast. */
  const page = (url === '/lab') ? 'theme-lab.html'
             : (url === '/' || url === '/showroom' || url === '/index.html') ? 'theme-showroom.html'
             : null;
  if (page) {
    const html = fs.readFileSync('tools/' + page, 'utf8')
                   .replace('__CSS__', `/assets/${findCss()}`);
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
    return res.end(html);
  }
  /* path traversal is the one thing a throwaway static server still has to get right */
  const file = path.join(ROOT, url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
                       'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`theme lab: http://localhost:${PORT}/  (css: ${findCss()})`));
