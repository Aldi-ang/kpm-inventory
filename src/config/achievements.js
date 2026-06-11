// 🚀 THE GAMIFICATION ENGINE

// Formula: 1 Level = Every Rp 5,000,000 in Omset (Adjust this later if you want it harder!)
export const calculateAgentLevel = (totalOmset) => {
    const baseOmsetPerLevel = 5000000; 
    const level = Math.floor((totalOmset || 0) / baseOmsetPerLevel) + 1;
    
    // Calculate progress to next level (Percentage 0-100)
    const currentLevelOmset = (level - 1) * baseOmsetPerLevel;
    const nextLevelOmset = level * baseOmsetPerLevel;
    const progress = (((totalOmset || 0) - currentLevelOmset) / (nextLevelOmset - currentLevelOmset)) * 100;

    return { level, progress, nextLevelOmset };
};

// 🏆 THE BADGE VAULT
// The engine will automatically loop through these and unlock them if the condition is true
export const BADGE_REGISTRY = [
    {
        id: 'first_blood',
        title: 'First Blood',
        description: 'Successfully closed your first transaction.',
        icon: 'Flame',
        color: 'text-orange-500',
        bg: 'bg-orange-500/20',
        border: 'border-orange-500/50',
        condition: (stats) => stats.totalTransactions > 0
    },
    {
        id: 'hustler',
        title: 'The Hustler',
        description: 'Completed 50 total transactions.',
        icon: 'Zap',
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/20',
        border: 'border-yellow-400/50',
        condition: (stats) => stats.totalTransactions >= 50
    },
    {
        id: 'omset_10m',
        title: '10M Club',
        description: 'Generated over Rp 10,000,000 in total Omset.',
        icon: 'Target',
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/20',
        border: 'border-emerald-400/50',
        condition: (stats) => stats.totalOmset >= 10000000
    },
    {
        id: 'omset_50m',
        title: 'Rainmaker',
        description: 'Generated over Rp 50,000,000 in total Omset.',
        icon: 'Crown',
        color: 'text-rose-500',
        bg: 'bg-rose-500/20',
        border: 'border-rose-500/50',
        condition: (stats) => stats.totalOmset >= 50000000
    },
    {
        id: 'veteran',
        title: 'Seasoned Vet',
        description: 'Reached Agent Level 10.',
        icon: 'ShieldCheck',
        color: 'text-blue-400',
        bg: 'bg-blue-400/20',
        border: 'border-blue-400/50',
        condition: (stats) => calculateAgentLevel(stats.totalOmset).level >= 10
    }
];

export const checkUnlockedBadges = (stats) => {
    if (!stats) return [];
    return BADGE_REGISTRY.filter(badge => badge.condition(stats));
};