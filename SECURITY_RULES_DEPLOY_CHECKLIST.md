# Firestore Security Rules — Deployment Checklist

Use this every time rules change, not just this once. Rules take effect instantly and globally the moment they're deployed — there's no gradual rollout, no staging environment for this project, and a mistake locks out real users immediately. This checklist exists so that fact never gets treated casually.

## Before deploying

- [ ] Put `firebase.json` in the project root (already provided, one time only — pointing at `firestore.rules`)
- [ ] Confirm `firestore.rules.deployed-baseline` exists in the repo — this is your instant rollback copy if anything goes wrong
- [ ] Confirm the emulator test suite passed for the new rules (32/32 for this deploy)
- [ ] Read through the reconciliation table one more time — confirm every change is one you actually intended, not something that snuck in

## The deploy itself

```bash
firebase deploy --only firestore:rules
```

Be physically present for this command and the few minutes after. Don't kick this off and walk away, even if everything tested clean — this is the one moment where "tested in emulator" meets "actually live," and if something's wrong, you want to catch it immediately, not find out later from a confused salesman.

## Immediately after deploying — test this for real, not just trust the emulator

- [ ] Log in as Tier 1 (yourself) — confirm normal access still works
- [ ] Log in as Tier 2 (a Company Owner test account) — confirm Settings, reports, roster all still load
- [ ] Log in as a lower-tier test account (Tier 4-6) — confirm they can still make a sale, see their own data, and are NOT blocked from anything they legitimately need
- [ ] Try the specific thing this deploy was meant to fix or change — confirm it now actually behaves differently, not just that the app still loads. (First example this checklist was built for: writing `{bossUid: <company>, userRole: 'ADMIN'}` to your own email-keyed directory doc from a non-privileged account — confirm that's still correctly denied, since it should never come back regardless of what else changes later.)
- [ ] Watch the browser console across all of the above for any new `permission-denied` errors that weren't there before

## If something breaks

Don't panic-edit the live rules. Redeploy the saved baseline immediately to restore known-working behavior, then debug calmly afterward with the emulator, not live.

```bash
firebase deploy --only firestore:rules --project <your-project-id>
# (after temporarily restoring firestore.rules.deployed-baseline as firestore.rules)
```

## After a successful deploy

- [ ] Commit a note in git (or here in chat) confirming the deploy happened and when
- [ ] Update this checklist itself if anything about the process felt wrong or was missing a step, so next time is smoother
