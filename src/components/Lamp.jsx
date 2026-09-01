import React from 'react';

/* The desk's status dot. Lifted out of `RestockVaultView` on 2026-09-01 so the regional warehouse
   desk wears the same one rather than a lookalike — two desks on the same page with two different
   status dots is how one of them starts reading as a different product.

   ⚠️ The colour carries the meaning on its own and the pulse never does. `html.lite-mode` strips
   every animation, so a lamp that said "live" only by pulsing would go silent on the cheap Android
   this app is actually used on — his locked rule: Lite Mode gives up motion, never colour. */
const Lamp = ({ tone = 'off', live = false }) => (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 border ${
        tone === 'on'  ? 'bg-orange border-orange' :
        tone === 'bad' ? 'bg-danger border-danger' :
                         'bg-transparent border-line-3'
    } ${live ? 'animate-pulse' : ''}`} />
);

export default Lamp;
