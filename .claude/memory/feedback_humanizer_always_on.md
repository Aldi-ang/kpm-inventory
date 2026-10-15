---
name: feedback_humanizer_always_on
description: "Run the humanizer skill over everything written for Aldi — replies, notes, UI copy, tutorial text — and never address the reader in KPM's own copy"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f4692961-8829-4b79-a635-e5eb94dd9d2d
  modified: 2026-08-30T03:07:46.303Z
---

Aldi, 2026-08-30, after watching the Ponder tutorial play: *"i think that we need to remake the
sentences and wording because it sound so ai ... make sure that u dont use kamu or aku, or any of
the informal language, we are talking about the factory, subject is factory, employees, manager and
all of these subject no u and me, and btw use /humanizer skill to do this. and i want alucard to use
humanizer for all the work that he do so that its easier for me to understand as well"*.

**Two separate instructions, and both are standing:**

1. **`anthropic-skills:humanizer` applies to everything written for him** — chat replies, PROGRESS
   entries, vault pages, commit messages, and any copy that ships in the app. He gave the reason
   himself: it is easier for him to read.
2. **KPM's own copy has no second person.** The subject of a sentence is the warehouse, the branch,
   the shipment, the app, or a role (admin, salesman, manager). Never *kamu*, *aku*, *kalian*, or
   any informal register. "Isi gudang terbuka saat namanya ditekan", not "klik namanya".

**Why:** he is fourteen, reads screens literally, and skims. AI throat-clearing — *Ayo…*, *Lihat:*,
*Ini penting:*, *Bahasa gampangnya* — costs him a beat before the sentence that carries the meaning.
And a tutorial that says *kamu* reads like a chatbot inside software that belongs to a factory.

**How to apply:** the tells that actually show up here are second person, `Ayo`/`Lihat:`/`Ini
penting:`, em-dashes used as punctuation, rule-of-three padding, and the significance-inflation
vocabulary (*crucial*, *pivotal*, *underscores*, *serves as*). Keep `—` when it is the CHARACTER the
app prints in an empty cell; several tutorial beats exist to explain that symbol, and a blanket ban
would ban the lesson.

Enforced structurally rather than remembered: `integration.audit.mjs` check 667 scans every Ponder
beat for second person and names the offending sentence. See
[[feedback_kpm_reply_size_cap]] · [[feedback_explain_in_plain_english]] ·
[[project_kpm_english_on_the_hq_desk]]
