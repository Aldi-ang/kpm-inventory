import React, { useState, useRef, useEffect } from 'react';
import { 
    Music, Play, Pause, SkipForward, SkipBack, 
    Volume2, Minus, Move, Repeat, Shuffle, List, X 
} from 'lucide-react';

// --- DYNAMIC MUSIC LOADING ---
const musicModules = import.meta.glob('./assets/music/*.mp3', { eager: true });

const DETECTED_TRACKS = Object.entries(musicModules).map(([path, module]) => {
    const fileName = path.split('/').pop().replace(/\.mp3$/i, '').replace(/[_-]/g, ' ');
    const title = fileName.replace(/\b\w/g, l => l.toUpperCase());
    return { title: title, url: module.default };
});

const TRACKS = DETECTED_TRACKS.length > 0 ? DETECTED_TRACKS : [
    { title: "No Music Found", url: "" }
];

const MusicPlayer = () => {
    // --- STATE ---
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(0);
    const [isMinimized, setIsMinimized] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [showPlaylist, setShowPlaylist] = useState(false);
    
    // --- EXTRA BUTTON STATES ---
    const [isLooping, setIsLooping] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);

    // --- REFS ---
    const audioRef = useRef(null);
    const playerRef = useRef(null);
    const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialLeft: 0, initialTop: 0 });

    // --- EFFECTS ---
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
            if (isPlaying) {
                audioRef.current.play().catch(e => console.log("Autoplay blocked", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, volume, currentTrack]);

    const handleSongEnd = () => {
        if (isLooping) {
            // REPEAT ONE
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        } else if (isShuffling) {
            // SHUFFLE MODE
            let nextIndex;
            do {
                nextIndex = Math.floor(Math.random() * TRACKS.length);
            } while (nextIndex === currentTrack && TRACKS.length > 1);
            setCurrentTrack(nextIndex);
        } else {
            // NORMAL NEXT
            setCurrentTrack((prev) => (prev + 1) % TRACKS.length);
        }
    };

    const togglePlay = () => setIsPlaying(!isPlaying);
    
    const playNext = () => {
        if (isShuffling) {
             let nextIndex = Math.floor(Math.random() * TRACKS.length);
             setCurrentTrack(nextIndex);
        } else {
             setCurrentTrack((prev) => (prev + 1) % TRACKS.length);
        }
        setIsPlaying(true);
    };

    const playPrev = () => {
        setCurrentTrack((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
        setIsPlaying(true);
    };

    const toggleView = (minimized) => {
        setIsMinimized(minimized);
        if (minimized) setShowPlaylist(false);
    };

    // --- DRAG LOGIC ---
    const handleMouseDown = (e, isIconClick) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        
        dragRef.current = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            initialLeft: playerRef.current.offsetLeft,
            initialTop: playerRef.current.offsetTop
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!dragRef.current.isDragging) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        
        if (playerRef.current) {
            playerRef.current.style.left = `${dragRef.current.initialLeft + dx}px`;
            playerRef.current.style.top = `${dragRef.current.initialTop + dy}px`;
            playerRef.current.style.bottom = 'auto'; 
            playerRef.current.style.right = 'auto';
        }
    };

    const handleMouseUp = () => {
        dragRef.current.isDragging = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    return (
        <div 
            ref={playerRef}
            style={{ top: '100px', right: '20px', left: 'auto' }} // Default to Right side
            className={`fixed z-[9999] transition-all duration-0 ease-linear font-mono ${isMinimized ? 'w-12 h-12 rounded-full cursor-grab active:cursor-grabbing' : 'w-80 h-[420px] rounded-xl'} bg-slate-900 border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] overflow-hidden`}
        >
            <audio ref={audioRef} src={TRACKS[currentTrack].url} onEnded={handleSongEnd} />

            {isMinimized ? (
                <div 
                    onMouseDown={(e) => handleMouseDown(e, true)}
                    onClick={() => toggleView(false)}
                    className="w-full h-full flex items-center justify-center text-orange-500 hover:bg-orange-500/20 animate-pulse hover:animate-none"
                    title="Drag to move, Click to open"
                >
                    <Music size={20} className="pointer-events-none"/>
                </div>
            ) : (
                <div className="flex flex-col h-full relative">
                    {/* HEADER */}
                    <div 
                        onMouseDown={(e) => handleMouseDown(e, false)}
                        className="bg-orange-500/10 p-2 flex justify-between items-center border-b border-orange-500/30 cursor-move"
                    >
                        <div className="flex items-center gap-2 text-orange-500 pointer-events-none">
                            <Move size={14} />
                            <span className="text-[10px] font-bold tracking-widest uppercase">Cassette OS v2.1</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowPlaylist(!showPlaylist)} className={`text-orange-500 hover:text-white ${showPlaylist ? 'bg-orange-500/20 rounded' : ''}`}><List size={14} /></button>
                            <button onClick={() => toggleView(true)} className="text-orange-500 hover:text-white"><Minus size={14} /></button>
                        </div>
                    </div>

                    {/* PLAYLIST OVERLAY */}
                    {showPlaylist && (
                        <div className="absolute inset-0 top-9 bottom-12 bg-slate-900/95 z-20 overflow-y-auto p-2 border-b border-orange-500/30 animate-fade-in custom-scrollbar">
                            <div className="flex justify-between items-center mb-2 px-2">
                                <span className="text-[10px] text-orange-400 font-bold uppercase">Tracks: {TRACKS.length}</span>
                                <button onClick={() => setShowPlaylist(false)}><X size={12} className="text-slate-400 hover:text-white"/></button>
                            </div>
                            <div className="space-y-1">
                                {TRACKS.map((t, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => { setCurrentTrack(idx); setIsPlaying(true); }}
                                        className={`w-full text-left text-xs p-2 rounded truncate ${currentTrack === idx ? 'bg-orange-500 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
                                    >
                                        {idx + 1}. {t.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- MAIN PLAYER CONTROLS --- */}
                    <div className="flex-1 bg-black/50 p-6 flex flex-col items-center justify-center relative">
                        {/* Spinning Disc Animation */}
                        <div className={`w-32 h-32 rounded-full border-4 border-slate-700 flex items-center justify-center shadow-xl mb-4 relative overflow-hidden ${isPlaying ? 'animate-spin-slow' : ''}`}>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-50"></div>
                            <div className="w-10 h-10 bg-orange-600 rounded-full border-2 border-white/20 shadow-inner z-10"></div>
                            <div className="absolute inset-0 border-t-2 border-b-2 border-transparent bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45"></div>
                        </div>

                        {/* Track Info */}
                        <div className="w-full text-center mb-4 overflow-hidden h-10">
                            <div className="whitespace-nowrap animate-marquee inline-block">
                                <h3 className="text-orange-500 font-bold text-sm uppercase tracking-wider">{TRACKS[currentTrack].title}</h3>
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono">STEREO • 44.1kHz</p>
                        </div>

                        {/* UTILITY BUTTONS (Shuffle / Repeat) */}
                        <div className="flex items-center gap-6 mb-4 w-full justify-center">
                            <button 
                                onClick={() => setIsShuffling(!isShuffling)} 
                                className={`p-2 rounded-full transition-all ${isShuffling ? 'text-orange-400 bg-orange-900/30 ring-1 ring-orange-500' : 'text-slate-600 hover:text-white'}`}
                                title="Shuffle"
                            >
                                <Shuffle size={14} />
                            </button>
                            
                            <button 
                                onClick={() => setIsLooping(!isLooping)} 
                                className={`p-2 rounded-full transition-all ${isLooping ? 'text-orange-400 bg-orange-900/30 ring-1 ring-orange-500' : 'text-slate-600 hover:text-white'}`}
                                title="Repeat One"
                            >
                                <Repeat size={14} />
                            </button>
                        </div>

                        {/* PLAYBACK CONTROLS */}
                        <div className="flex items-center gap-6 mb-6">
                            <button onClick={playPrev} className="text-slate-400 hover:text-white transition-colors"><SkipBack size={24} /></button>
                            <button 
                                onClick={togglePlay} 
                                className="w-14 h-14 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(234,88,12,0.5)] hover:scale-105 transition-all"
                            >
                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1"/>}
                            </button>
                            <button onClick={playNext} className="text-slate-400 hover:text-white transition-colors"><SkipForward size={24} /></button>
                        </div>

                        {/* Volume */}
                        <div className="w-full flex items-center gap-2 px-4">
                            <Volume2 size={14} className="text-slate-500"/>
                            <input 
                                type="range" min="0" max="1" step="0.05" 
                                value={volume} 
                                onChange={(e) => setVolume(parseFloat(e.target.value))} 
                                className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 8s linear infinite; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #f97316; border-radius: 2px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; }
            `}</style>
        </div>
    );
};

export default MusicPlayer;