import React from 'react';
import { nixieDigits } from '../utils/helpers';

/* THE NIXIE COUNTER - the app's one moving-number instrument. Aldi, 2026-09-18, with a 2.8 s clip
   of a price whose digits roll one place at a time: *"make the counter to be like this animation
   ... and make it like nixie tube a like so its analog but animated"*, and on the LED window it
   replaces: *"standardize effect, too much of that type"*.

   A nixie tube is a glass valve with the ten digits stacked as wire cathodes; one glows orange,
   the rest sit dark behind it. Here: one black glass window per digit, a reel of 0-9 inside it
   that TRANSLATES to the current digit (increase = the reel climbs, the new digit arrives from
   below), a 45 ms stagger per place from the left so the right-hand digits lag the way his clip
   does, the lit digit in amber on a gradient disc, the unlit "8" filament ghosted behind
   (theme.css, .kpm-nixie*). No shadow and no filter anywhere in it: audit G30 forbids the
   control system to depend on one, and Lite Mode strips both - a stopped tube must still read
   as a display.

   Tubes are keyed by PLACE VALUE (units, tens, ...), so 99 -> 100 adds a tube on the left and
   the reels already on screen keep rolling instead of remounting. `signed` prints − / + in front
   (a DIFFERENCE); a plain count prints nothing. `size` is the digit's font size in px; a
   `className` lets a theme rule override it by width (.kpm-nixie-verdict). */
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const NixieCount = ({ value = 0, signed = false, size = 16, className = '' }) => {
    const { sign, digits } = nixieDigits(value, signed);
    return (
        <span className={`kpm-nixie ${className}`} style={{ '--nx': `${size}px` }} role="img" aria-label={`${sign}${digits.join('')}`}>
            {sign && <span className="kpm-nixie-sign" aria-hidden="true">{sign}</span>}
            {digits.map((d, i) => (
                <span key={digits.length - i} className="kpm-nixie-tube" aria-hidden="true" style={{ '--d': `${i * 45}ms` }}>
                    <span className="kpm-nixie-reel" style={{ '--i': d }}>
                        {DIGITS.map((x) => <span key={x} className={x === d ? 'lit' : ''}>{x}</span>)}
                    </span>
                </span>
            ))}
        </span>
    );
};

export default NixieCount;
