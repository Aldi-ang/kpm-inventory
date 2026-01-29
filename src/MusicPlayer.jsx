import React, { useState, useRef, useEffect } from 'react';
import { 
    Music, Play, Pause, SkipForward, SkipBack, 
    Volume2, Minus, AlertCircle, Move, Repeat, 
    Shuffle, List, X 
} from 'lucide-react';

// --- DYNAMIC MUSIC LOADING (VITE SPECIFIC) ---
// This scans src/assets/music for any .mp3 files
const musicModules = import.meta.glob('./assets/music/*.mp3', { eager: true });

// Convert the scan results into our TRACKS array
const DETECTED_TRACKS = Object.entries(musicModules).map(([path, module]) => {
    // Clean up filename: "src/assets/music/my_cool_song.mp3" -> "my cool song"
    const fileName = path.split('/').pop().replace(/\.mp3$/i, '').replace(/[_-]/g, ' ');
    // Capitalize first letters
    const title = fileName.replace(/\b\w/g, l => l.toUpperCase());
    
    return {
        title: title,
        url: module.default // The actual file URL
    };
});

// Fallback if folder is empty so app doesn't crash
const TRACKS = DETECTED_TRACKS.length > 0 ? DETECTED_TRACKS : [
    { title: "No Music Found", url: "" }
];

const MusicPlayer = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(0);
    const [isMinimized, setIsMinimized] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [isLooping, setIsLooping] = useState(false);
    const [isShuffle, setIsShuffle] = useState(false);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [error, setError] = useState(null);
    
    const audioRef = useRef(null);

    // --- DRAGGING REFS ---
    const playerRef = useRef(null);
    const isDragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });
    const currentPos = useRef({ x: 20, y: window.innerHeight - 200 });
    const dragStartPos = useRef({ x: 0, y: 0 });
    const bubbleOrigin = useRef({ x: 20, y: window.innerHeight - 200 });

    // Handle Volume
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume;
    }, [volume]);

    // Handle Play/Pause
    useEffect(() => {
        if (!audioRef.current) return;
        const playAudio = async () => {
            try {
                if (isPlaying) {
                    await audioRef.current.play();
                    setError(null);
                } else {
                    audioRef.current.pause();
                }
            } catch (err) {
                console.error("Audio Play Error:", err);
                setError("Click Play");
                setIsPlaying(false);
            }
        };
        playAudio();
    }, [isPlaying, currentTrack]);

    const togglePlay = () => setIsPlaying(!isPlaying);

    const nextTrack = () => {
        if (isShuffle) {
            // Random index that isn't the current one
            let nextIndex = Math.floor(Math.random() * TRACKS.length);
            while (nextIndex === currentTrack && TRACKS.length > 1) {
                nextIndex = Math.floor(Math.random() * TRACKS.length);
            }
            setCurrentTrack(nextIndex);
        } else {
            setCurrentTrack((prev) => (prev + 1) % TRACKS.length);
        }
        setIsPlaying(true);
    };

    const prevTrack = () => {
        // If song is more than 3 seconds in, restart it instead of going back
        if (audioRef.current && audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0;
        } else {
            setCurrentTrack((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
        }
        setIsPlaying(true);
    };

    const handleSongEnd = () => {
        if (isLooping) {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }
        } else {
            nextTrack();
        }
    };

    // --- VIEW TOGGLE ---
    const toggleView = (minimize) => {
        if (!playerRef.current) return;
        if (!minimize) {
            bubbleOrigin.current = { ...currentPos.current };
            const screenW = window.innerWidth;
            const expandedWidth = 320; // Slightly wider for new buttons
            const padding = 20;
            if (currentPos.current.x + expandedWidth > screenW) {
                const newX = screenW - expandedWidth - padding;
                currentPos.current.x = Math.max(0, newX);
                playerRef.current.style.transform = `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`;
            }
        } else {
            currentPos.current = { ...bubbleOrigin.current };
            playerRef.current.style.transform = `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`;
            setShowPlaylist(false); // Close playlist when minimizing
        }
        setIsMinimized(minimize);
    };

    // --- DRAG LOGIC ---
    const handleMouseDown = (e, allowClickThrough = false) => {
        if (!allowClickThrough && ['BUTTON', 'INPUT', 'svg', 'path'].includes(e.target.tagName)) return;
        isDragging.current = true;
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        const rect = playerRef.current.getBoundingClientRect();
        offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', (ev) => handleMouseUp(ev, allowClickThrough));
        document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current || !playerRef.current) return;
        let newX = e.clientX - offset.current.x;
        let newY = e.clientY - offset.current.y;
        const maxX = window.innerWidth - playerRef.current.offsetWidth;
        const maxY = window.innerHeight - playerRef.current.offsetHeight;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        currentPos.current = { x: newX, y: newY };
        playerRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
    };

    const handleMouseUp = (e, isBubble) => {
        isDragging.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
        const distMoved = Math.hypot(e.clientX - dragStartPos.current.x, e.clientY - dragStartPos.current.y);
        if (isBubble && distMoved < 5) toggleView(false);
    };

    useEffect(() => {
        if (playerRef.current) playerRef.current.style.transform = `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`;
    }, []);

    return (
        <div 
            ref={playerRef}
            className={`fixed top-0 left-0 z-[9999] transition-all duration-0 ease-linear font-mono ${isMinimized ? 'w-12 h-12 rounded-full cursor-grab active:cursor-grabbing' : 'w-80 rounded-xl'} bg-slate-900 border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] overflow-hidden`}
        >
            <audio ref={audioRef} src={TRACKS[currentTrack].url} onEnded={handleSongEnd} />

            {isMinimized ? (
                <div 
                    onMouseDown={(e) => handleMouseDown(e, true)}
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
                            <span className="text-[10px] font-bold tracking-widest uppercase">Cassette OS v2</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowPlaylist(!showPlaylist)} className={`text-orange-500 hover:text-white ${showPlaylist ? 'bg-orange-500/20 rounded' : ''}`}><List size={14} /></button>
                            <button onClick={() => toggleView(true)} className="text-orange-500 hover:text-white"><Minus size={14} /></button>
                        </div>
                    </div>

                    {/* PLAYLIST OVERLAY */}
                    {showPlaylist && (
                        <div className="absolute inset-0 top-9 bottom-12 bg-slate-900/95 z-20 overflow-y-auto p-2 border-b border-orange-500/30 animate-fade-in">
                            <div className="flex justify-between items-center mb-2 px-2">
                                <span className="text-[10px] text-orange-400 font-bold uppercase">Tracks Detected: {TRACKS.length}</span>
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

                    {/* VISUALIZER & INFO */}
                    <div className="p-4 flex-1 bg-black/50 relative overflow-hidden group min-h-[100px]">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] text-slate-400 mb-1 flex justify-between">
                                <span>NOW PLAYING</span>
                                <span>{currentTrack + 1}/{TRACKS.length}</span>
                            </p>
                            {error ? (
                                <p className="text-red-500 font-bold text-xs flex items-center gap-1 animate-pulse"><AlertCircle size={12}/> {error}</p>
                            ) : (
                                <div className="overflow-hidden whitespace-nowrap select-none">
                                    <p className="text-orange-400 font-bold text-sm animate-marquee inline-block">
                                        {TRACKS[currentTrack].title} /// {TRACKS[currentTrack].title} ///
                                    </p>
                                </div>
                            )}
                            {/* Visualizer Bars */}
                            <div className="flex gap-1 h-8 mt-3 items-end justify-center opacity-80 pointer-events-none">
                                {[...Array(16)].map((_, i) => (
                                    <div key={i} className={`w-1 bg-orange-500 transition-all duration-150 ${isPlaying ? 'animate-music-bar' : 'h-1'}`} style={{ animationDelay: `${i * 0.05}s` }}></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ADVANCED CONTROLS */}
                    <div className="p-2 bg-slate-800 border-t border-slate-700">
                        {/* Top Row: Playback Controls */}
                        <div className="flex items-center justify-between mb-2 px-2">
                            <button onClick={() => setIsShuffle(!isShuffle)} className={`p-1.5 rounded transition-colors ${isShuffle ? 'text-orange-400 bg-orange-900/30' : 'text-slate-500 hover:text-white'}`} title="Shuffle">
                                <Shuffle size={14} />
                            </button>
                            
                            <div className="flex items-center gap-2">
                                <button onClick={prevTrack} className="text-slate-300 hover:text-white transition-colors"><SkipBack size={20} /></button>
                                <button onClick={togglePlay} className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-400 active:scale-95 transition-all shadow-lg shadow-orange-500/20">
                                    {isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}
                                </button>
                                <button onClick={nextTrack} className="text-slate-300 hover:text-white transition-colors"><SkipForward size={20} /></button>
                            </div>

                            <button onClick={() => setIsLooping(!isLooping)} className={`p-1.5 rounded transition-colors ${isLooping ? 'text-orange-400 bg-orange-900/30' : 'text-slate-500 hover:text-white'}`} title="Repeat One">
                                <Repeat size={14} />
                            </button>
                        </div>

                        {/* Bottom Row: Volume */}
                        <div className="flex items-center gap-2 px-2">
                            <Volume2 size={14} className="text-slate-400" />
                            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-orange-500"/>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .animate-marquee { animation: marquee 10s linear infinite; }
                @keyframes music-bar { 0%, 100% { height: 10%; } 50% { height: 100%; } }
                .animate-music-bar { animation: music-bar 0.6s ease-in-out infinite alternate; }
            `}</style>
        </div>
    );
};

export default MusicPlayer;