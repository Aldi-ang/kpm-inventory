/* make-preview.mjs — one file Aldi can double-click to see the theme, with no server and no login.
   =============================================================================================
   Run:  npm run build; node tools/make-preview.mjs     ->  tools/theme-preview.html

   The lab (theme-lab.html) needs a server because it <link>s the hashed stylesheet out of dist/.
   This inlines that stylesheet into a single self-contained file instead, so it opens straight
   from the file system in whatever browser he already has. Same markup, same CSS, same result —
   it is the lab, flattened. The light/dark/lite buttons still work. */

import fs from 'node:fs';
import path from 'node:path';

const assets = path.join('dist', 'assets');
const cssName = fs.existsSync(assets) && fs.readdirSync(assets)
  .filter(f => f.endsWith('.css'))
  .find(f => fs.readFileSync(path.join(assets, f), 'utf8').includes('--ground:'));
if (!cssName) {
  console.error('no stylesheet in dist/assets declares --ground — run `npm run build` first');
  process.exit(1);
}
const css = fs.readFileSync(path.join(assets, cssName), 'utf8');
const html = fs.readFileSync(path.join('tools', 'theme-lab.html'), 'utf8')
  /* ⚠️ The <link> becomes a <style>. Anything the stylesheet loads BY URL (a font file, a sprite)
     will not resolve from the file system, so treat this as a colour and layout preview, not a
     pixel-perfect one. The lab over the server stays the reference. */
  .replace(/<link rel="stylesheet" href="__CSS__" \/>/, `<style>\n${css}\n</style>`);

const out = path.join('tools', 'theme-preview.html');
fs.writeFileSync(out, html);
console.log(`${out}  (${(html.length / 1024).toFixed(0)} KB, css: ${cssName})`);
