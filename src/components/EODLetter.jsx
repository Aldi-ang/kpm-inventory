import React from 'react';
import { Check, Send } from 'lucide-react';
import { formatRupiah } from '../utils/helpers';
import { CARD_LABELS } from '../utils/eodRecord';

/* THE LETTER — the four counted cards go inside it, it seals, and it flies to the regional admin.

   Aldi's spec, 2026-08-16: *"confirm, animation of those cards put inside the letter, and there
   should be animation for that letter sent to the regional admin"*.

   ⚠️ THE SEAL IS NOT THE END OF THE DAY, and the copy has to say so. Sealing means the agent is
   finished counting; the day closes only when the regional admin approves and then HQ approves —
   his rule: *"3 times approval each day making sure that there is no leak in the work process"*.
   An earlier prototype ended at the seal and it was wrong.

   ⚠️ VISIBILITY BELONGS TO THE STATE, MOVEMENT BELONGS TO THE TRANSITION. Lite Mode forces
   `animation: none`, so anything that only becomes visible at an animation's last frame simply
   disappears in Lite — that is Lite deleting content, which his law forbids. Every element here is
   positioned by a class the stage owns; the transition only carries it there. */

const isMoney = (id) => id === 'cash' || id === 'transfer';

export default function EODLetter({ cards = [], stage = 'filling', onSend, disabled = false }) {
  const sealed = stage === 'sealed' || stage === 'sent';
  const sent = stage === 'sent';

  return (
    <div className="w-full">
      <div className="relative flex items-center justify-center h-[230px]" style={{ perspective: '1000px' }}>
        <div
          className="relative w-[290px] h-[164px] rounded-[10px] border shadow-lg bg-[var(--raised)] border-[var(--line-3)] transition-all duration-[700ms] ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: sent ? 'translateX(150px) rotateY(52deg) scale(.72)' : 'none',
            opacity: sent ? 0 : 1
          }}
        >
          {/* the paper's two creases, so it reads as a folded envelope even before the flap lands */}
          <span
            className="absolute inset-0 rounded-[10px] pointer-events-none opacity-70"
            style={{
              background:
                'linear-gradient(135deg,transparent 49.4%,var(--line) 49.4% 50.6%,transparent 50.6%),' +
                'linear-gradient(225deg,transparent 49.4%,var(--line) 49.4% 50.6%,transparent 50.6%)'
            }}
          />

          {/* the counted cards, stacked inside the envelope mouth. They drop in one after another —
              the stagger is what makes four separate confirmations read as one bundle. */}
          {/* ⚠️ z-10 PUTS THE CONTENTS ABOVE THE FLAP. Painted in DOM order the flap's triangle
              lands on top and clips the first row's figure — a closed envelope you cannot read
              through is realistic and useless. The flap now swings shut BEHIND the list. */}
          <div className="absolute inset-x-3 top-3 bottom-3 z-10 flex flex-col gap-1 justify-center overflow-hidden">
            {cards.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-md px-2.5 py-1 bg-[var(--inset)] border border-[var(--line)] transition-all duration-500 ease-out"
                style={{
                  transitionDelay: `${i * 90}ms`,
                  transform: sealed ? 'translateY(0) scale(1)' : 'translateY(-14px) scale(.96)',
                  opacity: sealed ? 1 : 0.85
                }}
              >
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--ink)]">
                  <Check size={11} className="text-[var(--accent-ink)]" />
                  {CARD_LABELS[c.id]}
                </span>
                <span className="font-mono tabular-nums text-[11px] text-[var(--ink-dim)]">
                  {isMoney(c.id) ? formatRupiah(c.counted) : c.counted}
                </span>
              </div>
            ))}
          </div>

          {/* the flap. Rests open (folded back over the top) and swings shut when the letter seals. */}
          <div
            className="absolute left-0 top-0 w-full h-[82px] rounded-t-[10px] bg-[var(--inset)] transition-transform duration-[640ms] ease-out"
            style={{
              transformOrigin: 'top center',
              transform: sealed ? 'rotateX(0deg)' : 'rotateX(172deg)',
              clipPath: 'polygon(0 0,100% 0,50% 100%)',
              boxShadow: '0 1px 0 var(--line-3)'
            }}
          />

          {/* The wax sits on the CORNER, half off the envelope — not centred. Centred, a 58px disc
              lands squarely on top of two of the four figures, and a seal that hides a number is a
              legibility bug rather than a style choice.
              ⚠️ `sealed` owns the opacity — NOT a keyframe — so Lite Mode keeps the seal and loses
              only the stamping motion. Verified in Lite: opacity 1, background rgb(122,76,12). */}
          <div
            className="absolute -right-[14px] -bottom-[14px] w-[52px] h-[52px] rounded-full flex items-center justify-center border-2 bg-[var(--gold)] text-[var(--gold-ink)] border-[var(--accent-edge)] font-mono font-black text-[8px] tracking-wider shadow-md transition-all duration-[420ms]"
            style={{
              transitionDelay: sealed ? '520ms' : '0ms',
              opacity: sealed ? 1 : 0,
              transform: sealed ? 'translateZ(2px) scale(1) rotate(-8deg)' : 'translateZ(2px) scale(2.4) rotate(-18deg)'
            }}
          >
            SEALED
          </div>
        </div>
      </div>

      {stage === 'sealed' && (
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className="w-full py-3.5 rounded-xl font-black flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--gold-ink)] border border-[var(--accent-edge)] shadow-md transition-transform active:scale-[.98] disabled:opacity-40"
        >
          <Send size={16} /> Send to the regional admin
        </button>
      )}

      {sent && (
        <div className="rounded-xl border border-dashed p-4 text-center border-[var(--line-3)] bg-[var(--inset)]">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--accent-ink)] mb-1">
            Waiting on the regional admin
          </p>
          {/* the honest line: sealing is not closing */}
          <p className="text-sm text-[var(--ink-dim)]">
            Nothing is credited yet. Your day closes when the region approves it and HQ signs it off.
          </p>
        </div>
      )}
    </div>
  );
}
