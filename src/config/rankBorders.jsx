import React from 'react';

/* Square rank frames, ported from the approved "KPM - Rank Frames" artifact with every revision
 * already folded in: Bronze's planks thinned, Silver's gleam masked so the light travels along
 * the border instead of drifting outside it, Gold's bar darkened so the moving highlight differs
 * from the metal by VALUE and not just brightness, Diamond's crossing shine deleted, Platinum
 * thinned from 20px to 12px.
 *
 * Nothing rotates. Every frame is a square band around a square photo well.
 *
 * The CSS is kept as one verbatim string rather than hand-split per frame. It was signed off as a
 * whole, and retyping 37KB of gradient stops is how a design silently drifts from what was
 * approved. To change a frame, change the artifact and re-port it.
 *
 * Sizing is FIXED at 128px. Diamond and Mythic place blocks at absolute pixel offsets
 * (background-position: 19px 3px and friends), so rendering at any other size misaligns them.
 */

export const BORDER_KEYFRAMES = `
/* ---- the frame stage ---- */
.sframe{position:relative;width:128px;height:128px;flex:none}
.sframe .av{position:absolute;inset:14px;z-index:0;
  background-image:radial-gradient(circle at 50% 34%,#2A2620,#0D0C0A 76%);
  border:1px solid rgba(255,255,255,.05)}
.sframe .av::after{content:"";position:absolute;left:50%;top:56%;transform:translate(-50%,-50%);
  width:34px;height:34px;border-radius:50% 50% 44% 44%;background:rgba(232,228,222,.13)}
.sframe .lyr,.sframe .seg,.sframe .node,.sframe .gl,.sframe .fl,.sframe .hv{z-index:2}

/* LITE MODE — the app's performance mode. This is the fallback, not the target. */
.lite .sframe *{animation:none !important;transition:none !important;filter:none !important;
  box-shadow:none !important;mix-blend-mode:normal !important;text-shadow:none !important}
@media (prefers-reduced-motion:reduce){.sframe *{animation:none !important}}

/* ===== BRONZE — ref: wooden frame ===== */
.s-bronze{background-color:#0A0908}
/* THE BUG IN REV 1: this rule did not exist, so every layer rendered unpositioned and Bronze
   showed as an empty square. Silver and Gold had it; Bronze did not. */
.s-bronze .lyr{position:absolute;pointer-events:none;background-repeat:no-repeat}
.s-bronze .beams{inset:0;
  background-image:
    linear-gradient(178deg,#A8764A 0%,#8A5F3A 26%,#6E4A2E 58%,#3E2918 100%),
    linear-gradient(2deg,#9A6B41 0%,#7A5230 30%,#5E3E25 62%,#33210F 100%),
    linear-gradient(92deg,#A0703F 0%,#845936 28%,#66452B 60%,#38240F 100%),
    linear-gradient(268deg,#96683C 0%,#7E5533 30%,#5A3B23 62%,#2F1E0F 100%);
  background-size:100% 10px,100% 10px,10px 100%,10px 100%;
  background-position:0 0,0 100%,0 0,100% 0}
/* long bark grain — a different angle and pitch per plank */
.s-bronze .grain{inset:0;opacity:.62;
  background-image:
    repeating-linear-gradient(87deg,#2E1D10 0 1px,transparent 1px 3px),
    repeating-linear-gradient(93deg,#33200F 0 1px,transparent 1px 4px),
    repeating-linear-gradient(3deg,#2A1A0D 0 1px,transparent 1px 3px),
    repeating-linear-gradient(177deg,#30200F 0 1px,transparent 1px 5px);
  background-size:100% 10px,100% 10px,10px 100%,10px 100%;
  background-position:0 0,0 100%,0 0,100% 0}
/* knots, splits and worn highlights */
.s-bronze .wear{inset:0;
  background-image:
    radial-gradient(8px 5px at 38px 8px,#2A1A0C 0%,#5A3B23 58%,transparent 100%),
    radial-gradient(5px 3px at 88px 9px,#2A1A0C 0%,#54381F 60%,transparent 100%),
    radial-gradient(4px 7px at 8px 78px,#241608 0%,#553820 60%,transparent 100%),
    radial-gradient(6px 4px at 84px 120px,#2A1A0C 0%,#553820 60%,transparent 100%),
    linear-gradient(178deg,rgba(214,166,110,.30) 0%,transparent 40%),
    linear-gradient(92deg,rgba(214,166,110,.22) 0%,transparent 42%);
  background-size:auto,auto,auto,auto,100% 10px,10px 100%;
  background-position:0 0,0 0,0 0,0 0,0 0,0 0}
/* dark end-grain where the planks overlap at the corners */
.s-bronze .joints{inset:0;
  background-image:
    linear-gradient(135deg,#1F1409 0%,#3A2617 46%,transparent 47%),
    linear-gradient(225deg,#1F1409 0%,#3A2617 46%,transparent 47%),
    linear-gradient(45deg,#1B1108 0%,#33210F 46%,transparent 47%),
    linear-gradient(315deg,#1B1108 0%,#33210F 46%,transparent 47%);
  background-size:12px 12px;
  background-position:0 0,100% 0,0 100%,100% 100%}
/* iron straps at the mid-edges, with a rivet */
.s-bronze .iron{inset:0;
  background-image:
    radial-gradient(circle 1.6px at 50% 50%,#6E6A63 0%,#2A2622 70%,transparent 100%),
    linear-gradient(178deg,#4A453F 0%,#221E1B 48%,#0C0A09 100%),
    radial-gradient(circle 1.6px at 50% 50%,#6E6A63 0%,#2A2622 70%,transparent 100%),
    linear-gradient(2deg,#453F39 0%,#1E1A17 48%,#0A0908 100%),
    linear-gradient(92deg,#4A453F 0%,#221E1B 48%,#0C0A09 100%),
    linear-gradient(268deg,#453F39 0%,#1E1A17 48%,#0A0908 100%);
  background-size:13px 10px,13px 10px,13px 10px,13px 10px,10px 13px,10px 13px;
  background-position:50% 0,50% 0,50% 100%,50% 100%,0 50%,100% 50%}
.s-bronze .rim{inset:0;box-shadow:inset 0 0 16px 4px rgba(0,0,0,.66),inset 0 0 2px 1px rgba(180,130,80,.16)}
.s-bronze .beams{filter:drop-shadow(0 2px 3px rgba(0,0,0,.8))}
/* REV 4: thinner border per Aldi. Knots re-seated for the narrower plank. */
.s-bronze .wear{background-image:
  radial-gradient(5px 3px at 38px 5px,#2A1A0C 0%,#5A3B23 58%,transparent 100%),
  radial-gradient(4px 2px at 88px 5px,#2A1A0C 0%,#54381F 60%,transparent 100%),
  radial-gradient(2.5px 5px at 5px 78px,#241608 0%,#553820 60%,transparent 100%),
  radial-gradient(4px 2.5px at 84px 123px,#2A1A0C 0%,#553820 60%,transparent 100%),
  linear-gradient(178deg,rgba(214,166,110,.32) 0%,transparent 44%),
  linear-gradient(92deg,rgba(214,166,110,.24) 0%,transparent 46%);
  background-size:auto,auto,auto,auto,100% 10px,10px 100%}

/* ===== SILVER — ref: silver ===== */
.s-silver{background-color:#0A0908}
.s-silver .lyr,.s-silver .gl{position:absolute;pointer-events:none;background-repeat:no-repeat}
.s-silver .plate{inset:0;
  background-image:linear-gradient(180deg,#17150F 0%,#0A0908 100%),linear-gradient(0deg,#141209 0%,#080706 100%),
    linear-gradient(90deg,#15130C 0%,#0A0908 100%),linear-gradient(270deg,#141209 0%,#08070603 100%);
  background-size:100% 12px,100% 12px,12px 100%,12px 100%;
  background-position:0 0,0 100%,0 0,100% 0}
/* outer 2px rail — lit from above, dark underside */
.s-silver .railo{inset:1px;
  background-image:
    linear-gradient(180deg,#F2F0EC 0%,#CBC9C4 44%,#7E7A74 100%),
    linear-gradient(0deg,#A8A49E 0%,#5C5852 100%),
    linear-gradient(90deg,#EDEBE7 0%,#BFBDB7 46%,#726E68 100%),
    linear-gradient(270deg,#DAD8D3 0%,#8A867F 44%,#4F4C47 100%);
  background-size:100% 2px,100% 2px,2px 100%,2px 100%;
  background-position:0 0,0 100%,0 0,100% 0}
/* inner hairline, gradient runs ALONG the rail so 1px still has value change */
.s-silver .raili{inset:7px;
  background-image:
    linear-gradient(90deg,#5E5A55 0%,#C3C1BB 48%,#6E6A64 100%),
    linear-gradient(90deg,#4F4C47 0%,#9A968F 52%,#57534E 100%),
    linear-gradient(180deg,#5A5651 0%,#B8B6B0 46%,#66625C 100%),
    linear-gradient(180deg,#524E49 0%,#A3A099 50%,#5C5853 100%);
  background-size:100% 1px,100% 1px,1px 100%,1px 100%;
  background-position:0 0,0 100%,0 0,100% 0}
/* bevelled corner blocks — hard diagonal split reads as a mitre */
.s-silver .corners{inset:1px;
  background-image:
    linear-gradient(135deg,#F4F2EE 0%,#CBC9C4 38%,#8E8A84 39%,#63605A 100%),
    linear-gradient(225deg,#EFEDE9 0%,#C2C0BA 38%,#87837D 39%,#5C5853 100%),
    linear-gradient(45deg,#E6E4E0 0%,#B4B2AC 38%,#7C7872 39%,#545049 100%),
    linear-gradient(315deg,#E0DEDA 0%,#ADABA5 38%,#75716B 39%,#4E4A45 100%);
  background-size:8px 8px;
  background-position:0 0,100% 0,0 100%,100% 100%}
/* ── the travelling gleam: four edges, each live for one quarter ── */
.s-silver .gl{opacity:0;will-change:transform,opacity;
  animation-duration:7.2s;animation-iteration-count:infinite;animation-timing-function:ease-in-out}
.s-silver .gT{top:0;left:0;width:34px;height:4px;animation-name:kpmSilT;
  background-image:radial-gradient(17px 3px at 50% 50%,rgba(255,255,255,.95) 0%,rgba(255,255,255,.35) 45%,transparent 100%)}
.s-silver .gR{top:0;right:0;width:4px;height:34px;animation-name:kpmSilR;animation-delay:1.8s;
  background-image:radial-gradient(3px 17px at 50% 50%,rgba(255,255,255,.95) 0%,rgba(255,255,255,.35) 45%,transparent 100%)}
.s-silver .gB{bottom:0;right:0;width:34px;height:4px;animation-name:kpmSilB;animation-delay:3.6s;
  background-image:radial-gradient(17px 3px at 50% 50%,rgba(255,255,255,.95) 0%,rgba(255,255,255,.35) 45%,transparent 100%)}
.s-silver .gL{bottom:0;left:0;width:4px;height:34px;animation-name:kpmSilL;animation-delay:5.4s;
  background-image:radial-gradient(3px 17px at 50% 50%,rgba(255,255,255,.95) 0%,rgba(255,255,255,.35) 45%,transparent 100%)}
@keyframes kpmSilT{0%{opacity:0;transform:translateX(-34px)}4%{opacity:1}21%{opacity:1}
  25%{opacity:0;transform:translateX(128px)}100%{opacity:0;transform:translateX(128px)}}
@keyframes kpmSilR{0%{opacity:0;transform:translateY(-34px)}4%{opacity:1}21%{opacity:1}
  25%{opacity:0;transform:translateY(128px)}100%{opacity:0;transform:translateY(128px)}}
@keyframes kpmSilB{0%{opacity:0;transform:translateX(34px)}4%{opacity:1}21%{opacity:1}
  25%{opacity:0;transform:translateX(-128px)}100%{opacity:0;transform:translateX(-128px)}}
@keyframes kpmSilL{0%{opacity:0;transform:translateY(34px)}4%{opacity:1}21%{opacity:1}
  25%{opacity:0;transform:translateY(-128px)}100%{opacity:0;transform:translateY(-128px)}}
@media (prefers-reduced-motion:reduce){.s-silver .gl{animation:none;opacity:0}}

/* the gleam now actually blooms off the metal */
.s-silver .gl{filter:blur(3px) drop-shadow(0 0 6px rgba(255,255,255,.9));mix-blend-mode:screen}
.s-silver .railo{filter:drop-shadow(0 0 2px rgba(220,218,212,.35))}
.s-silver .bloom{position:absolute;inset:-4px;pointer-events:none;border-radius:3px;
  box-shadow:0 0 18px 2px rgba(203,201,196,.22),inset 0 0 12px rgba(255,255,255,.10)}
/* ── REV 2: brighter, per your note ── */
.s-silver .gl{opacity:1;filter:blur(2px) drop-shadow(0 0 10px #FFFFFF) drop-shadow(0 0 20px rgba(255,255,255,.7));
  animation-duration:6s}
.s-silver .gT{background-image:radial-gradient(19px 3px at 50% 50%,#FFFFFF 0%,#FFFFFF 30%,rgba(255,255,255,.55) 62%,transparent 100%)}
.s-silver .gR{background-image:radial-gradient(3px 19px at 50% 50%,#FFFFFF 0%,#FFFFFF 30%,rgba(255,255,255,.55) 62%,transparent 100%)}
.s-silver .gB{background-image:radial-gradient(19px 3px at 50% 50%,#FFFFFF 0%,#FFFFFF 30%,rgba(255,255,255,.55) 62%,transparent 100%)}
.s-silver .gL{background-image:radial-gradient(3px 19px at 50% 50%,#FFFFFF 0%,#FFFFFF 30%,rgba(255,255,255,.55) 62%,transparent 100%)}
.s-silver .gR{animation-delay:1.5s}.s-silver .gB{animation-delay:3s}.s-silver .gL{animation-delay:4.5s}
.s-silver .bloom{box-shadow:0 0 26px 4px rgba(230,228,222,.34),inset 0 0 16px rgba(255,255,255,.16)}
.s-silver .railo{filter:drop-shadow(0 0 4px rgba(235,233,228,.6))}
/* REV 4: Aldi — "that light shouldnt move outside the border ... i want the light to just move
   along with the border shape". The gleams now live inside a frame-shaped mask. */
.s-silver .glw{position:absolute;inset:0;z-index:3;pointer-events:none;
  -webkit-mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  -webkit-mask-size:100% 12px,100% 12px,12px 100%,12px 100%;
  -webkit-mask-position:0 0,0 100%,0 0,100% 0;-webkit-mask-repeat:no-repeat;
  mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  mask-size:100% 12px,100% 12px,12px 100%,12px 100%;
  mask-position:0 0,0 100%,0 0,100% 0;mask-repeat:no-repeat;}
.s-silver .gl{filter:blur(2px) drop-shadow(0 0 7px #FFFFFF)}
.s-silver .gT{top:1px}.s-silver .gB{bottom:1px}.s-silver .gL{left:1px}.s-silver .gR{right:1px}
@keyframes kpmSilT{0%{opacity:0;transform:translateX(0)}5%{opacity:1}20%{opacity:1}
  25%{opacity:0;transform:translateX(94px)}100%{opacity:0;transform:translateX(94px)}}
@keyframes kpmSilR{0%{opacity:0;transform:translateY(0)}5%{opacity:1}20%{opacity:1}
  25%{opacity:0;transform:translateY(94px)}100%{opacity:0;transform:translateY(94px)}}
@keyframes kpmSilB{0%{opacity:0;transform:translateX(0)}5%{opacity:1}20%{opacity:1}
  25%{opacity:0;transform:translateX(-94px)}100%{opacity:0;transform:translateX(-94px)}}
@keyframes kpmSilL{0%{opacity:0;transform:translateY(0)}5%{opacity:1}20%{opacity:1}
  25%{opacity:0;transform:translateY(-94px)}100%{opacity:0;transform:translateY(-94px)}}

/* ===== GOLD — ref: gold frame ===== */
.s-gold{background-color:#0A0908}
.s-gold .lyr{position:absolute;inset:0;pointer-events:none;background-repeat:no-repeat;z-index:2}
.s-gold .bed{
  -webkit-mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  -webkit-mask-size:100% 11px,100% 11px,11px 100%,11px 100%;
  -webkit-mask-position:0 0,0 100%,0 0,100% 0;-webkit-mask-repeat:no-repeat;
  mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  mask-size:100% 11px,100% 11px,11px 100%,11px 100%;
  mask-position:0 0,0 100%,0 0,100% 0;mask-repeat:no-repeat;background-color:#2A1204}
/* the molten bar — brightest along its centre line */
.s-gold .bar{
  -webkit-mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  -webkit-mask-size:100% 9px,100% 9px,9px 100%,9px 100%;
  -webkit-mask-position:0 0,0 100%,0 0,100% 0;-webkit-mask-repeat:no-repeat;
  mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  mask-size:100% 9px,100% 9px,9px 100%,9px 100%;
  mask-position:0 0,0 100%,0 0,100% 0;mask-repeat:no-repeat;
  background-image:
    linear-gradient(180deg,#8A4108 0%,#FF8C1A 34%,#FFD79A 50%,#FF8C1A 66%,#8A4108 100%),
    linear-gradient(0deg,#7A3806 0%,#F2801A 34%,#FFC46B 50%,#F2801A 66%,#7A3806 100%),
    linear-gradient(90deg,#8A4108 0%,#FF8C1A 34%,#FFD79A 50%,#FF8C1A 66%,#8A4108 100%),
    linear-gradient(270deg,#7A3806 0%,#F2801A 34%,#FFC46B 50%,#F2801A 66%,#7A3806 100%);
  background-size:100% 9px,100% 9px,9px 100%,9px 100%;
  background-position:0 0,0 100%,0 0,100% 0;
  filter:drop-shadow(0 0 6px rgba(255,140,26,.6))}
/* hot spots baked in, so the frozen state still looks hot */
.s-gold .baked{
  -webkit-mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  -webkit-mask-size:100% 9px,100% 9px,9px 100%,9px 100%;
  -webkit-mask-position:0 0,0 100%,0 0,100% 0;-webkit-mask-repeat:no-repeat;
  mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  mask-size:100% 9px,100% 9px,9px 100%,9px 100%;
  mask-position:0 0,0 100%,0 0,100% 0;mask-repeat:no-repeat;mix-blend-mode:screen;filter:blur(2px);opacity:.85;
  background-image:
    radial-gradient(13px 4px at 30% 4px,#FFF6E0,transparent 72%),
    radial-gradient(10px 4px at 74% 5px,#FFE0A8,transparent 74%),
    radial-gradient(4px 12px at 4px 64%,#FFF6E0,transparent 72%),
    radial-gradient(4px 11px at calc(100% - 4px) 38%,#FFE0A8,transparent 74%),
    radial-gradient(12px 4px at 56% calc(100% - 4px),#FFF6E0,transparent 72%)}
/* four drifting hot spots, masked to the bar so they never leave it */
.s-gold .glw{position:absolute;inset:0;z-index:3;pointer-events:none;
  -webkit-mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  -webkit-mask-size:100% 9px,100% 9px,9px 100%,9px 100%;
  -webkit-mask-position:0 0,0 100%,0 0,100% 0;-webkit-mask-repeat:no-repeat;
  mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  mask-size:100% 9px,100% 9px,9px 100%,9px 100%;
  mask-position:0 0,0 100%,0 0,100% 0;mask-repeat:no-repeat;}
.s-gold .hs{position:absolute;mix-blend-mode:screen;filter:blur(2.5px);
  animation-iteration-count:infinite;animation-timing-function:linear}
.s-gold .h1{top:1px;left:0;width:30px;height:7px;animation-name:kpmGsH;animation-duration:5.1s;
  background-image:radial-gradient(15px 3.5px at 50% 50%,#FFFFFF 0%,rgba(255,236,200,.6) 42%,transparent 100%)}
.s-gold .h2{top:0;right:1px;width:7px;height:30px;animation-name:kpmGsV;animation-duration:6.8s;animation-delay:-2.1s;
  background-image:radial-gradient(3.5px 15px at 50% 50%,#FFFFFF 0%,rgba(255,236,200,.6) 42%,transparent 100%)}
.s-gold .h3{bottom:1px;right:0;width:26px;height:7px;animation-name:kpmGsHr;animation-duration:4.3s;animation-delay:-1.4s;
  background-image:radial-gradient(13px 3.5px at 50% 50%,#FFF8EC 0%,rgba(255,226,178,.55) 42%,transparent 100%)}
.s-gold .h4{bottom:0;left:1px;width:7px;height:26px;animation-name:kpmGsVr;animation-duration:7.9s;animation-delay:-3.3s;
  background-image:radial-gradient(3.5px 13px at 50% 50%,#FFF8EC 0%,rgba(255,226,178,.55) 42%,transparent 100%)}
.s-gold .halo{
  -webkit-mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  -webkit-mask-size:100% 13px,100% 13px,13px 100%,13px 100%;
  -webkit-mask-position:0 0,0 100%,0 0,100% 0;-webkit-mask-repeat:no-repeat;
  mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  mask-size:100% 13px,100% 13px,13px 100%,13px 100%;
  mask-position:0 0,0 100%,0 0,100% 0;mask-repeat:no-repeat;mix-blend-mode:screen;filter:blur(6px);opacity:.5;
  background-color:#FF8C1A;animation:kpmGsBreath 3.7s ease-in-out infinite alternate}
@keyframes kpmGsH{from{transform:translateX(-30px)}to{transform:translateX(128px)}}
@keyframes kpmGsV{from{transform:translateY(-30px)}to{transform:translateY(128px)}}
@keyframes kpmGsHr{from{transform:translateX(26px)}to{transform:translateX(-128px)}}
@keyframes kpmGsVr{from{transform:translateY(26px)}to{transform:translateY(-128px)}}
@keyframes kpmGsBreath{from{opacity:.3}to{opacity:.66}}
@media (prefers-reduced-motion:reduce){.s-gold .hs,.s-gold .halo{animation:none}}
/* ══ REV 5 ══ Aldi: "the animation is not clear ... the animation and the border color have the
   same color make it hard to see". The bar is darkened and the spot pushed to pure white, so the
   moving light differs from the metal by VALUE, not just brightness of the same hue. */
.s-gold .bar{
  background-image:
    linear-gradient(180deg,#4A1F03 0%,#B85A0A 34%,#E07A16 50%,#B85A0A 66%,#4A1F03 100%),
    linear-gradient(0deg,#3E1A02 0%,#A85008 34%,#D06E12 50%,#A85008 66%,#3E1A02 100%),
    linear-gradient(90deg,#4A1F03 0%,#B85A0A 34%,#E07A16 50%,#B85A0A 66%,#4A1F03 100%),
    linear-gradient(270deg,#3E1A02 0%,#A85008 34%,#D06E12 50%,#A85008 66%,#3E1A02 100%);
  filter:drop-shadow(0 0 4px rgba(184,90,10,.5))}
.s-gold .baked{opacity:.45;filter:blur(3px)}
.s-gold .halo{opacity:.28}
/* the travelling spots: pure white, bigger, heavily bloomed */
.s-gold .hs{filter:blur(3px) drop-shadow(0 0 10px #FFFFFF) drop-shadow(0 0 20px rgba(255,214,150,.9))}
.s-gold .h1{width:40px;height:9px;top:0;
  background-image:radial-gradient(20px 4.5px at 50% 50%,#FFFFFF 0%,#FFFFFF 26%,rgba(255,240,214,.75) 54%,transparent 100%)}
.s-gold .h2{height:40px;width:9px;right:0;
  background-image:radial-gradient(4.5px 20px at 50% 50%,#FFFFFF 0%,#FFFFFF 26%,rgba(255,240,214,.75) 54%,transparent 100%)}
.s-gold .h3{width:34px;height:9px;bottom:0;
  background-image:radial-gradient(17px 4.5px at 50% 50%,#FFFFFF 0%,#FFFFFF 26%,rgba(255,240,214,.7) 54%,transparent 100%)}
.s-gold .h4{height:34px;width:9px;left:0;
  background-image:radial-gradient(4.5px 17px at 50% 50%,#FFFFFF 0%,#FFFFFF 26%,rgba(255,240,214,.7) 54%,transparent 100%)}

/* ===== PLATINUM — ref: corrupted grace ===== */
.s-platinum{background-color:#0A0908}
.s-platinum .lyr{position:absolute;inset:0;pointer-events:none;background-repeat:no-repeat;z-index:3}
.s-platinum .ink{
  -webkit-mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  -webkit-mask-size:100% 20px,100% 20px,20px 100%,20px 100%;
  -webkit-mask-position:0 0,0 100%,0 0,100% 0;-webkit-mask-repeat:no-repeat;
  mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  mask-size:100% 20px,100% 20px,20px 100%,20px 100%;
  mask-position:0 0,0 100%,0 0,100% 0;mask-repeat:no-repeat;background-color:#000;z-index:1}
/* the turbulence does the work — no gradient blobs pretending to be marble */
.s-platinum .cg{position:absolute;inset:0;z-index:2;pointer-events:none;
  -webkit-mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  -webkit-mask-size:100% 20px,100% 20px,20px 100%,20px 100%;
  -webkit-mask-position:0 0,0 100%,0 0,100% 0;-webkit-mask-repeat:no-repeat;
  mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  mask-size:100% 20px,100% 20px,20px 100%,20px 100%;
  mask-position:0 0,0 100%,0 0,100% 0;mask-repeat:no-repeat;
  filter:url(#cgWarp) contrast(2.4) brightness(1.1)}
.s-platinum .veins{position:absolute;inset:-24px;
  background-image:repeating-linear-gradient(58deg,#FFFFFF 0 5px,#000000 5px 11px,#FFFFFF 11px 13px,#000000 13px 22px)}
.s-platinum .edge{z-index:4;
  background-image:
    linear-gradient(180deg,#FFFFFF,#CFCBC3),linear-gradient(0deg,#FFFFFF,#CFCBC3),
    linear-gradient(90deg,#FFFFFF,#CFCBC3),linear-gradient(270deg,#FFFFFF,#CFCBC3),
    linear-gradient(180deg,#F2EFE9,#8A867F),linear-gradient(0deg,#F2EFE9,#8A867F),
    linear-gradient(90deg,#F2EFE9,#8A867F),linear-gradient(270deg,#F2EFE9,#8A867F);
  background-size:100% 2px,100% 2px,2px 100%,2px 100%,100% 1px,100% 1px,1px 100%,1px 100%;
  background-position:0 0,0 100%,0 0,100% 0,0 20px,0 calc(100% - 20px),20px 0,calc(100% - 20px) 0;
  filter:drop-shadow(0 0 6px rgba(255,255,255,.6))}
@media (prefers-reduced-motion:reduce){.s-platinum .cg{filter:url(#cgWarp) contrast(2.4)}}
/* ══ REV 5 ══ thinner, per Aldi. 20px -> 12px, rails re-seated to match. */
.s-platinum .ink,.s-platinum .cg{
  -webkit-mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  -webkit-mask-size:100% 12px,100% 12px,12px 100%,12px 100%;
  -webkit-mask-position:0 0,0 100%,0 0,100% 0;-webkit-mask-repeat:no-repeat;
  mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  mask-size:100% 12px,100% 12px,12px 100%,12px 100%;
  mask-position:0 0,0 100%,0 0,100% 0;mask-repeat:no-repeat;}
.s-platinum .veins{background-image:repeating-linear-gradient(58deg,#FFFFFF 0 3px,#000000 3px 7px,#FFFFFF 7px 8px,#000000 8px 14px)}
.s-platinum .edge{
  background-size:100% 1.5px,100% 1.5px,1.5px 100%,1.5px 100%,100% 1px,100% 1px,1px 100%,1px 100%;
  background-position:0 0,0 100%,0 0,100% 0,0 12px,0 calc(100% - 12px),12px 0,calc(100% - 12px) 0}

/* ===== DIAMOND — ref: time winder platinum ===== */
/* RANK 5 - DIAMOND. Scattered-block frame. Nothing rotates, nothing travels as a group. */
.s-diamond{
  --m1:linear-gradient(148deg,#FFFFFF 0%,#F7EEDC 28%,#C9BCA4 58%,#6E6862 100%);
  --m2:linear-gradient(28deg,#5C5751 0%,#A79C8C 42%,#F2E4C8 76%,#FFFFFF 100%);
  --m3:linear-gradient(196deg,#FFF6E6 0%,#F2E4C8 38%,#8A8078 100%);
  --m4:linear-gradient(140deg,#CFC4AF 0%,#8A8078 58%,#5C5751 100%);
  --sp:linear-gradient(120deg,#FFFFFF 0%,#FFD9A0 52%,#B98F58 100%);
  --sl:linear-gradient(90deg,rgba(242,228,200,0) 0%,rgba(242,228,200,.85) 38%,rgba(110,104,98,.12) 100%);
  --sv:linear-gradient(180deg,rgba(242,228,200,0) 0%,rgba(242,228,200,.85) 38%,rgba(110,104,98,.12) 100%);
  --v1:radial-gradient(38px 38px at 0 0,rgba(146,138,128,.42),rgba(146,138,128,0) 100%);
  --v2:radial-gradient(38px 38px at 100% 0,rgba(146,138,128,.42),rgba(146,138,128,0) 100%);
  --v3:radial-gradient(38px 38px at 100% 100%,rgba(146,138,128,.42),rgba(146,138,128,0) 100%);
  --v4:radial-gradient(38px 38px at 0 100%,rgba(146,138,128,.42),rgba(146,138,128,0) 100%);
  --bl:radial-gradient(20px 20px at 12px 12px,rgba(255,246,230,.30),rgba(255,246,230,0) 100%);
  --br:radial-gradient(20px 20px at calc(100% - 12px) calc(100% - 12px),rgba(255,246,230,.30),rgba(255,246,230,0) 100%);
}
.s-diamond .lyr{position:absolute;top:0;right:0;bottom:0;left:0;background-repeat:no-repeat;transform-origin:50% 50%;pointer-events:none}

/* --- STRUCTURE: two keylines. Pure border, so they are the one thing lite mode cannot take away. --- */
.s-diamond .k2{top:8px;right:8px;bottom:8px;left:8px;border:1px solid rgba(92,87,81,.95);border-radius:4px}
.s-diamond .k1{top:11px;right:11px;bottom:11px;left:11px;border:1px solid rgba(242,228,200,.45);border-radius:3px}

/* --- E: faint corner brackets. Slow breath under everything else. --- */
.s-diamond .e{
  opacity:.55;
  background-image:var(--sl),var(--sl),var(--sl),var(--sl),var(--sv),var(--sv),var(--sv),var(--sv);
  background-size:22px 2px,22px 2px,22px 2px,22px 2px,2px 22px,2px 22px,2px 22px,2px 22px;
  background-position:4px 11px,102px 11px,4px 115px,102px 115px,11px 4px,115px 4px,11px 102px,115px 102px;
  animation:dia5-breathE 6.3s ease-in-out -1.1s infinite
}

/* --- A: static anchors. Never animates. Big corner bars + thin mid-edge chips + corner mass. --- */
.s-diamond .a{
  background-image:
    var(--m1),var(--m4),var(--m4),var(--m2),
    var(--m2),var(--m1),
    var(--m3),var(--m4),var(--m4),var(--m1),
    var(--m1),var(--m3),
    var(--v1),var(--v2),var(--v3),var(--v4);
  background-size:
    15px 6px,8px 3px,8px 3px,15px 6px,
    6px 15px,6px 15px,
    15px 6px,8px 3px,8px 3px,15px 6px,
    6px 15px,6px 15px,
    100% 100%,100% 100%,100% 100%,100% 100%;
  background-position:
    2px 3px,50px 5px,70px 5px,111px 3px,
    119px 19px,119px 104px,
    2px 119px,50px 120px,70px 120px,111px 119px,
    3px 19px,3px 104px,
    0 0,0 0,0 0,0 0
}

/* --- B: eight 8px blocks, corner-adjacent. Period 2.2s. --- */
.s-diamond .b{
  background-image:var(--m1),var(--m3),var(--m2),var(--m1),var(--m3),var(--m1),var(--m1),var(--m2);
  background-size:8px 8px,8px 8px,8px 8px,8px 8px,8px 8px,8px 8px,8px 8px,8px 8px;
  background-position:19px 3px,101px 3px,117px 38px,117px 92px,19px 117px,101px 117px,3px 38px,3px 92px;
  animation:dia5-popB 2.2s cubic-bezier(.33,0,.2,1) -.4s infinite
}

/* --- C: bars and 4px squares, mid-ward. Period 3.1s. --- */
.s-diamond .c{
  background-image:var(--m1),var(--m2),var(--m2),var(--m1),var(--m2),var(--m1),var(--m1),var(--m2),var(--m4),var(--m4);
  background-size:10px 3px,4px 4px,10px 3px,4px 4px,10px 3px,4px 4px,10px 3px,4px 4px,3px 10px,3px 10px;
  background-position:29px 4px,30px 9px,89px 4px,94px 9px,29px 121px,30px 115px,89px 121px,94px 115px,120px 78px,5px 78px;
  animation:dia5-popC 3.1s cubic-bezier(.5,.05,.3,1) -1.9s infinite
}

/* --- D: 2-3px sparks, four corner rivets, two soft blooms. Period 4.7s. --- */
.s-diamond .d{
  background-image:
    var(--sp),var(--m1),var(--m1),var(--sp),
    var(--m1),var(--sp),var(--m1),var(--sp),
    var(--sp),var(--sp),var(--sp),var(--sp),
    var(--bl),var(--br);
  background-size:
    3px 3px,3px 3px,3px 3px,3px 3px,
    2px 5px,3px 3px,2px 5px,3px 3px,
    3px 3px,3px 3px,3px 3px,3px 3px,
    100% 100%,100% 100%;
  background-position:
    44px 6px,81px 6px,44px 119px,81px 119px,
    121px 50px,120px 71px,5px 50px,5px 71px,
    11px 11px,114px 11px,114px 114px,11px 114px,
    0 0,0 0;
  animation:dia5-popD 4.7s cubic-bezier(.4,0,.25,1) -2.6s infinite
}

/* --- H: four hollow outline blocks at the mid-edges, each on its own unrelated period. --- */
.s-diamond .h{
  box-sizing:border-box;top:auto;right:auto;bottom:auto;left:auto;
  width:9px;height:9px;border:1px solid #F2E4C8;border-radius:1px;
  background-image:linear-gradient(140deg,rgba(255,255,255,.16),rgba(110,104,98,.06));
  box-shadow:0 0 5px rgba(242,228,200,.40),inset 0 0 3px rgba(255,255,255,.30)
}
.s-diamond .h1{left:60px;top:2px;animation:dia5-chipH 3.7s cubic-bezier(.45,0,.25,1) -.9s infinite}
.s-diamond .h2{left:118px;top:59px;animation:dia5-chipH 2.9s cubic-bezier(.45,0,.25,1) -2.1s infinite}
.s-diamond .h3{left:60px;top:117px;animation:dia5-chipH 5.3s cubic-bezier(.45,0,.25,1) -3.4s infinite}
.s-diamond .h4{left:2px;top:59px;animation:dia5-chipH 4.1s cubic-bezier(.45,0,.25,1) -1.5s infinite}

/* --- MOTION: every group rests at its finished state, dips away, comes back. Uneven, multi-dip. --- */
@keyframes dia5-popB{
  0%,100%{opacity:1;transform:scale(1)}
  14%{opacity:.28;transform:scale(.955)}
  26%{opacity:1;transform:scale(1.012)}
  58%{opacity:.62;transform:scale(.985)}
  72%{opacity:1;transform:scale(1)}
}
@keyframes dia5-popC{
  0%,100%{opacity:1;transform:scale(1)}
  9%{opacity:.9;transform:scale(1.02)}
  33%{opacity:.22;transform:scale(.94)}
  47%{opacity:1;transform:scale(1.005)}
  80%{opacity:.55;transform:scale(.99)}
}
@keyframes dia5-popD{
  0%,100%{opacity:1;transform:scale(1)}
  21%{opacity:.15;transform:scale(1.06)}
  30%{opacity:.85;transform:scale(.98)}
  55%{opacity:.35;transform:scale(1.03)}
  66%{opacity:1;transform:scale(1)}
}
@keyframes dia5-breathE{
  0%,100%{opacity:.55;transform:scale(1)}
  38%{opacity:.9;transform:scale(1.008)}
  74%{opacity:.4;transform:scale(.996)}
}
@keyframes dia5-chipH{
  0%,100%{opacity:1;transform:scale(1)}
  18%{opacity:.2;transform:scale(.8)}
  27%{opacity:1;transform:scale(1.14)}
  36%{opacity:.9;transform:scale(1)}
  70%{opacity:.45;transform:scale(.9)}
  82%{opacity:1;transform:scale(1)}
}
@media (prefers-reduced-motion:reduce){
  .s-diamond .b,.s-diamond .c,.s-diamond .d,.s-diamond .e,.s-diamond .h{animation:none}
}

/* each block pops with its own light instead of just fading */
.s-diamond .blk,.s-diamond .lyr{will-change:transform,opacity}
.s-diamond [class*="blk"],.s-diamond [class*="grp"]{filter:drop-shadow(0 0 5px rgba(242,228,200,.75))}
.s-diamond .dglow{position:absolute;inset:-6px;pointer-events:none;border-radius:3px;
  box-shadow:0 0 24px 3px rgba(242,228,200,.20),0 0 48px 10px rgba(255,255,255,.08);
  animation:kpmDiaGlow 4.7s ease-in-out infinite alternate}
@keyframes kpmDiaGlow{from{opacity:.5}to{opacity:1}}
/* ── REV 2: more visible, more expensive ── */
.s-diamond .lyr,.s-diamond [class*="blk"],.s-diamond [class*="grp"]{
  filter:drop-shadow(0 0 7px rgba(255,255,255,.9)) drop-shadow(0 0 16px rgba(242,228,200,.55))}
.s-diamond .dglow{box-shadow:0 0 34px 5px rgba(242,228,200,.34),0 0 70px 16px rgba(255,255,255,.14)}
.s-diamond .swp{position:absolute;inset:-10px;z-index:4;pointer-events:none;mix-blend-mode:screen;
  filter:blur(5px);opacity:0;
  background-image:linear-gradient(115deg,transparent 34%,rgba(255,255,255,.10) 44%,#FFFFFF 50%,rgba(242,228,200,.55) 56%,transparent 66%);
  animation:kpmDiaSweep 6.4s cubic-bezier(.4,0,.2,1) infinite}
.s-diamond .brt{position:absolute;inset:0;z-index:4;pointer-events:none;
  animation:kpmDiaBreath 3.9s ease-in-out infinite alternate}
@keyframes kpmDiaSweep{0%{opacity:0;transform:translateX(-150%)}
  12%{opacity:1}52%{opacity:1}64%{opacity:0;transform:translateX(150%)}
  100%{opacity:0;transform:translateX(150%)}}
@keyframes kpmDiaBreath{from{transform:scale(1)}to{transform:scale(1.02)}}
/* REV 3: the crossing shine ("kilau melintas") is removed — Aldi called it norak. */
.s-diamond .swp{display:none !important;animation:none !important}

/* ===== MYTHIC — ref: boss warlord + diamond motion ===== */
.s-mythic{background-color:#0A0908}
.s-mythic .mbone{position:absolute;inset:0;width:128px;height:128px;overflow:visible;z-index:6;
  pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.95)) drop-shadow(0 0 9px rgba(139,43,226,.55))}
/* ONE eye, centred on 64, blinking like before */
.s-mythic .meye{transform-origin:64px 4.6px;animation:kpmMyBlink1 5.4s ease-in-out infinite;
  filter:drop-shadow(0 0 6px #FF2A18) drop-shadow(0 0 15px rgba(255,42,24,.8))}
/* violet band churning on turbulence */
.s-mythic .mvoid{position:absolute;inset:5px;z-index:3;pointer-events:none;overflow:hidden;
  filter:url(#myWarp) contrast(1.45) saturate(1.6);
  -webkit-mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  -webkit-mask-size:100% 13px,100% 13px,13px 100%,13px 100%;
  -webkit-mask-position:0 0,0 100%,0 0,100% 0;-webkit-mask-repeat:no-repeat;
  mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  mask-size:100% 13px,100% 13px,13px 100%,13px 100%;
  mask-position:0 0,0 100%,0 0,100% 0;mask-repeat:no-repeat;}
.s-mythic .mnz{position:absolute;inset:-24px;background-color:#4A0FA0;
  background-image:
    radial-gradient(42px 30px at 20% 18%,#C77DFF 0%,#7B2FD4 46%,#3B0A6B 84%),
    radial-gradient(36px 40px at 78% 42%,#A855F7 0%,#6A1FC0 50%,transparent 84%),
    radial-gradient(40px 28px at 52% 84%,#9A3AE8 0%,#4A0FA0 54%,transparent 86%);
  animation:kpmMyDrift 6.4s ease-in-out infinite alternate}
/* ── DIAMOND'S SYSTEM IN VIOLET — jagged shards snapping in and out.
      Each layer carries the frame mask, so its blur is clipped to the band. ── */
.s-mythic .mshard{position:absolute;inset:0;z-index:4;pointer-events:none;mix-blend-mode:screen;
  
  -webkit-mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  -webkit-mask-size:100% 13px,100% 13px,13px 100%,13px 100%;
  -webkit-mask-position:0 0,0 100%,0 0,100% 0;-webkit-mask-repeat:no-repeat;
  mask-image:linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000),linear-gradient(#000,#000);
  mask-size:100% 13px,100% 13px,13px 100%,13px 100%;
  mask-position:0 0,0 100%,0 0,100% 0;mask-repeat:no-repeat;filter:blur(.6px);background-repeat:no-repeat;
  animation-iteration-count:infinite;animation-timing-function:steps(1,end)}
.s-mythic .k1{animation-name:kpmShardA;animation-duration:1.7s;
  background-image:linear-gradient(#F0DCFF,#F0DCFF),linear-gradient(#A855F7,#A855F7),linear-gradient(#F0DCFF,#F0DCFF),linear-gradient(#7B2FD4,#7B2FD4),linear-gradient(#F0DCFF,#F0DCFF),linear-gradient(#A855F7,#A855F7),linear-gradient(#F0DCFF,#F0DCFF);
  background-size:9px 3px,4px 8px,13px 2px,3px 11px,6px 4px,10px 2px,3px 7px;
  background-position:14% 2px,calc(100% - 4px) 26%,58% 3px,5px 62%,82% calc(100% - 3px),30% calc(100% - 2px),calc(100% - 5px) 78%}
.s-mythic .k2{animation-name:kpmShardB;animation-duration:2.3s;animation-delay:-.7s;
  background-image:linear-gradient(#A855F7,#A855F7),linear-gradient(#F0DCFF,#F0DCFF),linear-gradient(#7B2FD4,#7B2FD4),linear-gradient(#F0DCFF,#F0DCFF),linear-gradient(#A855F7,#A855F7),linear-gradient(#F0DCFF,#F0DCFF);
  background-size:5px 3px,11px 2px,4px 9px,2px 12px,8px 3px,7px 2px;
  background-position:38% 4px,72% 2px,4px 30%,calc(100% - 3px) 54%,12% calc(100% - 4px),64% calc(100% - 3px)}
.s-mythic .k3{animation-name:kpmShardC;animation-duration:3.1s;animation-delay:-1.9s;
  background-image:linear-gradient(#F0DCFF,#F0DCFF),linear-gradient(#7B2FD4,#7B2FD4),linear-gradient(#A855F7,#A855F7),linear-gradient(#F0DCFF,#F0DCFF),linear-gradient(#A855F7,#A855F7),linear-gradient(#F0DCFF,#F0DCFF);
  background-size:3px 6px,14px 2px,4px 10px,6px 3px,9px 2px,3px 8px;
  background-position:6px 14%,26% 3px,calc(100% - 5px) 12%,90% 4px,46% calc(100% - 4px),5px 86%}
.s-mythic .k4{animation-name:kpmShardD;animation-duration:4.3s;animation-delay:-3.1s;
  background-image:linear-gradient(#A855F7,#A855F7),linear-gradient(#F0DCFF,#F0DCFF),linear-gradient(#F0DCFF,#F0DCFF),linear-gradient(#7B2FD4,#7B2FD4),linear-gradient(#A855F7,#A855F7),linear-gradient(#F0DCFF,#F0DCFF),linear-gradient(#F0DCFF,#F0DCFF);
  background-size:7px 2px,3px 5px,12px 3px,2px 9px,5px 3px,10px 2px,4px 6px;
  background-position:52% 2px,calc(100% - 4px) 40%,20% calc(100% - 3px),4px 46%,88% 3px,76% calc(100% - 4px),6px 70%}
/* the escaping comets and the old boil layers are gone for good */
.s-mythic .msoul,.s-mythic .mboil,.s-mythic .mscan{display:none !important}
@keyframes kpmShardA{0%{opacity:1}22%{opacity:.15}38%{opacity:1}61%{opacity:.35}79%{opacity:1}100%{opacity:.5}}
@keyframes kpmShardB{0%{opacity:.25}18%{opacity:1}44%{opacity:.2}67%{opacity:1}88%{opacity:.4}100%{opacity:.25}}
@keyframes kpmShardC{0%{opacity:1}26%{opacity:.3}49%{opacity:1}72%{opacity:.18}91%{opacity:.85}100%{opacity:1}}
@keyframes kpmShardD{0%{opacity:.4}31%{opacity:1}55%{opacity:.22}74%{opacity:.9}96%{opacity:.3}100%{opacity:.4}}
@keyframes kpmMyBlink1{
  0%{transform:scaleY(1)}54%{transform:scaleY(1)}
  58%{transform:scaleY(.08)}62%{transform:scaleY(1)}
  84%{transform:scaleY(1)}87%{transform:scaleY(.35)}90%{transform:scaleY(1)}100%{transform:scaleY(1)}}
@keyframes kpmMyDrift{
  0%{transform:translate(-5px,3px) scale(1)}27%{transform:translate(3px,-3px) scale(1.09)}
  54%{transform:translate(6px,4px) scale(1.02)}79%{transform:translate(-2px,-4px) scale(1.12)}
  100%{transform:translate(-5px,3px) scale(1.05)}}
@media (prefers-reduced-motion:reduce){
  .s-mythic .mshard,.s-mythic .mnz,.s-mythic .meye{animation:none}
  .s-mythic .mshard{opacity:.85}}

.foot{margin-top:60px;padding-top:16px;border-top:1px solid var(--line);
  font-family:var(--fM);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);
  display:flex;gap:20px;flex-wrap:wrap}
.ask{margin-top:52px;border:1px solid var(--orange);padding:22px;background:
  linear-gradient(180deg,rgba(255,140,26,.07),transparent)}
.ask h3{font-family:var(--fD);font-stretch:condensed;text-transform:uppercase;font-size:21px;letter-spacing:.03em}
.ask ul{margin:12px 0 0;padding:0;list-style:none;display:grid;gap:10px}
.ask li{display:flex;gap:11px;font-size:13.5px}
.ask li::before{content:"\\25C7";color:var(--orange);flex:none}

`;

/* feTurbulence / feDisplacementMap filters. Platinum's marble and Mythic's violet churn
 * reference these by id, so this must be mounted once anywhere a frame renders. */

export const FrameFilters = () => (
<svg width="0" height="0" style={{position: 'absolute'}} aria-hidden="true" focusable="false">
  <defs>
    {/* corrupted grace: fractal noise displaces a hard band into flowing marble veins.
         Both the noise frequency and the displacement scale animate, on unrelated periods. */}
    <filter id="cgWarp" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.015 0.05" numOctaves="3" seed="11" result="n">
        <animate attributeName="baseFrequency" dur="7.4s" repeatCount="indefinite"
                 values="0.015 0.05;0.031 0.086;0.021 0.062;0.015 0.05"/>
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="n" xChannelSelector="R" yChannelSelector="G" scale="22">
        <animate attributeName="scale" dur="4.6s" repeatCount="indefinite" values="15;31;20;15"/>
      </feDisplacementMap>
    </filter>
    {/* boss warlord: the same technique churns the purple energy field. */}
    <filter id="myWarp" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.022 0.034" numOctaves="4" seed="5" result="n">
        <animate attributeName="baseFrequency" dur="7.2s" repeatCount="indefinite"
                 values="0.022 0.034;0.041 0.058;0.028 0.04;0.022 0.034"/>
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="n" xChannelSelector="R" yChannelSelector="B" scale="18">
        <animate attributeName="scale" dur="4.6s" repeatCount="indefinite" values="12;26;16;12"/>
      </feDisplacementMap>
    </filter>
  </defs>
</svg>
);

const FRAME_HTML = {
  "bronze": "<div class=\"lyr beams\"></div><div class=\"lyr grain\"></div><div class=\"lyr wear\"></div><div class=\"lyr joints\"></div><div class=\"lyr iron\"></div><div class=\"lyr rim\"></div>",
  "silver": "<div class=\"lyr plate\"></div><div class=\"lyr railo\"></div><div class=\"lyr raili\"></div><div class=\"lyr corners\"></div><div class=\"glw\"><div class=\"gl gT\"></div><div class=\"gl gR\"></div><div class=\"gl gB\"></div><div class=\"gl gL\"></div></div><div class=\"hv bloom\"></div>",
  "gold": "<div class=\"lyr bed\"></div><div class=\"lyr bar\"></div><div class=\"lyr baked\"></div><div class=\"glw\"><div class=\"hs h1\"></div><div class=\"hs h2\"></div><div class=\"hs h3\"></div><div class=\"hs h4\"></div></div><div class=\"lyr halo\"></div>",
  "platinum": "<div class=\"lyr ink\"></div><div class=\"cg\"><div class=\"veins\"></div></div><div class=\"lyr edge\"></div>",
  "diamond": "<div class=\"lyr k2\"></div><div class=\"lyr k1\"></div><div class=\"lyr e\"></div><div class=\"lyr a\"></div><div class=\"lyr b\"></div><div class=\"lyr c\"></div><div class=\"lyr d\"></div><div class=\"lyr h h1\"></div><div class=\"lyr h h2\"></div><div class=\"lyr h h3\"></div><div class=\"lyr h h4\"></div><div class=\"hv dglow\"></div><div class=\"brt\"></div>",
  "mythic": "<div class=\"mvoid\"><div class=\"mnz\"></div></div>\n<div class=\"mshard k1\"></div><div class=\"mshard k2\"></div><div class=\"mshard k3\"></div><div class=\"mshard k4\"></div>\n<svg class=\"mbone\" viewBox=\"0 0 128 128\" aria-hidden=\"true\">\n  <defs>\n    <linearGradient id=\"myBone\" x1=\"0\" y1=\"0\" x2=\"0.2\" y2=\"1\">\n      <stop offset=\"0\" stop-color=\"#F4EAD0\"/><stop offset=\".3\" stop-color=\"#DCC79A\"/>\n      <stop offset=\".66\" stop-color=\"#A88C5C\"/><stop offset=\"1\" stop-color=\"#6B5634\"/>\n    </linearGradient>\n    <radialGradient id=\"myRed\" cx=\".5\" cy=\".42\" r=\".62\">\n      <stop offset=\"0\" stop-color=\"#FFE4DE\"/><stop offset=\".26\" stop-color=\"#FF2A18\"/>\n      <stop offset=\".62\" stop-color=\"#9E0C06\"/><stop offset=\"1\" stop-color=\"#2A0202\"/>\n    </radialGradient>\n    <g id=\"myTal\">\n      <path d=\"M3 40 L3 14 Q3 3 14 3 L40 3 L40 8 L17 8 Q8 8 8 17 L8 40 Z\" fill=\"url(#myBone)\" stroke=\"#2A2318\" stroke-width=\".7\"/>\n      <path d=\"M8 24 Q0 18 -5 8 Q4 14 10 16 Z\" fill=\"url(#myBone)\" stroke=\"#2A2318\" stroke-width=\".6\"/>\n      <path d=\"M24 8 Q18 0 8 -5 Q14 4 16 10 Z\" fill=\"url(#myBone)\" stroke=\"#2A2318\" stroke-width=\".6\"/>\n      <path d=\"M11 11 L22 11 L11 22 Z\" fill=\"url(#myBone)\" stroke=\"#2A2318\" stroke-width=\".5\"/>\n    </g>\n  </defs>\n  <use href=\"#myTal\"/>\n  <use href=\"#myTal\" transform=\"translate(128,0) scale(-1,1)\"/>\n  <use href=\"#myTal\" transform=\"translate(0,128) scale(1,-1)\"/>\n  <use href=\"#myTal\" transform=\"translate(128,128) scale(-1,-1)\"/>\n  <rect x=\"3.5\" y=\"3.5\" width=\"121\" height=\"121\" fill=\"none\" stroke=\"url(#myBone)\" stroke-width=\"2.2\"/>\n  <rect x=\"3.5\" y=\"3.5\" width=\"121\" height=\"121\" fill=\"none\" stroke=\"#2A2318\" stroke-width=\".6\"/>\n  <!-- SOCKET: the eye is set INTO the rail so it reads as part of the frame, not stuck on it -->\n  <path d=\"M50 4 L56 -4 L72 -4 L78 4 L74 12 L54 12 Z\" fill=\"url(#myBone)\" stroke=\"#2A2318\" stroke-width=\".8\"/>\n  <path d=\"M56 -1 L72 -1 L70 3 L58 3 Z\" fill=\"#2A2318\" opacity=\".5\"/>\n  <g class=\"meye\">\n    <ellipse cx=\"64\" cy=\"4.6\" rx=\"7.4\" ry=\"4.6\" fill=\"url(#myRed)\"/>\n    <ellipse cx=\"64\" cy=\"4.6\" rx=\"1.9\" ry=\"3.7\" fill=\"#180000\"/>\n  </g>\n  <path d=\"M64 118 L69 124 L64 129 L59 124 Z\" fill=\"url(#myRed)\" stroke=\"#2A2318\" stroke-width=\".6\"/>\n</svg>"
};

export const BORDER_LOAD = { light: 'Ringan', medium: 'Sedang' };

export const RANK_BORDERS = [
  { id: "bronze", name: "Bronze", cost: "light", desc: "Balok kayu tipis, serat kayu, mata kayu, braket besi. Tanpa animasi." },
  { id: "silver", name: "Silver", cost: "light", desc: "Rel baja ganda, kilau putih berjalan menyusuri bentuk bingkai \u2014 tidak keluar tepi." },
  { id: "gold", name: "Gold", cost: "light", desc: "Batang emas gelap, titik putih menyala terang hanyut di sepanjang tepi \u2014 kontras jelas." },
  { id: "platinum", name: "Platinum", cost: "medium", desc: "Marmer korupsi hitam-putih mengalir dalam pita tipis, ditahan rel putih tajam." },
  { id: "diamond", name: "Diamond", cost: "medium", desc: "Blok-blok berserak menyusun bingkai, muncul-hilang tegas. Tanpa kilau melintas." },
  { id: "mythic", name: "Mythic", cost: "medium", desc: "Bingkai tulang simetris, satu mata merah menyatu di puncak, pecahan ungu berkedip sepanjang pita \u2014 tidak ada yang keluar bingkai." }
];


/* `index` and `hex` are accepted and ignored. The old circular rings tinted themselves from the
 * rank's hex, but these frames are materials - wood, steel, gold, marble - and recolouring them
 * destroys the thing that makes them read as materials. Unknown ids fall back to Bronze so a rank
 * still carrying an old id ('classic', 'gyro') renders something sane instead of nothing. */
export const RankBorder = ({ styleId }) => {
  const entry = RANK_BORDERS.find(b => b.id === styleId) || RANK_BORDERS[0];
  return (
    <div
      className={`sframe s-${entry.id}`}
      /* background MUST stay transparent. Five of the six frame roots carry
       * `background-color:#0A0908` in the ported CSS — in the artifact the avatar lived INSIDE
       * this div so the fill sat behind it, but here the photo well is a sibling underneath,
       * and that fill painted straight over the photo. Diamond was the only frame that worked,
       * purely because its root declares CSS vars and no background-color. Inline style beats
       * the class rule, which keeps the ported CSS byte-identical to what was approved. */
      style={{ position: 'absolute', top: 0, left: 0, background: 'transparent' }}
      dangerouslySetInnerHTML={{ __html: FRAME_HTML[entry.id] }}
    />
  );
};

export default RankBorder;
