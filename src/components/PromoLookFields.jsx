import React, { useState } from 'react';
import { promoGoods, promoLook, promoWord, GOODS_PARTS } from '../utils/helpers';
import PromoGoods3D from './PromoGoods3D';

/* THE LOOK, in the product form (his 2026-10-26 "edit the color appearance on the 3D design, and change the name on it
   when press edit"). Its own state, so dragging a colour repaints the preview without re-rendering the whole app; the
   inputs are named, so handleSaveProduct reads them from the form like every other field. Colours: any - this is the
   goods' own paint (a red shirt is a red shirt), not app UI, the same way a pack photo keeps its own colours. */
export default function PromoLookFields({ product, previewRef }) {
    const [text, setText] = useState(product.printText || '');
    const [body, setBody] = useState(product.goodsColor || '');
    const [ink, setInk] = useState(product.printColor || '');
    const [trim, setTrim] = useState(product.trimColor || '');
    const [accent, setAccent] = useState(product.accentColor || '');
    if (!promoGoods(product)) return <p className="text-[var(--duke-ink-8)]">Pick a TYPE to see the 3D model.</p>;
    const shown = { ...product, printText: text, goodsColor: body, printColor: ink, trimColor: trim, accentColor: accent };
    const look = promoLook(shown), parts = GOODS_PARTS[promoGoods(product)] || {};
    const swatch = 'w-14 h-10 p-0.5 bg-[var(--duke-veil)] border border-[var(--duke-veil-edge-2)] cursor-pointer';
    const field = 'w-full p-2 bg-[var(--duke-veil)] border border-[var(--duke-veil-edge-2)] text-[var(--duke-ink-hi)] focus:border-[var(--duke-amber-edge)] outline-none';
    return (
        <div className="space-y-3">
            <p className="text-[var(--shell-orange-ink)] font-bold">LOOK</p>
            <div className="relative h-44 bg-black border border-[var(--duke-veil-edge)]">
                <PromoGoods3D ref={previewRef} product={shown} className="absolute inset-0" />
            </div>
            <div><label htmlFor="printText" className="text-[var(--duke-ink-8)] block mb-1">PRINTED TEXT</label>
                <input id="printText" name="printText" value={text} maxLength={18} onChange={(e) => setText(e.target.value)}
                    placeholder={`${promoWord({ ...product, printText: '' })} (from the name)`} className={`${field} uppercase`} /></div>
            <div className="flex items-end gap-3 flex-wrap">
                <label className="text-[var(--duke-ink-8)] flex flex-col gap-1">COLOR
                    <input type="color" name="goodsColor" value={look.body} onChange={(e) => setBody(e.target.value)} className="w-14 h-10 p-0.5 bg-[var(--duke-veil)] border border-[var(--duke-veil-edge-2)] cursor-pointer" /></label>
                <label className="text-[var(--duke-ink-8)] flex flex-col gap-1">PRINT COLOR
                    <input type="color" name="printColor" value={look.ink} onChange={(e) => setInk(e.target.value)} className="w-14 h-10 p-0.5 bg-[var(--duke-veil)] border border-[var(--duke-veil-edge-2)] cursor-pointer" /></label>
                {parts.trim && <label className="text-[var(--duke-ink-8)] flex flex-col gap-1">{parts.trim[0]}
                    <input type="color" name="trimColor" value={look.trim} onChange={(e) => setTrim(e.target.value)} className={swatch} /></label>}
                {parts.accent && <label className="text-[var(--duke-ink-8)] flex flex-col gap-1">{parts.accent[0]}
                    <input type="color" name="accentColor" value={look.accent} onChange={(e) => setAccent(e.target.value)} className={swatch} /></label>}
                <button type="button" onClick={() => { setBody(''); setInk(''); setTrim(''); setAccent(''); }}
                    className="min-h-10 px-3 border border-[var(--duke-veil-edge-2)] text-[var(--duke-ink-hi)] text-xs hover:border-[var(--duke-amber-edge)]">Default colors</button>
            </div>
        </div>
    );
}
