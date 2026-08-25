/* HARI · MINGGU · BULAN · TAHUN — the window, in one place.
   ────────────────────────────────────────────────────────────────────────────
   Aldi, 2026-08-25: *"i want to see daily week, month and year only, dont use total"*.

   Two panels read this: the live panel computes omzet, laba, margin and the mix inside the
   window, and the velocity list ranks products inside the same one. If each worked out its own
   boundaries they would eventually disagree, and the failure would be silent — a velocity list
   headed "BULAN INI" quietly counting a different month than the figure above it. There is no
   check that could catch that from the outside, so there is one function instead.

   ⚠️ MINGGU IS A ROLLING SEVEN DAYS, not Monday-to-Sunday. A calendar week is empty on a Monday
   morning and the dashboard would say the business had collapsed. Rolling always has seven days
   of history in it, which is what makes "vs sebelumnya" mean anything on a Monday.

   ⚠️ `buckets` is how many slots the period HAS; `done` is how many have happened. The chart line
   stops short of the right edge by the difference, which is how the screen says "6 hari lagi"
   without printing it. On minggu the two are equal — a rolling window is always full.          */

const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export const PERIODS = [
    { key: 'hari',   label: 'Hari',   title: 'Hari ini',        unit: 'jam' },
    { key: 'minggu', label: 'Minggu', title: '7 hari terakhir', unit: 'hari' },
    { key: 'bulan',  label: 'Bulan',  title: 'Bulan ini',       unit: 'tanggal' },
    { key: 'tahun',  label: 'Tahun',  title: 'Tahun ini',       unit: 'bulan' },
];

export const periodMeta = (period) =>
    PERIODS.find(p => p.key === period) || PERIODS[2];

export const periodWindow = (period, now = new Date()) => {
    const meta = periodMeta(period);

    if (period === 'hari') {
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        return {
            ...meta, start, prevStart: new Date(start.getTime() - DAY),
            buckets: 24, done: now.getHours() + 1,
            bucketOf: (d) => d.getHours(),
            tickOf: (i) => `${String(i).padStart(2, '0')}:00`,
        };
    }

    if (period === 'minggu') {
        const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
        const start = new Date(midnight.getTime() - 6 * DAY);
        return {
            ...meta, start, prevStart: new Date(start.getTime() - 7 * DAY),
            buckets: 7, done: 7,
            bucketOf: (d) => Math.floor((d.getTime() - start.getTime()) / DAY),
            tickOf: (i) => {
                const d = new Date(start.getTime() + i * DAY);
                return `${d.getDate()}/${d.getMonth() + 1}`;
            },
        };
    }

    if (period === 'tahun') {
        return {
            ...meta,
            start: new Date(now.getFullYear(), 0, 1),
            prevStart: new Date(now.getFullYear() - 1, 0, 1),
            buckets: 12, done: now.getMonth() + 1,
            bucketOf: (d) => d.getMonth(),
            tickOf: (i) => MONTHS[i],
        };
    }

    return {
        ...meta,
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        prevStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        /* the real length of THIS month — day 0 of next month is the last day of this one */
        buckets: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
        done: now.getDate(),
        bucketOf: (d) => d.getDate() - 1,
        tickOf: (i) => `Tanggal ${i + 1}`,
    };
};

/* how many days the window covers, for turning a period total into a per-day rate */
export const periodDays = (period, w) => {
    if (period === 'hari')   return Math.max(1 / 24, w.done / 24);
    if (period === 'minggu') return 7;
    if (period === 'tahun')  return w.done * 30.44;
    return Math.max(1, w.done);
};

export const txDate = (t) =>
    new Date(t.timestamp?.seconds ? t.timestamp.seconds * 1000 : t.date);
