import { useEffect, useState } from 'react';

/* true at the PC width (Tailwind's lg, 1024px) and up - the expedition's squad list; below it the
   phone's travel card. Follows the window live, so a rotated tablet switches too. */
const WIDE = '(min-width: 1024px)';
export const useWide = () => {
    const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
    useEffect(() => {
        const mq = window.matchMedia(WIDE), on = () => setWide(mq.matches);
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, []);
    return wide;
};
