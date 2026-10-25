import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { promoGoods, promoLook, promoSkin } from '../utils/helpers';

/* A promo item with no photo, as its 3D goods (his 2026-10-26 "design 3D default for all the goods"). three.js comes in
   with the import() below, only when this is on screen. No goods type fits, no WebGL, or the model cannot download
   (offline, first visit): the flat picture instead, so the spot is never empty.
   The look (colours + printed word) repaints the mounted model; only a new goods type mounts a new one. The ref hands
   out snapshot() - the product form takes the Master Vault list picture from it on save. */
const PromoGoods3D = forwardRef(function PromoGoods3D({ product, drag = false, className = '' }, ref) {
    const box = useRef(null), handle = useRef(null);
    const [failed, setFailed] = useState(false);
    const goods = promoGoods(product), look = promoLook(product);
    const lookRef = useRef(look); lookRef.current = look;

    useEffect(() => {
        if (!goods || failed) return undefined;
        let live = true;
        import('../utils/promoGoods3d.js')
            .then(({ mount }) => { if (live && box.current) handle.current = mount(box.current, { goods, look: lookRef.current, drag, onFail: () => setFailed(true) }); })
            .catch(() => { if (live) setFailed(true); });
        return () => { live = false; handle.current?.(); handle.current = null; };
    }, [goods, drag, failed]);

    useEffect(() => { handle.current?.set(look); }, [look.body, look.ink, look.word]);   // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({ snapshot: () => handle.current?.snapshot() || null }), []);

    if (!goods || failed) return <img src={promoSkin(product, 'front')} alt="" className={`${className} object-contain`} />;
    return <div ref={box} className={className} />;
});
export default PromoGoods3D;
