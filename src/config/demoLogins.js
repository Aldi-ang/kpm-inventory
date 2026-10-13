/* THE DEMO'S FIVE LOGINS - one list, read by both sides.
   api/_demoCompany.js writes them (the reset sets each back to these values), api/demo-switch.js signs an
   invited visitor in as one of them, and the demo build's picker + switch bar (src/components/DemoFrontDoor.jsx)
   list them. Two copies would drift, and a card for a person the reset no longer makes is a door that does not open.
   Only ever imported behind IS_DEMO: the real bundle must not carry one of these strings
   (src/config/demoBuild.check.mjs reads the built bundles to prove it). */

export const OWNER_UID = 'demo-owner';
/* The vault password is public by design: the picker and the vault gate print it - his 2026-10-13 "i want easier
   password bruh like admin123". It opens the vault only AFTER a sign-in, and the five sign-ins have no public password
   any more (his invite-only demo, 2026-10-13): api/demo-switch.js hands them out to invited Google accounts only.
   The vault's strength rule only runs when a person SETS a vault password in the app (App.jsx calculateStrength);
   the reset writes the hash itself, and unlock only compares. */
export const VAULT_PASSWORD = 'admin123';

/* The five switch logins (T2..T6) - never T1. TWO TEAMS (his 2026-10-13 "just make 2 teams, and make the muntilan inside
   kabupaten magelang as headquarters ... only bandung and muntilan team for now"): Muntilan IS the app's Headquarters
   (owner, T3, T4, T6), Bandung the branch (T5). Each team's other regional admin / canvas / motorist are practice staff
   (api/_demoCompany.js PRACTICE) - his "each team have their own regional admin and 1 sales motorist and 1 sales canvas
   minimum". Each place's province lives with the places, in api/_demoCompany.js TEAMS. */
export const LOGINS = [
    { tier: 'T2', uid: OWNER_UID, email: 'demo.owner@example.com', name: 'HARTONO SUSILO' },
    { tier: 'T3', uid: 'demo-hq', email: 'demo.hq@example.com', name: 'RINA WIJAYA', agentId: 'demo-agent-6', userRole: 'AREA_ADMIN', role: 'Canvas', location: 'Headquarters' },
    /* approvalRegions = his own place: hand-offs into Headquarters wait for him, never Bandung's (permissions.js canApproveHandoffFrom) */
    { tier: 'T4', uid: 'demo-regional', email: 'demo.regional@example.com', name: 'HENDRA GUNAWAN', agentId: 'demo-agent-7', userRole: 'FLEET_CAPTAIN', role: 'Canvas', location: 'Headquarters', approvalRegions: ['HEADQUARTERS'] },
    { tier: 'T5', uid: 'demo-canvas', email: 'demo.canvas@example.com', name: 'AGUS PRASETYO', agentId: 'demo-agent-1', userRole: 'FIELD_OPERATIVE', role: 'Canvas', location: 'BANDUNG' },
    { tier: 'T6', uid: 'demo-motorist', email: 'demo.motorist@example.com', name: 'DIKA SAPUTRA', agentId: 'demo-agent-2', userRole: 'ROOKIE', role: 'Motorist', location: 'Headquarters' },
];
