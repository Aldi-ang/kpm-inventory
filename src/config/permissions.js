// Define the exact role names that match Firebase and your Agent Profile masking
export const CORPORATE_TIERS = {
    TIER_1: 'DEVELOPER',         // System Architect
    TIER_2: 'COMPANY_OWNER',     // Owner / Admin
    TIER_3: 'AREA_ADMIN',        // Regional Manager
    TIER_4: 'FLEET_CAPTAIN',     // Captain
    TIER_5: 'FIELD_OPERATIVE',   // Motorist / Agent
    TIER_6: 'ROOKIE'             // Trainee / New Hire
};

// THE MASTER PERMISSION MATRIX
export const ROLE_PERMISSIONS = {
    [CORPORATE_TIERS.TIER_1]: ['ALL_ACCESS'], // Tier 1 sees everything, always.

    [CORPORATE_TIERS.TIER_2]: [ // Tier 2 (Owner)
        'view_dashboard', 'view_map', 'view_journey', 'view_fleet',
        'view_master_vault', 'view_restock_vault', 'view_sales',
        'view_receivables', 'view_eod', 'view_stock_opname',
        'view_customers', 'view_sampling', 'view_reports',
        'view_audit_logs', 'view_settings', 'view_agent_profile',
        'edit_agent_roles', 'edit_rank_config'
    ],

    [CORPORATE_TIERS.TIER_3]: [ // Tier 3 (Regional Manager)
        'view_dashboard', 'view_map', 'view_journey', 'view_fleet',
        'view_agent_inventory', 'view_restock_vault', 'view_sales',
        'view_receivables', 'view_eod', 'view_reports', 'view_agent_profile'
    ],

    [CORPORATE_TIERS.TIER_4]: [ // Tier 4 (Fleet Captain)
        'view_map', 'view_journey', 'view_agent_inventory', 'view_fleet',
        'view_sales', 'view_receivables', 'view_eod', 'view_reports', 'view_agent_profile'
    ],

    [CORPORATE_TIERS.TIER_5]: [ // Tier 5 (Field Operative)
        'view_map', 'view_journey', 'view_agent_inventory',
        'view_sales', 'view_eod', 'view_reports', 'view_agent_profile'
    ],

    [CORPORATE_TIERS.TIER_6]: [ // Tier 6 (Rookie)
        'view_journey', 'view_agent_inventory', 'view_sales', 'view_agent_profile'
    ]
};

// 🚀 THE UNIVERSAL ACCESS CHECKER 🚀
export const hasClearance = (userRole, requiredFeature) => {
    // If no role is provided, default them to the lowest safe clearance (Tier 5)
    let role = userRole || CORPORATE_TIERS.TIER_5; 
    
    // 🚀 THE FIX: Legacy Translation Engine
    // Automatically bumps your legacy 'ADMIN' account to 'DEVELOPER' (Tier 1)
    if (role === 'ADMIN') {
        role = CORPORATE_TIERS.TIER_1;
    }
    
    // Tier 1 Bypass
    if (ROLE_PERMISSIONS[role]?.includes('ALL_ACCESS')) return true;
    
    // Check specific feature
    return ROLE_PERMISSIONS[role]?.includes(requiredFeature) || false;
};