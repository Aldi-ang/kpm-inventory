import React, { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, List, Repeat, Shuffle } from 'lucide-react';

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
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(0);
    const [volume, setVolume] = useState(0.5);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);

    const audioRef = useRef(null);

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
        <div className="w-full bg-black/40 border border-white/10 rounded-xl overflow-hidden font-mono flex flex-col mb-4 shadow-lg shrink-0">
            <audio ref={audioRef} src={TRACKS[currentTrack].url} onEnded={handleSongEnd} />

            {/* HEADER */}
            <div className="bg-orange-500/10 p-2 flex justify-between items-center border-b border-orange-500/20">
                <div className="flex items-center gap-2">
                    <Music size={12} className="text-orange-500" />
                    <span className="text-[9px] font-bold text-orange-500 tracking-widest uppercase">Cassette OS</span>
                </div>
                <button onClick={() => setShowPlaylist(!showPlaylist)} className="text-orange-500 hover:text-white transition-colors"><List size={12} /></button>
            </div>

            {/* PLAYLIST OVERLAY */}
            {showPlaylist && (
                <div className="max-h-32 overflow-y-auto p-1.5 bg-black/80 border-b border-white/10 custom-scrollbar">
                    <div className="space-y-1">
                        {TRACKS.map((t, idx) => (
                            <button key={idx} onClick={() => { setCurrentTrack(idx); setIsPlaying(true); }} className={`w-full text-left text-[9px] p-1.5 rounded truncate transition-colors ${currentTrack === idx ? 'bg-orange-500 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}>
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
                    <button onClick={() => setIsShuffling(!isShuffling)} className={`transition-colors ${isShuffling ? 'text-orange-500' : 'text-slate-600 hover:text-white'}`}><Shuffle size={12}/></button>
                    <div className="flex items-center gap-3">
                        <button onClick={playPrev} className="text-slate-400 hover:text-white transition-colors"><SkipBack size={16} /></button>
                        <button onClick={togglePlay} className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white hover:scale-105 transition-all shadow-[0_0_10px_rgba(234,88,12,0.4)]">
                            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5"/>}
                        </button>
                        <button onClick={playNext} className="text-slate-400 hover:text-white transition-colors"><SkipForward size={16} /></button>
                    </div>
                    <button onClick={() => setIsLooping(!isLooping)} className={`transition-colors ${isLooping ? 'text-orange-500' : 'text-slate-600 hover:text-white'}`}><Repeat size={12}/></button>
                </div>

                <div className="w-full flex items-center gap-2">
                    <Volume2 size={12} className="text-slate-500"/>
                    <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
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