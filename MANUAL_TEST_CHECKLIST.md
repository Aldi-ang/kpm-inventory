# KPM Inventory — Manual Test Checklist

Use this before every release, not just once. Check boxes as you go — if something fails, stop and fix before continuing down the list. Ordered by how much damage a bug there could cause, most dangerous first.

## 🚨 Before you say "done" or commit anything — do this EVERY time

This has already happened TWICE: real, correct code was written, but the commit that actually
landed on `main` didn't contain it — only a `package.json` version bump did. The commit
*message* said the feature was added. The commit *diff* did not. Nobody caught it until a much
later session went looking.

The fix is one boring habit, done every single time, no exceptions:

- [ ] Before writing your commit message, run `git diff --cached --stat` (or `git status` +
      `git diff --cached`) and actually read the file list it prints.
- [ ] Take the commit message you are about to write and list every file/feature it claims to
      touch.
- [ ] Match those two lists side by side. Every file named in the message must actually appear
      in the staged diff — not "should be there," actually there.
- [ ] If they don't match: STOP. Do not commit. Figure out why (forgot to `git add` a file? in
      the wrong worktree/folder? edited a copy that isn't the real project file?) before trying again.
- [ ] Same rule applies to a plain-English summary you give the project owner at the end of a
      task ("I changed X, Y, Z") — diff the real commit against that sentence before you say it,
      not just before you type `git commit`.

This is not just for big features — apply it to every commit, even a one-line fix. It costs
30 seconds and it is the exact check that would have caught both past incidents before they
ever reached `main`.

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
- [ ] Customer Directory edit tier: View Only hides the whole Add/Edit form (directory still browsable). Own Region can edit a store whose Kabupaten matches their own branch/area name, is blocked from a different one (with a clear "Outside your region" message, not a silent failure), and CAN still edit legacy/unmapped stores. Global is unaffected. A company that never touches this setting sees zero change (default = Global).

## 🟡 Edge cases — test when touching that specific code

- [ ] Empty states: zero stock, zero transactions today, zero damaged tickets — renders a real "nothing here" message, not a crash or `undefined`.
- [ ] Boundary values: exactly at minStock, exactly 0 stock, negative quantity typed into a form field.
- [ ] Timezone edge: a sale made at 11:58 PM — does "today" mean the same thing to the agent and to HQ?
- [ ] Brand-new device, offline, first-ever login: shows the honest "Can't Verify You Yet" message, not a false Access Denied.
- [ ] Email-as-document-ID inputs: a typo'd email (stray `/` instead of `.`) shows a friendly validation message, not a raw Firebase error.

## 🆕 This update: Trophy Room & Career Ledger (Phases 0-8) — test before pushing to Vercel

Nothing in this update has been committed to git yet — it's all sitting as uncommitted changes for
you to review first. Everything below was already tested once during development (emulator +
live browser), but test it again against your real data before it goes live, since the emulator
data isn't the same as your real company's data.

**How to test:** the app is already running locally at http://localhost:5173 — open that in your
browser and log in with your real account. This talks to your REAL Firebase project (not a fake
test one), so anything you do here is real — don't verify a real EOD report you don't want verified.

- [ ] **App loads at all.** Log in, dashboard shows up, no blank white screen, no red errors in
      the browser console (F12 → Console tab).
- [ ] **Offline sale doesn't get lost** (Phase 0): turn on airplane mode / DevTools "offline"
      checkbox, record a sale, go back online — the sale appears exactly once, not zero times,
      not twice.
- [ ] **EOD verify still works, still gives correct XP/rank** (Phase 2-4): verify one real EOD
      report as normal. If "Use Career Ledger for Rank" is OFF in Settings → Security, rank/XP
      should look exactly like before (old formula, unchanged). If you turn it ON, rank/XP should
      still make sense (not blank, not negative, not stuck at zero).
- [ ] **"Hitung Ulang Karir" button** (Settings → Security, Company Owner only): click it once,
      confirm it doesn't error out and gives you a summary of how many agents/reports it processed.
      Click it a **second time immediately** — numbers should not double.
- [ ] **New agent hire date field** (Fleet Canvas → add/edit agent): a date picker should appear;
      saving it should stick after a refresh.
- [ ] **Agent Profile screen renders** (open any agent's profile): rank border animates smoothly
      (no visual glitch), badges grid shows the category tabs (Penjualan / Keandalan / Masa Kerja /
      Wilayah / Tim / Seru) and they filter correctly, avatar has a small camera icon in the corner
      (always visible, not just on hover).
- [ ] **Grant Award form** (Agent Profile, if you have permission): fill title + a reason of at
      least 10 characters + XP amount, submit — confirm it saves without error and the agent's XP
      goes up by that amount.
- [ ] **Stock Opname attribution** (Phase 7 — the actual bug this phase fixed): have a real
      Tier 5 field agent (not you, not the Company Owner account) submit a stock count. Check that
      it's recorded under THEIR name/ID, not under the Master Vault or company owner.
- [ ] **New customer registration (NOO)** still saves correctly, online and offline, and is now
      tagged with which agent registered it (check the customer's Firestore doc has a
      `mappedById` field, or just confirm registration itself doesn't error).
- [ ] **Mobile/touch check** (Phase 8 — resize your browser narrow, or open on your phone):
      avatar upload buttons, delete buttons, and small icon buttons are all visible without
      needing to hover a mouse over them (there is no mouse on a phone). Offline indicator sits
      near the bottom-right, doesn't overlap other buttons.
- [ ] **Nothing from before this update broke:** run at least the 🔴 Business-critical section
      above once (EOD → stock routing, permission matrix, cash/payment integrity) — this update
      touched `App.jsx` and several shared views, so a quick pass there catches any accidental
      side effect.

If anything on this list fails: don't push to Vercel. Come back and say what broke — the exact
button, the exact error message if there is one, and what you expected instead.

### Round 2 — fixes for the bugs you found on the first local test

- [ ] **Lite Mode no longer hides the sidebar.** Turn Cello Lite Mode ON. The left sidebar menu
      must still show all its items. Turn it OFF and ON a few times. Also check the Capybara
      speech bubble and the Map Mission Control slide-in panels still appear with Lite Mode ON —
      the same bug was silently affecting those too.
- [ ] **Hamburger button is back at top-left** (only visible on phone/tablet width, not desktop).
- [ ] **SYNCED / OFFLINE indicator is back in the top bar** next to the notification bell.
- [ ] **Journey Map is faster.** Open Journey View on a phone. Zoomed out, stores should now
      group into numbered orange circles instead of hundreds of separate pins. Zoom in past a
      point and individual pins appear again. Tap a cluster — it should zoom/split open.
- [ ] **Journey Map "Adjust Pin Location" still works.** Pick a store, start editing its pin,
      and confirm you can still drag it while zoomed out (it must not get swallowed into a
      cluster circle). Save and confirm the new position sticks after refresh.
- [ ] **Hitung Ulang Karir now talks to you via the Capybara** on failure too, not just success —
      try it on a narrow window (under 1024px wide) and you should get a Capybara message saying
      it's desktop-only, instead of a plain browser popup.
- [ ] **New: Achievement Tester** (Settings → Architect tab, Tier 1 only). Type numbers into the
      stat boxes and watch badges light up. It writes nothing, so you can't break anything with
      it. Check that the badge list it shows matches what you configured in Achievement Config.

### 🚨 READ THIS BEFORE YOU TOUCH THE CAREER LEDGER TOGGLE

**Do NOT turn "Use Career Ledger for Rank" ON yet.** The rank thresholds are on the wrong scale
for the new XP system, and flipping it would drop every agent to the lowest rank.

I re-verified this myself with the real code, and the numbers are exact:

- Your rank thresholds are old-formula, raw-rupiah numbers — Silver `25.000.000`,
  Gold `100.000.000`, Mythic `1.000.000.000` (`AgentProfileView.jsx:174-178`).
- The new XP scale is ~100.000× smaller: `Rp 100.000 collected = 1 XP`.
- **Measured:** an agent with 3 years tenure, Rp 5 miliar collected and 900 verified days earns
  **86.975 XP** — and would still be **Bronze**.
- To reach Silver on money alone you'd have to collect **Rp 2,5 triliun**.

Nothing is broken right now, because the toggle defaults to OFF and rank still uses the old
formula. It only breaks the moment you switch it on. The fix is a business decision about your own
numbers, so I haven't touched them — see item 0 in
`A-Brain/Backlog/Follow-up fixes after Trophy Room update.md` for the two options.

- [ ] Decide the new rank thresholds (in XP units) before enabling the toggle.

### Round 3 — the morning test list (start here)

I re-drove the whole app before handing this over: all 14 screens render, **zero console errors**,
no horizontal scrolling at 375 / 800 / 1280px. Below is what I could NOT verify myself, ordered
by what would hurt most if it's broken. Anything I already proved is marked so you can skip it.

**Must check — I could not verify these myself**

- [ ] **Achievement Tester renders** (Settings → Architect tab). I couldn't open it — Settings is
      behind your Master Vault PIN and I won't enter a PIN. Type numbers into the stat boxes and
      confirm badges light up. It writes nothing, so it cannot damage anything.
- [ ] **Sidebar with Lite Mode OFF.** I proved Lite Mode ON is fixed. Lite Mode OFF I could not
      fully prove because the test browser doesn't run animations — and that sidebar only becomes
      visible *when its animation finishes*. Toggle Lite Mode off and confirm the menu still shows.
- [ ] **Journey Map "Adjust Pin Location"** — pick a store, drag its pin while **zoomed out**,
      save, refresh, confirm the new position stuck. This is the one thing clustering could
      plausibly break.
- [ ] **Anything that writes data** — record a sale, verify an EOD, submit a stock count. I stayed
      read-only on purpose because this is your real live company database.

**Already verified — spot-check only**

- [x] Journey Map clustering works — measured on your real data: 19 cluster bubbles + 32 individual
      pins. Zoom out to see bubbles, zoom in past a point to see pins.
- [x] Sync pill sits beside the notification bell at every width, no longer overlapping the theme
      button (it used to collide at tablet width — that's fixed).
- [x] Hamburger back at top-left, phone/tablet only, now a proper 44×44 touch target.
- [x] Sidebar visible with Lite Mode ON (17 menu items, opacity 1).
- [x] All 14 screens load with no errors.

**Known, NOT fixed — don't report these as new bugs**

- [ ] Agent Profile gets cut off sideways on a phone. This is **pre-existing**, not from this
      update — I proved it by turning my new code off and measuring the same 87px overflow. It's
      written up in the follow-up plan.
- [ ] Rank border gallery — the 7 border styles and the per-rank Border dropdown ARE built now
      (`src/config/rankBorders.jsx`). The "unlockable by achievement, agent picks their own" half
      is still open — right now you assign a border per rank, agents don't earn them.
- [ ] Firestore rules still **not deployed**. Unchanged and deliberate — only you deploy rules.

Full write-up of everything found and deferred:
`A-Brain/Backlog/Follow-up fixes after Trophy Room update.md`

### Round 4 — border designs + Tier 1 dev tools

Everything here is in **Settings → Architect tab** (Tier 1 / you only), except the Border picker.

- [ ] 🚨 **READ THIS FIRST — do NOT turn on "Use Career Ledger for Rank" yet.** While building the
      EXP modifier I found the rank numbers (Silver 25.000.000, Gold 100.000.000…) are on the old
      raw-rupiah scale, but the new system gives 1 XP per Rp 100.000 collected. A 3-year agent with
      Rp 5 miliar collected only earns ~87.000 XP — so **everyone would be stuck at the lowest rank
      forever**. The numbers need lowering in Rank Config first. Full explanation + suggested
      numbers are in the follow-up plan. The dev tools show a red warning about this automatically.
- [ ] **Border gallery renders** — 7 borders, each a spinning/glowing ring around a dummy avatar:
      Classic Sweep, Sentinel Sweep, Aura Pulse, Sentinel Beacon, Emblem Studs, Tier Segments,
      Gyro Array. Confirm none of them look broken or invisible.
- [ ] **Pick a border per rank** — Agent Profile → Rank Config → the new **Border** dropdown on each
      rank row. Save, then open an agent on that rank and confirm the frame changed.
- [ ] **Borders survive Lite Mode** — turn Cello Lite Mode ON and re-check the gallery. They should
      stop moving but still look like proper borders (I verified this by deleting the animations
      entirely and confirming all 7 stay visible — but confirm it looks right to your eye).
- [ ] **EXP modifier** — pick an agent, press +1.000, confirm Total XP goes up and the Capybara
      speaks. Try the free-number box too.
- [ ] **Jump to rank** — press a rank button, confirm Total XP lands exactly on that rank's number
      and "Rank sekarang" updates.
- [ ] **Unlock/lock badges** — press a badge to force it open, confirm it turns coloured; press
      again to re-lock it.
- [ ] **⚠️ Undo works — test this before trusting the tools on a real agent.** After granting XP and
      badges, press "Batalkan semua perubahan dev". XP must return to exactly what it was and only
      the dev-granted badges disappear. I proved this maths with assertions (it's exactly
      reversible, double-undo doesn't double-subtract, real badges survive) — but confirm on a real
      agent once.
- [ ] **Not verified by me:** these panels sit behind your Master Vault PIN, which I won't enter,
      so I could not open the screen. The logic and the border rendering were both verified
      separately, but you are the first person to actually see them on screen.

### Round 4 — Phase 1 of the rework (bug fixes + readability)

The big one this round: **your badges were never going to unlock.** The Achievement Config "Data
Source" dropdown offered 7 stats, but 6 of them don't exist in the career system — and "Add New
Badge" defaulted to one of the broken ones. So every badge you ever created was born stuck at 0%.
That's what "the test achievement isn't working in the agent profile" actually was.

- [ ] **Achievement Config → Data Source** now lists only real stats with readable names
      (Cash Collected, Items Moved, Stores Served, Days Served…). No `storesserved`, no dead options.
- [ ] **Make a new badge with a low target** (e.g. Items Moved, target 1) → it should actually show
      progress and unlock, not sit at 0%.
- [ ] **Check a badge you made earlier.** If it used one of the dead stats it now shows an amber
      warning telling you to pick a new source. Change it and confirm it starts tracking.
- [ ] **Achievement Tester**: typing replaces the `0` instead of appending to it; labels read as
      words; a broken stat shows a greyed-out box with a warning instead of a dead input.
- [ ] **Rank Config → EXP Required** shows `250.000` not `250000`, and still saves the right number.
- [ ] **Career Dev Tools → Ubah EXP** field groups digits the same way.
- [ ] **Rank defaults are now XP-scale** (Silver 5.000, Mythic 250.000) instead of the old
      rupiah-scale numbers that would have frozen everyone at Bronze.
- [ ] **Border gallery** load labels now read "Beban: Ringan / Sedang" in one language.

**Journey Map** — measured before/after on your real data:

- [ ] Zoomed out, region names **no longer pile into mush**. They now appear on hover, or when you
      select a region. (Permanent labels dropped from ~90 to **0** at rest — that was ~90 DOM nodes
      being repositioned every zoom frame.)
- [ ] Map feels faster panning/zooming **on your phone** — that's the real test, my browser can't
      judge it.
- [ ] **Tapping a kecamatan now visibly highlights its polygon.** This was silently broken before
      (the code set a style that React was ignoring), so it never worked at all.
- [ ] **Pin drag still works while zoomed out** — regression check, this is the one thing the
      clustering could plausibly break.
- [ ] Store name tooltips no longer bind on phones (useless without a mouse).

Verified by me: 19 cluster bubbles + 32 pins still render correctly, all 32 at distinct positions,
zero console errors across 5 screens, build clean, `career.js` self-check passing.

**New regression guard:** `node src/config/career.js` now asserts that every stat a badge can be
built on actually exists. That's the check whose absence let the dead-source bug ship — if anyone
adds a fake stat again, the self-check fails immediately.

### Testing on your real phone without deploying

You don't have to push to Vercel to test touch behaviour. Run this instead of the normal dev
command, then open the "Network" address it prints on your phone (same WiFi):

```bash
npm run dev -- --host
```

### Round 5 — Restock Vault + Executive Targets on the theme tokens

This round has **no logic changes at all** — only colours. What changed is that the Restock Vault
pair and the Executive Targets strip stopped using blue, purple, emerald and slate, and moved onto
the same tokens the Dashboard and Manifest already use.

The thing worth looking at: those screens used **blue for "HQ / shipping" and purple for "branch"**.
Both are banned by the palette, so identity is now carried by **gold vs plain steel** instead of by
two hues. Meaning-colours are untouched: orange still = pending/warning, red still = rejected,
verified still = delivered.

- [ ] **Restock Vault → order timeline**: the status chips (PENDING / APPROVED / IN_TRANSIT /
      DELIVERED / REJECTED / SYSTEM_EDIT) are all still readable and still tell each other apart.
      SYSTEM_EDIT is deliberately the grey one now.
- [ ] **Every gold button** (Set Production Goal, Save Shipping Data, Add to Cart, Submit Request,
      Ship Items) has **dark text, not white**. White on gold measured 2,0:1 — it was unreadable and
      that's now fixed. If any gold button still shows white text, tell me.
- [ ] **Hover over the small icon buttons** in the order cards — they still visibly change. Two
      different greys collapsed into one token, so I re-stepped the hover; this is the check for it.
- [ ] **Print a Goods Received Note** (Restock Vault → an accepted order → Print Document).
      It must still come out as **white paper with black ink**, exactly as before.
      That receipt is a deliberate exception to the palette and keeps fixed print greys.
- [ ] **Dashboard → Executive Targets**: the three cards (Monthly Trajectory, Daily Volume,
      Product Shift) — the progress bars and the little pie are readable, and the Filter/Kretek
      split is still tellable apart at a glance (it's steel vs orange now, not blue vs orange).
- [ ] **Adjust Goals modal** still opens, saves, and the numbers still stick.
- [ ] **Lite Mode ON** — same screens, everything still legible.
- [ ] **Light mode** — same screens, nothing washed out.

Verified by me: build clean (`EXIT=0`), `career.js` self-check passing, and the whole diff is
class-strings only — no calculation, no Firestore call, no handler was touched. **Not** verified by
me: how it actually looks. These screens need a real login, so the eyeballing is yours.

### Round 6 — the capybara merchant, sounds, and the desktop grid

All of this is MerchantSalesView. Nothing here touches money or stock **except one thing**,
which is first on the list because it is the only item that can cost you real inventory.

**🔴 Test this one first — it moves stock**

- [ ] **Sell 1 `Karton` of something.** Check the stock drops by `balsPerCarton × slopsPerBal ×
      packsPerPack` — with your defaults that's about **800 Bks**, not 1. The `Karton` option was
      missing from the dropdown even though the pricing maths already handled it, so this path has
      never been used in the real app. If the number looks wrong, stop and tell me.

**The merchant**

- [ ] Complete a sale. The capybara **shows up in the bottom-right corner**, says a line, and
      **leaves on his own** after about 8 seconds. He does *not* sit permanently on the left
      any more — that whole panel is gone and the space belongs to the wares now.
- [ ] He appears **only when the sale commits**. Add ten items to the cart — he should stay
      away the entire time. If he pops up while you're building a basket, that's a bug.
- [ ] The **coin spins above his open palm**, and he's giving a thumbs up with the other hand.
- [ ] The **speech bubble sits above his hat**, not across it.
- [ ] Tap him — he goes away early.

**Sound** (needs volume up)

- [ ] You hear a short **mumble** when he speaks — a few blips, not a voice. It should stop
      after about a second even on a longer line.
- [ ] **Lite Mode ON → completely silent**, and he holds still instead of animating.

**Desktop, on a laptop or PC**

- [ ] At a normal laptop width, the wares **fill the screen in rows** instead of scrolling
      sideways. This is the change most worth your eye — I can't reach that screen without a
      login, so it's verified as CSS but not as pixels.
- [ ] On a **phone, nothing changed**: the wares still swipe sideways as before. If your phone
      layout looks different, that's a bug, not a feature.
- [ ] On a big monitor the cart panel is wider and the grid still fills the rest.

**Regression checks — these are the ones I'd worry about**

- [ ] **Retur still works**, both BUYBACK and EXCHANGE, with the damage reason and the IOU
      switch. I didn't touch that code, but it lives in the file I edited most.
- [ ] **Printing a receipt** still comes out right, thermal and A4.
- [ ] Turn WiFi off and open the app: the **merchant still appears**, the **coin still spins**,
      and the **mumble still plays**. All three used to fail offline — none of them were in the
      service worker.

Verified by me: build clean every commit, `useSound` self-check 6/6, sprite transparency
measured at 69,5% after cleaning (the art arrives with a white background painted in), coin
position measured against the palm rather than eyeballed, and the desktop rule confirmed inside
a 1280px media query in the built CSS. **Not** verified by me: anything that needs a login —
so the merchant appearing on a real sale, the sound, and the desktop grid are all yours to see.

Also removed along the way, worth knowing: **five verbatim Resident Evil 4 merchant lines** were
shipping inside your app's JavaScript. They're gone, replaced with original English lines.

## ⚪ Skip entirely

- Pure UI styling/color changes (unless they hide a real state, like a badge that should show a warning).
- The RE8 reskin, animations, 3D rotation — cosmetic, not correctness.

## After deploying a Firestore Security Rules change specifically

(See `SECURITY_RULES_DEPLOY_CHECKLIST.md` for the full process — this is just the quick in-app confirmation subset)

- [ ] Log in as Tier 1, 2, and at least one lower tier — normal access still works
- [ ] Try the specific thing the rule change was meant to fix/restrict — confirm it actually behaves differently now
- [ ] Watch the browser console for any new, unexpected `permission-denied` errors
