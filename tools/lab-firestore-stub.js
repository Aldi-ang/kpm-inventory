/* A Firestore stand-in, aliased over `firebase/firestore` by tools/ponder-lab.config.mjs and by
   nothing else. The app never sees this file.

   Why it exists: `BranchWarehouseManager` is the branch screen, and its listener returns early
   when `masterUserId` is missing — so mounting it with `db={null}` renders a permanent "Loading
   Logistics Logs..." and an empty shelf. A harness that can only show empty states measures the
   harness, not the screen. This serves fixtures to the REAL component through the REAL listener,
   so what appears is what a branch admin sees.

   Writes are no-ops that resolve. Nothing here talks to a network, and nothing here is bundled
   into dist/. */

/* A fixture that is an ARRAY is a collection; a plain OBJECT is one document (`docSnap.exists()`
   / `.data()`), which is what `AgentInventoryView` listens to — `onSnapshot(doc(...))`. With no
   fixture a document listener resolves `exists() === false`, the same as a van never loaded. */
const snap = (rows) => Array.isArray(rows)
  ? {
      docs: rows.map(({ id, ...rest }) => ({ id, data: () => rest })),
      empty: rows.length === 0,
      exists: () => false, data: () => ({}),
    }
  : { exists: () => true, data: () => rows, docs: [], empty: true };

/* Keyed by the tail of the collection path, because the lab's appId and masterUserId are made up
   and the prefix is therefore meaningless. */
/* a shooter can seed it before the page runs (globalThis.__labFixtures, set on a new document), so a listener that
   subscribes on mount - the geofence requests, say - already has rows; a later import would lose that race */
export const FIXTURES = globalThis.__labFixtures || {};

export const collection = (_db, path) => ({ path });
/* like the real one, the id segments join the path — so a document fixture can be keyed
   `motorists/m2` and never collide with a `motorists` collection fixture */
export const doc = (_db, path, ...segs) => ({ path: [path, ...segs].join('/') });

export const onSnapshot = (ref, cb) => {
  const path = (ref && ref.path) || '';
  const key = Object.keys(FIXTURES).find((k) => path.endsWith(k));
  /* Asynchronously, like the real one: a synchronous first callback would set state during
     render and hide any effect-ordering bug this harness is supposed to be able to show. */
  setTimeout(() => cb(snap(key ? FIXTURES[key] : [])), 0);
  return () => {};
};

/* 2026-09-22 — WRITES ARE RECORDED, READS SERVE THE FIXTURES. Still no network and still nothing
   persists: a write lands in `globalThis.__labWrites` (`{ op, path, data }`) so a money path can be
   driven through the REAL engine and the update it would have sent can be read back — his "can u do
   your test yourself". `getDoc` / `runTransaction`'s get / `getDocs` answer from FIXTURES by the
   same path-suffix rule as onSnapshot, so an engine loop that reads a product first has a product. */
const noop = () => {};
const writes = () => (globalThis.__labWrites = globalThis.__labWrites || []);
const record = (op) => (ref, data) => { writes().push({ op, path: (ref && ref.path) || '', data }); };
const found = (ref) => { const path = (ref && ref.path) || ''; const key = Object.keys(FIXTURES).find((k) => path.endsWith(k)); return key ? snap(FIXTURES[key]) : null; };
export const writeBatch = () => ({ set: record('set'), update: record('update'), delete: record('delete'), commit: async () => {} });
export const runTransaction = async (_db, fn) =>
  fn({ get: async (ref) => found(ref) || { exists: () => false, data: () => ({}) }, set: record('set'), update: record('update') });
export const updateDoc = async (ref, data) => { record('update')(ref, data); };
export const deleteDoc = async () => {};
export const deleteField = () => undefined;
export const serverTimestamp = () => ({ seconds: Math.floor(Date.now() / 1000) });
export const increment = (n) => n;
export const arrayUnion = (...v) => v;
export const getDoc = async (ref) => found(ref) || { exists: () => false, data: () => ({}) };
export const setDoc = async () => {};
export const query = (r) => r;
export const where = () => ({});
export const orderBy = () => ({});
export const getDocs = async (ref) => found(ref) || snap([]);
export const addDoc = async (ref) => ({ id: `lab-${Date.now()}`, path: (ref && ref.path) || "" });
