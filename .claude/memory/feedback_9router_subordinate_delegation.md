---
name: feedback-9router-subordinate-delegation
description: "Standing practice - delegate cheap/free subtasks to other AI models via 9Router, log what's learned to A-Brain"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 77bca394-9542-4c63-9d0e-66de09fe91ee
  modified: 2026-08-04T07:04:20.460Z
---

Aldi runs [9Router](https://github.com/decolua/9router) locally at `http://localhost:20128` — an OpenAI-compatible gateway to 40+ providers. When a subtask is heavy-output-but-low-judgment (draft boilerplate, spot an obvious bug, explain an error) and doesn't need deep KPM-specific context, delegate it via a plain `curl` call to `${NINEROUTER_URL}/v1/chat/completions` with a model id, instead of generating the output directly. Read the response, verify it, use it — don't skip verification just because another model produced it.

**Why:** Aldi's framing — "you're the boss, free models are subordinates for easy tasks." Cuts Claude's own output-token spend on grunt work; he explicitly wants this used, not just available.

**How to apply:**
- Confirmed free tier (2026-07-31): `kr/*` prefix (Kiro-backed: claude-sonnet-4.5, claude-haiku-4.5, glm-5, MiniMax-M2.5, qwen3-coder-next, deepseek-3.2), OpenCode Free, Vertex AI ($300 GCP credit). Kimi is NOT free ($9/mo, needs account balance) — don't route to `kimi/*` models.
- This is a manual Bash/curl pattern, not the built-in Agent/subagent tool (that's Claude-only, no config slot for other providers).
- After a delegation call that reveals something non-obvious about a model (good at X, bad at Y, needs specific prompt phrasing, auth/cost gotcha), log a dated entry to `A-Brain/Wiki/Concepts/9Router Subordinate AI Delegation.md` — don't log routine successes with nothing new to report. This is the "learn cheap with someone else's tokens" loop Aldi asked for.
- Don't build automation/scripts/hooks for this unless asked — it's a manual habit, not a feature.
- **Recommend before defaulting (confirmed 2026-08-03):** Aldi can't reliably remember the fit
  criteria himself, so before doing a task on Claude by default, check it against the list below —
  if it's a good fit, flag it as a one-line recommendation first and wait for his go-ahead, instead
  of silently defaulting to Claude or silently auto-delegating. Still manual — Aldi decides
  per-task — this just moves the "remember the criteria" burden onto Alucard instead of him. No
  script/hook needed; this is a judgment step applied each turn, not built infrastructure.
- **Good fit (recommend delegating):** heavy output, low judgment — boilerplate, scaffolding, a
  first-pass draft, "explain this error." Doesn't touch KPM's rules (firestore rules, tier
  permissions, financial calcs). Doesn't need anything established earlier in the session. Cheap to
  verify — a wrong draft is obvious fast.
- **Bad fit (keep on Claude, don't recommend):** anything security/financial/permission-adjacent in
  KPM. Anything needing session memory. The verification/review step itself — can't delegate the
  checking, that defeats the point. When misjudging fit costs more review-tokens to catch than just
  doing the task directly, that's a bad fit regardless of surface shape.
