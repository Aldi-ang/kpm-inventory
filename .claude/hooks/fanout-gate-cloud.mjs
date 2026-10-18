#!/usr/bin/env node
/* The fan-out gate for cloud sessions. His rule, re-confirmed 2026-10-18: "well it should not use workflow until i said yes",
   and from 2026-08-20: "if want to use workflow then only use sonnet or haiku".
   The PC runs ../A-Brain/automation/fanout-gate.mjs; a cloud container has no A-Brain, so settings.json runs this one instead.
   A Workflow or Agent call passes only when (1) his LATEST own message says yes to it and (2) every agent runs on haiku or sonnet.
   The typed word "ultracode" is not a yes. Anything it cannot read, it blocks. Exit 2 = blocked, and stderr tells Claude why. */
import { readFileSync } from 'node:fs';

const deny = (why) => { process.stderr.write(`fanout-gate (cloud): ${why}\n`); process.exit(2); };
const ASK = 'Ask Aldi first, in one plain line that starts with "🔴 DECIDE: workflow" and says what it is for, how many agents, and that they run on sonnet or haiku. Run it only after he answers yes.';

let input;
try { input = JSON.parse(readFileSync(0, 'utf8')); } catch { deny('could not read the tool call, so it is blocked to be safe.'); }
const tool = input.tool_name, ti = input.tool_input || {};
if (tool !== 'Workflow' && tool !== 'Agent') process.exit(0);

/* ---- 1. his yes: his latest own message, read with the assistant text just before it ---- */
let rows = [];
try { rows = readFileSync(input.transcript_path, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); }
catch { deny('could not read the conversation to find his yes, so it is blocked to be safe. ' + ASK); }
const textOf = (d) => {
  const c = d?.message?.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c) && !c.some((x) => x.type === 'tool_result')) return c.filter((x) => x.type === 'text').map((x) => x.text).join('\n');
  return '';
};
const isHuman = (d) => { if (d.type !== 'user' || d.isMeta || d.isSidechain) return false; const s = textOf(d).trim(); return !!s && !s.startsWith('<') && !/^(Stop hook feedback|\[SYSTEM NOTIFICATION)/.test(s); };
let hi = rows.length - 1; while (hi >= 0 && !isHuman(rows[hi])) hi--;
if (hi < 0) deny('found no message from Aldi in this conversation. ' + ASK);
const his = textOf(rows[hi]);
let asked = '';
for (let i = hi - 1; i >= 0 && !isHuman(rows[i]); i--) if (rows[i].type === 'assistant' && !rows[i].isSidechain && textOf(rows[i])) { asked = textOf(rows[i]); break; }
const YES = /\b(yes|yep|yeah|ya|iya|ok|okay|oke|boleh|go|gas|lanjut|sure)\b/i;
const NO = /\b(no|not|dont|don't|never|stop|jangan|tidak|nggak|gak)\b/i;
const FAN = /\b(workflows?|fan.?outs?|sub.?agents?|agents?)\b/i;
const USE = /\b(use|run|start|pakai|jalankan)\s+(a\s+|the\s+)?(workflows?|agents?|fan.?outs?)\b/i;
const yes = !NO.test(his) && ((YES.test(his) && (FAN.test(his) || /DECIDE:\s*workflow/i.test(asked))) || USE.test(his));
if (!yes) deny(`his latest message is not a yes to a ${tool === 'Workflow' ? 'workflow' : 'subagent'}. ${ASK}`);

/* ---- 2. the model: haiku or sonnet on every agent, never inherited ---- */
const CHEAP = /haiku|sonnet/i;
if (tool === 'Agent') {
  if (!CHEAP.test(String(ti.model || ''))) deny(`set model to "haiku" or "sonnet" on this Agent call (got "${ti.model || 'nothing - it would inherit the expensive model'}").`);
  process.exit(0);
}
let src = ti.script;
if (!src && ti.scriptPath) { try { src = readFileSync(ti.scriptPath, 'utf8'); } catch { deny(`could not read ${ti.scriptPath} to check its models.`); } }
if (!src) deny('pass the workflow script inline (or by scriptPath), so the gate can check that every agent runs on haiku or sonnet.');

/* find every agent( ... ) call outside strings and comments; each one must name its model in its own text */
function endOfString(s, i) {
  const q = s[i]; i++;
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') { i += 2; continue; }
    if (q === '`' && c === '$' && s[i + 1] === '{') { i = endOfBlock(s, i + 1, '{', '}'); continue; }
    if (c === q) return i + 1;
    i++;
  }
  return i;
}
function endOfBlock(s, i, open, close) {
  let depth = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') { i = endOfString(s, i); continue; }
    if (c === '/' && s[i + 1] === '/') { const n = s.indexOf('\n', i); i = n < 0 ? s.length : n; continue; }
    if (c === '/' && s[i + 1] === '*') { const n = s.indexOf('*/', i + 2); i = n < 0 ? s.length : n + 2; continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return i + 1;
    i++;
  }
  return i;
}
const calls = [];
for (let i = 0; i < src.length; ) {
  const c = src[i];
  if (c === '"' || c === "'" || c === '`') { i = endOfString(src, i); continue; }
  if (c === '/' && src[i + 1] === '/') { const n = src.indexOf('\n', i); i = n < 0 ? src.length : n; continue; }
  if (c === '/' && src[i + 1] === '*') { const n = src.indexOf('*/', i + 2); i = n < 0 ? src.length : n + 2; continue; }
  if (src.startsWith('agent', i) && !/[\w$.]/.test(src[i - 1] || '') && !/[\w$]/.test(src[i + 5] || '')) {
    let j = i + 5; while (/\s/.test(src[j] || '')) j++;
    if (src[j] === '(') { calls.push(src.slice(i, endOfBlock(src, j, '(', ')'))); i = j + 1; continue; }
  }
  i++;
}
const bad = calls.filter((t) => !/\bmodel\s*:\s*(['"`])[^'"`]*(haiku|sonnet)[^'"`]*\1/i.test(t));
if (bad.length) deny(`${bad.length} of ${calls.length} agent() calls do not set model: 'sonnet' or 'haiku' in their own options (first: ${bad[0].slice(0, 90).replace(/\s+/g, ' ')}...). Write the model literally in every call; never let it inherit.`);
process.exit(0);
