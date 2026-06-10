export const CORPORATE_TIERS = {
    TIER_1: 'DEVELOPER',         
    TIER_2: 'COMPANY_OWNER',     
    TIER_3: 'AREA_ADMIN',        
    TIER_4: 'FLEET_CAPTAIN',     
    TIER_5: 'FIELD_OPERATIVE',   
    TIER_6: 'ROOKIE'             
};

// We use 'let' now so Firebase can overwrite it on boot
export let ROLE_PERMISSIONS = {
    [CORPORATE_TIERS.TIER_1]: ['ALL_ACCESS'], 

    [CORPORATE_TIERS.TIER_2]: [ 
        'view_dashboard', 'view_map', 'view_journey', 'view_fleet',
        'view_master_vault', 'view_restock_vault', 'view_sales',
        'view_receivables', 'view_eod', 'view_stock_opname',
        'view_customers', 'view_sampling', 'view_reports',
        'view_audit_logs', 'view_settings', 'view_agent_profile',
        'edit_agent_roles', 'edit_rank_config'
    ],

    [CORPORATE_TIERS.TIER_3]: [ 
        'view_dashboard', 'view_map', 'view_journey', 'view_fleet',
        'view_agent_inventory', 'view_restock_vault', 'view_sales',
        'view_receivables', 'view_eod', 'view_reports', 'view_agent_profile'
    ],

    [CORPORATE_TIERS.TIER_4]: [ 
        'view_map', 'view_journey', 'view_agent_inventory', 'view_fleet',
        'view_sales', 'view_receivables', 'view_eod', 'view_reports', 'view_agent_profile'
    ],

    [CORPORATE_TIERS.TIER_5]: [ 
        'view_map', 'view_journey', 'view_agent_inventory',
        'view_sales', 'view_eod', 'view_reports', 'view_agent_profile'
    ],

    [CORPORATE_TIERS.TIER_6]: [ 
        'view_journey', 'view_agent_inventory', 'view_sales', 'view_agent_profile'
    ]
};

// 🚀 NEW: The Injector Engine (Allows Firebase to overwrite the defaults)
export const injectDynamicPermissions = (firebaseMatrix) => {
    if (firebaseMatrix) {
        // Keep Tier 1 strictly untouched for security, merge the rest
        ROLE_PERMISSIONS = { 
            ...ROLE_PERMISSIONS, 
            ...firebaseMatrix,
            [CORPORATE_TIERS.TIER_1]: ['ALL_ACCESS'] 
        };
    }
};

export const hasClearance = (userRole, requiredFeature) => {
    let role = userRole || CORPORATE_TIERS.TIER_5; 
    if (role === 'ADMIN') role = CORPORATE_TIERS.TIER_1;
    
    if (ROLE_PERMISSIONS[role]?.includes('ALL_ACCESS')) return true;
    return ROLE_PERMISSIONS[role]?.includes(requiredFeature) || false;
};