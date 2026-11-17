# The one job - Restock Vault in the professional look (segment 2 of 12, deadline 20 November)

His words, 2026-11-17 07:15: *"anyway just skip the demo for now and do the next segment i want to finish all segment before 20 november"*. 07:20 *"your plan go"* - fixed order: Master Vault (DONE, LIVE ad0b7d5a), Restock Vault, Stock Opname, Receivables & Consignment, Reports, Customers, Sampling, Command Center, Map System, Agent Profile, Audit Logs, Settings. One picture per screen, no A/B/C.

His answer to the Master Vault picture (07:28): *"actually its look solid, 3D slider is important we need to keep it somewhere, and the background yea we also need it but since we are on new theme, make sure it is professional and not kaku and looks minimalistic but cool"*. Lesson for every next screen: the picture may drop nothing he built - name each feature the new look moves or hides, and keep it somewhere.

THE LOOP: ONE picture (artifact, PC + phone, real lab numbers) -> his ok / changes -> build -> lab frames PC 1440 + phone 390 (+ light) -> gates -> patch note (en + id) -> push.

THE MAP IS READY: Antigravity Task 21's Result in `.claude/ANTIGRAVITY-TASK.md` (grep "## Task 21") = every element, press, write, inline math and pin of `src/RestockVaultView.jsx` (2,230 lines). Read it instead of the file.
- Money paths live IN this file: `handleProcessRestock` (stock += , procurement), `handleHQPush`, `handleShipItems`, `handleDeletePO`, `handleSaveEditPO`. Restyle = classNames and words only; never a handler, never a `name=`, never the math lines 380-513.
- Demo guide marks MUST survive: `data-mission` on Masuk/Kirim tabs (L1501), `data-guide="goods"` (L1843), `data-guide={guide}` + `data-ok` in RouteCombo (L88: asal, tujuan), `data-guide="cart"` + `data-n` + `data-qty` (L2010), `data-guide="save"` (L2198).
- Trap: App.jsx L5397-5426 wrapper - logicFixes 7006-7016 pins `border-2 lg:border-4` and `p-2 lg:p-4` (matched to tools/ponder-lab.jsx); a removed game frame means updating those pins together, same intent.
- Look language to copy: `src/components/ResidentEvilInventory.jsx` (today's Master Vault): bg-ground, border-line-2, text-ink / ink-muted / ink-dim, bg-gold text-gold-ink buttons, underline tabs `border-b-2 border-gold`, ruled lists, tabular-nums, sentence case.

LAB (all from A-Brain `Raw/2026-11-17-master-vault/`, `g.mjs` there): preview_start demo-emulator, demo-api-emulator, demo-app-emulator; `node tools/demo-reset-emulator.mjs`; invite walker.pc@gmail.com by REST (POST `http://127.0.0.1:8080/v1/projects/kpm-demo-f4d74/databases/(default)/documents/demo_invites?documentId=walker.pc@gmail.com`, header `Authorization: Bearer owner`, body `{"fields":{"by":{"stringValue":"lab"}}}`); from `Raw/2026-11-15-journey-review`: `node walk5176.mjs --pc --gate-only 8`, `node ../2026-11-16-fleet-build/clear-pc.mjs`, `--gate-only 8` again; then in the master-vault folder `node g.mjs eval:owner.js wait:4000`, gate-only 8 again, `node g.mjs eval:gate.js` (opens the vault, demo password), wait 5 s, close the guide bubble (`click:361,317`), then a nav eval like `mv.js` with `[data-mark="restock_vault"]`. `size:` lives for one run only - put it in every command. Stop the servers before `npm run build`.

BEFORE ANY PUSH: `git log --format=%s origin/phase0-solid-ground..HEAD | grep -q '^Antigravity:' && echo STOP || git push -q origin phase0-solid-ground` - read every Antigravity commit (`git show --stat`, only .claude/ANTIGRAVITY-TASK.md) and re-run the gates first. Gates: logicFixes, every *.selfcheck.mjs by exit code, npm run build, integration.audit.

PARKED until after 20 November (his call): the demo (step 3 Dika A/C pick, Task 17's copy fixes, Tasks 18-19 results); the two Fleet fixes (Task 15's code); the Master Vault Edit form (App.jsx L5220-5381) still in the game look - classNames only when its turn comes.

ANTIGRAVITY: 19-21 DONE (read 07:33). 22 OPEN = Stock Opname map (segment 3), 23 OPEN = Receivables & Consignment map (segment 4). Keep 2+ OPEN; end every reply that queues or closes work with the paste-ready prompt.
