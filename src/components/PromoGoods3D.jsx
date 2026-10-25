import React, { useEffect, useRef, useState } from 'react';
import { promoGoods, promoWord, promoSkin } from '../utils/helpers';

/* A promo item with no photo, as its 3D goods (his 2026-10-26 "design 3D default for all the goods"). three.js comes in
   with the import() below, only when this is on screen. No goods type fits, no WebGL, or the model cannot download
   (offline, first visit): the flat picture instead, so the spot is never empty. */
export default function PromoGoods3D({ product, drag = false, className = '' }) {
    const ref = useRef(null);
    const [failed, setFailed] = useState(false);
    const goods = promoGoods(product), word = promoWord(product);

    useEffect(() => {
        if (!goods || failed) return undefined;
        let live = true, unmount = () => {};
        import('../utils/promoGoods3d.js')
            .then(({ mount }) => { if (live && ref.current) unmount = mount(ref.current, { goods, word, drag, onFail: () => setFailed(true) }); })
            .catch(() => { if (live) setFailed(true); });
        return () => { live = false; unmount(); };
    }, [goods, word, drag, failed]);

    if (!goods || failed) return <img src={promoSkin(product, 'front')} alt="" className={`${className} object-contain`} />;
    return <div ref={ref} className={className} />;
}
