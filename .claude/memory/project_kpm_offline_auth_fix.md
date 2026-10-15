---
name: project-kpm-offline-auth-fix
description: "Root cause and fix for the offline-refresh false \"Access Denied\" lockout in App.jsx's Traffic Cop auth handler"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7d2121b6-4ca0-4f59-b71e-9c415c5ffa5c
  modified: 2026-07-24T11:34:56.900Z
---

Fixed 2026-07-24: every non-Tier-1 employee got locked out with "Access Denied — not registered" when refreshing the page with no internet, even though they were a real registered employee.

**Root cause**: Firestore's `getDoc()` is documented (its own SDK type declarations, `node_modules/@firebase/firestore/dist/index.d.ts`) to "return cached data OR FAIL if you are offline and the server cannot be reached" — it does NOT reliably fall back to the local persistent cache on its own, even though this app has `persistentLocalCache` configured in `config/firebase.js`. The Traffic Cop auth handler in `App.jsx` (inside `onAuthStateChanged`) used plain `getDoc()` for every employee-lookup read, so on an offline refresh the very first read threw, landed in the outer `catch`, and — except for the hardcoded VIP/Tier-1 bypass ("OFFLINE GOD MODE") — fell through to `setUserRole('UNAUTHORIZED')`, the same state used for a genuinely unregistered email.

**Fix**: added `getDocOfflineSafe(ref)` (module-level helper right after the imports in `App.jsx`) that tries `getDoc()` first, and on an offline-flavored failure (`!navigator.onLine` or `err.code === 'unavailable'`) retries with `getDocFromCache()`. All 5 `getDoc()` calls in the Traffic Cop handler now go through it. If even the cache has nothing (brand-new device, never logged in online), it throws a distinguishable `offline-no-cache` error. The catch block now has a new branch (before the final `UNAUTHORIZED` fallback, for every tier — not just VIPs) that sets a new `userRole` value, `'OFFLINE_UNVERIFIED'`, whenever the failure looks offline-related; the UI shows a distinct "Can't Verify You Yet" screen for this instead of "Access Denied". A confirmed real negative (server actually resolved the lookup and found nothing) never throws at all — it's a separate `else` branch — so it's untouched by any of this.

**Why**: a network failure ("I couldn't check") was being treated identically to a confirmed negative ("you're not registered"), which is a false-positive lockout, not a real security control. [[project-kpm-rules-draft-process]]

**Verification note**: the Firestore emulator needs JDK 21+; this dev machine only has JDK 8, so a live emulator-backed browser test wasn't possible without installing a new JDK (asked first, per the system change boundary). Verified instead with an executable Node test that copies the exact `getDocOfflineSafe` and catch-block logic verbatim and drives it through 4 real scenarios (online+registered, online+unregistered, offline+cached, offline+never-cached) using mocks that reproduce the documented Firestore SDK contract exactly — all 8 assertions passed. The literal "log in as a real non-Tier-1 Google account, toggle real WiFi, refresh" end-to-end click-through still needs the account owner to do it themselves, since Claude cannot enter real Google credentials.

**How to apply**: if offline auth issues resurface, check first whether a new/changed Firestore read was added to the Traffic Cop handler using plain `getDoc()` instead of `getDocOfflineSafe()` — that's the exact regression shape this bug had.
