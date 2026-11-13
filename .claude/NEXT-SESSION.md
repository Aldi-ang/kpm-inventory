# The one job

FULL REDESIGN, SCREEN 3 = AGENT INVENTORY (src/AgentInventoryView.jsx, ~650 lines; the salesman's own stock). Live before it: the Sales Terminal in direction B (cb8f5244) and Journey Plan in direction B (1f4b4011 + 040faf91, 2026-11-13). No new pick is needed (his 2026-11-11 "Then build one screen at a time, test it, show me, and push").

B's LANGUAGE, as built on both screens: `font-mono` on the screen root, flat ground, ruled lines instead of framed cards (a card grid = `gap-px bg-[var(--line-2)] border border-[var(--line-2)]` with `bg-[var(--panel)]` cards), a lit tab = a plain word with `border-b-2 -mb-px border-[var(--duke-amber-edge)]` (never a plate), amber only as an edge or an ink (`--accent-edge` / `--accent-ink`), the one main key cream (`bg-[var(--duke-paper-2)] text-[var(--duke-on-plate)]`), other keys outlines on `--line-3`, danger = `--danger` edge + `--danger-ink` text, 44 px controls on the phone, tables at lg, the day's numbers as one strip split by rules. Palette law: no blue, no green, and slate-* IS blue (swap it for tokens: --panel --raised --inset --line-2 --line-3 --ink --ink-muted --ink-dim). The file has 18 rounded-xl/2xl/shadow classes; 24 self-checks name it.

HOW: look only. `npm run build; node src/config/integration.audit.mjs` BEFORE the first edit; phone first, then PC. Find the lab flag for this screen in tools/ponder-lab.jsx (grep AgentInventory); URL http://localhost:4190/tools/ponder-lab.html?shell&... - the /tools/ path. Recolour big blocks with a node script that swaps class strings inside marked ranges (scratchpad), not sed: the heredoc gate blocks backslashes.

TRAPS (all met on Journey Plan): (a) BEFORE the first screenshot run tabs_context - a hidden pane returns a frozen, cropped frame; call mcp__ccd_view__show_pane "preview" and shoot right after; never agent-browser (hung 30 min). (b) the shell scrolls its own box (.print-reset.overflow-y-auto), not the window. (c) a % height in an auto grid track = the content's height. (d) checks pin the old look by class string: run the gates early, re-pin each with its reason, never delete one. (e) a colour class on an <a> inside Leaflet (or any library box) can lose to the library's own rule - measure the COMPUTED colour, force with ! if needed. (f) Tailwind 3 cannot put /90 on a var() colour - write the token plain. (g) convert the WHOLE visible surface before showing it. Never commit to branch game-edition.

AFTER Agent Inventory: EOD.

STILL OPEN, phone-side only (a Console rule he would publish, not this job): the database lets anyone with shop-edit access write assignedAgent and bundleReset (firestore.rules:751; the app shows both only to tier 1-4). Check CustomerManager.jsx:662 (KML import writes 'Unassigned') before drafting it; grep "CHANGE [0-9]" firestore.rules for the next number.

ANTIGRAVITY: its task (.claude/ANTIGRAVITY-TASK.md, the 38 findings, Status OPEN since 2026-11-11) waits for him to start it ("Do the task in .claude/ANTIGRAVITY-TASK.md"). When it says DONE: review, push, then write the queued one - a read-only audit of the whole Retur path, every way a return could be used for gain.

KEEP THIS FILE UNDER 7,000 CHARACTERS - ONE job. When a job is done, move its text to the top of NEXT-SESSION-archive.md and write the next one here.
