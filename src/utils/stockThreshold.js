import { convertToBks } from './helpers';

/* WHAT COUNTS AS LOW — one place, because it used to be seven.
   ────────────────────────────────────────────────────────────────────────────
   Aldi, 2026-08-25: *"few bal is considered as low not BKS bruh, but we should add option and
   setting to edit what considered as low to the company"*. Two separate faults sat behind that:

   1. THE FALLBACK DISAGREED WITH ITSELF. A product with no `minStock` of its own fell back to a
      number typed straight into the file, and the number was not the same everywhere:
        50  in App.jsx (lowStockItems), useTransactionEngine, MerchantSalesView,
            ResidentEvilInventory
         5  in DashboardView and StockOpnameView
      So the Dashboard only called something low when it was TEN TIMES worse than the rest of the
      app thought. That is most of why the alert panel felt useless — it was quiet when it should
      not have been.

   2. THE UNIT WAS WRONG FOR THE BUSINESS. Stock is stored in Bks because that is the atom every
      conversion resolves to, but nobody running a distributor thinks in Bks. "50" meant fifty
      packs, which for a product packed 10×20 is a quarter of one Bal — a threshold that fires
      only once the shelf is already empty.

   THE RULE NOW: a product is low when its stock reaches its own MIN. ALERT if one is set, and
   otherwise the COMPANY DEFAULT, which Aldi sets as a quantity plus a unit (Bal, Karton, Slop or
   Bks) and which is converted per product using that product's own packing. Two products with
   different slops-per-bal get different Bks thresholds from the same "3 Bal" setting, which is
   the entire point of storing it as a unit rather than a number.

   ⚠️ `product.minStock` stays in BKS. It is compared against `product.stock`, which is Bks, and
   every existing product already carries a value in that unit — reinterpreting the field would
   silently move every threshold a user has already set. The company default is the only part
   that speaks units.                                                                          */

export const DEFAULT_MIN_QTY  = 3;
export const DEFAULT_MIN_UNIT = 'Bal';
export const MIN_STOCK_UNITS  = ['Bal', 'Karton', 'Slop', 'Bks'];

/* The threshold for ONE product, in Bks, ready to compare against `product.stock`. */
export const minStockBks = (product, appSettings) => {
  const own = Number(product?.minStock);
  if (Number.isFinite(own) && own > 0) return own;

  const qty  = Number(appSettings?.defaultMinStockQty);
  const unit = MIN_STOCK_UNITS.includes(appSettings?.defaultMinStockUnit)
    ? appSettings.defaultMinStockUnit
    : DEFAULT_MIN_UNIT;

  return convertToBks(Number.isFinite(qty) && qty > 0 ? qty : DEFAULT_MIN_QTY, unit, product || {});
};

export const isLowStock = (product, appSettings) =>
  Number(product?.stock || 0) <= minStockBks(product, appSettings);

/* HOW LONG THE SHELF LASTS, in days, at the speed it has actually been selling.
   Aldi's call, 2026-08-25: this does NOT decide what is low — "under X Bal" does. It only ORDERS
   the alert panel, so the thing that runs out first sits at the top. A product with no sales in
   the window returns Infinity and therefore sorts last, which is correct: nothing is selling it,
   so nothing is running out.
   ⚠️ Both arguments must be in the SAME unit. Bks in, Bks per day in. */
export const daysOfCover = (stockBks, soldBksPerDay) => {
  const per = Number(soldBksPerDay);
  if (!Number.isFinite(per) || per <= 0) return Infinity;
  return Math.max(0, Number(stockBks) || 0) / per;
};
