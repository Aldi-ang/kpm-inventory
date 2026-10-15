---
name: feedback_explain_in_plain_english
description: "Caveman short is not the same as plain. Short sentences full of jargon still fail him — cut the hard WORDS, not just the filler."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4ca63b2a-ec65-4c5e-af63-72ad73d77c7a
  modified: 2026-09-12T13:45:15.916Z
---

Aldi, 2026-08-19: *"why the caveman ultra not working, alucard still talk like it used to be not
caveman that i ask tho, too many hard to understand words, too many unfamiliar terms i want this
to change"*.

**Why:** caveman was being applied to sentence LENGTH only. The replies got short and stayed full
of specialist words — "adversarial pass", "refutation", "premise", "landmine", "discrete-event
flush", "error boundary", "rejection versus suspension", "UI-says-yes/server-says-no". He is 14
and self-taught. A four-word sentence he cannot decode is worse than a long one he can, because
the short one looks like it needs no explaining. An approval he did not understand is not an
approval, and that is the whole cost.

**How to apply:**
- Cut hard WORDS, not only filler. Short + jargon = still failed.
- Every specialist word gets a plain gloss the FIRST time it appears in a reply, every reply.
  Not once per session — he clears chats and skims.
- Prefer the plain word outright: "the screen crashed and went blank" over "the root unmounted";
  "the app forgets who you are" over "the credential is destroyed"; "I checked my own answer by
  arguing against it" over "adversarial pass"; "a fix that would make it worse" over "landmine".
- Keep exact: file paths, function names, error text, numbers, commit hashes. Never dumb those
  down — they are how he finds the thing.
- Say the thing, then the word, if he needs the word at all: "the app never told the server the
  sale happened — that gap is what people call a *race*".
- Tables and short lines are still right. This is about vocabulary, not layout.

**2026-08-25 — the fix that actually worked, use it by default.** A reply ended with four
decisions written as a numbered prose list ("swap the three all-time totals", "money owed needs
wiring across", "the rhythm strip needs the hour off each nota"). His whole answer was *"i dont
understand your question"*. Re-asking the identical four through **`AskUserQuestion`** — one
question per decision, each option spelling out its own terms and consequence in a full sentence —
got four clear decisions in one turn, and one of them (*"i want to see daily week, month and year
only, dont use total"*) was better than what I had proposed.

- **Ask for decisions with `AskUserQuestion`, not a prose list.** Clicking beats composing a reply.
- Put the explanation **inside the option's description**, not in a paragraph above it. He skims to
  the buttons.
- One decision per question. Four bundled into one paragraph reads as one impossible question.
- Give him an option that rejects the premise ("change nothing", "why do we need this?"). He uses
  it, and he is often right.

**2026-09-12 — third time he has had to ask.** After a closing report on the low-stock fix:
*"talk simple english and always use /humanizer when talking to me, i dont understand technical
terms and hard english"*. The reply that triggered it was short, and still failed. What was in it:
`[certain] (checked: ...)` tags, "adversarial: yes", "heredoc", "fanout-gate hook", "spread the
product and override stock", "threaded appSettings into", "regression guard", the `${` symbol in a
question he was supposed to answer.

- **Caveman ULTRA abbreviations are hard words too.** `DB`, `config`, `req`, `res`, `fn`, `impl`,
  `->` arrows for "so". The alucard skill orders ULTRA, but his instruction outranks it on
  vocabulary: keep sentences short, write the words out in full, plain English.
- **The `[certain]`/`[likely]` tags and the `checks: N run` closing line are for the skill, not for
  him.** Keep the honesty, drop the notation: "I ran the test after the change and it passed" says
  the same thing. If a tag is kept, it goes at the end of the line, never in the middle.
- **Run `anthropic-skills:humanizer` before sending every reply to him**, not just app copy. He
  asked for the skill by name, twice now (2026-08-30 and 2026-09-12).
- A question to him is written for a 14-year-old reading English as a second language: one idea,
  one sentence, a concrete example of what happens if he says yes and what happens if he says no.

Related: [[feedback_caveman_mode_scope]] · [[feedback_lead_with_the_ask]] · [[user_kpm_project]] ·
[[feedback_diagnose_before_changing]] · [[feedback_humanizer_always_on]]
