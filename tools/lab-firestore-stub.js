/* A Firestore stand-in, aliased over `firebase/firestore` by tools/ponder-lab.config.mjs and by
   nothing else. The app never sees this file.

   Why it exists: `BranchWarehouseManager` is the branch screen, and its listener returns early
   when `masterUserId` is missing — so mounting it with `db={null}` renders a permanent "Loading
   Logistics Logs..." and an empty shelf. A harness that can only show empty states measures the
   harness, not the screen. This serves fixtures to the REAL component through the REAL listener,
   so what appears is what a branch admin sees.

   Writes are no-ops that resolve. Nothing here talks to a network, and nothing here is bundled
   into dist/. */

const snap = (rows) => ({
  docs: rows.map(({ id, ...rest }) => ({ id, data: () => rest })),
  empty: rows.length === 0,
});

/* Keyed by the tail of the collection path, because the lab's appId and masterUserId are made up
   and the prefix is therefore meaningless. */
export const FIXTURES = {};

export const collection = (_db, path) => ({ path });
export const doc = (_db, path) => ({ path });

export const onSnapshot = (ref, cb) => {
  const path = (ref && ref.path) || '';
  const key = Object.keys(FIXTURES).find((k) => path.endsWith(k));
  /* Asynchronously, like the real one: a synchronous first callback would set state during
     render and hide any effect-ordering bug this harness is supposed to be able to show. */
  setTimeout(() => cb(snap(key ? FIXTURES[key] : [])), 0);
  return () => {};
};

const noop = () => {};
export const writeBatch = () => ({ set: noop, update: noop, delete: noop, commit: async () => {} });
export const runTransaction = async (_db, fn) =>
  fn({ get: async () => ({ exists: () => false, data: () => ({}) }), set: noop, update: noop });
export const updateDoc = async () => {};
export const deleteDoc = async () => {};
export const serverTimestamp = () => ({ seconds: Math.floor(Date.now() / 1000) });
export const increment = (n) => n;
export const arrayUnion = (...v) => v;
export const getDoc = async () => ({ exists: () => false, data: () => ({}) });
export const setDoc = async () => {};
export const query = (r) => r;
export const where = () => ({});
export const orderBy = () => ({});
export const getDocs = async () => snap([]);
