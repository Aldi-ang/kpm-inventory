import React from 'react';
import { Check, Send } from 'lucide-react';
import { formatRupiah } from '../utils/helpers';
import { CARD_IDS, CARD_LABELS, isMoneyCard } from '../utils/eodRecord';

/* THE LETTER — it is on screen from the first card, the four counted cards fly INTO it, it seals,
   and it is launched to the regional admin.

   Aldi's spec, 2026-08-16: *"confirm, animation of those cards put inside the letter, and there
   should be animation for that letter sent to the regional admin"*. Then the correction that
   matters, 2026-08-17 after seeing the first build: *"what i want is each card animations going
   inside 1 same letter then sending animation could be better than now"*.

   ⚠️ "INSIDE" IS A DESTINATION, NOT A SEQUENCE. The first build read that spec as deck-then-letter
   — two scenes, one on screen at a time — and two things cannot go inside each other if only one
   of them exists. So the letter is mounted for the whole flow: small while counting, full size
   once sealed, and the deck aims its confirmed cards at `mouthRef` below.

   ⚠️ THE FOUR LINES ARE ALWAYS RENDERED, blank until their card arrives. Two reasons. A row that
   mounts already in its final position has no "before" value to transition from — the trap that
   made an earlier prototype's motion invisible. And a letter showing four empty rules from the
   start SAYS what the evening is: four things to fill in. The envelope also stops changing height
   as rows land, which keeps the flight target still.

   ⚠️ VISIBILITY BELONGS TO THE STATE, MOVEMENT BELONGS TO THE TRANSITION. Lite Mode forces every
   duration to 0.001s, so anything that only becomes visible at an animation's last frame simply
   disappears in Lite — that is Lite deleting content, which his law forbids. Every element here is
   positioned by a value the stage owns; the transition only carries it there. */

/* open → sealed → launching → sent. `launching` is a 200ms wind-up: the letter lifts and swells
   before it goes. A send with no wind-up is the "cheap" he has named twice — the effort was not
   where the moment is. */
const SEND_TRANSFORM = {
  open:      'scale(.74)',
  sealed:    'scale(1)',
  launching: 'translateY(-18px) scale(1.05)',
  sent:      'translate(104px, -300px) rotate(15deg) scale(.24)'
};
const SEND_DURATION = { open: '520ms', sealed: '520ms', launching: '200ms', sent: '780ms' };
const SEND_EASE = {
  open: 'cubic-bezier(.2,.7,.3,1)',
  sealed: 'cubic-bezier(.2,.7,.3,1)',
  launching: 'cubic-bezier(.3,0,.2,1)',
  sent: 'cubic-bezier(.55,0,.35,1)'
};

export default function EODLetter({ counted = {}, stage = 'open', mouthRef, onSend, disabled = false }) {
  const sealed = stage !== 'open';
  const sent = stage === 'sent';

  return (
    <div className="w-full">
      {/* The stage keeps a fixed height per phase so the deck below it does not jump each time a
          card lands. It grows once, when the letter stops being a waiting tray and becomes the
          subject of the screen. */}
      {/* ⚠️ THE SLOT CLOSES AFTER THE LETTER LEAVES. Holding 238px for an envelope that has flown
          away left a screen-height hole above the "waiting" panel — the letter was gone and its
          absence was still taking up the room. The 640ms delay is the flight: collapse any sooner
          and the letter is yanked upward instead of launched. */}
      <div
        className="relative flex items-center justify-center transition-[height] duration-500 ease-out"
        style={{
          perspective: '1000px',
          height: sent ? 0 : sealed ? 238 : 178,
          transitionDelay: sent ? '640ms' : '0ms'
        }}
      >
        <div
          className="relative w-[290px] h-[164px] rounded-[10px] border shadow-lg bg-[var(--raised)] border-[var(--line-3)]"
          style={{
            transformStyle: 'preserve-3d',
            transform: SEND_TRANSFORM[stage] || SEND_TRANSFORM.open,
            opacity: sent ? 0 : 1,
            transitionProperty: 'transform, opacity',
            transitionDuration: SEND_DURATION[stage] || '520ms',
            transitionTimingFunction: SEND_EASE[stage] || 'ease-out'
          }}
        >
          {/* The paper's two creases, so it reads as a folded envelope even before the flap lands.
              ⚠️ AT .7 THEY CUT STRAIGHT THROUGH THE ROWS. That was invisible while the letter only
              appeared at the end with four solid plates over it; now it is on screen from the first
              card with two of its four rows still blank, and a full-width X across dim text is the
              "collapsing" he means — two things overlapping. Texture stays, contrast drops. */}
          <span
            className="absolute inset-0 rounded-[10px] pointer-events-none opacity-25"
            style={{
              background:
                'linear-gradient(135deg,transparent 49.4%,var(--line) 49.4% 50.6%,transparent 50.6%),' +
                'linear-gradient(225deg,transparent 49.4%,var(--line) 49.4% 50.6%,transparent 50.6%)'
            }}
          />

          {/* WHERE THE CARDS ARE AIMED. A zero-size anchor rather than a measurement of the list,
              because the list's own rows move — the target has to be a thing that never does. */}
          <span ref={mouthRef} className="absolute left-1/2 top-[42%] w-0 h-0 pointer-events-none" />

          {/* ⚠️ z-10 PUTS THE CONTENTS ABOVE THE FLAP. Painted in DOM order the flap's triangle
              lands on top and clips the first row's figure — a closed envelope you cannot read
              through is realistic and useless. The flap now swings shut BEHIND the list. */}
          <div className="absolute inset-x-3 top-3 bottom-3 z-10 flex flex-col gap-1 justify-center">
            {CARD_IDS.map((id, i) => {
              const value = counted[id];
              const landed = value !== undefined && value !== null;
              return (
                <div
                  key={id}
                  className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1 border ${
                    landed
                      ? 'bg-[var(--inset)] border-[var(--line)]'
                      : 'bg-transparent border-dashed border-[var(--line)]'
                  }`}
                  style={{
                    /* the row lands a beat AFTER the card does — 340ms into a 760ms flight, so the
                       card is still visibly arriving when its line appears. That beat is the whole
                       reason the flight reads as "the card became the row". */
                    transitionProperty: 'transform, opacity, background-color, border-color',
                    transitionDuration: '420ms',
                    transitionDelay: landed ? '340ms' : '0ms',
                    transitionTimingFunction: 'cubic-bezier(.2,.8,.3,1)',
                    transform: landed ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(.97)',
                    opacity: landed ? 1 : 0.4
                  }}
                >
                  <span className={`flex items-center gap-1.5 text-[11px] font-bold ${
                    landed ? 'text-[var(--ink)]' : 'text-[var(--ink-dim)]'
                  }`}>
                    {landed
                      ? <Check size={11} className="text-[var(--accent-ink)]" />
                      : <span className="inline-block w-[11px] text-center font-mono text-[var(--ink-dim)]">{i + 1}</span>}
                    {CARD_LABELS[id]}
                  </span>
                  <span className="font-mono tabular-nums text-[11px] text-[var(--ink-dim)]">
                    {landed ? (isMoneyCard(id) ? formatRupiah(value) : value) : '——'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* The flap. Stands open, leaning back, and swings shut when the letter seals.
              ⚠️ IT USED TO REST AT rotateX(172deg) AND THAT WAS THE BROKEN SHAPE ON SCREEN. Folding
              a 82px triangle back about its top edge throws the tip 82·cos(8°) ≈ 81px ABOVE the
              envelope — a full-width beige wedge sitting on top of the step strip. Nobody saw it
              while the letter only existed after the last card; it is on screen the whole time now.
              104° leans the flap away instead of flipping it over: the tip clears the fold by
              82·cos(76°) ≈ 20px and the rest goes backwards in Z, which is what an open envelope
              actually looks like. */}
          <div
            className="absolute left-0 top-0 w-full h-[82px] rounded-t-[10px] bg-[var(--inset)] transition-transform duration-[640ms] ease-out"
            style={{
              transformOrigin: 'top center',
              transform: sealed ? 'rotateX(0deg)' : 'rotateX(104deg)',
              clipPath: 'polygon(0 0,100% 0,50% 100%)',
              boxShadow: '0 1px 0 var(--line-3)'
            }}
          />

          {/* THE WAX GOES BOTTOM-CENTRE, HALF OFF THE EDGE, and the position is load-bearing rather
              than decorative. Every row is `justify-between` — label hard left, figure hard right —
              so the middle of a row is the one strip of this envelope that never carries text. A
              52px disc lands there and covers nothing.
              ⚠️ THIS IS THE SECOND FIX TO THE SAME BUG. Centred it sat on two of the four figures;
              moved to the corner it still clipped the last row's number, because the corner is
              exactly where a right-aligned figure ends. "Half off the edge" was never the property
              that mattered — "not where the text is" was.
              ⚠️ `sealed` owns the opacity — NOT a keyframe — so Lite Mode keeps the seal and loses
              only the stamping motion. */}
          <div
            className="absolute left-1/2 -bottom-[26px] w-[52px] h-[52px] rounded-full flex items-center justify-center border-2 bg-[var(--gold)] text-[var(--gold-ink)] border-[var(--accent-edge)] font-mono font-black text-[8px] tracking-wider shadow-md transition-all duration-[420ms]"
            style={{
              transitionDelay: sealed ? '420ms' : '0ms',
              opacity: sealed ? 1 : 0,
              transform: sealed
                ? 'translateX(-50%) translateZ(2px) scale(1) rotate(-8deg)'
                : 'translateX(-50%) translateZ(2px) scale(2.4) rotate(-18deg)'
            }}
          >
            SEALED
          </div>
        </div>
      </div>

      {stage === 'open' && (
        <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[.18em] text-[var(--ink-dim)]">
          Every card you confirm goes in here
        </p>
      )}

      {(stage === 'sealed' || stage === 'launching') && (
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || stage === 'launching'}
          className="w-full py-3.5 rounded-xl font-black flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--gold-ink)] border border-[var(--accent-edge)] shadow-md transition-transform active:scale-[.98] disabled:opacity-40"
        >
          <Send size={16} /> Send to the regional admin
        </button>
      )}

      {sent && (
        <div className="rounded-xl border border-dashed p-4 text-center border-[var(--line-3)] bg-[var(--inset)]">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[var(--accent-ink)] mb-1">
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
