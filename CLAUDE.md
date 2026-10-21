## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Context Navigation (3-layer rule)

1. **First:** query `graphify-out/graph.json` (via `graphify query`/`path`/`explain`, see above) for
   code structure and connections.
2. **Second:** check the A-Brain vault for decisions, past incidents, and lessons learned —
   `D:\APP DEVELOPMENT\kpm inventory main FILES\A-Brain\Wiki\Index.md`. Especially worth
   checking for recurring-looking bugs — see `Wiki/Concepts/UI-Says-Yes-Server-Says-No Pattern.md`
   and `Wiki/Concepts/Anti-Recurrence Check.md` in that vault, and
   `Wiki/Entities/Fleet Captain Permission Gap.md` if a tier/role check looks involved.
3. **Third:** only read raw code files when editing, or when layers 1-2 don't have the answer.

Don't re-read the whole codebase or the whole vault by default — both are structured precisely
so you don't have to.

## Publishing (a push IS the live app)

Aldi, 2026-10-19: *"actually i like it this way that u can push it yourself make sure the cloud session can do that too"*.
Aldi, 2026-10-21: *"can u push it automatically next time u dont need my permission for that becuase its nothing to lose, put that  in automation workflow as well"*.
Full workflow: A-Brain `Wiki/Concepts/Publishing a Fix.md`.

- A push of `phase0-solid-ground` to GitHub is the live app: Vercel builds it. `main` is not live.
- Push yourself, without asking, at the end of every FINISHED job (built, gates green, rendered if visual) -
  and whenever he says publish / push / "fix the publish". No approval window, and none should be added.
  Still stays local: a half-done job, a lab-only board waiting on his pick, anything with a red gate.
- Before the push, after the LAST edit: `node src/config/logicFixes.selfcheck.mjs`, `npm run build`,
  `node src/config/integration.audit.mjs`, all green; `git rev-list --count HEAD..origin/phase0-solid-ground` = 0.
- After: `git fetch`, confirm `origin/phase0-solid-ground` is your commit, give him the hash (the vault
  card shows "Latest version · <hash>").
- Firestore rules are never part of a push. He publishes them in the Console; a rule the code needs goes first.
- Cloud session: `git push origin HEAD:phase0-solid-ground`. If the cloud refuses (it may allow only its own
  branch), push the session branch and tell him it is NOT live until the PC merges it.
