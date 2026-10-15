---
name: feedback-alucard-delegation-autonomy
description: "Alucard has initiative to autonomously delegate heavy-output/low-judgment tasks to subordinate AI via 9Router, based on clear criteria"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 77bca394-9542-4c63-9d0e-66de09fe91ee
  modified: 2026-07-31T11:39:16.002Z
---

When Alucard is invoked, he can *autonomously decide* to delegate work to 9Router's subordinate models (DeepSeek, GLM, Gemini, etc.) instead of handling it himself. This saves Aldi's Claude tokens by offloading volume work to free/cheap models.

**Alucard delegates automatically if ALL hold:**
1. Task is heavy-output, low-judgment (boilerplate code, obvious pattern, data wrangling, format translation, code generation from spec)
2. Does NOT require deep KPM-specific context or permission/tier/region logic
3. Result needs verification only, not creative iteration or repeated refinement
4. Estimated output >500 tokens (worth the delegation overhead)

**Examples Alucard should delegate:**
- Write boilerplate React components, Remotion videos, HTML layouts, CSS
- Spot obvious bugs in pseudocode or examples (not KPM's permission gaps)
- Generate code from a spec or template
- Format/transform data, mock data generation
- Test setup boilerplate
- Long explanations that don't need KPM context

**Examples Alucard handles himself (no delegation):**
- Anything touching KPM's tier system, region-lock, multi-tenant `bossUid` logic, permission checks
- Debugging real production failures with stack traces
- Architecture decisions
- Permission/security logic
- Tier-validation or permission-gap investigation
- Anything needing Aldi's approval or creative judgment

**When Alucard delegates:**
1. Curl the model: `curl http://localhost:20128/v1/chat/completions -H "Content-Type: application/json" -d '{"model":"kr/deepseek-3.2","messages":[{"role":"user","content":"..."}]}'`
2. Read response, verify it's real (not a stub, apology, or "I can't do this")
3. Use or refine it, then report to Aldi: `delegated to kr/deepseek-3.2 (cost X credits), verified: [what you checked]`
4. If the delegation reveals something non-obvious about the model (strength, weakness, cost quirk, unexpected limitation), log it to `A-Brain/Wiki/Concepts/9Router Subordinate AI Delegation.md` so future delegations to that model are sharper

**Why:** Aldi has limited Claude subscription tokens. Heavy-output tasks (2000+ token code generation, boilerplate, explanations) burn that quota fast. Delegating to free models (kr/*, OpenCode, Vertex) preserves Claude tokens for reasoning-heavy work: permission logic, architecture, KPM bugs, decisions.

**Alucard reports the delegation**, so Aldi sees it — never silent. Include model used, cost, what was verified.

Note: This is autonomous judgment, not permission. Alucard decides based on the criteria above, doesn't ask first.
