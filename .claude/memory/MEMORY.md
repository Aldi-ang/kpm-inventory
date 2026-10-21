# Memory Index

## How to work with Aldi
- [Stop and note before usage ends](feedback_stop_and_note_before_usage_ends.md) — halt at 95-98%, but keep PROGRESS.md current continuously; a stranded session with no notes is the real cost
- [Quota: report the 5h window first](feedback_quota_report_5h_first.md) — the 5-hour bucket hits its wall long before the weekly one; lead with it, measured ~9x the burn rate
- [Lead with the ask](feedback_lead_with_the_ask.md) — every reply opens with ONE bold line saying what he must do; he skims
- [Tell it once](feedback_tell_it_once.md) — full story in the commit message only; PROGRESS/vault/reply are pointers (his call, measured 12:1)
- [Say only what he must do or answer](feedback_kpm_reply_size_cap.md) — no narration of work, no reasoning, no summaries; the limit is CONTENT not length (his call 2026-09-04, "stop bertele2")
- [No Learn by Doing for him](feedback_no_learn_by_doing.md) — never a TODO(human) or a terminal test for Aldi; write it, run it, show the result (his call 2026-09-28)
- [Diagnose before changing](feedback_diagnose_before_changing.md) — report findings and let him rank them; write no code, not even a check, until he answers
- [Show him, don't tell him](feedback_show_him_dont_tell_him.md) — a design decision comes as rendered frames side by side with plain captions, never a technical sentence (his call 2026-09-14); goal is set: every panel must work on the phone as well as on the PC
- [Explain in plain English](feedback_explain_in_plain_english.md) — define every technical term before using it; an approval he didn't understand isn't an approval. **Asked a THIRD time 2026-09-12**: caveman-ultra abbreviations and `[certain]` tags count as hard words; run humanizer on every reply
- [Clear terms, one language](feedback_kpm_clear_terms_one_language.md) — never a vague label; match the SIBLING screen's language before naming anything (Restock Vault is mixed — measured)
- [Reply in English](feedback_reply_in_english.md) — his call 2026-09-11, he is practising English; Indonesian stays for contract and price script; NEW app labels are English ("Quarantine", 2026-09-29), old ones wait for the language switch
- [Humanizer, always on](feedback_humanizer_always_on.md) — run it over every reply, note and shipped string; KPM copy never says "kamu" (his call, enforced by audit check 667)
- [Flag decisions with emoji](feedback_flag_decisions_with_emoji.md) — 🔴 DECIDE / ❓ ANSWER / ✅ TEST markers on every ask, not just the first
- [User: KPM project owner](user_kpm_project.md) — **24** (not 14 — he corrected it 2026-09-09), owns the app; plain-English reports with test checklists
- [Verify before claiming committed](feedback_verify_before_claiming_committed.md) — always git add+commit+show --stat before saying "done"
- [Push every finished job yourself](feedback_kpm_dont_push_every_update.md) — unasked, at the end of every FINISHED job once the gates are green (his 2026-10-21 "u dont need my permission"); half-done work and boards waiting on his pick stay local
- [Caveman mode scope](feedback_caveman_mode_scope.md) — always-on here; ask before enabling elsewhere
- [9Router delegation](feedback_9router_subordinate_delegation.md) — delegate cheap high-output subtasks to localhost:20128, free tier kr/*+OpenCode+Vertex
- [Alucard delegation autonomy](feedback_alucard_delegation_autonomy.md) — delegates heavy-output/low-judgment work, reports what and why

- [A-Brain is the only memory](feedback_abrain_is_the_only_memory.md) — every fact/decision goes in the vault; the repo is workspace, PROGRESS.md is session state only

## Design laws (locked — do not re-litigate)
- [Every action must report](project_kpm_every_action_must_report.md) — silence is a bug, not missing polish; his words, unprompted
- [Dialog gate replaced all 69 confirms/prompts](project_kpm_dialog_gate.md) — never reintroduce window.confirm/prompt; a blocked dialog does nothing, so it can't explain duplicate data
- [Palette law: no blue, no green](project_kpm_palette_law.md) — slate-* IS the blue; gold never as text on light
- ["Lite mode" = performance, not white theme](feedback_kpm_lite_mode_means_performance.md) — borders exempt; nothing rotates
- [Receipt keeps KPM company blue](project_kpm_receipt_is_company_theme.md) — the nota is NOT app UI; palette law stops at the print block

## Current work
- [UI rework phases](project_kpm_ui_rework_phases.md) — 6-phase plan, Phase 5 COMPLETE; **login screen + app shell are the live front (2026-08-14)**; plan file path + locked decisions
- [MerchantSalesView redesign](project_kpm_merchantsales_redesign_brief.md) — sales-terminal TRAPS and locked decisions only; **the resume point is `.claude/NEXT-SESSION.md` in the repo** (one job, printed by the SessionStart hook with PROGRESS.md) — never search for it
- [Cost fix workflow](project_kpm_cost_fix_workflow.md) — **active**; stage 1 done (1acabca), stage 2 blocked on the benchmark question
- [Model tier benchmark: NEGATIVE](project_kpm_model_tier_benchmark.md) — **never set `model` on a subagent here, it kills it**; the real levers are agent count + scope. Also: one verification pass is evidence, not proof
- [Terminal: what to build next](project_kpm_terminal_next_features.md) — ranked plan + the region decision Aldi still owes; mobile stays as-is
- [Manual test checklist](project_kpm_manual_test_checklist.md) — MANUAL_TEST_CHECKLIST.md + SECURITY_RULES_DEPLOY_CHECKLIST.md at repo root
- [9router routing is unstable](project_9router_routing_is_unstable.md) — a dead tier silently kills specific tools (opus→Bash, haiku→WebFetch); check which route works TODAY first
- [Rules draft-and-report process](project_kpm_rules_draft_process.md) — firestore.rules is a DRAFT; never silently change `allow` lines

## Knowledge base
- [A-Brain wiki built](project_kpm_second_brain_wiki.md) — Raw/Inbox/Wiki structure and what's in it
- [A-Brain rename + Graphify wiring](project_kpm_abrain_rename_and_graphify.md) — vault path, graphify install, /save + /resume
- [Notes vault relocated](project_kpm_notes_vault_relocated.md) — own sibling folder + separate git repo
- [Alucard skill](project_kpm_alucard_skill.md) — advisor persona, benchmarked 2026-07-29, verdict KEEP

## Shipped and settled (read only if the topic comes up)
- [Batch 1+2 merged via PR #3](project_kpm_batch12_pr3.md) — a8fc57c, CI passed; **rules ARE deployed** (Aldi read the Console 2026-08-11 — the old "NOT deployed" claim was wrong)
- [Customer Directory permission tier](project_kpm_customer_directory_permission_tier.md) — emulator-tested AND live (CHANGE 6 confirmed in the Console 2026-08-11)
- [Option B region-lock](project_kpm_option_b_region_lock.md) · [Offline auth lockout fix](project_kpm_offline_auth_fix.md) · [Email doc-ID investigation](project_kpm_email_docid_bug.md) — all resolved
- [Customer/notification scoping](project_kpm_customer_notification_scoping.md) — why per-tier customer visibility is blocked
- [Phase 0+1 and Phase 3 committed](project_kpm_phase3_committed.md) — restore points 13fc5eb, cc12344
- Superseded fix logs, kept on disk but not worth loading: `project_kpm_fresh_review_2026_07.md`, `project_kpm_fresh_review_2026_07_26.md`, `project_kpm_batch1_permissions_fix_2026_07_26.md`, `project_kpm_noo_audits_fix_2026_07_25.md`, `project_kpm_batch2_unmerged_discovery.md`, `project_kpm_obsidian_claudian_vault.md`, `kpm_obsidian_integration_recommendation.md`
