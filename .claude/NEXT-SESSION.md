# The one job - Master Vault in the professional look (segment 1 of 12, deadline 20 November)

His words, 2026-11-17 07:15: *"anyway just skip the demo for now and do the next segment i want to finish all segment before 20 november"*.

HIS ANSWER, 2026-11-17 07:20: *"your plan go"* - the order is fixed: Master Vault, Restock Vault, Stock Opname, Receivables & Consignment, Reports, Customers, Sampling, Command Center, Map System, Agent Profile, Audit Logs, Settings. One picture per screen, no A/B/C.

Already in the new look (copy their language, never invent a new one): Sales Terminal (11-11), EOD Setoran, Agent Inventory, Journey Plan (11-13), Fleet & Roster (11-16). Taste: A-Brain Wiki/Concepts/Aldi's Design Taste.md, grep "professional" (densest, quietest; ruled lines beat cards). Palette law: no blue, no green; slate + gold.

Where the code is: the Master Vault is written INLINE in `src/App.jsx` (`activeTab === 'inventory'` ~L5174), not its own file. Trap (Brainstorm 2026-11-09_professional-edition.md): a new face on a mixed file edits the same code that does the money math - move the logic out first, in today's look, with the checks proving nothing changed; then restyle. App.jsx also holds money paths: grep before every edit, never touch handlers.

The loop (his speed, 12 screens in ~3 days): ONE picture of the new Master Vault (PC + phone, real lab data on the big demo company), he answers ok / what to change, then build, check PC and phone, gates, patch note (en + id), push. No A/B/C boards.

LAB: launch demo-emulator, demo-api-emulator, demo-app-emulator (5176); `node tools/demo-reset-emulator.mjs`; invite walker.pc@gmail.com by REST (POST `http://127.0.0.1:8080/v1/projects/kpm-demo-f4d74/databases/(default)/documents/demo_invites?documentId=walker.pc@gmail.com`, header `Authorization: Bearer owner`, body `{"fields":{"by":{"stringValue":"lab"}}}`). From A-Brain `Raw/2026-11-15-journey-review`: `node walk5176.mjs --pc --gate-only 8`, `node ../2026-11-16-fleet-build/clear-pc.mjs`, `--gate-only 8` again. Owner: from `Raw/2026-11-17-menu-tour`, `node g.mjs eval:owner.js`, then `--gate-only 8`. g.mjs: `eval:<file> shot:<name> move:x,y click:x,y tapring wait:ms size:390x844m` (size only lives for that run). Stop the servers before `npm run build`.

BEFORE ANY PUSH: `git log --format=%s origin/phase0-solid-ground..HEAD | grep -q '^Antigravity:' && echo STOP || git push -q origin phase0-solid-ground` - read every Antigravity commit (`git show`, only .claude/ANTIGRAVITY-TASK.md) and re-run the gates first. Gates: logicFixes, npm run build, integration.audit, every *.selfcheck.mjs by exit code.

PARKED until after 20 November (his call): the demo (step 3 Dika A/C pick, Task 17's two copy fixes - see PROGRESS and A-Brain Wiki/Concepts/Demo Guide on the Phone.md); the two Fleet fixes (Antigravity Task 15's code).

ANTIGRAVITY: 18 DONE (demo audit, parked, not read), 19 OPEN (demo audit, parked). 20 OPEN = the Master Vault map (every element, press, write, inline logic, what can move out) - THIS JOB's data, read it first if DONE. 21 OPEN = the same map for Restock Vault. Keep at least 2 OPEN (next: segment 3+ maps); end every reply that queues or closes work with the paste-ready prompt.
