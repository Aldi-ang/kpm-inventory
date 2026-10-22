// node gen.mjs <ref.png> <out.png> <seed> "<prompt>"   - FLUX.1 Kontext [dev] on its official HF Space
import { Client, handle_file } from '@gradio/client';
import { readFileSync, writeFileSync } from 'node:fs';
const [, , ref, out, seed, prompt] = process.argv;
const t0 = Date.now();
try {
  /* no token: the anonymous ZeroGPU limit (3 images on 2026-10-22, then "exceeded your ZeroGPU runs limit"); HF_TOKEN set: his own free-account quota */
  let tok = process.env.HF_TOKEN; try { tok ||= readFileSync(`${process.env.USERPROFILE || process.env.HOME}/.cache/huggingface/token`, 'utf8').trim(); } catch { /* none: anonymous */ }
  const c = await Client.connect('black-forest-labs/FLUX.1-Kontext-Dev', tok ? { hf_token: tok } : {});
  const r = await c.predict('/infer', { input_image: handle_file(new Blob([readFileSync(ref)], { type: 'image/png' })), prompt, seed: +seed, randomize_seed: false, guidance_scale: 2.5, steps: 28 });
  const img = r.data[0]; const url = img.url || img.path;
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer()); writeFileSync(out, buf);
  console.log('ok', out, buf.length, 'bytes', ((Date.now() - t0) / 1000).toFixed(0) + 's');
} catch (e) { console.log('FAIL', (e && (e.message || JSON.stringify(e))).toString().slice(0, 400)); }
process.exit(0);
