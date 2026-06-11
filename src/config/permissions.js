// Define the exact role names that match Firebase
export const CORPORATE_TIERS = {
    TIER_1: 'DEVELOPER',         
    TIER_2: 'COMPANY_OWNER',     
    TIER_3: 'AREA_ADMIN',        
    TIER_4: 'FLEET_CAPTAIN',     
    TIER_5: 'FIELD_OPERATIVE',   
    TIER_6: 'ROOKIE'             
};

// 🚀 DYNAMIC TIER LABELS
export let DYNAMIC_TIERS = [
    { id: CORPORATE_TIERS.TIER_2, label: 'T2: OWNER', color: 'text-yellow-500' },
    { id: CORPORATE_TIERS.TIER_3, label: 'T3: REGIONAL', color: 'text-purple-400' },
    { id: CORPORATE_TIERS.TIER_4, label: 'T4: CAPTAIN', color: 'text-blue-400' },
    { id: CORPORATE_TIERS.TIER_5, label: 'T5: OPERATIVE', color: 'text-emerald-400' },
    { id: CORPORATE_TIERS.TIER_6, label: 'T6: ROOKIE', color: 'text-slate-400' }
];

export let ROLE_PERMISSIONS = {
    [CORPORATE_TIERS.TIER_1]: ['ALL_ACCESS'], 
    [CORPORATE_TIERS.TIER_2]: [ 
        'view_dashboard', 'view_map', 'view_journey', 'view_fleet', 'view_master_vault', 'view_restock_vault', 'view_sales', 'view_receivables', 'view_eod', 'view_stock_opname', 'view_customers', 'view_sampling', 'view_reports', 'view_audit_logs', 'view_settings', 'view_agent_profile', 'edit_agent_roles', 'edit_rank_config'
    ],
    [CORPORATE_TIERS.TIER_3]: [ 
        'view_dashboard', 'view_map', 'view_journey', 'view_fleet', 'view_agent_inventory', 'view_restock_vault', 'view_sales', 'view_receivables', 'view_eod', 'view_reports', 'view_agent_profile'
    ],
    [CORPORATE_TIERS.TIER_4]: [ 
        'view_map', 'view_journey', 'view_agent_inventory', 'view_fleet', 'view_sales', 'view_receivables', 'view_eod', 'view_reports', 'view_agent_profile'
    ],
    [CORPORATE_TIERS.TIER_5]: [ 
        'view_map', 'view_journey', 'view_agent_inventory', 'view_sales', 'view_eod', 'view_reports', 'view_agent_profile'
    ],
    [CORPORATE_TIERS.TIER_6]: [ 
        'view_journey', 'view_agent_inventory', 'view_sales', 'view_agent_profile'
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
    let role = userRole || CORPORATE_TIERS.TIER_5; 
    
    // 1. Aggressive Legacy Translator (Catches old Firebase tags)
    if (role === 'ADMIN' || role === 'DEVELOPER') role = CORPORATE_TIERS.TIER_1;
    else if (role === 'COMPANY_OWNER') role = CORPORATE_TIERS.TIER_2;
    else if (role === 'AREA_ADMIN') role = CORPORATE_TIERS.TIER_3;
    else if (role === 'FLEET_CAPTAIN') role = CORPORATE_TIERS.TIER_4;
    else if (role === 'ROOKIE') role = CORPORATE_TIERS.TIER_6;
    else if (role === 'AGENT' || role === 'Motorist' || role === 'Canvas' || role === 'Salesman') role = CORPORATE_TIERS.TIER_5;

    // 2. The Safety Net (Prevents blank sidebars if a rank is corrupted or deleted)
    let activePerms = ROLE_PERMISSIONS[role];
    if (!activePerms) {
        // Force fallback to Tier 5 Operative defaults
        activePerms = ROLE_PERMISSIONS[CORPORATE_TIERS.TIER_5] || ['view_journey', 'view_agent_inventory', 'view_sales', 'view_agent_profile'];
    }
    
    if (activePerms.includes('ALL_ACCESS')) return true;
    return activePerms.includes(requiredFeature) || false;
};