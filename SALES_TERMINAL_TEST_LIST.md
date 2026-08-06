# Sales Terminal — test list

Everything designed for the terminal is now built. This is the list to walk, in order.

**Before you start, run this.** It checks 105 things about the built app in one command and
takes seconds. If it fails, stop and send me the failure — no point testing by hand what a
machine already says is broken.

You are on Windows PowerShell, so use `;` between the two — `&&` is a Bash thing and
PowerShell rejects it with "not a valid statement separator".

```powershell
npm run build; node src/config/integration.audit.mjs
```

Run it from the project folder, the one holding `package.json`. In VS Code, Terminal → New
Terminal already opens there.

## How to report a failure

The useful report is **where you were and what you expected**, not "it's broken". For each
item below there is a note about what it depends on, so if it fails you can tell me which
half to look at.

Three tags I will act on differently:
- **BROKEN** — it does not work
- **UGLY** — it works but looks wrong, collapses, or overlaps
- **AWKWARD** — it works and looks fine but feels wrong to use

The UI collapsing you mentioned is almost always **UGLY at a particular width**. If you hit
one, tell me the browser width and whether the sidebar was open — those two facts usually
identify it immediately.

---

## A. The shelf

| # | Do this | Expect |
|---|---|---|
| A1 | Look at the shelf on a wide screen | 3 wares a row. If 2, note your window width and whether the sidebar is open |
| A2 | Open and close the sidebar | Layout re-flows cleanly both ways, nothing overlaps |
| A3 | Hover a ware (mouse) | Two thin gold corner brackets close in. No lift, no light sweeping across |
| A4 | Hover a ware's picture | The box turns slowly |
| A5 | Press a ware's picture | Its stock opens — in the rail on desktop, under the card on a phone |
| A6 | Press the same picture again | It closes |
| A7 | Press anywhere else on the card | Adds 1 to the manifest, merchant reacts |
| A8 | Press `/` | Cursor jumps to the search box |
| A9 | Type in search, then press `/` | Nothing happens — it must not steal the key while you type |

## B. The rail (desktop, wide window)

| # | Do this | Expect |
|---|---|---|
| B1 | Nothing selected, nothing pinned | Today's takings, vs yesterday, stores done, last customer, running low |
| B2 | With GPS on | "Next stop" with distance and how many are left, plus Directions |
| B3 | Press Directions | Google Maps opens in a **new tab** — the terminal stays open behind it |
| B4 | Pin a ware | Rail shows that ware: 3D box, its mm, stock as Karton/Bal/Slop/Bks |
| B5 | Press "Examine in 3D" | Full 3D view **scales up**, does not just appear |
| B6 | Choose a customer | Rail becomes their brief. The pin must clear itself |
| B7 | Choose a customer with no history | "No order in the last 7 days" — not the day's takings |

## C. The customer brief

| # | Do this | Expect |
|---|---|---|
| C1 | Choose a customer from the dropdown | It **sticks**. The name must not blank itself |
| C2 | Choose a store you sold to today | A double-tap warning. Cancel it — your typing must survive |
| C3 | Choose a customer who owes money | Red "Owes" block with the age in days |
| C4 | Press "Same as last time" | Manifest fills with their last order |
| C5 | Same, but a ware is now empty or low | It tells you what it dropped or clamped. It must never load stock you do not have |
| C6 | Same, during a retur | Button disabled |

## D. Money — the part that must be exactly right

| # | Do this | Expect |
|---|---|---|
| D1 | Add a ware, type 1 Karton + 1 Bal + 1 Slop + 1 Bks | Total matches that product's packing. Check against the grey line under the boxes |
| D2 | Read the grey rate line | Matches what you set in the master vault for that product |
| D3 | Change packing in the master vault, come back | The rate line and the total both follow the new numbers |
| D4 | Sell a Karton of something with real stock | Stock drops by the right number of Bks |
| D5 | Commit a sale with 3+ lines and product photos | It saves. **This used to fail outright** — the 1 MiB limit |
| D6 | Check the printed nota | Still blue, still KPM's design. Unchanged on purpose |

## E. The merchant

| # | Do this | Expect |
|---|---|---|
| E1 | Idle | Stands in his cave, torches lit |
| E2 | Add a ware | Talks, mumbles, bubble above his hat |
| E3 | Choose a customer | Talks — but says something about opening their page, **not** "one more" |
| E4 | Scroll the shelf down far | He leaves the cave and **slides in** from the right corner |
| E5 | Scroll back up | He leaves and returns to the cave |
| E6 | While he is in the corner | Only **one** capybara on screen, ever |
| E7 | Commit a sale | Deal pose with the coin, **above the receipt**, not hidden behind it |

## F. Phone (narrow the browser, or use your phone)

| # | Do this | Expect |
|---|---|---|
| F1 | No customer chosen, GPS on | Strip shows next stop + a "Go" button |
| F2 | Choose a customer | Strip becomes their brief + "Same as last time" |
| F3 | Add something to the manifest | Strip **collapses to one line**, keeping only the debt |
| F4 | Press a ware's picture | Stock breakdown opens under that card, full width |
| F5 | Press "Examine in 3D" in that panel | Opens the 3D view |
| F6 | Tap a ware, then tap elsewhere | No brackets or spinning box left stuck on the tapped ware |
| F7 | Everything you press | Nothing feels too small. Tell me anything that does |

## G. Nothing old was lost

These existed before the redesign. They must still work.

| # | Do this | Expect |
|---|---|---|
| G1 | Retur mode → Buyback | Works, muted red, no emoji |
| G2 | Retur mode → Exchange | Works, muted gold |
| G3 | Mark a returned item Damaged | Reason dropdown appears and is required |
| G4 | Exchange → Hutang Barang (IOU) | Creates an IOU |
| G5 | Customer with a pending IOU | Banner appears, Fulfill works |
| G6 | New outlet (NOO) registration | Full flow, live photo required |
| G7 | Sampling | Deploy Marketing Sample works |
| G8 | Stand out of range of a store | Geofence blocks the sale; bypass request works |
| G9 | Lite Mode on | Nothing animates, but hover still responds and the merchant still reads as solid |

---

## What I already know is NOT built

So you do not waste time looking for these:

- **Regional warehouse stock in the rail** — designed, decided (own region only), not built
- **Manual store picker when GPS never gets a fix** — designed, not built
- **Leaderboard as an EOD snapshot** — planned, blocked on the Firebase work

## What I cannot test from here

I have no browser view of your app, so **every visual and every feel judgement is yours**.
The audit proves the code is present and wired; it cannot prove it looks right at your
window size, on your screen, with your data. That is the half you are doing.
