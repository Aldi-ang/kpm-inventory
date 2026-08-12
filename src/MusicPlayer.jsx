import React, { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, List, Repeat, Shuffle, ChevronDown, ChevronUp } from 'lucide-react';

// --- DYNAMIC MUSIC LOADING ---
// ponytail: eager:false so the ~9.66MB of MP3s only download when someone actually presses
// play (admin-only player), instead of being forced into every field agent's build.
const musicModules = import.meta.glob('./assets/music/*.mp3', { eager: false });

const DETECTED_TRACKS = Object.keys(musicModules).map((path) => {
    const fileName = path.split('/').pop().replace(/\.mp3$/i, '').replace(/[_-]/g, ' ');
    const title = fileName.replace(/\b\w/g, l => l.toUpperCase());
    return { title: title, path };
});

const TRACKS = DETECTED_TRACKS.length > 0 ? DETECTED_TRACKS : [
    { title: "No Music Found", path: null }
];

const MusicPlayer = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(0);
    const [volume, setVolume] = useState(0.5);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);
    
    // --- NEW STATE: Collapsed by Default ---
    const [isExpanded, setIsExpanded] = useState(false); 

    const audioRef = useRef(null);

    useEffect(() => {
        if (!audioRef.current) return;
        let cancelled = false;
        (async () => {
            const track = TRACKS[currentTrack];
            if (track?.path) {
                const mod = await musicModules[track.path]();
                if (cancelled || !audioRef.current) return;
                audioRef.current.src = mod.default;
            }
            audioRef.current.volume = volume;
            if (isPlaying) {
                audioRef.current.play().catch(e => console.log("Autoplay blocked", e));
            } else {
                audioRef.current.pause();
            }
        })();
        return () => { cancelled = true; };
    }, [isPlaying, volume, currentTrack]);

    const handleSongEnd = () => {
        if (isLooping) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        } else if (isShuffling) {
            let nextIndex;
            do { nextIndex = Math.floor(Math.random() * TRACKS.length); } while (nextIndex === currentTrack && TRACKS.length > 1);
            setCurrentTrack(nextIndex);
        } else {
            setCurrentTrack((prev) => (prev + 1) % TRACKS.length);
        }
    };

    const togglePlay = () => setIsPlaying(!isPlaying);
    const playNext = () => {
        if (isShuffling) { setCurrentTrack(Math.floor(Math.random() * TRACKS.length)); } 
        else { setCurrentTrack((prev) => (prev + 1) % TRACKS.length); }
        setIsPlaying(true);
    };
    const playPrev = () => { setCurrentTrack((prev) => (prev - 1 + TRACKS.length) % TRACKS.length); setIsPlaying(true); };

    return (
        /* `relative` is load-bearing on a phone: it is what the body below anchors its
           `right-full` to, and without it the panel would hang off the viewport instead. */
        <div className="relative w-full bg-black/40 border border-white/10 rounded-xl font-mono flex flex-col mb-4 shadow-lg shrink-0">
            <audio ref={audioRef} onEnded={handleSongEnd} />

            {/* ACCORDION HEADER (Always visible) */}
            {/* On a phone this whole component lives in a 76px rail, so the head keeps the note
                and play/pause and drops the name — you opened the music, you know what it is. */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="bg-[#ff9d00]/10 p-2 lg:p-2.5 flex justify-center lg:justify-between items-center gap-1.5 lg:gap-2 rounded-t-xl border-b border-[#ff9d00]/20 cursor-pointer hover:bg-[#ff9d00]/20 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Music size={14} className={`text-[#ff9d00] shrink-0 ${isPlaying ? 'animate-pulse' : ''}`} />
                    <span className="hidden lg:inline text-[10px] font-bold text-[#ff9d00] tracking-widest uppercase">Cassette OS</span>
                </div>

                {/* MINI CONTROLS (Lets you play/pause without expanding the menu!) */}
                <div className="flex items-center gap-1 lg:gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                        className="text-[#ff9d00] hover:text-white transition-colors p-1"
                    >
                        {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                    </button>
                    {isExpanded ? <ChevronUp size={14} className="text-[#ff9d00] shrink-0" /> : <ChevronDown size={14} className="text-[#ff9d00] shrink-0" />}
                </div>
            </div>

            {/* EXPANDABLE CONTENT */}
            {/* THE BODY OPENS SIDEWAYS ON A PHONE. The transport row and a volume slider cannot
                be used at 76px, and shrinking them further would have made a control nobody can
                hit. `right-full` puts it in the screen the rail is sitting on top of — which is
                why the rail is overflow-visible below lg, and why it had to be the RIGHT-hand
                rail for this to have anywhere to go. On a desk nothing moves: lg:static puts it
                straight back under the head, in the flow, exactly as it was. */}
            <div className={`transition-all duration-300 origin-top overflow-hidden
                             absolute right-full bottom-0 mr-2 w-[232px] rounded-xl border border-[#3e3226] bg-[#0f0e0d] shadow-[0_10px_40px_rgba(0,0,0,.7)]
                             lg:static lg:w-auto lg:mr-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none
                             ${isExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                
                {/* PLAYLIST TOGGLE */}
                <div className="px-2 pt-2 flex justify-end">
                    <button onClick={() => setShowPlaylist(!showPlaylist)} className={`text-[11px] font-bold uppercase flex items-center gap-1 transition-colors ${showPlaylist ? 'text-white' : 'text-orange-500 hover:text-orange-400'}`}>
                        <List size={10} /> {showPlaylist ? 'Hide Tracks' : 'Tracks'}
                    </button>
                </div>

                {/* PLAYLIST OVERLAY */}
                {showPlaylist && (
                    <div className="max-h-24 overflow-y-auto mx-2 mt-2 p-1.5 bg-black/80 border border-white/10 rounded custom-scrollbar">
                        <div className="space-y-1">
                            {TRACKS.map((t, idx) => (
                                <button key={idx} onClick={() => { setCurrentTrack(idx); setIsPlaying(true); }} className={`w-full text-left text-[11px] p-1.5 rounded truncate transition-colors ${currentTrack === idx ? 'bg-[#ff9d00] text-[#2b2318] font-bold' : 'text-[#8b7256] hover:bg-[#26211c]'}`}>
                                    {idx + 1}. {t.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* MAIN CONTROLS */}
                <div className="p-3 flex flex-col items-center">
                    <div className="w-full text-center mb-3 overflow-hidden">
                        <div className="whitespace-nowrap animate-marquee inline-block">
                            <h3 className="text-orange-400 font-bold text-[10px] uppercase tracking-wider">{TRACKS[currentTrack].title}</h3>
                        </div>
                    </div>

                    <div className="flex items-center justify-between w-full mb-3 px-2">
                        <button onClick={() => setIsShuffling(!isShuffling)} className={`transition-colors ${isShuffling ? 'text-orange-500' : 'text-[#8b7256] hover:text-white'}`}><Shuffle size={12}/></button>
                        <div className="flex items-center gap-3">
                            <button onClick={playPrev} className="text-[#8b7256] hover:text-white transition-colors"><SkipBack size={16} /></button>
                            <button onClick={togglePlay} className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white hover:scale-105 transition-all shadow-[0_0_10px_rgba(234,88,12,0.4)]">
                                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5"/>}
                            </button>
                            <button onClick={playNext} className="text-[#8b7256] hover:text-white transition-colors"><SkipForward size={16} /></button>
                        </div>
                        <button onClick={() => setIsLooping(!isLooping)} className={`transition-colors ${isLooping ? 'text-orange-500' : 'text-[#8b7256] hover:text-white'}`}><Repeat size={12}/></button>
                    </div>

                    <div className="w-full flex items-center gap-2">
                        {/* was text-slate-400 / bg-slate-700 — slate IS the blue */}
                        <Volume2 size={12} className="text-[#8b7256]"/>
                        <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="flex-1 h-1 bg-[#3e3226] rounded-lg appearance-none cursor-pointer accent-[#ff9d00]" />
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
                .animate-marquee { animation: marquee 10s linear infinite; }
            `}</style>
        </div>
    );
};

export default MusicPlayer;