/* WHERE HIS MAP BORDERS LIVE, for everything that copies them: the two backups and the restore (App.jsx),
   the share import, the demo seed (tools/demo-seed-from-backup.mjs) and the demo reset (api/_demoCompany.js).

   The Map System saves a border at users/<owner>/mapSettings/bnd_<border id> and loads only the bnd_ docs
   (MapMissionControl.jsx saveBoundaryToFirebase / the mapSettings getDocs). Both backups used to read a
   `mapBorders` folder that nothing ever writes, so no backup held a single border (found 2026-10-13). */

/* Firestore docs of mapSettings -> the borders, each with its own id (the doc id minus bnd_). Other docs in
   that folder (agentColors) are not borders. */
export const bordersFromDocs = (docs) => docs.filter((d) => d.id.startsWith('bnd_')).map((d) => ({ ...d.data(), id: d.id.slice(4) }));

/* the doc a border is written back to - the Map System's own name for it */
export const borderDocId = (b) => `bnd_${b.id}`;

/* the borders in a backup file: `mapBorders` now; `mapSettings` in the oldest files (the id there is already the
   border's own). Anything without a shape is not a border the map can draw. */
export const restorableBorders = (data) => [...(data?.mapBorders || []), ...(data?.mapSettings || [])].filter((b) => b && b.id && b.geometryString);
