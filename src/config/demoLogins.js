/* THE DEMO'S FIVE LOGINS - one list, read by both sides.
   api/_demoCompany.js writes them (the reset sets each back to these values) and the demo build's front
   door + switch bar (src/components/DemoFrontDoor.jsx) sign in with them. Two copies would drift, and a
   card that prints a password the reset no longer sets is a door that does not open.
   Only ever imported behind IS_DEMO: the real bundle must not carry one of these strings
   (src/config/demoBuild.check.mjs reads the built bundles to prove it). */

export const OWNER_UID = 'demo-owner';
/* Public by design: the front door prints them, and every reset sets them back. One easy word for both - his
   2026-10-13 "i want easier password bruh like admin123". The vault's strength rule only runs when a person SETS a
   vault password in the app (App.jsx calculateStrength); the reset writes the hash itself, and unlock only compares. */
export const LOGIN_PASSWORD = 'admin123';
export const VAULT_PASSWORD = 'admin123';

/* The five switch logins (T2..T6) - never T1. T5 and T6 take the two seed salesmen with shops. */
export const LOGINS = [
    { tier: 'T2', uid: OWNER_UID, email: 'demo.owner@example.com', name: 'DEMO OWNER' },
    { tier: 'T3', uid: 'demo-hq', email: 'demo.hq@example.com', name: 'RINA WIJAYA', agentId: 'demo-agent-6', userRole: 'AREA_ADMIN', role: 'Canvas', location: 'Headquarters' },
    /* the rules give a Regional Admin the shops whose `region` equals their `location` (isOwnRegionMatch) */
    { tier: 'T4', uid: 'demo-regional', email: 'demo.regional@example.com', name: 'HENDRA GUNAWAN', agentId: 'demo-agent-7', userRole: 'FLEET_CAPTAIN', role: 'Canvas', location: 'MAGELANG', approvalRegions: ['MAGELANG'] },
    { tier: 'T5', uid: 'demo-canvas', email: 'demo.canvas@example.com', name: 'AGUS PRASETYO', agentId: 'demo-agent-1', userRole: 'FIELD_OPERATIVE', role: 'Canvas', location: 'Headquarters' },
    { tier: 'T6', uid: 'demo-motorist', email: 'demo.motorist@example.com', name: 'DIKA SAPUTRA', agentId: 'demo-agent-2', userRole: 'ROOKIE', role: 'Motorist', location: 'MAGELANG' },
];
