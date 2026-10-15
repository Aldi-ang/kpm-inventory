---
name: project-kpm-email-docid-bug
description: "Investigation into the \"gmail/com\" Firestore doc-path crash during agent registration — no code bug found; added a defensive email-format guard instead"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7d2121b6-4ca0-4f59-b71e-9c415c5ffa5c
  modified: 2026-07-25T00:54:13.360Z
---

Investigated 2026-07-24: live testing showed "Authorize & Register" (FleetCanvasManager.jsx, `handleSaveAgent`) crash with `Invalid document reference... theonlygilgamesh@gmail/com has 5` segments — a period apparently turned into a slash.

**Exhaustive investigation found NO code bug that converts `.` to `/`.** Checked every `employee_directory` write site (FleetCanvasManager.jsx, LandlordDashboard.jsx, CrownTransferProtocol.jsx, App.jsx) — all use the safe `doc(db, collectionPathString, docIdString)` two-argument form, none contain a `.replace()` or sanitizer touching email. Empirically verified with the real Firebase SDK (`node` script, no network needed — `doc()` path construction is synchronous): the exact email `theonlygilgamesh@gmail.com` through the exact code path in `handleSaveAgent` produces a correct 4-segment path with the period intact. Also empirically reproduced the EXACT reported error by feeding `doc()` an email string that already contained a literal `/` — proving the malformed value must have entered the `email` input field's raw value itself (typo, or an OS/keyboard autofill quirk), not a transformation bug in this codebase. `git log -S` across all history for this line shows `emailKey` has always been plain `.toLowerCase().trim()`, never a replace — not a regression either.

Also logically resolved investigation point 4's live-data question without needing DB access: since this is a *client-side SDK validation error thrown before any network request*, it is **impossible** for a malformed doc like this to exist in the live database — the write never leaves the browser.

**The fix applied instead**: since no root-cause code bug could be found, but this exact failure mode (any `/` in a user-typed email breaks Firestore doc-ID construction) is real and worth guarding against regardless of cause, added a shared `isSafeDocIdEmail()` helper to `utils/helpers.js` and applied it at both places in the codebase that use a raw user-typed email directly as an `employee_directory` document ID: `FleetCanvasManager.jsx`'s `handleSaveAgent` (the exact reported site) and `LandlordDashboard.jsx`'s `handleCreateTenant` (same risk, same collection, previously unguarded). Rejects only `/` and other doc-ID-breaking characters — periods are fine and unrestricted, matching Firestore's real rules.

**How to apply**: if this exact crash resurfaces, check first whether the input is genuinely a typo/autofill issue (the guard should already catch it and show a friendly message instead of the raw SDK crash) rather than re-investigating for a phantom sanitizer bug — that path was already exhaustively ruled out.
