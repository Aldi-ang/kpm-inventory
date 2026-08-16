/* dev-proxy.mjs — a plain-HTTP window onto the HTTPS dev server.
   =============================================================================================
   Run:  node tools/dev-proxy.mjs        ->  http://localhost:4183  ->  https://localhost:5173

   🔴 WHY. `npm run dev` is HTTPS with a self-signed certificate, deliberately — Aldi's phone needs
   a secure context for `crypto.subtle`, and that rule does not move. But the in-app browser
   refuses that certificate, so the REAL running app has never once been opened here; every
   verification has been done against files and against the server's raw response instead. His
   instruction, twice now: *"why dont u open the localhost then look at it yourself"*.

   ⚠️ THIS PROXIES, IT DOES NOT REPLACE. The dev server keeps its own HTTPS and its own port, and
   nothing about it is reconfigured. This is a read-only pipe that terminates TLS on the way in so
   a browser that distrusts the certificate can still see what the app actually renders.
   ⚠️ LOCALHOST ONLY, and only while you are looking. It exists to be pointed at a page, not to be
   left running.

   Websockets (Vite's HMR channel) are not proxied — the page loads and renders, it just will not
   hot-reload. Reload by hand after an edit. */

import http from 'node:http';
import https from 'node:https';

const FROM = Number(process.env.PORT || 4183);
const TO = Number(process.env.TARGET || 5173);

http.createServer((req, res) => {
  const up = https.request(
    { host: 'localhost', port: TO, path: req.url, method: req.method,
      headers: { ...req.headers, host: `localhost:${TO}` },
      /* the certificate is self-signed on purpose; distrusting it is the entire problem
         this file exists to route around, on localhost, for looking at a page */
      rejectUnauthorized: false },
    (upRes) => {
      res.writeHead(upRes.statusCode || 502, upRes.headers);
      upRes.pipe(res);
    });
  up.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('dev server not reachable on https://localhost:' + TO + '\n' + e.message);
  });
  req.pipe(up);
}).listen(FROM, () =>
  console.log(`dev proxy: http://localhost:${FROM}  ->  https://localhost:${TO}`));
