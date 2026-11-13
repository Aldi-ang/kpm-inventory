# The one job

MAP PINS BUILT, NOT COMMITTED, NOT LIVE (2026-11-13 19:46) - his "build it but i want to see it on action first". Working tree only: mapSprites.js (shopHtml, shopIconBox, groupHtml, flagSvg + cloth, at the end), expedition.css ("the professional map pins", at the end), JourneyView (import, getStoreIcon, cluster icon, ShopNames .kx-grp, the moment window 1500 -> 2400 ms / 1600 -> 2500 so the 2.24 s gust finishes), DayReplay (shopHtml + shopIconBox). Seen working in the lab ?shell&journey&exp&visits&tick: a planted flag's svg clock ran 0 -> 1.9 s with 56 SMIL parts, swapped to the still copy after 2.24 s; 375 px no sideways scroll. Pixel men NOT changed (stage 2, his call). WHEN HE SAYS OK: delete the orphaned chest code (chestHtml, slotHtml, CHEST5/SIGN5/STILL/SPRITE_CSS users, the .kx-c5 chest + .kx-slot CSS) or keep it - check its other users first; re-pin the 2 failing checks (crowd re-run: slotHtml call in JourneyView; replay scene: chestHtml in DayReplay) with his words; patch note; gates; push. If he wants changes: the board flag() and mapSprites flagSvg are the same code.

HIS REVIEW PAGE of the redesign (before / now at phone width, 2026-11-13): https://claude.ai/artifact/DBBCoC74eK6mGRr7JyCGtq - its "before" pictures came from putting the morning's six screen files back for a minute (git checkout e8d820aa -- <files>, then git checkout HEAD -- <files>); the code is the live version.

ALSO WAITING ON HIM: which screen the redesign does next (Sales Terminal, Journey Plan, Agent Inventory, EOD are live in direction B). The B language and its traps are in NEXT-SESSION-archive.md (the Agent Inventory and EOD blocks at the top).

ANTIGRAVITY: its task (.claude/ANTIGRAVITY-TASK.md, the 38 findings, Status OPEN since 2026-11-11) waits for him to start it ("Do the task in .claude/ANTIGRAVITY-TASK.md"). When it says DONE: review, push, then write the queued one - a read-only audit of the whole Retur path, every way a return could be used for gain.

KEEP THIS FILE UNDER 7,000 CHARACTERS - ONE job. When a job is done, move its text to the top of NEXT-SESSION-archive.md and write the next one here.
