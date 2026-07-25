# KPM Inventory — Manual Test Checklist

Use this before every release, not just once. Check boxes as you go — if something fails, stop and fix before continuing down the list. Ordered by how much damage a bug there could cause, most dangerous first.

## 🔴 Business-critical — test every single release

- [ ] EOD verify → stock routing: Salesman EOD → stock lands in their branch. Tier 1/2/3 EOD → stock lands in Master Vault. Same ticket never double-credits across 2 verifications.
- [ ] Damaged goods pipeline, end-to-end: Mark damaged → EOD shows it → verify → Master Vault's damaged stock increases by exactly that amount → Quarantine Ledger clears the ticket → Sample/RTV/Penalty reduces damaged stock correctly.
- [ ] Permission matrix, per tier: For each tier — Reports shows the right data scope. Sidebar hides the right buttons. A tier set to "No Access" truly can't reach the tab by any route (direct nav, deep link, browser back button).
- [ ] Cash & payment integrity: Exchange/Retur transactions never save as "Cash." Receipt always shows the Fleet-registered name, never the Google account name (online AND offline).
- [ ] Offline login: Log in online once, go offline, refresh the page. Real employees must not get locked out. A genuinely unregistered email, while online, must still correctly show Access Denied.
- [ ] Cross-company isolation: An employee from Company A can never read or write Company B's data, by any route.
- [ ] Employee self-write escalation check: A signed-in user cannot write arbitrary fields (especially `bossUid` or `userRole`) to their own directory record beyond what's explicitly allowed.

## 🟠 Data integrity — test after any related change

- [ ] Race conditions: Two people editing the same product's stock at the same moment — does the second write correctly protect against overwriting the first?
- [ ] Firestore batch limits: Force a large backup restore, a big Stock Opname count, a bulk fleet edit — confirm none hit 500 ops and fail silently.
- [ ] Photo storage toggle: With the toggle off (default), photos save as base64 and display correctly. If ever switched on, confirm Storage upload + fallback-on-failure both work.
- [ ] Region-lock roster edits: A delegated Area Admin or Fleet Captain (with roster permission on) can hire/fire within their own region, correctly blocked outside it. The Owner/Tier 1 remains unrestricted. Location-transfer of an existing agent still works.
- [ ] Fleet paintbrush: Tier 1-4 can see and use it (if the company-wide toggle is on); Tier 5/6 never see it. Saves actually persist after a refresh, not just visually.

## 🟡 Edge cases — test when touching that specific code

- [ ] Empty states: zero stock, zero transactions today, zero damaged tickets — renders a real "nothing here" message, not a crash or `undefined`.
- [ ] Boundary values: exactly at minStock, exactly 0 stock, negative quantity typed into a form field.
- [ ] Timezone edge: a sale made at 11:58 PM — does "today" mean the same thing to the agent and to HQ?
- [ ] Brand-new device, offline, first-ever login: shows the honest "Can't Verify You Yet" message, not a false Access Denied.
- [ ] Email-as-document-ID inputs: a typo'd email (stray `/` instead of `.`) shows a friendly validation message, not a raw Firebase error.

## ⚪ Skip entirely

- Pure UI styling/color changes (unless they hide a real state, like a badge that should show a warning).
- The RE8 reskin, animations, 3D rotation — cosmetic, not correctness.

## After deploying a Firestore Security Rules change specifically

(See `SECURITY_RULES_DEPLOY_CHECKLIST.md` for the full process — this is just the quick in-app confirmation subset)

- [ ] Log in as Tier 1, 2, and at least one lower tier — normal access still works
- [ ] Try the specific thing the rule change was meant to fix/restrict — confirm it actually behaves differently now
- [ ] Watch the browser console for any new, unexpected `permission-denied` errors
