import React, { useState } from 'react';
import { X, Menu, Lock, LogOut, LogIn, ArrowRight } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase'; // Ensure this points to your firebase config
import NotificationBell from './NotificationBell';
import MusicPlayer from './MusicPlayer';

export default function BiohazardTheme({ 
    activeTab, setActiveTab, children, user, appSettings, 
    isAdmin, onLogin, userRole, setShowAdminLogin, agentSettings, 
    notifications, onNotificationClick, appVersion 
}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const handleLogout = () => {
        if(window.confirm("Terminate Session?")) {
            signOut(auth);
            window.location.reload();
        }
    };

    const allMenuItems = [
        { id: 'dashboard', label: 'Command Center' },
        { id: 'map_war_room', label: 'Map System' },
        { id: 'journey', label: 'Journey Plan' },
        { id: 'fleet', label: 'Fleet & Canvas' }, 
        { id: 'inventory', label: 'Master Vault' },
        { id: 'agent_inventory', label: 'Agent Inventory' },
        { id: 'restock_vault', label: 'Restock Vault' },
        { id: 'sales', label: 'Sales Terminal' },
        { id: 'receivables', label: 'Receivables & Consignment' },
        { id: 'eod', label: 'EOD Setoran' },
        { id: 'stock_opname', label: 'Stock Opname' },
        { id: 'customers', label: 'Customers' },
        { id: 'sampling', label: 'Sampling' },
        { id: 'transactions', label: 'Reports' },
        { id: 'audit', label: 'Audit Logs' },
        { id: 'settings', label: 'Settings' }
    ];

    const visibleMenu = allMenuItems.filter(item => {
        if (userRole === 'ADMIN') {
            if (isAdmin) {
                if (item.id === 'agent_inventory') return false;
                return true; 
            }
            return ['map_war_room', 'journey', 'sales'].includes(item.id);
        }
        
        let allowedTabs = ['map_war_room', 'journey', 'sales', 'agent_inventory', 'transactions', 'eod'];
        
        if (typeof agentSettings !== 'undefined' && agentSettings?.allowedTiers) {
            if (agentSettings.allowedTiers.includes('Grosir') || agentSettings.allowedTiers.includes('Distributor')) {
                allowedTabs.push('receivables');
            }
        }
        
        return allowedTabs.includes(item.id);
    });

    return (
        <div className="print-reset h-[100dvh] w-full bg-black text-gray-300 font-sans tracking-wide overflow-hidden flex relative">
            <style>{`
                @keyframes reRequiem {
                    0% { opacity: 0; transform: scale(0.98) translateY(10px); filter: blur(3px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
                }
                .boot-1 { animation: reRequiem 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) 0.05s forwards; opacity: 0; }
                .boot-2 { animation: reRequiem 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) 0.15s forwards; opacity: 0; }
                .boot-3 { animation: reRequiem 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) 0.25s forwards; opacity: 0; }
                .boot-4 { animation: reRequiem 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) 0.35s forwards; opacity: 0; }
            `}</style>
            
            <div className="hide-on-print absolute inset-0 bg-[url('https://wallpapers.com/images/hd/resident-evil-background-2834-x-1594-c7m6q8j3q8j3q8j3.jpg')] bg-cover bg-center opacity-40 pointer-events-none"></div>
            <div className="hide-on-print absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent pointer-events-none"></div>

            <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="hide-on-print lg:hidden fixed top-3 left-3 z-[100] p-2.5 bg-orange-600/90 backdrop-blur-md text-white rounded-xl shadow-[0_0_15px_rgba(234,88,12,0.5)] border border-orange-400/50 active:scale-90 transition-all"
            >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className={`hide-on-print fixed inset-y-0 left-0 z-[90] w-64 bg-black/95 backdrop-blur-xl border-r border-white/10 flex flex-col pt-5 lg:pt-8 pl-4 pr-4 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
                
                <div key={`brand-${isAdmin}`} className="mb-6 ml-12 lg:ml-2 mt-0.5 lg:mt-0 boot-1">
                    <h1 className="text-sm lg:text-xl font-bold text-white font-mono border-b-2 border-white/50 pb-1 lg:pb-2 inline-block shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        {appSettings?.companyName || "KPM SYSTEM"}
                    </h1>
                    <p className="text-[10px] font-mono text-blue-400 tracking-widest mt-1">BUILD {appVersion}</p>
                </div>

                {user ? (
                    <nav key={`nav-${isAdmin}`} className="space-y-0.5 flex-1 overflow-y-auto scrollbar-hide boot-2">
                        {visibleMenu.map(item => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                                className={`w-full text-left py-2 px-3 text-xs font-bold transition-all duration-200 uppercase tracking-widest clip-path-polygon ${
                                    activeTab === item.id 
                                    ? 'bg-white text-black pl-6 shadow-[0_0_10px_rgba(255,255,255,0.8)] border-l-4 border-orange-500' 
                                    : 'text-gray-500 hover:text-white hover:pl-4 hover:bg-white/5'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
                ) : (
                    <div className="flex-1 flex flex-col items-start pt-10 opacity-50">
                        <div className="text-xs text-red-500 font-mono mb-2">ACCESS DENIED</div>
                        <div className="h-0.5 w-10 bg-red-800 mb-4"></div>
                        <p className="text-[10px] text-slate-500">Authentication required.</p>
                    </div>
                )}

                <div key={`bot-${isAdmin}`} className="mt-auto mb-2 border-t border-white/10 pt-3 boot-3">
                    {userRole === 'ADMIN' && !isAdmin && (
                        <div className="px-2 mb-3">
                            <button 
                                onClick={() => { if (setShowAdminLogin) setShowAdminLogin(true); setIsMobileMenuOpen(false); }} 
                                className="w-full bg-orange-600/20 hover:bg-orange-600 border border-orange-500/50 text-orange-400 hover:text-white p-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20"
                            >
                                <Lock size={14} /> Unlock Master Vault
                            </button>
                        </div>
                    )}

                    {isAdmin && <MusicPlayer />}

                    {user ? (
                        <div className="flex items-center gap-2">
                            <NotificationBell notifications={notifications} onNotificationClick={onNotificationClick} />
                            <img 
                                src={appSettings?.mascotImage || "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"} 
                                className="w-7 h-7 rounded border border-white/30 object-cover bg-black"
                                alt="avatar"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-[8px] text-gray-400 uppercase font-bold leading-none mb-0.5">OPERATIVE</p>
                                <p className="text-[10px] text-white font-mono truncate leading-none">{user.email?.split('@')[0]}</p>
                            </div>
                            <button onClick={handleLogout} className="text-red-500 hover:text-red-400 p-1.5 rounded transition-colors" title="Logout">
                                <LogOut size={14}/>
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={onLogin}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-500 border border-emerald-800 py-3 rounded uppercase text-xs font-bold tracking-widest transition-all"
                        >
                            <LogIn size={14}/> System Login
                        </button>
                    )}
                </div>
            </div>

            <div className="print-reset relative z-10 flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-transparent to-black/80">
                <div className={`hide-on-print pt-16 lg:pt-6 px-4 lg:px-8 pb-2 flex justify-between items-end border-b border-white/20 shrink-0 relative`}>
                    <h2 className="text-6xl font-bold text-white/5 uppercase select-none absolute top-2 right-8 pointer-events-none hidden lg:block">
                        {activeTab}
                    </h2>

                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className={`h-1.5 w-1.5 rounded-full ${user ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`}></div>
                            <span className={`text-[9px] font-mono uppercase ${user ? 'text-emerald-500' : 'text-red-500'}`}>{user ? "System Active" : "Disconnected"}</span>
                        </div>
                        <div className="text-2xl text-white font-bold tracking-[0.15em] uppercase text-shadow-glow">
                            {activeTab.replace(/_/g, ' ')}
                        </div>
                    </div>

                    <div className="text-[10px] text-gray-500 font-mono text-right">
                        <div>{new Date().toLocaleDateString()}</div>
                        <div className="text-sm text-white">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                </div>

                <div className={`print-reset flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/20`}>
                    <div className="biohazard-content max-w-full mx-auto">
                        {children}
                    </div>
                </div>

                <div className="hide-on-print hidden lg:flex h-8 border-t border-white/10 items-center px-6 gap-6 text-[10px] text-gray-500 font-bold uppercase bg-black/80 backdrop-blur shrink-0">
                    <span className="flex items-center gap-2"><span className="bg-white text-black px-1 rounded-[1px]">L-CLICK</span> SELECT</span>
                    <span className="flex items-center gap-2"><span className="bg-gray-700 text-white px-1 rounded-[1px]">SCROLL</span> NAVIGATE</span>
                </div>
            </div>
            
            <style>{`
                .biohazard-content .bg-white { background-color: rgba(20, 20, 20, 0.85) !important; border: 1px solid rgba(255,255,255,0.15) !important; color: #e5e5e5 !important; }
                .text-shadow-glow { text-shadow: 0 0 10px rgba(255,255,255,0.5); }
                .leaflet-container .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; border: none !important; padding: 0 !important; }
                .leaflet-container .leaflet-popup-tip-container { display: none !important; }
                .leaflet-container .leaflet-popup-content { margin: 0 !important; line-height: normal !important; width: auto !important; }
                .leaflet-container a.leaflet-popup-close-button { display: none !important; }

                @media print {
                    @page { size: A4 portrait !important; margin: 5mm !important; }
                    body, html, #root { background-color: white !important; color: black !important; height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; display: block !important; }
                    .print-reset { display: block !important; height: auto !important; min-height: auto !important; overflow: visible !important; position: static !important; }
                    nav, header, .hide-on-print, .no-print { display: none !important; }
                    .print-modal-wrapper { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: auto !important; background: white !important; display: block !important; padding: 0 !important; margin: 0 !important; z-index: 999999 !important; }
                    .print-receipt { background-color: white !important; color: black !important; box-shadow: none !important; border: none !important; margin: 0 auto !important; border-radius: 0 !important; overflow: visible !important; max-height: none !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
                    .print-receipt.format-thermal { width: 80mm !important; max-width: 80mm !important; padding: 5mm !important; }
                    .print-receipt.format-a4 { width: 210mm !important; max-width: 210mm !important; padding: 10mm !important; box-sizing: border-box !important; }
                    .print-receipt * { color: black !important; border-color: black !important; }
                }
            `}</style>
        </div>
    );
}