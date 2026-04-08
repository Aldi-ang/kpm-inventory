import React, { useState, useEffect, useRef } from 'react';

export default function CapybaraMascot({ isDiscoMode, message, messages = [], onClick, staticImageSrc, user, scale }) {
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

    const DEFAULT_MESSAGES = user ? LOGGED_IN_MESSAGES : LOCKED_MESSAGES;
    const dialogueList = messages.length > 0 ? messages : DEFAULT_MESSAGES;

    const [isPeeking, setIsPeeking] = useState(false);
    const [isHiding, setIsHiding] = useState(false); 
    const [internalMsg, setInternalMsg] = useState(""); 
    const msgIndexRef = useRef(0);

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

    useEffect(() => {
        if (isDiscoMode) return; 

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

        const handleHide = () => {
            setIsHiding(true); 
            setTimeout(() => {
                setIsPeeking(false);
                setIsHiding(false);
                setInternalMsg(""); 
                scheduleNextPeek(); 
            }, 1000);
        };

        scheduleNextPeek();
        return () => { clearTimeout(peekTimer); clearTimeout(hideTimer); };
    }, [isDiscoMode, dialogueList]); 

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

    const activeMessage = message || internalMsg; 
    const showMascot = isPeeking || message; 
    const slideClass = isHiding ? 'translate-x-[200%]' : 'translate-x-0'; 
    const initialClass = 'translate-x-[200%]';

    return (
        <div 
            className={`hide-on-print fixed bottom-0 right-0 z-[9999] transition-transform duration-700 ease-in-out cursor-pointer group ${showMascot ? slideClass : initialClass}`}
            onClick={onMascotClick}
            style={{ willChange: 'transform', marginBottom: '0px', marginRight: '0px' }} 
        >
            <div className="relative w-32 h-32 md:w-48 md:h-48 transition-transform duration-300 origin-bottom-right" style={{ transform: `scale(${scale || 1})` }}> 
                {activeMessage && (
                    <div className="absolute bottom-[85%] right-[20%] z-20 animate-pop-in pointer-events-none">
                        <div className="relative border-4 border-green-600 p-3 min-w-[140px] max-w-[180px] text-center shadow-[4px_4px_0px_0px_rgba(0,100,0,0.5)]" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                            <p className="text-[10px] font-bold font-mono leading-tight uppercase tracking-wide" style={{ color: '#000000' }}>{activeMessage}</p>
                            <div className="absolute -bottom-3 right-8 w-4 h-4 border-r-4 border-b-4 border-green-600 rotate-45" style={{ backgroundColor: '#ffffff' }}></div>
                        </div>
                    </div>
                )}
                <img src={NORMAL_IMAGE_URL} alt="Mascot" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:brightness-110 transition-all origin-bottom-right" onError={(e) => { e.target.onerror = null; e.target.src="https://api.dicebear.com/7.x/avataaars/svg?seed=CapyStandard"; }}/>
            </div>
            <style>{`
                @keyframes pop-in { 0% { transform: scale(0) translateY(20px); opacity: 0; } 80% { transform: scale(1.1) translateY(-5px); opacity: 1; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
                .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            `}</style>
        </div>
    );
}