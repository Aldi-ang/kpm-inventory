import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, List, Repeat, Shuffle, ChevronDown, ChevronUp, X } from 'lucide-react';

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

/* `onOpen` lets the shell get out of the way — his rule for the island, which holds for the pill:
   pressing the music mark should close the rail, not stack a panel on top of it. */
const MusicPlayer = ({ onOpen }) => {
    /* WHY THE PILL IS PORTALLED AND NOT SIMPLY POSITIONED. The rail carries a backdrop-filter —
       on the pod, since 2026-08-14 — and a backdrop-filter makes that element the containing
       block for every `position: fixed` descendant. A pill left inside would anchor to a 72px
       capsule instead of to the screen and land off the edge. CSS cannot move an element out of
       an ancestor, so this has to stay a JS decision.

       ONE ANSWER AT BOTH WIDTHS from 2026-08-14 — his call: *"i want the initial position for the
       music player also the same with that"*, meaning the music button is one more mark in the
       collapsed capsule. The desk's in-flow accordion could not survive that: it opened downward
       inside a panel that is 72px wide, and 72px tall the moment the pointer leaves. The phone
       had already answered this. Ported, not redesigned — and the `isPhone` media query that
       used to choose between the two went with it. */
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
        /* Bare at BOTH widths from 2026-08-14 — his call: *"music player is not even the same UI
           like what we have in the phone mode"*. The desk used to keep a card of its own here
           (`lg:bg-black/40`, a white hairline, a drop shadow) plus a "Cassette OS" label and an
           inline play/pause, because it had a 256px column to spend. It has a strip now, and the
           head has to read as one more mark in it — which is exactly what the phone already
           settled. Ported, not redesigned. */
        <div className="relative w-full rounded-xl font-mono flex flex-col mb-2 shrink-0">
            <audio ref={audioRef} onEnded={handleSongEnd} />

            {/* ACCORDION HEADER (Always visible) */}
            {/* HIS CALL: "music player is squeshed bro, hard to interact with it, i rather make
                the music logo pressable like other components ... delete the music player button,
                like the forward backwar pause button in the sidebar ... make the music button
                spawn a panel beside it".

                So on a phone the head is exactly one mark, the same 56px target as every other
                mark in the rail, and it does exactly one thing: open the panel. Every control —
                play, skip, shuffle, loop, volume — lives in the panel where there is room to hit
                it. The mini play/pause that used to sit here is what was squeezing the row. */}
            <div
                onClick={() => { const next = !isExpanded; setIsExpanded(next); if (next && onOpen) onOpen(); }}
                role="button"
                aria-expanded={isExpanded}
                aria-label="Cassette OS"
                className={`kpm-rail-mark ${isExpanded ? 'on' : ''} relative h-14 p-2 flex justify-center items-center gap-2 rounded-xl cursor-pointer transition-colors`}
            >
                {/* One mark, one job: open the pill. Every control — play, skip, shuffle, loop,
                    volume — lives in the pill, at both widths now. The desk's own label and inline
                    play/pause are gone with the 256px column that had room for them. */}
                <Music size={21} className={`text-[#ff9d00] shrink-0 transition-transform duration-300 ${isPlaying ? 'animate-pulse' : ''} ${isExpanded ? 'scale-[1.22]' : ''}`} />
                {/* the same label plate every other mark gets on a desk — his video asks for the
                    music button to be one of them, which means it says its name like one too */}
                <span className="kpm-rail-word">Music</span>
            </div>

            {/* THE PILL — his call, replacing the panel that hung off the side of the rail:
                a MusicPill instead. It is the better shape for this: the panel had to fit in
                whatever the rail left over, which is why it kept getting squeezed and cut. The
                pill owns the top of the screen instead, at a width it chooses, and the rail
                closes behind it — his rule from the island ask, and it still holds. Everything
                the old panel had is here; nothing had to shrink to fit beside something.

                Portalled to <body>, which is not optional — see the note on backdrop-filter at
                the top of this file. The desk branch below is the accordion, untouched. */}
            {isExpanded && createPortal(
                <>
                    {/* No dimmer: a pill is not a modal, and the screen behind it stays readable.
                        This only catches the tap that dismisses it. */}
                    <div className="hide-on-print fixed inset-0 z-[94]" onClick={() => setIsExpanded(false)}></div>

                    <div className="kpm-music-pill hide-on-print fixed z-[95] top-3 left-1/2 -translate-x-1/2 w-[min(92vw,340px)] rounded-[26px] border border-[#3e3226] bg-[#0f0e0d]/95 backdrop-blur-xl shadow-[0_14px_44px_rgba(0,0,0,.72)] overflow-hidden font-mono">
                        <div className="flex items-center gap-3 px-3 py-2.5">
                            <span className={`kpm-pill-art ${isPlaying ? 'spinning' : ''}`} aria-hidden="true"><Music size={15} /></span>
                            <div className="flex-1 min-w-0">
                                <div className="text-[9px] font-black uppercase tracking-[0.22em] text-[#5c4b3a] leading-none">Cassette OS</div>
                                <div className="text-xs font-bold text-[#f5e6c8] truncate leading-tight mt-1">{TRACKS[currentTrack].title}</div>
                            </div>
                            <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="shrink-0 w-10 h-10 rounded-full bg-[#ff9d00] text-[#2b2318] flex items-center justify-center active:scale-90 transition-transform shadow-[0_0_14px_rgba(255,157,0,.35)]">
                                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <button onClick={() => setIsExpanded(false)} aria-label="Close player" className="shrink-0 p-1.5 text-[#8b7256]"><X size={18} strokeWidth={3} /></button>
                        </div>

                        <div className="flex items-center gap-3 px-3 pb-3">
                            <button onClick={() => setIsShuffling(!isShuffling)} aria-label="Shuffle" className={isShuffling ? 'text-[#ff9d00]' : 'text-[#8b7256]'}><Shuffle size={15} /></button>
                            <button onClick={playPrev} aria-label="Previous track" className="text-[#d4c5a3]"><SkipBack size={17} /></button>
                            <button onClick={playNext} aria-label="Next track" className="text-[#d4c5a3]"><SkipForward size={17} /></button>
                            <button onClick={() => setIsLooping(!isLooping)} aria-label="Repeat" className={isLooping ? 'text-[#ff9d00]' : 'text-[#8b7256]'}><Repeat size={15} /></button>
                            <Volume2 size={14} className="text-[#8b7256] shrink-0 ml-1" />
                            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} aria-label="Volume" className="flex-1 min-w-0 h-1 bg-[#3e3226] rounded-lg appearance-none cursor-pointer accent-[#ff9d00]" />
                            <button onClick={() => setShowPlaylist(!showPlaylist)} aria-label="Tracks" className={showPlaylist ? 'text-[#ff9d00]' : 'text-[#8b7256]'}><List size={15} /></button>
                        </div>

                        {showPlaylist && (
                            <div className="max-h-40 overflow-y-auto border-t border-[#3e3226] custom-scrollbar">
                                {TRACKS.map((t, idx) => (
                                    <button key={idx} onClick={() => { setCurrentTrack(idx); setIsPlaying(true); }} className={`w-full text-left px-4 py-2.5 text-[11px] border-b border-[#3e3226]/60 truncate ${currentTrack === idx ? 'bg-[#ff9d00] text-[#2b2318] font-black' : 'text-[#8b7256]'}`}>
                                        {idx + 1}. {t.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

export default MusicPlayer;