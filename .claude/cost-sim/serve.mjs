// Serves .claude/cost-sim on http://localhost:4195 so the 3D page can run in the preview pane.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
http.createServer((req, res) => {
  const name = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'preview.html';
  const file = path.join(dir, path.basename(name));
  fs.readFile(file, (err, body) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain' });
    res.end(body);
  });
}).listen(4195, () => console.log('cost-sim on http://localhost:4195'));
