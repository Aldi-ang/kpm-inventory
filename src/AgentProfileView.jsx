import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    User, Activity, TrendingUp, ShieldCheck, DollarSign, Wallet, 
    Calendar, Truck, Award, Target, Zap, Lock, Crosshair, 
    MapPin, AlertCircle, Camera, Phone, Edit3, Save, Clock,
    Star, Menu, X, ChevronRight, Sparkles, Settings, Plus, Trash2, Image as ImageIcon,
    List, Trophy, Medal, PackageOpen, Crown, Flame
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { doc, getDoc, setDoc, updateDoc, collection, increment, serverTimestamp } from 'firebase/firestore';
import { RankBorder, RANK_BORDERS, BORDER_KEYFRAMES } from './config/rankBorders';
import Cropper from 'react-easy-crop';
import { hasClearance, DYNAMIC_TIERS } from './config/permissions';
import HallOfFameView from './HallOfFameView';
import { savePhotoAndGetReference, deletePhotoFromStorage, formatNumber, parseGroupedNumber } from './utils/helpers';
import { careerXP, DEFAULT_XP, totals, DEFAULT_BADGES, STAT_LABELS, BADGE_SOURCES, statLabel } from './config/career';

const DynamicIconMap = { Calendar, PackageOpen, Crown, Target, Zap, Trophy, Medal, Star, Flame, ShieldCheck, Truck, Activity, DollarSign, Award };

const BADGE_CATEGORIES = [
    { id: 'all', label: 'Semua' },
    { id: 'jual', label: 'Penjualan' },
    { id: 'andal', label: 'Keandalan' },
    { id: 'masa', label: 'Masa Kerja' },
    { id: 'wilayah', label: 'Wilayah' },
    { id: 'tim', label: 'Tim' },
    { id: 'seru', label: 'Seru' }
];

const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous'); 
        image.src = url;
    });

const getCroppedImg = async (imageSrc, pixelCrop) => {
    try {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // 🚀 THE AUTO-COMPRESSOR ENGINE
        // 1. Cap the maximum size at 800px to prevent massive file sizes
        let finalWidth = pixelCrop.width;
        let finalHeight = pixelCrop.height;
        
        if (finalWidth > 800) {
            const ratio = 800 / finalWidth;
            finalWidth = 800;
            finalHeight = finalHeight * ratio;
        }

        canvas.width = finalWidth;
        canvas.height = finalHeight;

        // 2. Draw the cropped image onto the perfectly sized canvas
        ctx.drawImage(
            image, 
            pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 
            0, 0, finalWidth, finalHeight
        );
        
        // 3. Crush the output to 70% quality and convert to JPEG (Massive bandwidth savings!)
        return canvas.toDataURL('image/jpeg', 0.7); 
    } catch (e) {
        console.error("Cropper Error:", e);
        return null;
    }
};

// 🚀 Phase 6: rewritten as ONE masked-conic ring instead of 6 hand-built tiers each layering
// animated `filter: blur()` + `box-shadow` + multiple `animate-bounce`/`animate-pulse` elements
// (a registered-@property conic-gradient forces a full repaint every frame; blur then re-blurs
// that fresh paint, 60x/sec — the single biggest GPU cost on this screen at Mythic). A masked
// conic-gradient is painted ONCE into its own layer; after that only `transform: rotate()`
// changes, which is compositor-only. Keyed on `hex` — a property that belongs to the RANK OBJECT
// itself (stable across reordering/renaming/deleting other ranks) — not on `index` (the rank's
// position in the array, which reshuffles under everyone the moment a rank is added or removed).
// `index` only nudges a couple of cosmetic knobs (speed, glow size) — never identity.
// Border styles now live in src/config/rankBorders.jsx so the Tier 1 preview gallery and the
// profile render the exact same code. Each rank picks its own via `borderStyle`; no value = the
// original Classic Sweep, so ranks configured before this existed look unchanged.
const CrazyRankBorder = ({ index, hex, styleId }) => (
    <RankBorder styleId={styleId} index={index} hex={hex} />
);

// The rank frame + photo stack. One definition, two call sites — the profile header and the
// Customize Avatar modal — because Phase 5 turns these rings square, and a second copy of this
// markup would be a second place to miss it. Sizing comes from the parent's box, so callers stay
// in control of how big it renders. `scrim` is the header-only darkening gradient; `children` is
// where the header hangs its camera badge and hidden file input.
const AgentAvatar = ({ tier, tierIndex, hex, photo, styleId, iconSize, scrim = false, children }) => (
    <>
        {tier?.borderImage ? (
            <img src={tier.borderImage} className="absolute inset-[-25%] w-[150%] h-[150%] object-contain z-20 pointer-events-none drop-shadow-[0_0_15px_currentColor]" style={{ color: hex }} alt="" />
        ) : (
            <CrazyRankBorder index={tierIndex} hex={hex} styleId={styleId ?? tier?.borderStyle} />
        )}
        <div className="absolute inset-[4px] bg-slate-900 rounded-full z-10 overflow-hidden border-[3px]" style={{ borderColor: hex, boxShadow: `0 0 15px ${hex}` }}>
            {scrim && <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none"></div>}
            {photo ? (
                <img src={photo} className="w-full h-full object-cover z-0" alt="Profile" />
            ) : (
                <div className="flex h-full items-center justify-center"><User size={iconSize} className="z-0 opacity-50" style={{ color: hex }}/></div>
            )}
        </div>
        {children}
    </>
);

const AgentProfileView = ({ motorists, transactions, inventory, userRole, agentProfileId, db, appId, userId, storage, appSettings, career, logAudit }) => {
    const useCareerLedger = !!appSettings?.useCareerLedger;
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    const [locationFilter, setLocationFilter] = useState('ALL');
    const [showRankConfig, setShowRankConfig] = useState(false);
    const [chartFilter, setChartFilter] = useState('1W'); 
    
    // 🚀 NEW: DYNAMIC ACHIEVEMENT ENGINE STATES
    const [showBadgeConfig, setShowBadgeConfig] = useState(false);
    const [badgeCategoryFilter, setBadgeCategoryFilter] = useState('all');
    const [showAwardForm, setShowAwardForm] = useState(false);
    const [awardForm, setAwardForm] = useState({ title: '', reason: '', xp: '', cosmetic: '' });
    const [badgeData, setBadgeData] = useState(DEFAULT_BADGES);
    const [editingBadges, setEditingBadges] = useState(null);

    useEffect(() => {
        if (!db || !appId || !userId) return;
        const fetchBadges = async () => {
            try {
                // 🚀 Phase 4: per-company path first (fixes the cross-tenant leak — this doc
                // used to be shared by every company in the whole Firestore project). One
                // release of fallback to the old shared doc so nobody's existing badge config
                // silently resets to defaults the first time they open this after the update.
                const snap = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/settings`, 'progression'));
                if (snap.exists() && snap.data().badges) { setBadgeData(snap.data().badges); return; }
                const legacySnap = await getDoc(doc(db, `artifacts/${appId}/settings`, 'achievements'));
                if (legacySnap.exists() && legacySnap.data().badges) setBadgeData(legacySnap.data().badges);
            } catch (e) {}
        };
        fetchBadges();
    }, [db, appId, userId]);

    const handleSaveBadgeConfig = async () => {
        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/settings`, 'progression'), { badges: editingBadges }, { merge: true });
            setBadgeData(editingBadges);
            setShowBadgeConfig(false);
        } catch (error) { alert("Failed to save Achievements."); }
    };
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bioText, setBioText] = useState('');
    const [showCanvasBreakdown, setShowCanvasBreakdown] = useState(false);
  
    const [showTitipBreakdown, setShowTitipBreakdown] = useState(false);
    const [showHallOfFame, setShowHallOfFame] = useState(false); // 🚀 NEW: State to open leaderboard

    const [ownerProfile, setOwnerProfile] = useState(null);
    useEffect(() => {
        if((userRole === 'ADMIN' || userRole === 'COMPANY_OWNER') && db && appId && userId) {
            const fetchOwner = async () => {
                try {
                    const snap = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/motorists`, 'master_owner'));
                    if(snap.exists()) setOwnerProfile({id: 'master_owner', userRole: 'COMPANY_OWNER', name: 'Master Owner', ...snap.data()});
                    else setOwnerProfile({id: 'master_owner', userRole: 'COMPANY_OWNER', name: 'Master Owner', location: 'Headquarters', allowedPayments: ['Cash','Titip','Transfer'], allowedTiers: ['Grosir','Retail'], canEditRoster: true, allowRetur: true});
                } catch(e) { console.warn("Failed to synthesize owner profile"); }
            }
            fetchOwner();
        }
    }, [db, appId, userId, userRole]);

    const allAgents = useMemo(() => {
        let list = [...(motorists || [])];
        if (ownerProfile && !list.find(m => m.id === 'master_owner')) list.unshift(ownerProfile);
        return list;
    }, [motorists, ownerProfile]);

    const [selectedId, setSelectedId] = useState(() => {
        if (userRole !== 'ADMIN' && userRole !== 'AREA_ADMIN' && userRole !== 'COMPANY_OWNER' && agentProfileId) return agentProfileId;
        return allAgents && allAgents.length > 0 ? allAgents[0].id : null;
    });

    const activeAgent = allAgents?.find(m => m.id === selectedId);
    // 🚀 MATRIX: Can edit if they have global editing rights OR if it's their personal profile
    const canEditProfile = hasClearance(userRole, 'edit_agent_roles') || activeAgent?.id === agentProfileId || activeAgent?.id === 'master_owner';

    const [rpgData, setRpgData] = useState({
        expMultiplier: 1, 
        workingDays: [1,2,3,4,5,6], 
        ranks: [
            // `min` is in XP, NOT rupiah. These used to be rupiah-scale (Silver 25.000.000) because
            // the old formula made lifetime EXP roughly equal to rupiah collected. careerXP() is
            // ~100.000x smaller (Rp 100.000 collected = 1 XP), so on the old numbers a 3-year veteran
            // with Rp 5 miliar collected and 900 verified days scored 86.975 XP and was still Bronze —
            // Silver alone would have needed Rp 2,5 triliun. Rescaled to XP units.
            { id: '1', name: 'Bronze', min: 0, hex: '#d97706', title: 'The Wanderer', logo: '', borderImage: '' },
            { id: '2', name: 'Silver', min: 5000, hex: '#94a3b8', title: 'The Hustler', logo: '', borderImage: '' },
            { id: '3', name: 'Gold', min: 20000, hex: '#facc15', title: 'The Market King', logo: '', borderImage: '' },
            { id: '4', name: 'Platinum', min: 50000, hex: '#22d3ee', title: 'The Syndicate Boss', logo: '', borderImage: '' },
            { id: '5', name: 'Diamond', min: 100000, hex: '#c084fc', title: 'The Robin Hood', logo: '', borderImage: '' },
            { id: '6', name: 'Mythic', min: 250000, hex: '#f43f5e', title: 'The Sales Boomer', logo: '', borderImage: '' }
        ]
    });
    const [editingRpgData, setEditingRpgData] = useState(null);

    useEffect(() => {
        if (!db || !appId || !userId) return;
        const fetchSettings = async () => {
            try {
                // 🚀 Phase 4: per-company path first, same cross-tenant-leak fix and
                // one-release fallback as the badge config above.
                const applyLoaded = (loaded) => {
                    loaded.ranks = loaded.ranks.map(r => ({...r, title: r.title || r.perks || 'No Title', hex: r.hex || '#64748b', borderImage: r.borderImage || ''}));
                    setRpgData(loaded);
                };
                const snap = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/settings`, 'progression'));
                if (snap.exists() && snap.data().ranks) { applyLoaded(snap.data()); return; }
                const legacySnap = await getDoc(doc(db, `artifacts/${appId}/settings`, 'rpg_ranks'));
                if (legacySnap.exists() && legacySnap.data().ranks) applyLoaded(legacySnap.data());
            } catch (e) { console.warn("Rank Config Fetch Error", e); }
        };
        fetchSettings();
    }, [db, appId, userId]);

    const uniqueLocations = useMemo(() => ['ALL', ...new Set((allAgents || []).map(m => m.location || 'Field'))], [allAgents]);
    const filteredMotorists = allAgents?.filter(m => locationFilter === 'ALL' || (m.location || 'Field') === locationFilter) || [];

    useEffect(() => { setBioText(activeAgent?.bio || ''); setIsEditingBio(false); }, [activeAgent]);

    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [cropTarget, setCropTarget] = useState(null); 
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => { setCroppedAreaPixels(croppedAreaPixels); }, []);

    const handleFileSelect = (e, target) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { setCropImageSrc(reader.result); setCropTarget(target); setCrop({x:0, y:0}); setZoom(1); };
        reader.readAsDataURL(file);
        e.target.value = null; 
    };

    const handleExecuteCrop = async () => {
        setIsUploading(true);
        try {
            const croppedImageBase64 = await getCroppedImg(cropImageSrc, croppedAreaPixels);
            if (!croppedImageBase64) throw new Error("Cropping failed to return data");
            
            if (cropTarget === 'avatar') {
                // 🚀 FIX: Route avatar photos through the same usePhotoStorage toggle as
                // RestockVaultView/StockOpnameView/BranchWarehouseManager/App.jsx mascot
                // image, instead of always writing raw base64. Toggle off (default)
                // behaves exactly as before — savePhotoAndGetReference just returns the
                // base64 string unchanged.
                const previousImage = activeAgent.profileImage;
                const storagePath = `artifacts/${appId}/users/${userId}/photos/avatar_${activeAgent.id}_${Date.now()}.jpg`;
                const finalImage = await savePhotoAndGetReference(storage, croppedImageBase64, storagePath, appSettings?.usePhotoStorage);

                const agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, activeAgent.id);
                if(activeAgent.id === 'master_owner') await setDoc(agentRef, { ...activeAgent, profileImage: finalImage });
                else await updateDoc(agentRef, { profileImage: finalImage });
                if(activeAgent.id === 'master_owner') setOwnerProfile(prev => ({...prev, profileImage: finalImage}));
                if (previousImage) deletePhotoFromStorage(storage, previousImage);
            } else if (typeof cropTarget === 'number') {
                const newRanks = [...editingRpgData.ranks];
                newRanks[cropTarget].logo = croppedImageBase64;
                setEditingRpgData({...editingRpgData, ranks: newRanks});
            } else if (typeof cropTarget === 'string' && cropTarget.startsWith('border-')) {
                const targetIdx = parseInt(cropTarget.split('-')[1]);
                const newRanks = [...editingRpgData.ranks];
                newRanks[targetIdx].borderImage = croppedImageBase64;
                setEditingRpgData({...editingRpgData, ranks: newRanks});
            }
        } catch (e) { alert("Crop Failed: " + e.message); }
        setCropImageSrc(null);
        setCropTarget(null);
        setIsUploading(false);
    };

    // 🚀 DYNAMIC CORPORATE HIERARCHY ENGINE
    const getCorporateIdentity = (agent) => {
        const role = agent?.userRole || agent?.role || 'FIELD_OPERATIVE';
        const isMaster = agent?.id === 'master_owner';
        
        if (isMaster || role === 'DEVELOPER' || role === 'ADMIN') return { stars: 6, title: 'SYSTEM ARCHITECT', tier: 'TIER 1', color: 'text-rose-500', bg: 'bg-rose-900/30', border: 'border-rose-500/50' };
        
        // Magically syncs with whatever you name them in Settings!
        const foundTier = DYNAMIC_TIERS.find(t => t.id === role);
        if (foundTier) {
            const parts = foundTier.label.split(':');
            const tierStr = parts.length > 1 ? parts[0].trim() : 'TIER';
            const titleStr = parts.length > 1 ? parts[1].trim() : foundTier.label;
            
            let stars = 2; // Default
            if (tierStr.includes('2')) stars = 5;
            if (tierStr.includes('3')) stars = 4;
            if (tierStr.includes('4')) stars = 3;
            if (tierStr.includes('6')) stars = 1;

            return { stars, title: titleStr, tier: tierStr, color: foundTier.color || 'text-cyan-400', bg: 'bg-slate-800/50', border: 'border-slate-500/50' };
        }
        
        return { stars: 2, title: 'FIELD OPERATIVE', tier: 'TIER 5', color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-500/50' };
    };
    
  


    const corpIdentity = getCorporateIdentity(activeAgent);
    const roleStars = corpIdentity.stars;

    const handleBioSave = async () => {
        if (!db || !activeAgent || !canEditProfile) return;
        try {
            const agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, activeAgent.id);
            if(activeAgent.id === 'master_owner') await setDoc(agentRef, { ...activeAgent, bio: bioText });
            else await updateDoc(agentRef, { bio: bioText });
            if(activeAgent.id === 'master_owner') setOwnerProfile(prev => ({...prev, bio: bioText}));
            setIsEditingBio(false);
        } catch(err) { alert("Failed to save record: " + err.message); }
    };

    // 🚀 Phase 6: replaces the old `prompt("Set to 1000000000 to instantly hit Mythic")` override
    // — a number typed with no reason, no grantor, no date, and no audit trail. This writes a real
    // award: a permanent record in career/{agentId}/awards, folded into bonusXP so it counts
    // toward XP immediately, and actually calls logAudit (the old override recorded nothing at all).
    const handleGrantAward = async () => {
        const xpNum = Number(awardForm.xp);
        if (!awardForm.title.trim()) return alert("Award needs a title.");
        if (awardForm.reason.trim().length < 10) return alert("Reason needs at least 10 characters — a real explanation, not a placeholder.");
        if (isNaN(xpNum) || xpNum === 0) return alert("XP must be a nonzero number.");
        try {
            const careerRef = doc(db, `artifacts/${appId}/users/${userId}/career`, activeAgent.id);
            const awardRef = doc(collection(db, `artifacts/${appId}/users/${userId}/career/${activeAgent.id}/awards`));
            await setDoc(awardRef, {
                title: awardForm.title.trim(), reason: awardForm.reason.trim(), xp: xpNum,
                cosmetic: awardForm.cosmetic.trim() || null,
                grantedBy: userId, grantedByName: activeAgent.name || 'Admin', grantedAt: serverTimestamp()
            });
            await setDoc(careerRef, { bonusXP: increment(xpNum), awardCount: increment(1) }, { merge: true });
            await logAudit?.("AWARD_GRANTED", `Granted "${awardForm.title.trim()}" (${xpNum} XP) to ${activeAgent.name}: ${awardForm.reason.trim()}`);
            setShowAwardForm(false);
            setAwardForm({ title: '', reason: '', xp: '', cosmetic: '' });
        } catch (err) { alert("Failed to grant award: " + err.message); }
    };

    const handleSaveRankConfig = async () => {
        try {
            const sortedRanks = [...editingRpgData.ranks].sort((a,b) => Number(a.min) - Number(b.min));
            // 🚀 Phase 4: dedupe by min — two ranks sharing a min produces a NaN% progress bar
            // at the division below (next.min - current.min === 0).
            const dedupedRanks = sortedRanks.filter((r, i) => i === 0 || Number(r.min) !== Number(sortedRanks[i - 1].min));
            const finalData = { ...editingRpgData, ranks: dedupedRanks };
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/settings`, 'progression'), finalData, { merge: true });
            setRpgData(finalData);
            setShowRankConfig(false);
        } catch (error) { alert("Failed to save Rank Configuration."); }
    };

    // The frame each agent wears is THEIRS — stored on their own motorist doc, not on the rank.
    // The rank's own `borderStyle` (set in Rank Config) is what a rank *grants*: it is the frame
    // an agent is switched to when they reach that rank, and it is what they wear until they pick
    // something else. Field agents are already allowed to write their own motorist doc
    // (firestore.rules:480, the same clause activeCanvas stock deduction relies on), so this needs
    // no rules change.
    const writeAgentBorder = async (patch) => {
        const agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, activeAgent.id);
        if (activeAgent.id === 'master_owner') await setDoc(agentRef, { ...activeAgent, ...patch });
        else await updateDoc(agentRef, patch);
        if (activeAgent.id === 'master_owner') setOwnerProfile(prev => ({ ...prev, ...patch }));
    };

    const handleSaveBorderStyle = async (styleId) => {
        // borderTier is stamped alongside the pick so the rank-up effect below does not immediately
        // overwrite a deliberate choice made at the rank the agent is already standing on.
        try {
            await writeAgentBorder({ borderStyle: styleId, borderTier: stats.currentTier?.id || null });
        } catch (e) { alert("Failed to save frame: " + e.message); }
    };

    const toggleWorkingDay = (dayIndex) => {
        const wd = [...(editingRpgData.workingDays || [1,2,3,4,5,6])];
        if (wd.includes(dayIndex)) wd.splice(wd.indexOf(dayIndex), 1);
        else wd.push(dayIndex);
        setEditingRpgData({...editingRpgData, workingDays: wd.sort()});
    };

    const stats = useMemo(() => {
        if (!activeAgent) return null;

        let lifetimeOmset = 0; let todayOmset = 0; let todayCash = 0; let titipIssued = 0; let titipCollected = 0;
        let totalItemsSold = 0; let ecerItemsSold = 0;
        const yearlyAgentOmset = {};

        const today = new Date(); const todayStr = today.toISOString().split('T')[0];
        const currentMonth = today.getMonth(); const currentYear = today.getFullYear();
        
        const getMonday = (d) => {
            const date = new Date(d); const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(date.setDate(diff));
        };
        const currentMonday = getMonday(new Date());
        
        const thisWeek = Array.from({length: 7}, (_, i) => {
            const d = new Date(currentMonday); d.setDate(currentMonday.getDate() + i);
            return { date: d.toISOString().split('T')[0], label: d.toLocaleDateString('id-ID', {weekday:'short'}), dayIndex: d.getDay(), cash: 0, titip: 0 };
        }).filter(day => (rpgData.workingDays || [1,2,3,4,5,6]).includes(day.dayIndex));

        const thisMonth = [ { label: 'Wk 1', cash: 0, titip: 0 }, { label: 'Wk 2', cash: 0, titip: 0 }, { label: 'Wk 3', cash: 0, titip: 0 }, { label: 'Wk 4', cash: 0, titip: 0 } ];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const thisYear = monthNames.map(m => ({ label: m, cash: 0, titip: 0 }));
        
        const uniqueStores = new Set();
        const storeDebt = {};

        (transactions || []).forEach(t => {
            // 🚀 HALL OF FAME: Calculate global yearly omset for MVP race
            if (t.type === 'SALE') {
                let txDateStr = t.date;
                try {
                    if (!txDateStr && t.timestamp && t.timestamp.seconds) {
                        txDateStr = new Date(t.timestamp.seconds * 1000).toISOString().split('T')[0];
                    }
                } catch(e) { txDateStr = null; }

                if (txDateStr && txDateStr.startsWith(currentYear.toString())) {
                    const aId = t.agentId || 'UNKNOWN';
                    if (!yearlyAgentOmset[aId]) yearlyAgentOmset[aId] = 0;
                    yearlyAgentOmset[aId] += (t.total || 0);
                }
            }

            const isOwnerView = activeAgent.id === 'master_owner';
            const belongsToAgent = t.agentId === activeAgent.id || (t.agentName && t.agentName.toLowerCase() === activeAgent.name?.toLowerCase());

            if (isOwnerView || belongsToAgent) {
                let txDateStr = t.date;
                let txDateObj = null;
                
                try {
                    if (!txDateStr && t.timestamp && t.timestamp.seconds) {
                        txDateObj = new Date(t.timestamp.seconds * 1000);
                        txDateStr = txDateObj.toISOString().split('T')[0];
                    } else if (txDateStr) {
                        txDateObj = new Date(txDateStr);
                    }
                } catch(e) { txDateStr = null; }
                
                if (t.type === 'SALE') {
                    lifetimeOmset += (t.total || 0);
                    if (t.customerName) uniqueStores.add(t.customerName);

                    // 🚀 VOLUME & ECER MATH
                    const itemsList = Array.isArray(t.items) ? t.items : Object.values(t.items || {});
                    let tQty = 0;
                    itemsList.forEach(i => {
                        const product = inventory?.find(p => p.id === i.productId);
                        let mult = 1;
                        if (i.unit === 'Slop') mult = product?.packsPerSlop || 10;
                        if (i.unit === 'Bal') mult = (product?.slopsPerBal || 20) * (product?.packsPerSlop || 10);
                        if (i.unit === 'Karton') mult = (product?.balsPerCarton || 4) * (product?.slopsPerBal || 20) * (product?.packsPerSlop || 10);
                        tQty += (Number(i.qty) || 0) * mult;
                    });
                    totalItemsSold += tQty;
                    
                    const isEcer = itemsList.some(i => i.priceTier === 'Ecer') || (t.customerName || '').toLowerCase().includes('ecer') || (t.customerName || '').toLowerCase().includes('walk-in');
                    if (isEcer) ecerItemsSold += tQty;
                    
                    if (t.paymentType === 'Titip') {
                        titipIssued += (t.total || 0);
                        if(t.customerName) {
                            if(!storeDebt[t.customerName]) storeDebt[t.customerName] = 0;
                            storeDebt[t.customerName] += (t.total || 0);
                        }
                    }
                    if (txDateStr === todayStr) {
                        todayOmset += (t.total || 0);
                        if (t.paymentType !== 'Titip') todayCash += (t.total || 0);
                    }
                    if (txDateStr && txDateObj) {
                        const isTitip = t.paymentType === 'Titip';
                        const dayWeekNode = thisWeek.find(d => d.date === txDateStr);
                        if (dayWeekNode) dayWeekNode[isTitip ? 'titip' : 'cash'] += (t.total || 0);
                        if (txDateObj.getMonth() === currentMonth && txDateObj.getFullYear() === currentYear) {
                            const dateNum = txDateObj.getDate();
                            const weekIdx = dateNum <= 7 ? 0 : dateNum <= 14 ? 1 : dateNum <= 21 ? 2 : 3;
                            thisMonth[weekIdx][isTitip ? 'titip' : 'cash'] += (t.total || 0);
                        }
                        if (txDateObj.getFullYear() === currentYear) thisYear[txDateObj.getMonth()][isTitip ? 'titip' : 'cash'] += (t.total || 0);
                    }
                }
                if (t.type === 'CONSIGNMENT_PAYMENT') {
                    titipCollected += (t.amountPaid || t.total || 0);
                    if(t.customerName && storeDebt[t.customerName]) storeDebt[t.customerName] -= (t.amountPaid || t.total || 0);
                }
            }
        });

        // 🚀 DETERMINE REGIONAL MVP (Highest Yearly Omset excluding Admin/Owner)
        let topAgentId = null;
        let maxYearOmset = 0;
        Object.keys(yearlyAgentOmset).forEach(aId => {
            if (aId !== 'master_owner' && aId !== 'ADMIN' && aId !== 'ADMIN_VEHICLE' && aId !== 'VAULT' && yearlyAgentOmset[aId] > maxYearOmset) {
                maxYearOmset = yearlyAgentOmset[aId];
                topAgentId = aId;
            }
        });
        const isTopAgentOfYear = (activeAgent.id === topAgentId) && maxYearOmset > 0;

        const activeTitipResponsibility = Math.max(0, titipIssued - titipCollected);
        const activeDebtList = Object.keys(storeDebt).filter(k => storeDebt[k] > 0).map(k => ({ store: k, amount: storeDebt[k] })).sort((a,b) => b.amount - a.amount);
        
        let canvasValue = 0;
        const canvasBreakdown = [];
        
        if (activeAgent.id !== 'master_owner') {
            (activeAgent.activeCanvas || []).forEach(item => {
                const product = inventory?.find(p => p.id === item.productId);
                let price = product ? (product.priceEcer || product.priceRetail || 0) : item.calculatedPrice || 0;
                let qtyInBks = item.qty;
                if (product) {
                    if (item.unit === 'Slop') qtyInBks = item.qty * (product.packsPerSlop || 10);
                    if (item.unit === 'Bal') qtyInBks = item.qty * (product.slopsPerBal || 20) * (product.packsPerSlop || 10);
                    if (item.unit === 'Karton') qtyInBks = item.qty * (product.balsPerCarton || 4) * (product.slopsPerBal || 20) * (product.packsPerSlop || 10);
                }
                const totalItemValue = qtyInBks * price;
                canvasValue += totalItemValue;
                canvasBreakdown.push({ name: product?.name || item.productId, qty: item.qty, unit: item.unit, value: totalItemValue });
            });
        }

        // 🚀 Phase 4, behind a flag: flag OFF keeps the byte-identical old formula (7-day
        // omset window * multiplier + manualExp). Flag ON reads real career history instead,
        // so rank stops falling back to Bronze after a sick week. See config/career.js.
        const lifetimeEXP = useCareerLedger
            ? careerXP(career?.[activeAgent.id] || {}, DEFAULT_XP)
            : (lifetimeOmset * (rpgData.expMultiplier || 1)) + (activeAgent.manualExp || 0);
        const sortedRanks = [...rpgData.ranks].sort((a,b) => Number(a.min) - Number(b.min));
        
        let currentTier = sortedRanks[0] || { name: 'Unranked', hex: '#64748b', min: 0 }; 
        let nextTier = sortedRanks[1] || null;
        let tierIndex = 0;
        
        for (let i = sortedRanks.length - 1; i >= 0; i--) {
            if (lifetimeEXP >= Number(sortedRanks[i].min)) { 
                currentTier = sortedRanks[i]; 
                nextTier = sortedRanks[i + 1] || null; 
                tierIndex = i;
                break; 
            }
        }
        const progressPercent = nextTier ? Math.min(100, Math.max(0, ((lifetimeEXP - currentTier.min) / Math.max(1, nextTier.min - currentTier.min)) * 100)) : 100;

        let daysInServiceNum = 0;
        if (activeAgent?.createdAt) {
            const createdTime = activeAgent.createdAt.seconds ? activeAgent.createdAt.seconds * 1000 : new Date(activeAgent.createdAt).getTime();
            if (!isNaN(createdTime)) daysInServiceNum = Math.max(0, Math.floor((new Date().getTime() - createdTime) / (1000 * 60 * 60 * 24)));
        } else if (activeAgent.id === 'master_owner') daysInServiceNum = 999;

        const daysInService = daysInServiceNum === 999 ? 'DAY ONE' : (daysInServiceNum > 0 ? `${daysInServiceNum} Days` : 'NEW');
        const currentYearString = currentYear.toString();

        return { 
            lifetimeOmset, lifetimeEXP, todayOmset, todayCash, activeTitipResponsibility, canvasValue, 
            currentTier, nextTier, tierIndex, progressPercent, daysInService, daysInServiceNum,
            chartData1W: thisWeek, chartData1M: thisMonth, chartData1Y: thisYear,
            achievements: { stores: uniqueStores.size, titipCollected, totalItemsSold, ecerItemsSold },
            canvasBreakdown, activeDebtList, isTopAgentOfYear, currentYearString
        };
    }, [activeAgent, transactions, inventory, rpgData]);

    // How far up the ladder you are, scaled onto the frame shelf — bottom rank owns 1 frame, top
    // rank owns all of them, whatever the rank count happens to be.
    //
    // The obvious rule — "you own the borderStyle of every rank you passed" — was tried first and
    // is useless in practice: Rank Config leaves Border unset on most tiers, every unset tier reads
    // as 'classic', and a Mythic agent ended up owning 2 frames out of 7. Unlocks are now driven by
    // POSITION on the ladder, not by what each tier happens to have configured, so they can never
    // collapse like that again. The rank's own granted frame is unioned in regardless, so a frame
    // an agent is actually wearing is never missing from their own picker.
    const unlockedBorders = useMemo(() => {
        const sorted = [...(rpgData.ranks || [])].sort((a, b) => Number(a.min) - Number(b.min));
        const reached = (stats?.tierIndex ?? 0) + 1;
        const count = sorted.length
            ? Math.ceil((reached / sorted.length) * RANK_BORDERS.length)
            : 1;
        const earned = new Set(RANK_BORDERS.slice(0, count).map(b => b.id));
        sorted.slice(0, reached).forEach(r => { if (r.borderStyle) earned.add(r.borderStyle); });
        const list = RANK_BORDERS.filter(b => earned.has(b.id));
        return list.length ? list : [RANK_BORDERS[0]];
    }, [rpgData, stats?.tierIndex]);

    // Rank-up auto-switch. Reaching a new rank hands the agent that rank's frame — once. The stamp
    // is `borderTier`: while it matches the current rank nothing is written, so a frame the agent
    // picks afterwards is never clobbered on a later render. Runs on the client and lands the next
    // time the profile is opened, because the project is on the Spark plan — no Cloud Functions to
    // do it the moment the XP crosses the threshold.
    useEffect(() => {
        if (!activeAgent || !stats?.currentTier?.id || !canEditProfile) return;
        if (activeAgent.borderTier === stats.currentTier.id) return;
        writeAgentBorder({
            borderStyle: stats.currentTier.borderStyle || 'classic',
            borderTier: stats.currentTier.id,
        }).catch(e => console.warn("Rank-up frame switch skipped:", e.message));
    }, [activeAgent?.id, activeAgent?.borderTier, stats?.currentTier?.id, canEditProfile]);

    if (!activeAgent || !stats) return <div className="p-8 text-white">No Agent Data Found.</div>;

    const formatRp = (num) => new Intl.NumberFormat('id-ID', { notation: "compact", maximumFractionDigits: 1 }).format(num);
    const formatFullRp = (num) => new Intl.NumberFormat('id-ID').format(num);
    const chartDataToRender = chartFilter === '1W' ? stats.chartData1W : chartFilter === '1M' ? stats.chartData1M : stats.chartData1Y;

    const renderRarityStars = (count, hex) => {
        const safeHex = hex || '#64748b';
        return (
            <div className="flex gap-1 mt-1 mb-2">
                {[...Array(6)].map((_, i) => (
                    <Star key={i} size={16} className={`transition-all duration-500 ${i < count ? 'fill-current drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-110 animate-pulse' : 'text-slate-800 opacity-30'}`} style={{ color: i < count ? safeHex : undefined }} />
                ))}
            </div>
        );
    };
    
    const safeCurrentHex = stats.currentTier.hex || '#64748b';

    // The agent's own pick wins, but only while it is still unlocked — an admin reshuffling the
    // rank ladder can strip a frame out from under someone, and a `value` with no matching option
    // renders the select blank. Falling back to the current rank's frame is always safe: that rank
    // is inside the unlocked slice by definition.
    const activeBorderStyle = unlockedBorders.some(b => b.id === activeAgent.borderStyle)
        ? activeAgent.borderStyle
        : (stats.currentTier.borderStyle || 'classic');

    return (
        <div className="flex h-full min-h-screen bg-[#050505] font-sans relative overflow-hidden">
            <style>{BORDER_KEYFRAMES}</style>

            {cropImageSrc && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[999999] flex flex-col items-center justify-center p-6">
                    <div className="relative w-full max-w-2xl h-[60vh] bg-black border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                        <Cropper
                            image={cropImageSrc} crop={crop} zoom={zoom} aspect={1}
                            onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom}
                            cropShape={cropTarget === 'avatar' ? 'round' : 'rect'}
                            showGrid={false}
                        />
                    </div>
                    <div className="mt-8 flex gap-4 w-full max-w-2xl">
                        <button onClick={() => setCropImageSrc(null)} className="flex-1 py-4 border border-slate-700 text-slate-300 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">Cancel</button>
                        <button onClick={handleExecuteCrop} disabled={isUploading} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-colors flex items-center justify-center gap-2">{isUploading ? 'Saving...' : <><Camera size={18}/> Execute Crop & Save</>}</button>
                    </div>
                </div>
            )}



            {/* 🚀 Phase 5: Customize Avatar — photo and frame in one place. Sits one z-index below
                the cropper above, so picking a photo from in here stacks the cropper on top and
                drops back to this modal (with the new photo already in the preview) when done. */}
            {showAvatarCustomizer && canEditProfile && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[999998] flex items-center justify-center p-6" onClick={() => setShowAvatarCustomizer(false)}>
                    <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowAvatarCustomizer(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6">Customize Avatar</h3>

                        <div className="flex justify-center mb-6">
                            <div className="relative w-32 h-32">
                                <AgentAvatar tier={stats.currentTier} tierIndex={stats.tierIndex} hex={safeCurrentHex} photo={activeAgent.profileImage} styleId={activeBorderStyle} iconSize={48} />
                            </div>
                        </div>

                        <button onClick={() => document.getElementById('avatar-input').click()} className="w-full py-3 mb-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                            <Camera size={16}/> {activeAgent.profileImage ? 'Replace Photo' : 'Upload Photo'}
                        </button>

                        <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Frame</label>
                        <select
                            value={activeBorderStyle}
                            onChange={(e) => handleSaveBorderStyle(e.target.value)}
                            className="w-full bg-black border border-slate-800 text-white px-3 py-2 rounded text-xs outline-none focus:border-slate-500 transition-colors"
                        >
                            {unlockedBorders.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                            {unlockedBorders.length} of {RANK_BORDERS.length} frames unlocked — one for every rank reached. Ranking up switches you to the new rank's frame; you can change it back to any unlocked one.
                        </p>
                        {stats.currentTier.borderImage && (
                            <p className="text-[10px] text-amber-500 mt-2 leading-relaxed">This rank has a custom border image uploaded, which is drawn instead of any frame picked here. Clear it in Rank Config to see these frames.</p>
                        )}
                    </div>
                </div>
            )}

            {/* 🚀 NEW: HALL OF FAME OVERLAY MODAL */}
            {showHallOfFame && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[999999] flex flex-col p-4 md:p-8 overflow-y-auto custom-scrollbar lg:pl-[17rem]">
                    <button onClick={() => setShowHallOfFame(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white z-50 bg-black/50 p-2 rounded-full border border-slate-700"><X size={24}/></button>
                    <div className="w-full mt-10 lg:mt-4">
                        <HallOfFameView motorists={motorists} transactions={transactions} rpgData={rpgData} career={career} useCareerLedger={useCareerLedger} badgeData={badgeData} />
                    </div>
                </div>
            )}


            {/* 🚀 NEW: DYNAMIC ACHIEVEMENT EDITOR MODAL */}
            {showBadgeConfig && hasClearance(userRole, 'edit_rank_config') && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[999999] flex flex-col items-center p-4 md:p-8 overflow-y-auto custom-scrollbar lg:pl-[17rem]">
                    <div className="max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl relative mt-10 md:mt-0">
                        <button onClick={() => setShowBadgeConfig(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X size={24}/></button>
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3"><Award className="text-yellow-500"/> Achievement Config</h2>
                        
                        <div className="space-y-4 mb-8">
                            {editingBadges.map((badge, idx) => (
                                <div key={idx} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col xl:flex-row gap-5 relative">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full">
                                        <div className="md:col-span-3">
                                            <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Badge Title</label>
                                            <input type="text" value={badge.title} onChange={(e) => { const b = [...editingBadges]; b[idx].title = e.target.value; setEditingBadges(b); }} className="w-full bg-black border border-slate-800 text-white px-3 py-2 rounded text-sm outline-none focus:border-blue-500" />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Data Source</label>
                                            {/* Options come from BADGE_SOURCES (career.js), never a hand-written list.
                                                This dropdown used to offer 6 keys totals() doesn't return, so any badge
                                                built on them sat at 0% and could never unlock. Picking a source also
                                                sets fmt, so a rupiah badge can't render as a bare count. */}
                                            <select value={badge.source} onChange={(e) => { const b = [...editingBadges]; const src = e.target.value; b[idx].source = src; b[idx].fmt = STAT_LABELS[src]?.fmt || 'count'; setEditingBadges(b); }} className="w-full bg-black border border-slate-800 text-white px-3 py-2 rounded text-xs outline-none focus:border-blue-500">
                                                {BADGE_SOURCES.map(s => (
                                                    <option key={s.key} value={s.key}>{s.label}{s.fmt === 'rp' ? ' (Rp)' : ''}</option>
                                                ))}
                                                {/* An old config may still point at a retired key. Show it rather than
                                                    silently snapping the badge to a different stat on first render. */}
                                                {badge.source && !BADGE_SOURCES.some(s => s.key === badge.source) && (
                                                    <option value={badge.source}>⚠ {statLabel(badge.source)} — tidak terpakai lagi</option>
                                                )}
                                            </select>
                                            {badge.source && !BADGE_SOURCES.some(s => s.key === badge.source) && (
                                                <p className="text-[10px] text-amber-400 font-mono mt-1 leading-tight">
                                                    Sumber ini tidak dilacak — badge tidak akan pernah terbuka. Pilih sumber lain.
                                                </p>
                                            )}
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Target Number</label>
                                            <input type="number" value={badge.target} onChange={(e) => { const b = [...editingBadges]; b[idx].target = Number(e.target.value); setEditingBadges(b); }} className="w-full bg-black border border-slate-800 text-white px-3 py-2 rounded text-sm outline-none font-mono focus:border-blue-500" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Theme / Color</label>
                                            <div className="flex gap-2">
                                                <input type="color" value={badge.hex || '#ffffff'} onChange={(e) => { const b = [...editingBadges]; b[idx].hex = e.target.value; setEditingBadges(b); }} className="w-8 h-9 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                                                <select value={badge.icon} onChange={(e) => { const b = [...editingBadges]; b[idx].icon = e.target.value; setEditingBadges(b); }} className="w-full bg-black border border-slate-800 text-white px-2 py-2 rounded text-xs outline-none">
                                                    {Object.keys(DynamicIconMap).map(k => <option key={k} value={k}>{k}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 relative flex flex-col justify-end">
                                            <button onClick={() => { const b = [...editingBadges]; b.splice(idx, 1); setEditingBadges(b); }} className="w-full bg-red-900/20 border border-red-500/50 text-red-500 rounded py-2 text-xs font-bold hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"><Trash2 size={14}/> Remove</button>
                                        </div>
                                        <div className="md:col-span-12">
                                            <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Description Template (Use {'{val}'} and {'{max}'} as placeholders)</label>
                                            <input type="text" value={badge.desc} onChange={(e) => { const b = [...editingBadges]; b[idx].desc = e.target.value; setEditingBadges(b); }} placeholder="e.g. Sold {val} out of {max} items." className="w-full bg-black border border-slate-800 text-emerald-400 px-3 py-2 rounded text-xs outline-none focus:border-emerald-500" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {/* Defaults must be a TRACKED source, plus cat and fmt: without cat the badge
                                vanishes the moment any category tab is clicked, without fmt a rupiah
                                badge renders as a bare number. The old default was 'totalItemsSold',
                                which totals() doesn't return — so every badge created here was born
                                permanently locked. */}
                            <button onClick={() => setEditingBadges([...editingBadges, { id: Date.now().toString(), cat: 'jual', source: 'itemsBks', fmt: STAT_LABELS.itemsBks.fmt, target: 1000, title: 'New Badge', desc: 'Reached {val} / {max}', icon: 'Star', hex: '#ffffff' }])} className="w-full py-4 border-2 border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-blue-500 rounded-xl flex justify-center items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors"><Plus size={18}/> Add New Badge</button>
                        </div>
                        <button onClick={handleSaveBadgeConfig} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-black uppercase tracking-[0.2em] py-5 rounded-xl shadow-[0_0_20px_rgba(202,138,4,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"><Save size={20}/> Deploy Achievements</button>
                    </div>
                </div>
            )}

            {showAwardForm && hasClearance(userRole, 'edit_agent_roles') && (
                <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4" onClick={() => setShowAwardForm(false)}>
                    <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2"><Award size={20} className="text-blue-500"/> Grant Award</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-4">To {activeAgent?.name}</p>
                        <input type="text" placeholder="Title (e.g. Ketenangan Luar Biasa)" value={awardForm.title} onChange={e => setAwardForm({...awardForm, title: e.target.value})} className="w-full bg-black border border-slate-700 rounded-lg p-3 text-sm text-white mb-3 outline-none focus:border-blue-500"/>
                        <textarea placeholder="Reason — at least 10 characters, a real explanation" value={awardForm.reason} onChange={e => setAwardForm({...awardForm, reason: e.target.value})} className="w-full bg-black border border-slate-700 rounded-lg p-3 text-sm text-white mb-1 outline-none focus:border-blue-500 resize-none h-24"/>
                        <p className={`text-[11px] mb-3 ${awardForm.reason.trim().length >= 10 ? 'text-emerald-500' : 'text-slate-400'}`}>{awardForm.reason.trim().length}/10 characters minimum</p>
                        <input type="number" placeholder="XP amount" value={awardForm.xp} onChange={e => setAwardForm({...awardForm, xp: e.target.value})} className="w-full bg-black border border-slate-700 rounded-lg p-3 text-sm text-white mb-3 outline-none focus:border-blue-500"/>
                        <input type="text" placeholder="Cosmetic id (optional)" value={awardForm.cosmetic} onChange={e => setAwardForm({...awardForm, cosmetic: e.target.value})} className="w-full bg-black border border-slate-700 rounded-lg p-3 text-sm text-white mb-4 outline-none focus:border-blue-500"/>
                        <div className="flex gap-3">
                            <button onClick={() => setShowAwardForm(false)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-lg font-bold uppercase text-xs">Cancel</button>
                            <button onClick={handleGrantAward} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold uppercase text-xs">Grant</button>
                        </div>
                    </div>
                </div>
            )}

            {showRankConfig && hasClearance(userRole, 'edit_rank_config') && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[999999] flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto custom-scrollbar lg:pl-[17rem]">
                    <div className="max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button onClick={() => setShowRankConfig(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X size={24}/></button>
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3"><Settings className="text-blue-500"/> Rank & EXP Architecture</h2>
                        
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                            <div className="bg-black/50 p-6 rounded-xl border border-slate-800">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Global Experience Multiplier</label>
                                <div className="flex items-center gap-4">
                                    <span className="text-emerald-500 font-black text-sm">1 Rupiah (Omset) = </span>
                                    <input type="number" value={editingRpgData.expMultiplier} onChange={(e) => setEditingRpgData({...editingRpgData, expMultiplier: Number(e.target.value)})} className="bg-slate-950 border border-slate-700 text-white px-4 py-2 rounded-lg font-mono text-center w-32 focus:border-blue-500 outline-none"/>
                                    <span className="text-blue-500 font-black text-sm">EXP</span>
                                </div>
                            </div>
                            <div className="bg-black/50 p-6 rounded-xl border border-slate-800">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Timeline Analytics (Working Days)</label>
                                <div className="flex gap-2 justify-center">
                                    {[{id:1,l:'Mon'},{id:2,l:'Tue'},{id:3,l:'Wed'},{id:4,l:'Thu'},{id:5,l:'Fri'},{id:6,l:'Sat'},{id:0,l:'Sun'}].map(day => (
                                        <button key={day.id} onClick={() => toggleWorkingDay(day.id)} className={`w-10 h-10 rounded-lg font-black text-[10px] uppercase transition-all ${(editingRpgData.workingDays || [1,2,3,4,5,6]).includes(day.id) ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-600'}`}>
                                            {day.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest border-b border-slate-800 pb-2">Active Progression Tiers</h3>
                            {editingRpgData.ranks.map((rank, idx) => (
                                <div key={idx} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col xl:flex-row gap-5 items-start xl:items-center relative">
                                    
                                    <div className="flex gap-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] text-slate-400 uppercase tracking-widest text-center font-bold">Rank Icon</label>
                                            <div className="relative group cursor-pointer w-16 h-16 rounded-lg border-[3px] overflow-hidden bg-black flex items-center justify-center shadow-lg" style={{ borderColor: rank.hex || '#64748b' }} onClick={() => document.getElementById(`logo-upload-${idx}`).click()}>
                                                {rank.logo ? <img src={rank.logo} className="w-full h-full object-contain p-1" /> : <ImageIcon className="text-slate-400" size={24}/>}
                                                <div className="absolute inset-0 bg-black/60 opacity-40 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera size={16} className="text-white"/></div>
                                                <input type="file" id={`logo-upload-${idx}`} className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, idx)} />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] text-slate-400 uppercase tracking-widest text-center font-bold">Custom Border</label>
                                            <div className="relative group cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-slate-600 overflow-hidden bg-black flex items-center justify-center hover:border-blue-500 transition-colors" onClick={() => document.getElementById(`border-upload-${idx}`).click()}>
                                                {rank.borderImage ? <img src={rank.borderImage} className="w-full h-full object-contain" /> : <ImageIcon className="text-slate-400" size={20}/>}
                                                <div className="absolute inset-0 bg-black/60 opacity-40 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity"><Camera size={14} className="text-white"/><span className="text-[6px] font-bold text-white mt-0.5">UPLOAD PNG</span></div>
                                                <input type="file" id={`border-upload-${idx}`} className="hidden" accept="image/png" onChange={(e) => handleFileSelect(e, `border-${idx}`)} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 w-full">
                                        <div className="md:col-span-3">
                                            <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Rank Name</label>
                                            <input type="text" value={rank.name} onChange={(e) => { const r = [...editingRpgData.ranks]; r[idx].name = e.target.value; setEditingRpgData({...editingRpgData, ranks: r})}} className="w-full bg-black border border-slate-800 text-white px-3 py-2 rounded text-sm outline-none focus:border-blue-500 transition-colors" />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1">EXP Required</label>
                                            {/* type="text" + grouped display: a number input can't render "250.000",
                                                and long XP thresholds are unreadable as a run of zeros. Stored raw —
                                                parseGroupedNumber strips the separators back out on every change. */}
                                            <input type="text" inputMode="numeric" value={formatNumber(rank.min)} onChange={(e) => { const r = [...editingRpgData.ranks]; r[idx].min = parseGroupedNumber(e.target.value); setEditingRpgData({...editingRpgData, ranks: r})}} className="w-full bg-black border border-slate-800 text-white px-3 py-2 rounded text-sm outline-none font-mono focus:border-blue-500 transition-colors" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Theme</label>
                                            <div className="flex gap-2">
                                                <input type="color" value={rank.hex || '#64748b'} onChange={(e) => { const r = [...editingRpgData.ranks]; r[idx].hex = e.target.value; setEditingRpgData({...editingRpgData, ranks: r})}} className="w-10 h-9 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                                                <input type="text" value={rank.hex || '#64748b'} onChange={(e) => { const r = [...editingRpgData.ranks]; r[idx].hex = e.target.value; setEditingRpgData({...editingRpgData, ranks: r})}} className="w-full bg-black border border-slate-800 text-slate-400 px-2 py-2 rounded text-xs outline-none font-mono uppercase" />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Border</label>
                                            <select
                                                value={rank.borderStyle || 'classic'}
                                                onChange={(e) => { const r = [...editingRpgData.ranks]; r[idx].borderStyle = e.target.value; setEditingRpgData({...editingRpgData, ranks: r}); }}
                                                className="w-full bg-black border border-slate-800 text-white px-2 py-2 rounded text-xs outline-none focus:border-blue-500 transition-colors"
                                            >
                                                {RANK_BORDERS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 relative flex flex-col justify-end">
                                            <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Achievement Title</label>
                                            <div className="flex gap-2">
                                                <input type="text" value={rank.title || ''} onChange={(e) => { const r = [...editingRpgData.ranks]; r[idx].title = e.target.value; setEditingRpgData({...editingRpgData, ranks: r})}} placeholder="e.g. The Sales Boomer" className="w-full bg-black border border-slate-800 text-emerald-400 px-3 py-2 rounded text-xs outline-none focus:border-emerald-500 transition-colors" />
                                                <button onClick={() => { const r = [...editingRpgData.ranks]; r.splice(idx, 1); setEditingRpgData({...editingRpgData, ranks: r})}} className="w-9 h-9 bg-red-900/20 border border-red-500/50 text-red-500 rounded flex items-center justify-center shrink-0 hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => setEditingRpgData({...editingRpgData, ranks: [...editingRpgData.ranks, {id: Date.now().toString(), name: 'New Rank', min: 0, hex: '#ffffff', title: '', logo: '', borderImage: ''}]})} className="w-full py-4 border-2 border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-blue-500 rounded-xl flex justify-center items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors"><Plus size={18}/> Add New Rank Tier</button>
                        </div>

                        <button onClick={handleSaveRankConfig} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] py-5 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"><Save size={20}/> Deploy Rank Architecture</button>
                    </div>
                </div>
            )}

            {isSidebarOpen && window.innerWidth <= 1024 && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            {/* 🚀 MATRIX: Directory sidebar access */}
            {hasClearance(userRole, 'view_dashboard') && (
                <div className={`fixed lg:relative top-0 left-0 h-full bg-slate-950/95 border-r border-slate-800 flex flex-col shrink-0 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-50 shadow-[20px_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0'}`}>
                    <div className="w-72 flex flex-col h-full">
                        <div className="p-4 border-b border-slate-800 bg-black/50 sticky top-0 z-10 space-y-3">
                            <div className="flex justify-between items-center">
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target size={14} className="text-emerald-500"/> Agent Directory</h2>
                                <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white"><X size={18}/></button>
                            </div>
                            <div className="relative group">
                                <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-[10px] uppercase font-bold rounded-lg pl-8 pr-3 py-2.5 outline-none focus:border-blue-500 appearance-none cursor-pointer transition-colors hover:border-slate-500 shadow-inner">
                                    {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc === 'ALL' ? 'ALL DEPLOYMENT ZONES' : loc}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="p-3 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                            {filteredMotorists.length === 0 ? (
                                <p className="text-center text-[10px] text-slate-400 uppercase font-bold py-4">No agents in this zone.</p>
                            ) : (
                                filteredMotorists.map(agent => (
                                    <button 
                                        key={agent.id} 
                                        onClick={() => { setSelectedId(agent.id); if(window.innerWidth <= 1024) setIsSidebarOpen(false); }}
                                        className={`w-full text-left p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 group relative overflow-hidden ${selectedId === agent.id ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] translate-x-1' : 'bg-slate-900/50 border-slate-800/50 hover:border-slate-600 hover:bg-slate-800'}`}
                                    >
                                        {selectedId === agent.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>}
                                        <div className={`w-10 h-10 rounded-full border ${selectedId === agent.id ? 'border-blue-400 text-blue-400' : 'border-slate-700 text-slate-400 bg-black'} flex items-center justify-center shrink-0 overflow-hidden`}>
                                            {agent.profileImage ? <img src={agent.profileImage} className="w-full h-full object-cover"/> : <User size={18}/>}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className={`font-bold text-sm truncate transition-colors flex items-center gap-1 ${selectedId === agent.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{agent.name} {agent.id === 'master_owner' && <ShieldCheck size={12} className="text-yellow-500"/>}</p>
                                            <p className="text-[11px] text-slate-400 uppercase tracking-widest truncate">{agent.location || 'Field'}</p>
                                        </div>
                                        {selectedId === agent.id && <ChevronRight size={14} className="text-blue-500 absolute right-3 opacity-50"/>}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 h-screen overflow-y-auto custom-scrollbar relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" style={{ backgroundColor: '#0f172a' }}>
                
                <div className="absolute top-6 left-6 z-30 flex gap-3">
                    {/* 🚀 MATRIX: If they have dashboard rights, they need the Directory Toggle */}
                    {hasClearance(userRole, 'view_dashboard') && (
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="bg-black/80 backdrop-blur-md border border-slate-700 p-2.5 rounded-xl text-slate-400 hover:text-white hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all active:scale-95 group">
                            {isSidebarOpen ? <X size={20}/> : <Menu size={20} className="group-hover:animate-pulse"/>}
                        </button>
                    )}
                    {/* 🚀 MATRIX: Rank Config Button Access */}
                    {hasClearance(userRole, 'edit_rank_config') && (
                        <button onClick={() => { setEditingRpgData(JSON.parse(JSON.stringify(rpgData))); setShowRankConfig(true); }} className="bg-black/80 backdrop-blur-md border border-slate-700 px-4 py-2.5 rounded-xl text-slate-400 hover:text-blue-400 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                            <Settings size={16}/> Rank Config
                        </button>
                    )}
                    {/* 🚀 Phase 5: Customize Avatar — same modal the avatar itself opens, given a
                        labelled entry point so it's findable without guessing the avatar is a button. */}
                    {canEditProfile && (
                        <button onClick={() => setShowAvatarCustomizer(true)} className="bg-black/80 backdrop-blur-md border border-slate-700 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 transition-all active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                            <ImageIcon size={16}/> Avatar
                        </button>
                    )}
                    {/* 🚀 NEW: HALL OF FAME MODAL BUTTON */}
                    <button onClick={() => setShowHallOfFame(true)} className="bg-gradient-to-r from-amber-600 to-amber-500 text-white border border-amber-400/50 px-4 py-2.5 rounded-xl hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg">
                        <Trophy size={16} className="animate-bounce-slow"/> Leaderboard
                    </button>
                </div>

                <div className="pt-24 pb-10 px-6 md:px-10 border-b border-slate-800 relative overflow-hidden bg-gradient-to-br from-black via-slate-900 to-black">
                    <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none opacity-20 transition-colors duration-1000" style={{ backgroundColor: safeCurrentHex }}></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
                    
                    <div className="flex flex-col xl:flex-row gap-8 relative z-10 max-w-7xl mx-auto">
                        
                        <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 lg:gap-10 min-w-[350px]">
                            
                            <div className="relative group cursor-pointer hover:scale-105 transition-transform duration-500 shrink-0 w-32 h-32 md:w-40 md:h-40" onClick={() => canEditProfile && setShowAvatarCustomizer(true)}>
                                
                                <AgentAvatar tier={stats.currentTier} tierIndex={stats.tierIndex} hex={safeCurrentHex} photo={activeAgent.profileImage} styleId={activeBorderStyle} iconSize={64} scrim>
                                    {canEditProfile && (
                                        // 🚀 Phase 6: always-visible badge, not a hover-only overlay — touch screens
                                        // have no hover, so this was invisible on every phone until now.
                                        <div className="absolute bottom-0 right-0 z-30 w-9 h-9 rounded-full bg-black/80 border-2 border-white/70 flex items-center justify-center shadow-lg">
                                            <Camera size={16} className="text-white" />
                                        </div>
                                    )}
                                    <input type="file" id="avatar-input" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'avatar')} />
                                </AgentAvatar>
                            </div>
                            
                            <div className="mt-4 md:mt-0">
                                {renderRarityStars(roleStars, safeCurrentHex)}
                                <div className="flex items-center justify-center md:justify-start flex-wrap gap-2 mb-2">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest border-l-2 bg-black/50 shadow-md backdrop-blur-sm" style={{ borderLeftColor: safeCurrentHex, color: safeCurrentHex }}>
                                        {stats.currentTier.logo ? <img src={stats.currentTier.logo} className="w-4 h-4 object-contain drop-shadow-[0_0_5px_currentColor]"/> : <Sparkles size={12}/>} 
                                        {stats.currentTier.name} OPERATIVE
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-slate-700/50 text-emerald-400 bg-black/50 shadow-md backdrop-blur-sm">
                                        <Clock size={12}/> Active: {stats.daysInService}
                                    </div>
                                </div>
                                {/* 🚀 CORPORATE COMMAND TAG */}
                                <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-widest border ${corpIdentity.border} ${corpIdentity.bg} ${corpIdentity.color} mb-2 shadow-inner`}>
                                    <ShieldCheck size={12}/> {corpIdentity.tier} : {corpIdentity.title}
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-black text-white leading-none uppercase tracking-tighter drop-shadow-lg mb-2">{activeAgent.name}</h1>
                                <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                                    <ShieldCheck size={16} className="text-blue-500"/>
                                    <span className="text-[10px] text-slate-400 font-mono tracking-widest">ID: {String(activeAgent.id || '').substring(0,8)}</span>
                                    <span className="text-slate-400">|</span>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest"><MapPin size={10} className="inline mr-1 text-orange-500"/>{activeAgent.location || 'Field'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center bg-black/60 p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-md relative overflow-hidden group hover:border-slate-600 transition-colors">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors pointer-events-none"></div>
                            
                            <div className="flex justify-between items-start mb-4 relative z-10 gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] flex items-center gap-2"><Activity size={14} className="text-blue-500"/> Omset 7 Hari</span>
                                    <span className="text-3xl font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] tracking-tight leading-none mt-1" style={{ color: safeCurrentHex }}>{new Intl.NumberFormat('id-ID').format(stats.lifetimeEXP)} <span className="text-lg">XP</span></span>
                                </div>
                                {/* 🚀 Phase 6: grant a real, reasoned award instead of overriding a raw number */}
                                {hasClearance(userRole, 'edit_agent_roles') && (
                                    <button onClick={() => setShowAwardForm(true)} className="text-blue-500 hover:text-white bg-blue-900/20 border border-blue-500/30 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shrink-0"><Award size={12}/> Grant Award</button>
                                )}
                            </div>
                            
                            <div className="h-5 w-full bg-slate-950 rounded-md overflow-hidden border border-slate-800 shadow-inner relative mb-4 z-10 skew-x-[-10deg]">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 pointer-events-none"></div>
                                <div className="h-full transition-all duration-1000 ease-out relative" style={{ width: `${stats.progressPercent}%`, backgroundColor: safeCurrentHex, boxShadow: `0 0 15px ${safeCurrentHex}` }}>
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>
                                    <div className="absolute top-0 right-0 w-4 h-full bg-white/50 skew-x-[20deg] animate-[flow_2s_infinite]"></div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-3 mt-1">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stats.currentTier.name} RANK</span>
                                    {stats.currentTier.title && (
                                        <span className="text-xs font-black uppercase tracking-[0.2em] animate-pulse" style={{ color: safeCurrentHex, textShadow: `0 0 10px ${safeCurrentHex}` }}>
                                            « {stats.currentTier.title} »
                                        </span>
                                    )}
                                </div>
                                {stats.nextTier ? (
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Next Phase: <span className="text-white">{stats.nextTier.name}</span> <span className="text-slate-400 ml-1">({formatRp(stats.nextTier.min - stats.lifetimeEXP)} req)</span></span>
                                ) : (
                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">MAXIMUM RANK REACHED</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><DollarSign size={14} className="text-emerald-500"/> Live Financial Matrix</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-900/50 rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-start md:items-center justify-between group hover:-translate-y-1 transition-all duration-300 hover:border-emerald-500/50 relative overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 2% 100%, 0 85%)' }}>
                                <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-colors"></div>
                                <div>
                                    <p className="text-[10px] text-emerald-500/80 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><Wallet size={14}/> Today's Gross Revenue (Omset)</p>
                                    <p className="text-4xl md:text-5xl font-black text-emerald-400 font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">Rp {formatFullRp(stats.todayOmset)}</p>
                                    <div className="flex items-center gap-3 mt-3">
                                        <p className="text-[10px] text-emerald-200 uppercase tracking-widest font-bold bg-emerald-900/50 border border-emerald-500/30 px-2.5 py-1 rounded-sm shadow-inner">Cash Flow: Rp {formatFullRp(stats.todayCash)}</p>
                                    </div>
                                </div>
                                <div className="hidden md:flex w-20 h-20 rounded-full bg-emerald-900/30 border border-emerald-500/30 items-center justify-center shadow-inner group-hover:scale-110 group-hover:rotate-12 transition-all duration-500"><Wallet size={32} className="text-emerald-400"/></div>
                            </div>

                            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl shadow-lg relative overflow-hidden flex flex-col">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                <div className="p-6 flex items-center justify-between group hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => setShowCanvasBreakdown(!showCanvasBreakdown)}>
                                    <div>
                                        <p className="text-[11px] text-blue-400/80 font-bold uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5"><Truck size={12}/> Active Canvas Value</p>
                                        <p className="text-2xl font-black text-blue-400 font-mono drop-shadow-[0_0_10px_rgba(59,130,246,0.3)] tracking-tight">Rp {formatRp(stats.canvasValue)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-blue-400 transition-colors">
                                        <span className="text-[11px] font-black uppercase tracking-widest hidden md:block">View Intel</span>
                                        <List size={20} />
                                    </div>
                                </div>
                                {showCanvasBreakdown && (
                                    <div className="bg-black/50 border-t border-slate-800 p-4 max-h-48 overflow-y-auto custom-scrollbar">
                                        {stats.canvasBreakdown.length === 0 ? <p className="text-[10px] text-slate-400 font-mono text-center">Canvas is empty.</p> : (
                                            <table className="w-full text-left text-[10px] font-mono text-slate-300">
                                                <thead><tr className="text-slate-400 border-b border-slate-800"><th className="pb-2">Item</th><th className="pb-2">Qty</th><th className="pb-2 text-right">Value (Rp)</th></tr></thead>
                                                <tbody>
                                                    {stats.canvasBreakdown.map((item, i) => (
                                                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/50"><td className="py-2 text-blue-400 truncate max-w-[120px]">{item.name}</td><td className="py-2">{item.qty} {item.unit}</td><td className="py-2 text-right">{formatFullRp(item.value)}</td></tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl shadow-lg relative overflow-hidden flex flex-col">
                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                                <div className="p-6 flex items-center justify-between group hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => setShowTitipBreakdown(!showTitipBreakdown)}>
                                    <div>
                                        <p className="text-[11px] text-orange-500/80 font-bold uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5"><AlertCircle size={12}/> Consignment Risk (Titip)</p>
                                        <p className="text-2xl font-black text-orange-500 font-mono drop-shadow-[0_0_10px_rgba(249,115,22,0.3)] tracking-tight">Rp {formatRp(stats.activeTitipResponsibility)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-orange-400 transition-colors">
                                        <span className="text-[11px] font-black uppercase tracking-widest hidden md:block">View Targets</span>
                                        <List size={20} />
                                    </div>
                                </div>
                                {showTitipBreakdown && (
                                    <div className="bg-black/50 border-t border-slate-800 p-4 max-h-48 overflow-y-auto custom-scrollbar">
                                        {stats.activeDebtList.length === 0 ? <p className="text-[10px] text-slate-400 font-mono text-center">No active consignment targets.</p> : (
                                            <table className="w-full text-left text-[10px] font-mono text-slate-300">
                                                <thead><tr className="text-slate-400 border-b border-slate-800"><th className="pb-2">Target Store</th><th className="pb-2 text-right">Debt Float (Rp)</th></tr></thead>
                                                <tbody>
                                                    {stats.activeDebtList.map((debt, i) => (
                                                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/50"><td className="py-2 text-orange-400 truncate max-w-[150px]">{debt.store}</td><td className="py-2 text-right text-orange-300 font-bold">{formatFullRp(debt.amount)}</td></tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><ShieldCheck size={100}/></div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2"><ShieldCheck size={14} className="text-blue-500"/> Operator Credentials</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 relative z-10">
                                <div className="bg-black/40 p-4 rounded-xl border border-slate-800/50 backdrop-blur-sm flex flex-col justify-center">
                                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><ShieldCheck size={10} className="text-blue-400"/> Corp. Assignment</p>
                                    <p className={`text-xs font-black uppercase tracking-widest truncate drop-shadow-md ${corpIdentity.color}`}>
                                        {corpIdentity.tier}: {corpIdentity.title}
                                    </p>
                                </div>
                                <div className="bg-black/40 p-4 rounded-xl border border-slate-800/50 backdrop-blur-sm flex flex-col justify-center">
                                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Phone size={10} className="text-blue-400"/> Comms Link</p>
                                    <p className="text-xs font-bold text-slate-200 truncate">{activeAgent.phone || 'No Data'}</p>
                                </div>
                                <div className="bg-black/40 p-2 rounded-xl border border-slate-800/50 backdrop-blur-sm flex flex-col items-center justify-center relative overflow-hidden group-hover:border-slate-600 transition-colors">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 absolute top-1 left-2">Mount</p>
                                    {activeAgent.id === 'master_owner' ? (
                                        <div className="mt-3 text-sm font-black text-yellow-500 uppercase tracking-[0.3em] font-mono bg-yellow-900/20 px-3 py-1 border border-yellow-500/50 rounded shadow-[0_0_10px_rgba(234,179,8,0.2)]">HQ Override</div>
                                    ) : (
                                        <div className="relative border-[3px] border-slate-400 bg-gradient-to-b from-slate-100 to-slate-300 rounded shadow-[inset_0_0_15px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center w-[90%] h-12 overflow-hidden mt-2">
                                            <div className="absolute top-0 w-full h-2.5 bg-blue-700 border-b border-blue-900 flex items-center justify-center">
                                                <span className="text-[5px] text-white font-black uppercase tracking-[0.4em] drop-shadow-md">San Andreas</span>
                                            </div>
                                            <div className="absolute top-1 left-1.5 w-1 h-1 rounded-full bg-slate-400 shadow-inner"></div>
                                            <div className="absolute top-1 right-1.5 w-1 h-1 rounded-full bg-slate-400 shadow-inner"></div>
                                            <span className="font-mono text-lg font-black text-blue-900 tracking-[0.15em] mt-2 drop-shadow-sm">{activeAgent.vehicle || 'UNKNOWN'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-black/40 p-4 rounded-xl border border-slate-800/50 backdrop-blur-sm relative z-10">
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-2.5 flex items-center gap-1.5"><Lock size={10} className="text-blue-400"/> System Clearance</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className={`text-[11px] border px-2 py-1 rounded shadow-inner uppercase font-black tracking-widest ${activeAgent.canEditRoster ? 'bg-purple-900/30 text-purple-400 border-purple-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>Roster Control: {activeAgent.canEditRoster ? 'GRANTED' : 'DENIED'}</span>
                                    <span className={`text-[11px] border px-2 py-1 rounded shadow-inner uppercase font-black tracking-widest ${activeAgent.allowRetur ? 'bg-red-900/30 text-red-400 border-red-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>Tarik Barang: {activeAgent.allowRetur ? 'GRANTED' : 'DENIED'}</span>
                                </div>
                            </div>


                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col group hover:border-slate-700 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Calendar size={100}/></div>
                            <div className="flex justify-between items-center mb-5 relative z-10">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Calendar size={14} className="text-orange-500"/> Service Record</h3>
                                {canEditProfile && !isEditingBio && (
                                    <button onClick={() => setIsEditingBio(true)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-md border border-slate-700"><Edit3 size={12}/></button>
                                )}
                                {canEditProfile && isEditingBio && (
                                    <button onClick={handleBioSave} className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest border border-emerald-500/50 bg-emerald-900/30 px-3 py-1.5 rounded-md shadow-[0_0_10px_rgba(16,185,129,0.2)]"><Save size={12}/> Save Intel</button>
                                )}
                            </div>

                            <div className="flex-1 bg-black/40 rounded-xl border border-slate-800/50 p-4 relative group overflow-hidden backdrop-blur-sm z-10">
                                {isEditingBio ? (
                                    <textarea 
                                        value={bioText} onChange={(e) => setBioText(e.target.value)}
                                        placeholder="Enter operational history, warnings, or personal goals..."
                                        className="w-full h-full min-h-[100px] bg-transparent text-sm text-slate-300 resize-none outline-none custom-scrollbar" autoFocus
                                    />
                                ) : (
                                    <div className="h-full overflow-y-auto custom-scrollbar pr-2 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
                                        {activeAgent.bio || <span className="text-slate-400 italic">No operational record on file. Agent is a blank slate.</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 🚀 SECTOR 3: HALL OF FAME & TIMELINE ANALYTICS 🚀 */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-8">
                        
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl group hover:border-slate-700 transition-colors">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><TrendingUp size={14}/> Timeline Analytics</h3>
                                    {chartFilter === '1W' && <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-1">Current Active Week (Mon-Sun)</p>}
                                </div>
                                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-lg border border-slate-800 shadow-inner">
                                    {['1W', '1M', '1Y'].map(f => (
                                        <button key={f} onClick={() => setChartFilter(f)} className={`px-3 py-1 rounded-md text-[11px] font-black uppercase transition-all ${chartFilter === f ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>{f}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartDataToRender}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{fill: '#0f172a'}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }} formatter={(value) => `Rp ${new Intl.NumberFormat('id-ID').format(value)}`}/>
                                        <Bar dataKey="cash" name="Cash Sales" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="titip" name="Titip (Consign)" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-6 mt-4">
                                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-[0_0_5px_#10b981]"></div> Cash Flow</span>
                                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-orange-500 shadow-[0_0_5px_#f59e0b]"></div> Consignment</span>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl group hover:border-slate-700 transition-colors">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Award size={14}/> Hall of Fame & Achievements</h3>
                                {hasClearance(userRole, 'edit_rank_config') && (
                                    <button onClick={() => { setEditingBadges(JSON.parse(JSON.stringify(badgeData))); setShowBadgeConfig(true); }} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-md border border-slate-700" title="Configure Achievements"><Edit3 size={12}/></button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 mb-6">
                                {BADGE_CATEGORIES.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setBadgeCategoryFilter(c.id)}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${badgeCategoryFilter === c.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                            
                            {/* 🚀 THE MCL REGIONAL MVP TROPHY 🚀 */}
                            <div className="mb-8 flex justify-center">
                                <div className={`relative w-full max-w-md p-6 rounded-2xl border-2 flex flex-col items-center text-center overflow-hidden transition-all duration-700 ${stats.isTopAgentOfYear ? 'bg-gradient-to-b from-yellow-900/40 to-slate-900 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)] scale-[1.02]' : 'bg-slate-950/50 border-slate-800/50 grayscale opacity-40'}`}>
                                    {stats.isTopAgentOfYear && <div className="absolute top-0 w-full h-full bg-[conic-gradient(from_0deg,transparent,#facc15,transparent)] animate-[spin_4s_linear_infinite] opacity-10"></div>}
                                    
                                    <div className="relative z-10 mb-4">
                                        <Trophy size={64} className={stats.isTopAgentOfYear ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]' : 'text-slate-400'} />
                                        {stats.isTopAgentOfYear && <Sparkles size={24} className="absolute -top-2 -right-2 text-yellow-200 animate-ping"/>}
                                    </div>
                                    
                                    <h4 className={`text-sm font-black uppercase tracking-widest mb-1 ${stats.isTopAgentOfYear ? 'text-yellow-400' : 'text-slate-400'}`}>Regional MVP {stats.currentYearString}</h4>
                                    <p className="text-[10px] text-slate-400 max-w-[200px]">Penjual terbaik 7 hari terakhir.</p>
                                    {stats.isTopAgentOfYear && <div className="mt-4 px-4 py-1.5 bg-yellow-900/50 border border-yellow-500/50 rounded-full text-[11px] font-black text-yellow-300 uppercase tracking-widest shadow-inner">Active Champion</div>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                {badgeData
                                    .filter(badge => badgeCategoryFilter === 'all' || badge.cat === badgeCategoryFilter)
                                    .map(badge => {
                                    const BadgeIcon = DynamicIconMap[badge.icon] || Star;

                                    // 🚀 Phase 5: reads straight from career.js's totals(), same source
                                    // handleVerifyEOD writes into and isUnlocked() checks against —
                                    // no more per-badge if/else chain re-deriving a 7-day stat.
                                    const currentProgress = totals(career?.[activeAgent.id] || {})[badge.source] || 0;

                                    // 🚀 Explicit fmt field, not string-sniffing badge.source (the old
                                    // code read 'titipCollected' as NOT containing 'Titip' because of
                                    // the lowercase t, and ran plain item counts through the Rupiah
                                    // formatter because 'totalItemsSold' happened to contain 'Items').
                                    const formattedCurrent = badge.fmt === 'rp' ? formatRp(currentProgress) : currentProgress;
                                    const formattedTarget = badge.fmt === 'rp' ? formatRp(badge.target) : badge.target;

                                    const filledDesc = (badge.desc || '').replace('{val}', formattedCurrent).replace('{max}', formattedTarget);

                                    return (
                                        <AchievementCard
                                            key={badge.id}
                                            icon={<BadgeIcon size={20}/>}
                                            title={badge.title}
                                            desc={filledDesc}
                                            progress={currentProgress}
                                            target={badge.target}
                                            colorHex={badge.hex}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AchievementCard = ({ icon, title, desc, progress, target, colorHex }) => {
    const percent = Math.min(100, (progress / target) * 100);
    const isUnlocked = progress >= target;

    // 🚀 Phase 5: inline style, not a runtime-templated arbitrary Tailwind shadow class. Tailwind
    // cannot interpolate a variable into a class name at runtime, and spelling the example out
    // here verbatim makes its scanner emit that dead class as broken CSS (4 build warnings) — so
    // the example stays described, not written. An 8-digit hex (#RRGGBBAA) is valid CSS, so it works
    // fine as a plain inline value instead.
    const unlockedStyle = isUnlocked
        ? { background: `linear-gradient(to bottom, ${colorHex}30, #0f172a)`, boxShadow: `0 0 15px ${colorHex}40` }
        : {};

    return (
        <div className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all duration-500 relative overflow-hidden ${isUnlocked ? 'border-white/20 hover:-translate-y-1' : 'bg-slate-950/50 border-slate-800/50 opacity-60 grayscale'}`} style={unlockedStyle}>
            {isUnlocked && <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl pointer-events-none"></div>}
            
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors ${isUnlocked ? 'bg-black/40 shadow-inner' : 'bg-slate-800 text-slate-400'}`} style={isUnlocked ? { color: colorHex } : {}}>
                {icon}
            </div>
            
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1" style={isUnlocked ? { color: colorHex } : { color: '#64748b' }}>{title}</h4>
            <p className="text-[11px] text-slate-400 leading-tight h-6 flex items-center justify-center">{desc}</p>
            
            <div className="w-full bg-slate-950 h-1.5 rounded-full mt-3 overflow-hidden border border-slate-800">
                <div className="h-full transition-all shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]" style={{ width: `${percent}%`, backgroundColor: isUnlocked ? colorHex : '#475569' }}></div>
            </div>
        </div>
    );
};

export default AgentProfileView;