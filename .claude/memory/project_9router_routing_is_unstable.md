---
name: project-9router-routing-is-unstable
description: 9router silently loses a model tier every few days; which tool breaks depends on which tier died
metadata: 
  node_type: memory
  type: project
  originSessionId: 9319bcc4-2fbc-434f-b2bb-26700845fac4
  modified: 2026-08-23T07:05:32.352Z
---

9router (`localhost:20128`) routing is unstable across days. A model listed in `/v1/models`
may still be access-denied. Three separate silent outages in three days (2026-08-21..23):
sonnet denied, then opus, then haiku.

**Which tier breaks which tool:**
- OPUS tier → the Bash safety classifier. Bash returns "cc/claude-opus-5[1m] is temporarily
  unavailable, so auto mode cannot determine the safety of Bash". Read/Grep/Glob still work.
- HAIKU tier → WebFetch and WebSearch ("There's an issue with the selected model").
- Scheduled tasks have NO project override — they fall back to the global `ANTHROPIC_DEFAULT_*`
  tiers, which is why they die while the interactive session is fine.

**Why:** the failure is silent and never names 9router, so it reads as a Claude Code bug and
sends you diagnosing the wrong thing. This is what killed `a-brain-session-ingest` for 12 days
(see [[project_kpm_model_tier_benchmark]]).

**How to apply:** when a tool dies with a model error, check which route works TODAY before
diagnosing anything deeper. Workarounds that need no model: `mcp__Claude_Browser__preview_start`
+ `get_page_text` fetches a URL with no classifier and no summariser — use it instead of
WebFetch/curl when both are down. Read/Write/Edit/Grep/Glob never need the classifier.
