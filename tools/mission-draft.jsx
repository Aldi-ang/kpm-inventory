/* LAB ONLY - mounts the REAL demo bar and its mission line (src/components/DemoMission.jsx, built 2026-10-25 from his
   picks) over the real shell, for frames. Nothing here ships.
     ?shell&places&tab=kirim&mission[&done=1,2][&as=T4]
   done = the steps already saved today (fixture numbers), as = which demo person is signed in (T2 default). Press
   PETUNJUK for the capybara, then "Tunjukkan tempatnya" for the square. */
import React from 'react';
import { DemoBar } from '../src/components/DemoFrontDoor.jsx';
import { missionDay } from '../src/config/demoMission.js';

const SAVED = { 1: { qty: 120 }, 2: { qty: 120, to: 'BANDUNG' }, 3: { qty: 40, who: 'DIKA SAPUTRA' } };
const EMAIL = { T2: 'demo.owner@example.com', T4: 'demo.regional@example.com', T6: 'demo.motorist@example.com' };

export default function MissionDraft() {
    const qs = new URLSearchParams(window.location.search);
    /* written before the mission mounts, so its first read sees this day's fixture */
    const done = Object.fromEntries((qs.get('done') || '').split(',').filter((n) => SAVED[n]).map((n) => [n, SAVED[n]]));
    if (qs.has('done')) try { localStorage.setItem('kpm-demo-mission', JSON.stringify({ day: missionDay(Date.now()), done })); } catch { /* lab */ }
    /* &gate = the Master Vault password screen is still up: the bar shows, the mission must not */
    return <DemoBar user={{ email: EMAIL[qs.get('as') || 'T2'] }} inside={!qs.has('gate')} />;
}
