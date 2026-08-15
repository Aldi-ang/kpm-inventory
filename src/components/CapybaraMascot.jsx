import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

/* Module scope, not inside the component. As locals these were rebuilt on every single render,
   so `dialogueList` was a new array every time, so the peek effect below — which lists it as a
   dependency — tore itself down and restarted on every render. Its timers never survived long
   enough to matter, and its cleanup could not cancel a hide that was already in flight. */
const LOGGED_IN_MESSAGES = [
    "Welcome back, Boss!",
    "Stock looks good today.",
    "Don't forget to record samples!",
    "Sales are looking up! 📈",
    "I love organization. And watermelons. 🍉",
    "Did you know Capybaras are the largest rodents?",
    "Remember to hydrate while you work! 💧",
    "System systems go! 🚀",
    "Any new products to add?",
    "You are doing great today! ⭐"
];

const LOCKED_MESSAGES = [
    "System Locked. 🔒",
    "Please identify yourself.",
    "I cannot let you in without a badge.",
    "Access Denied. 🛑",
    "Who goes there?"
];

/* A default of `[]` written in the parameter list is a NEW array on every render, which
   defeats the memo below for every caller that omits the prop — which is all of them. */
const NO_MESSAGES = [];

export default function CapybaraMascot({ isDiscoMode, message, messages = NO_MESSAGES, onClick, staticImageSrc, user, scale }) {
    const NORMAL_IMAGE_URL = "/mr capy.png"; 
    const DISCO_VIDEO_URL = "/Bit_Capybara_Fortnite_Dance_Video.mp4";
    const DISCO_MUSIC_URL = "/disco_music.mp3";

    useEffect(() => {
        const lastBackup = localStorage.getItem('last_usb_backup');
        const now = new Date().getTime();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        if (!lastBackup || (now - lastBackup) > sevenDays) {
            setInternalMsg("⚠️ PROTOCOL ALERT: TIME FOR USB SAFE BACKUP!");
            setIsPeeking(true);
        }
    }, []);

    const dialogueList = useMemo(
        () => (messages.length > 0 ? messages : (user ? LOGGED_IN_MESSAGES : LOCKED_MESSAGES)),
        [messages, user]
    );

    const [isPeeking, setIsPeeking] = useState(false);
    const [isHiding, setIsHiding] = useState(false);
    // the sales terminal owns the merchant while its corner figure is on screen
    const [suppressed, setSuppressed] = useState(false);
    const [internalMsg, setInternalMsg] = useState("");
    // art for THIS appearance only. Lets the merchant borrow the mascot's whole
    // show-up-and-go behaviour without a second component being written.
    const [radioImage, setRadioImage] = useState(null);
    // a CSS class naming a sprite SHEET (kpm-merch-idle / -talk / -deal) instead of a
    // flat image, so the merchant can animate without a second component existing.
    const [radioSprite, setRadioSprite] = useState(null);
    const msgIndexRef = useRef(0);

    /* THE BUG ALDI MARKED BROKEN: "capybara shows once and just spawned and do outro and
       vanish". Two things caused it, and both live here.

       One — `isHiding` was never cleared when a NEW line arrived. The peek timer sets it true
       to play the exit; if triggerCapy fired inside that window, the mascot became visible
       again while still wearing kpm-merch-exit, so he appeared already leaving.

       Two — the `message` prop had no exit at all. App cleared it after 8s, `showMascot` went
       false on the same tick, and he jumped to translate-x-[200%] with no animation: his
       earlier "just snapped and gone". The prop is now mirrored into state that lags it by one
       exit, so the animation has somewhere to play.

       Deliberately not guarded on "was he actually showing": if he was not, showMascot is false
       and the exit class is never on screen anyway, and the guard would need `propMsg` as a
       dependency, which reintroduces the stale-closure class of bug this is fixing. */
    const [propMsg, setPropMsg] = useState(null);
    const propExitRef = useRef(null);
    useEffect(() => {
        clearTimeout(propExitRef.current);
        if (message) {
            setIsHiding(false);
            setPropMsg(message);
            return;
        }
        setIsHiding(true);
        propExitRef.current = setTimeout(() => {
            setPropMsg(null);
            setIsHiding(false);
        }, 700);
        return () => clearTimeout(propExitRef.current);
    }, [message]);

    // 📻 THE RADIO RECEIVER: Listens for signals from anywhere in the app
    const radioTimers = useRef({});
    useEffect(() => {
        const handleRadioComms = (event) => {
            // detail is either a plain string (original callers) or
            // { message, image } so a caller can bring its own character.
            const d = event.detail;
            const incomingMessage = typeof d === 'string' ? d : d?.message;
            const incomingImage   = typeof d === 'string' ? null : d?.image;
            const incomingSprite  = typeof d === 'string' ? null : d?.sprite;
            /* `peek` is a duration in ms and carries NO line: "show yourself for N and go".
               HIS ASK, 2026-08-15, about the mascot-size slider: *"i want the mascott to show
               up for 5 second when the slider for the mascot size is moved"* — and, asked what
               he wanted him to do while there, *"just the idle animation"*. A silent appearance
               had no way in before this: every path into `isPeeking` went through a message,
               and a message is what puts the bubble up and swaps him to the talking sprite. */
            const incomingPeek = typeof d === 'string' ? 0 : d?.peek;
            if (incomingMessage || incomingPeek) {
                /* blank, not left alone: with `activeMessage` falsy `spriteToShow` resolves to
                   kpm-merch-idle and no bubble renders — which IS the ask. A line still on
                   screen from an earlier peek is cleared with it, deliberately: he asked to be
                   shown a SIZE, and a leftover speech bubble is not part of that answer. */
                setInternalMsg(incomingMessage || "");
                setRadioImage(incomingImage || null);
                setRadioSprite(incomingSprite || null);
                setIsPeeking(true);
                setIsHiding(false);
                /* an EXPLICIT peek releases the sales terminal's mute. `showMascot` is
                   `!suppressed && ...`, so a `suppressed` left stuck true — the terminal
                   unmounting without its cleanup running, say — would silently eat every peek
                   and look exactly like a dead button. Safe because `peek` is only ever sent by
                   the Settings size slider, and Settings and the sales terminal are different
                   tabs: they cannot be on screen together, so this cannot bring back the two
                   capybaras that `suppressed` exists to prevent. */
                if (incomingPeek) setSuppressed(false);

                /* Same overlap bug as the mascot's other two paths: without cancelling the
                   previous line's timers, the FIRST message's 8s dismissal hides the SECOND
                   one — a line arriving late in the previous window flashes and goes. */
                clearTimeout(radioTimers.current.hide);
                clearTimeout(radioTimers.current.clear);
                radioTimers.current.hide = setTimeout(() => {
                    setIsHiding(true);
                    radioTimers.current.clear = setTimeout(() => {
                        setIsPeeking(false);
                        setIsHiding(false);
                        setInternalMsg("");
                        setRadioImage(null);
                        setRadioSprite(null);
                    }, 1000); // Wait for the slide-out animation to finish
                    /* the clear above already ran for the previous event, so a drag that fires
                       this handler forty times leaves ONE window open, counted from the last
                       move. Without that, the 5s would expire mid-drag and he would leave while
                       the slider was still under his thumb. */
                }, incomingPeek || 8000);
            }
        };

        window.addEventListener('CAPY_COMMS', handleRadioComms);
        const pending = radioTimers.current;
        return () => {
            window.removeEventListener('CAPY_COMMS', handleRadioComms);
            clearTimeout(pending.hide);
            clearTimeout(pending.clear);
        };
    }, []);

    useEffect(() => {
        let audio = null;
        if (isDiscoMode) {
            audio = new Audio(DISCO_MUSIC_URL);
            audio.volume = 0.6; 
            audio.loop = true;  
            audio.play().catch(e => console.log("Audio blocked:", e));
        }
        return () => { if (audio) { audio.pause(); audio.currentTime = 0; } };
    }, [isDiscoMode]);

    /* The sales terminal draws its OWN merchant in the corner once his alcove scrolls away.
       This mascot peeks on its own timer every 90-210s, so the two appeared together and
       there were two capybaras on screen. The terminal now says when it owns him; while it
       does, this one stands down and stops scheduling peeks entirely.

       An event rather than a prop because App renders this mascot and MerchantSalesView is
       lazily loaded several levels away — threading a boolean through would touch both and
       every layer between, for a flag only one screen ever sets. */
    useEffect(() => {
        const onSuppress = (e) => setSuppressed(!!e.detail?.on);
        window.addEventListener('CAPY_SUPPRESS', onSuppress);
        return () => window.removeEventListener('CAPY_SUPPRESS', onSuppress);
    }, []);

    useEffect(() => {
        if (!suppressed) return;
        setIsPeeking(false);
        setIsHiding(false);
        setInternalMsg("");
    }, [suppressed]);

    useEffect(() => {
        if (isDiscoMode || suppressed) return;

        let peekTimer;
        let hideTimer;

        const scheduleNextPeek = () => {
            const nextPeekTime = Math.random() * 120000 + 90000; 
            
            peekTimer = setTimeout(() => {
                const currentIndex = msgIndexRef.current;
                const nextText = dialogueList[currentIndex];
                
                setInternalMsg(nextText);
                msgIndexRef.current = (currentIndex + 1) % dialogueList.length;

                setIsPeeking(true);
                setIsHiding(false);

                hideTimer = setTimeout(() => {
                    handleHide();
                }, 6000); 

            }, nextPeekTime);
        };

        /* This inner timeout was never cancelled by the cleanup below — only peekTimer and
           hideTimer were. A hide already in flight when the effect re-ran would land a second
           later and blank whatever line had arrived in the meantime. */
        let exitTimer;
        const handleHide = () => {
            setIsHiding(true);
            exitTimer = setTimeout(() => {
                setIsPeeking(false);
                setIsHiding(false);
                setInternalMsg("");
                scheduleNextPeek();
            }, 1000);
        };

        scheduleNextPeek();
        return () => { clearTimeout(peekTimer); clearTimeout(hideTimer); clearTimeout(exitTimer); };
    }, [isDiscoMode, dialogueList, suppressed]);

    const onMascotClick = () => {
        if (message || internalMsg) {
            setIsHiding(true);
            setTimeout(() => {
                setIsPeeking(false);
                setInternalMsg("");
            }, 500); 
        } else {
            if (onClick) onClick(); 
            setIsHiding(false);     
        }
    };

    if (isDiscoMode) {
        return (
            <>
                <div className="fixed inset-0 z-[100] pointer-events-none animate-disco-lights mix-blend-overlay opacity-60"></div>
                <div className="fixed bottom-0 right-4 z-[102] cursor-pointer animate-bounce-high" onClick={onClick}>
                    <div className="relative w-56 h-56 md:w-72 md:h-72 rounded-full overflow-hidden border-4 border-pink-500 shadow-[0_0_50px_#ec4899]">
                        <video src={DISCO_VIDEO_URL} autoPlay loop muted className="w-full h-full object-cover"/>
                    </div>
                </div>
                <style>{`
                    @keyframes disco-lights { 0% { background: linear-gradient(45deg, red, blue); } 50% { background: linear-gradient(45deg, lime, yellow); } 100% { background: linear-gradient(45deg, purple, red); } }
                    @keyframes bounce-high { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
                    .animate-disco-lights { animation: disco-lights 2s infinite linear alternate; }
                    .animate-bounce-high { animation: bounce-high 0.8s infinite ease-in-out; }
                `}</style>
            </>
        );
    }

    /* propMsg, not message: it holds the last line for one exit longer, so he finishes leaving
       with his bubble still on him instead of the text vanishing a beat before he does. */
    const activeMessage = propMsg || internalMsg;

    /* Only the sales terminal's deal ever passed an explicit sprite, so every other popup in
       the app - triggerCapy("Product updated!"), the sampling reminder, all of them - fell
       through to NORMAL_IMAGE_URL and showed the OLD pixel capybara. Two mascots, one app.
       The new merchant is now the default: he mouths the words while a line is on screen and
       idles otherwise. An explicit sprite still wins, and an explicit image still wins over
       the fallback, so a caller that genuinely wants a picture is unaffected. */
    const explicitImage = radioImage || staticImageSrc;
    const spriteToShow = radioSprite
        || (explicitImage ? null : (activeMessage ? 'kpm-merch-talk' : 'kpm-merch-idle'));
    // suppressed wins over an explicit `message` too — otherwise a triggerCapy fired while
    // the terminal owns the corner would put the second capybara straight back on screen
    const showMascot = !suppressed && (isPeeking || propMsg);
    /* He arrives from below with an overshoot instead of sliding flatly in from the
       right, and leaves faster than he arrives. Keyframes live in theme.css so Lite
       Mode strips them with everything else. */
    const stateClass = !showMascot
        ? 'opacity-0 pointer-events-none translate-x-[200%]'
        : (isHiding ? 'kpm-merch-exit' : 'kpm-merch-enter');

    /* HIS REPORT, 2026-08-12: the talking capybara "is still cutted in my phone" — the safe-area
       insets below fixed the HARDWARE cut (the notch and the home strip) but not this one.

       This one is an ancestor. He is `fixed`, but he is rendered deep inside the app shell, and
       that shell has `overflow-hidden` on its column and `overflow-y-auto` on its scroller. On
       iOS WebKit an overflow ancestor CLIPS a fixed descendant, so the parts of him that reach
       furthest outside his own 128px box — which is exactly the speech bubble, sitting at
       bottom-112% — are the parts that get sliced off.

       A portal to <body> takes him out of every one of those ancestors at once. He is already
       `fixed` with his own z-index, so nothing else about him changes. Third time this exact trap
       has bitten in this app: the field-mode bar, the music pill, now him. */
    return createPortal(
        <div
            className={`hide-on-print fixed bottom-0 right-0 z-[99999] cursor-pointer group ${stateClass}`}
            onClick={onMascotClick}
            /* HIS REPORT: "capybara is still cutted on the phone". `viewport-fit=cover` went into
               index.html on 2026-08-10 so the app could fill the notch — which also means the
               page now runs under the phone's rounded corners and its home-indicator strip, and
               anything pinned to bottom-0 right-0 gets sliced by the hardware.
               env(safe-area-inset-*) is what the browser exposes for exactly this; it is 0 on a
               desktop and on any phone without a cutout, so nothing else moves. */
            style={{
                willChange: 'transform',
                marginBottom: 'env(safe-area-inset-bottom, 0px)',
                marginRight: 'env(safe-area-inset-right, 0px)'
            }}
        >
            <div className="relative w-32 h-32 md:w-48 md:h-48 transition-transform duration-300 origin-bottom-right" style={{ transform: `scale(${scale || 1})` }}> 
                {/* bubble sits fully above him: 85% overlapped the hat once the sprite
                    filled the box. Border was green-600, which the palette law bans. */}
                {activeMessage && (
                    <div className="absolute bottom-[112%] right-[6%] mb-2 z-20 animate-pop-in pointer-events-none">
                        {/* the cap is measured off the VIEWPORT, not off him: he sits at the
                            right edge, so a long line grows leftward and a fixed 180px can still
                            run off a narrow phone even once nothing is clipping him. */}
                        <div className="relative border-4 border-gold p-3 min-w-[140px] max-w-[min(180px,calc(100vw-40px))] text-center shadow-[4px_4px_0px_0px_rgba(212,175,55,0.45)]" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                            <p className="text-[10px] font-bold font-mono leading-tight uppercase tracking-wide" style={{ color: '#000000' }}>{activeMessage}</p>
                            <div className="absolute -bottom-3 right-8 w-4 h-4 border-r-4 border-b-4 border-gold rotate-45" style={{ backgroundColor: '#ffffff' }}></div>
                        </div>
                    </div>
                )}
                {spriteToShow ? (
                    /* kpm-merch-corner carries the frame's TRUE 200px size and scales it down to
                       this box — see the note in theme.css. Without it the element is 128px wide
                       with a 200px frame painted into it, and he is sliced down his right side.
                       The sheet MUST stay on the inner div: a sheet that animates transform (the
                       deal breath does) replaces the wrapper's scale if they share an element. */
                    <div className="kpm-merch-corner">
                        <div className={`kpm-merch ${spriteToShow}`} role="img" aria-label="Merchant">
                            {/* the coin he is holding — the app's existing spinning coin sprite,
                                floated beside his hand rather than drawn into the character.
                                INSIDE the sprite now, not beside it: it is `inset-0` of its parent,
                                and this is the only box that is the frame's real size. As a sibling
                                it was measured against the 128px box and sat off his hand. */}
                            {spriteToShow === 'kpm-merch-deal' && <div className="kpm-merch-hold" aria-hidden="true"></div>}
                        </div>
                    </div>
                ) : (
                <img src={radioImage || staticImageSrc || NORMAL_IMAGE_URL} alt="Mascot" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:brightness-110 transition-all origin-bottom-right" onError={(e) => { e.target.onerror = null; e.target.src="https://api.dicebear.com/7.x/avataaars/svg?seed=CapyStandard"; }}/>
                )}
            </div>
            <style>{`
                @keyframes pop-in { 0% { transform: scale(0) translateY(20px); opacity: 0; } 80% { transform: scale(1.1) translateY(-5px); opacity: 1; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
                .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            `}</style>
        </div>,
        document.body
    );
}