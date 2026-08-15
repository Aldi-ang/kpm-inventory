/* THE RECEIPT WATERMARK'S GEOMETRY, IN ONE PLACE.
 *
 * Two screens draw this mark: the real A4 nota in HistoryReportView, and the preview behind
 * the "View receipt" button in Settings. The preview exists so Aldi can check the mark without
 * printing — which it can only do if it is telling the truth. Two copies of these numbers would
 * drift the first time one of them was nudged, and a preview that lies about the thing it is
 * previewing is worse than having no preview at all: he would trust it and print the wrong page.
 *
 * The picture itself is `appSettings.receiptWatermark`, a data: URI produced by the crop tool.
 * `|| appSettings.mascotImage` is a migration, not a default — the picture lived under that name
 * until 2026-08-15, when it also doubled as the mascot's face. See App.jsx for why they split.
 */

/* His pick between the two shapes offered, 2026-08-15: *"B is good enough"* — a small corner
 * mark, not a faint wash across the page. 64px against an 800px-wide page is ~8% of the width:
 * present enough to read as deliberate, small enough that nothing on the nota has to move.
 *
 * ⚠️ INLINE STYLE, NOT A CLASS, AND THAT IS DELIBERATE. Printing CLONES the nota node into a
 * fresh window and carries the parent's stylesheets along — where a print stylesheet is entirely
 * free to override a utility class's opacity. An inline style is the one thing that survives
 * that trip intact. `printColorAdjust` stops the browser from "helpfully" dropping the ink.
 */
export const WATERMARK_STYLE = {
  width: '64px',
  height: '64px',
  objectFit: 'contain',
  opacity: 0.28,
  WebkitPrintColorAdjust: 'exact',
  printColorAdjust: 'exact',
};

/* the corner it sits in. Bottom-right of the PAGE — on the A4 nota that means inside
 * `.a4-print-jail`, which is the sheet itself, NOT the modal shell around it. Anchoring it to
 * the shell put it level with the action buttons instead of on the paper. */
export const WATERMARK_POSITION = 'absolute bottom-8 right-8 pointer-events-none select-none';

/** the picture to print, or undefined when he has never set one — in which case nothing renders
 *  and the nota is exactly as it was. */
export const watermarkFrom = (appSettings) =>
  appSettings?.receiptWatermark || appSettings?.mascotImage;
