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
