// Define the exact role names that match Firebase
export const CORPORATE_TIERS = {
    TIER_1: 'DEVELOPER',         
    TIER_2: 'COMPANY_OWNER',     
    TIER_3: 'AREA_ADMIN',        
    TIER_4: 'FLEET_CAPTAIN',     
    TIER_5: 'FIELD_OPERATIVE',   
    TIER_6: 'ROOKIE'             
};

/* ONE PERSON, ONE PROFILE. Aldi, 2026-08-20: "i ask u to make only 1 profile for tier 1 account
   not 2". The boss exists as three documents in `motorists`: master_owner (him), ADMIN_VEHICLE
   (his van, created automatically at useDatabaseSync.js:126) and VAULT (his warehouse). Only the
   first is a PERSON. The other two are places, and listing them as people is what put him in the
   roster twice. 'ADMIN' is the legacy tag for the van, already translated at App.jsx:1828.

   He chose to MERGE rather than hide, so these are staged: A folds them in the roster (done,
   pinned by S33), B copies the van's record onto master_owner, C flips the writes and deletes
   ADMIN_VEHICLE. C before B would show his van as empty, so the order is not optional. */
export const TIER_ONE_ID = 'master_owner';
export const TIER_ONE_ALIAS_IDS = ['ADMIN_VEHICLE', 'VAULT', 'ADMIN'];
/* Reads only. Old sales and EOD reports still carry the alias, and they must keep answering. */
export const resolveTierOneId = (id) => TIER_ONE_ALIAS_IDS.includes(id) ? TIER_ONE_ID : id;

/* 🚀 DYNAMIC TIER LABELS — HIS WORDS ARE THE DEFAULT NOW.

   Aldi, 2026-08-24: *"yea better change the code to follow my tier name make it as default"*.
   These used to read REGIONAL / CAPTAIN / OPERATIVE / ROOKIE while his live company called the
   same five tiers something else entirely, and the gap was not cosmetic — it is what made his own
   sentence *"regional manager can edit the fleet"* ambiguous for a whole exchange, because his
   REGIONAL ADMIN is the code's FLEET_CAPTAIN and his HQ SALES MANAGER is the code's AREA_ADMIN.

   ⚠️ THE `id`s ABOVE DID NOT MOVE AND MUST NEVER MOVE. `AREA_ADMIN`, `FLEET_CAPTAIN` and the rest
   are written into every employee document, every sale and every audit line already on file.
   Renaming a LABEL changes a word on a screen; renaming an ID orphans the history. Labels only.

   These are the fallbacks: `injectDynamicPermissions` replaces this whole array with whatever he
   saved in Settings, so his live app already shows these words. What this fixes is everything
   BEFORE that fetch lands, and every tier he has not saved a name for.

   🎨 Two banned colours went with the rename: `text-blue-400` on T4 and `text-emerald-400` on T5.
   Palette law is no blue and no green, and these are read live by AgentProfileView's identity
   chip. Amber, orange and stone keep the five apart without breaking it. */
export let DYNAMIC_TIERS = [
    { id: CORPORATE_TIERS.TIER_2, label: 'T2: OWNER',             color: 'text-yellow-500' },
    { id: CORPORATE_TIERS.TIER_3, label: 'T3: HQ SALES MANAGER',  color: 'text-purple-400' },
    { id: CORPORATE_TIERS.TIER_4, label: 'T4: REGIONAL ADMIN',    color: 'text-amber-400' },
    { id: CORPORATE_TIERS.TIER_5, label: 'T5: SALES CANVAS',      color: 'text-orange-400' },
    { id: CORPORATE_TIERS.TIER_6, label: 'T6: SALES MOTORIST',    color: 'text-stone-400' }
];

/* ONE PLACE THAT TURNS A ROLE ID INTO THE WORD HE USES FOR IT. 'T5: SALES CANVAS' -> 'SALES
   CANVAS'; the number is already beside it wherever this is printed. Returns '' for a tier with
   no label so the caller can fall back — never a raw id, which is what put `AREA_ADMIN` on the
   fleet roster in the first place. */
export const tierWord = (roleId) =>
    (DYNAMIC_TIERS.find(t => t.id === roleId)?.label || '').replace(/^T\d+:\s*/, '').trim();

// 🚀 SHARED: normalizes legacy/old Firebase role tags (ADMIN, DEVELOPER, COMPANY_OWNER,
// AREA_ADMIN, FLEET_CAPTAIN, ROOKIE, AGENT/Motorist/Canvas/Salesman) into the canonical
// CORPORATE_TIERS id every tier check compares against. This exact translation block
// used to be copy-pasted 3x (isFieldLevelTier, isFleetManagementTier, hasClearance) —
// precisely the kind of drift that's already caused tier-check bugs in this project
// before, so it now lives in exactly one place.
const translateLegacyRole = (userRole) => {
    let role = userRole || CORPORATE_TIERS.TIER_5;
    if (role === 'ADMIN' || role === 'DEVELOPER') role = CORPORATE_TIERS.TIER_1;
    else if (role === 'COMPANY_OWNER') role = CORPORATE_TIERS.TIER_2;
    else if (role === 'AREA_ADMIN') role = CORPORATE_TIERS.TIER_3;
    else if (role === 'FLEET_CAPTAIN') role = CORPORATE_TIERS.TIER_4;
    else if (role === 'ROOKIE') role = CORPORATE_TIERS.TIER_6;
    else if (role === 'AGENT' || role === 'Motorist' || role === 'Canvas' || role === 'Salesman') role = CORPORATE_TIERS.TIER_5;
    return role;
};

// 🚀 SHARED WAREHOUSE-ROUTING RULE: Field-level tiers (T5/T6, real salesmen) return
// stock to their own regional branch. Tier 3 and above always return to the Master Vault.
// Used by both EOD verification and the Fleet & Canvas "Clear Canvas" button, so the
// two can never disagree about where an agent's stock belongs.
export const isFieldLevelTier = (userRole) => {
    const role = translateLegacyRole(userRole);
    return role === CORPORATE_TIERS.TIER_5 || role === CORPORATE_TIERS.TIER_6;
};

// 🚀 SHARED FLEET-MANAGEMENT TIER RULE: Tier 1-4 (Developer, Company Owner, Area
// Admin, Fleet Captain) can manage the Journey Plan fleet paintbrush (squad colors /
// map boundaries) — a regional/area management convenience, not an owner-exclusive
// one. Tier 5/6 (Field Operative, Rookie) cannot. Mirrors isFieldLevelTier's exact
// translation logic so the two tier checks never drift apart.
export const isFleetManagementTier = (userRole) => {
    const role = translateLegacyRole(userRole);
    return role === CORPORATE_TIERS.TIER_1 || role === CORPORATE_TIERS.TIER_2 || role === CORPORATE_TIERS.TIER_3 || role === CORPORATE_TIERS.TIER_4;
};

// 🚀 SHARED PHOTO-SOURCE RULE: a photo of goods or of a nota is evidence, and evidence has to be
// taken NOW, at the warehouse. A picture chosen from the gallery can be any picture from any day —
// which is the exact thing the photo exists to rule out. So field tiers get the camera only.
// Tier 3 and above may pick from the gallery, because they are the ones who re-file a photo that
// arrived by WhatsApp or has to be replaced after the fact.
// ⚠️ `capture` is a request, not a lock: mobile browsers honour it and open the camera directly,
// desktop browsers ignore it and open a file picker. The rule is enforceable where the photos are
// actually taken; on a desktop it is a default, not a wall.
// Mirrors isFieldLevelTier's translation so the tier checks can never drift apart.
export const canPickFromGallery = (userRole) => {
    const role = translateLegacyRole(userRole);
    return role === CORPORATE_TIERS.TIER_1 || role === CORPORATE_TIERS.TIER_2 || role === CORPORATE_TIERS.TIER_3;
};

export let ROLE_PERMISSIONS = {
    [CORPORATE_TIERS.TIER_1]: ['ALL_ACCESS'], 
    [CORPORATE_TIERS.TIER_2]: [ 
        'view_dashboard', 'view_map', 'view_journey', 'view_fleet', 'view_master_vault', 'view_restock_vault', 'view_sales', 'view_receivables', 'view_eod', 'view_stock_opname', 'view_customers', 'view_sampling', 'view_audit_logs', 'view_settings', 'view_agent_profile', 'edit_agent_roles', 'edit_rank_config', 'can_unrestricted_sample', 'view_expected_count', 'fleet_edit',
        'view_reports_global' // 🚀 THE DROPDOWN AUTHORITY
    ],
    [CORPORATE_TIERS.TIER_3]: [ 
        'view_dashboard', 'view_map', 'view_journey', 'view_fleet', 'view_agent_inventory', 'view_restock_vault', 'view_sales', 'view_receivables', 'view_eod', 'view_agent_profile', 'can_unrestricted_sample', 'view_expected_count', 'fleet_edit',
        'view_reports_regional' // 🚀 THE DROPDOWN AUTHORITY
    ],
    [CORPORATE_TIERS.TIER_4]: [ 
        'view_map', 'view_journey', 'view_agent_inventory', 'view_fleet', 'view_sales', 'view_receivables', 'view_eod', 'view_agent_profile', 'fleet_edit',
        'view_reports_regional' // 🚀 THE DROPDOWN AUTHORITY
    ],
    [CORPORATE_TIERS.TIER_5]: [ 
        'view_map', 'view_journey', 'view_agent_inventory', 'view_sales', 'view_eod', 'view_agent_profile',
        'view_reports_personal' // 🚀 THE DROPDOWN AUTHORITY
    ],
    [CORPORATE_TIERS.TIER_6]: [ 
        'view_journey', 'view_agent_inventory', 'view_sales', 'view_agent_profile',
        'view_reports_personal' // 🚀 THE DROPDOWN AUTHORITY
    ]
};

// 🚀 UPDATED INJECTOR: Now saves Custom Tier Names too!
export const injectDynamicPermissions = (firebaseMatrix, firebaseTiers) => {
    if (firebaseMatrix) {
        ROLE_PERMISSIONS = { ...ROLE_PERMISSIONS, ...firebaseMatrix, [CORPORATE_TIERS.TIER_1]: ['ALL_ACCESS'] };
    }
    if (firebaseTiers && firebaseTiers.length > 0) {
        DYNAMIC_TIERS = firebaseTiers;
    }
};

// 🚀 THE FIX: AGGRESSIVE TRANSLATOR AND SAFETY NET
export const hasClearance = (userRole, requiredFeature) => {
    // 1. Aggressive Legacy Translator (Catches old Firebase tags)
    const role = translateLegacyRole(userRole);

    // 2. The Safety Net (Prevents blank sidebars if a rank is corrupted or deleted)
    let activePerms = ROLE_PERMISSIONS[role];
    if (!activePerms) {
        // Force fallback to Tier 5 Operative defaults
        activePerms = ROLE_PERMISSIONS[CORPORATE_TIERS.TIER_5] || ['view_journey', 'view_agent_inventory', 'view_sales', 'view_agent_profile', 'view_reports_personal'];
    }
    
    // 🛡️ ALL_ACCESS is Tier 1's exclusive god-mode key. Never honor it for any other tier,
    // even if it somehow ends up saved inside another tier's permission array.
    if (role === CORPORATE_TIERS.TIER_1 && activePerms.includes('ALL_ACCESS')) return true;
    return activePerms.includes(requiredFeature) || false;
};

/* STOCK COUNT: does this tier see the expected number WHILE counting?
   Aldi, 2026-08-20: "comparison healthy and found side by side is higher tier only on default,
   which is tier 3 and above only". His reason, the day before: "encourage them to really count
   the number right" - a counter who can see the answer will drift towards it.

   THE TRAP this would otherwise die on: `injectDynamicPermissions` REPLACES ROLE_PERMISSIONS
   with whatever he saved in Firebase, so a brand-new key is simply ABSENT from his live matrix.
   Read as a plain missing permission that means "no", and the number would never appear for
   tier 2 or 3 - the feature would look broken while the code was right. So absence means
   "use the tier default". The moment the key appears anywhere in his saved matrix he has
   configured it deliberately, and from then on his switch wins in BOTH directions. */
const EXPECTED_COUNT_KEY = 'view_expected_count';
export const canSeeExpectedCount = (userRole) => {
    const role = translateLegacyRole(userRole);
    if (role === CORPORATE_TIERS.TIER_1) return true;
    const matrixKnowsKey = Object.values(ROLE_PERMISSIONS)
        .some(list => Array.isArray(list) && list.includes(EXPECTED_COUNT_KEY));
    if (matrixKnowsKey) return hasClearance(userRole, EXPECTED_COUNT_KEY);
    return role === CORPORATE_TIERS.TIER_2 || role === CORPORATE_TIERS.TIER_3;
};

/* FLEET & CANVAS: may this tier only LOOK, or also change things?

   Aldi found this himself with the POV switch on its first run, 2026-08-23: *"i just checked
   looks like my tier 6 account can edit the fleet and canvas"*. He was right, and the reason is
   worth writing down because it was never a tier check at all. FleetCanvasManager decided with:

       const isAreaAdmin = !isGlobalAdmin;                                  // ← tiers 3,4,5,6 alike
       const canEditFleet = isAdmin || (isAreaAdmin && myProfile?.canEditRoster === true);

   `isAreaAdmin` means nothing more than "not tier 1 or 2", so a ROOKIE carrying a stale
   `canEditRoster: true` on their own profile could add, edit and terminate staff. And the canvas
   half - Load and Reconcile & Clear, which move real stock between the warehouse and a van - was
   not gated at all, by anything.

   His instruction: *"moved that into matrix on setting instead"*. So the per-person checkbox is
   gone and the answer comes from the permission matrix, next to every other permission, where he
   can see all six tiers at once.

   ABSENCE MEANS "USE THE TIER DEFAULT", exactly like view_expected_count above, and for the same
   reason: injectDynamicPermissions REPLACES a saved tier's list wholesale, so a brand-new key is
   simply missing from his live matrix. Read as a plain missing permission it would mean "no", and
   his branch admins would lose the roster the moment this shipped - the feature would look broken
   while the code was right. The moment the key appears anywhere in his matrix he has chosen
   deliberately, and from then on his switch wins in BOTH directions. */
export const FLEET_EDIT_PERMS = ['fleet_edit', 'fleet_view_only'];

/* The answer for a tier he has never set, and the SAME function the Settings dropdown shows so
   the screen can never promise something the app does not do.

   🔑 THE LINE IS DRAWN BY ALDI, 2026-08-24: *"regional manager can edit the fleet and canvas, tier
   below that cannot"*. That is TIER 4 - `REGIONAL ADMIN` is his own name for it in DYNAMIC_TIERS -
   so the cut runs between tier 4 and tier 5. It had shipped a few hours earlier with tier 4 on
   view only, flagged to him as a guess rather than his decision; this is him overruling it.

   In plain terms: everyone who runs an area may hire, fire and load a van. Nobody who rides in
   one may. Anything unrecognised - including a custom tier he invents later - lands on view only,
   because the safe end is the one that cannot delete a person. */
export const defaultFleetAccess = (tierId) => [
    CORPORATE_TIERS.TIER_1, CORPORATE_TIERS.TIER_2, CORPORATE_TIERS.TIER_3, CORPORATE_TIERS.TIER_4
].includes(tierId) ? 'fleet_edit' : 'fleet_view_only';

export const canEditFleetRoster = (userRole) => {
    const role = translateLegacyRole(userRole);
    if (role === CORPORATE_TIERS.TIER_1) return true;
    const matrixKnowsKey = Object.values(ROLE_PERMISSIONS)
        .some(list => Array.isArray(list) && list.some(p => FLEET_EDIT_PERMS.includes(p)));
    if (matrixKnowsKey) return hasClearance(userRole, 'fleet_edit');
    return defaultFleetAccess(role) === 'fleet_edit';
};

// 🚀 THE 3 CUSTOMER DIRECTORY EDIT MODES (mirrors the view_reports_* pattern)
export const CUSTOMER_EDIT_PERMS = ['customers_edit_global', 'customers_edit_own_region', 'customers_view_only'];

// 🚀 CUSTOMER DIRECTORY ACCESS RESOLVER: Checks 'global' FIRST so Tier 1's ALL_ACCESS
// god-mode bypass (see hasClearance above) always resolves to the strongest tier, never
// to 'view_only'. Order matters here — do not flip it.
// DEFAULT IS 'global' (today's unrestricted behavior) so nothing changes for any existing
// company until an owner deliberately dials in a stricter option in Settings.
export const getCustomerAccessLevel = (userRole) => {
    if (hasClearance(userRole, 'customers_edit_global')) return 'global';
    if (hasClearance(userRole, 'customers_edit_own_region')) return 'own_region';
    if (hasClearance(userRole, 'customers_view_only')) return 'view_only';
    return 'global';
};