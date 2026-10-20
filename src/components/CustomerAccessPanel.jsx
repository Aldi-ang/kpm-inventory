import React, { useMemo, useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ChevronRight } from 'lucide-react';
import { confirmAction } from './ConfirmGate.jsx';
import { notify } from './Toast.jsx';
import { ACCESS_DOC_ID, folderTree, kabKey, teamOf, seesEveryShop, isTeamAdminRole, tickState } from '../utils/customerAccess.js';

/* SETTINGS > CUSTOMER ACCESS (P2). His pick 2026-10-20 09:29: *"i think it should be inside the setting"*.
   Per regional team (a Fleet & Roster branch): tick the Kecamatan its people may see - a Kabupaten or Provinsi tick
   ticks everything inside it, each can be unticked - and one switch for the admin, one for the team. The rules
   (CHANGE 17) are the guard; this screen only writes settings/customer_access. Nothing changes until "On". */

const OFF_IDS = ['ADMIN_VEHICLE', 'VAULT', 'ADMIN', 'master_owner'];

/* one tick box: 44px target, the box carries the state; 'some' = part of what is inside is ticked */
function Tick({ state, onClick, label }) {
    return (
        <button type="button" className="kpm-tick" role="checkbox" aria-checked={state === 'all' ? true : state === 'some' ? 'mixed' : false}
            aria-label={label} onClick={onClick}>
            <span data-state={state} aria-hidden="true" />
        </button>
    );
}

export default function CustomerAccessPanel({ db, appId, userId, user, customers = [], motorists = [], access = null, triggerCapy }) {
    const saved = access || {};
    const { tree, unfiled } = useMemo(() => folderTree(customers), [customers]);

    /* the teams: every branch with a T3-T6 on the roster, plus any team already saved (so it can be cleared) */
    const teams = useMemo(() => {
        const byTeam = {};
        for (const m of motorists || []) {
            if (!m || OFF_IDS.includes(m.id) || seesEveryShop(m.userRole)) continue;
            const t = teamOf(m.location);
            (byTeam[t] ||= { team: t, admins: [], people: 0 }).people++;
            if (isTeamAdminRole(m.userRole)) byTeam[t].admins.push(m.name || m.agentName || 'admin');
        }
        for (const t of Object.keys(saved.teams || {})) byTeam[t] ||= { team: t, admins: [], people: 0 };
        return Object.values(byTeam).sort((a, b) => a.team.localeCompare(b.team));
    }, [motorists, saved.teams]);

    const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(saved.teams || {})));
    const [pick, setPick] = useState(null);
    const [openProv, setOpenProv] = useState({});
    const [openKab, setOpenKab] = useState({});
    const [busy, setBusy] = useState(false);
    const team = pick && teams.some(t => t.team === pick) ? pick : teams[0]?.team;
    const grant = draft[team] || {};
    const areas = grant.areas || {};
    /* the doc can land after the first paint (or change on another phone): take it in unless he has unsaved ticks */
    const savedJson = JSON.stringify(saved.teams || {});
    const [base, setBase] = useState(savedJson);
    if (savedJson !== base) { setBase(savedJson); if (JSON.stringify(draft) === base) setDraft(JSON.parse(savedJson)); }
    const dirty = JSON.stringify(draft) !== savedJson;

    /* folders on screen = the shops' folders + any tick saved for a folder that has no shop now */
    const shown = useMemo(() => {
        const t = JSON.parse(JSON.stringify(tree));
        for (const g of Object.values(draft)) for (const [key, kecs] of Object.entries(g?.areas || {})) {
            const cut = key.indexOf('|');
            const kab = ((t[key.slice(0, cut)] ||= {})[key.slice(cut + 1)] ||= {});
            for (const k of kecs || []) kab[k] ??= 0;
        }
        return t;
    }, [tree, draft]);

    const setGrant = (next) => setDraft(d => ({ ...d, [team]: { adminEdit: true, teamEdit: false, ...d[team], ...next } }));
    const setKecs = (changes) => {   // changes: { 'PROV|KAB': [kecs] | null }
        const next = { ...areas };
        for (const [key, list] of Object.entries(changes)) { if (list && list.length) next[key] = list; else delete next[key]; }
        setGrant({ areas: next });
    };
    const kabTicked = (p, k) => (areas[kabKey(p, k)] || []).filter(x => x in (shown[p]?.[k] || {})).length;
    const toggleKec = (p, k, kec) => {
        const cur = areas[kabKey(p, k)] || [];
        setKecs({ [kabKey(p, k)]: cur.includes(kec) ? cur.filter(x => x !== kec) : [...cur, kec].sort() });
    };
    const toggleKab = (p, k) => {
        const all = Object.keys(shown[p][k]);
        setKecs({ [kabKey(p, k)]: kabTicked(p, k) >= all.length ? null : all.sort() });
    };
    const toggleProv = (p) => {
        const kabs = Object.keys(shown[p]);
        const total = kabs.reduce((n, k) => n + Object.keys(shown[p][k]).length, 0);
        const on = kabs.reduce((n, k) => n + kabTicked(p, k), 0);
        setKecs(Object.fromEntries(kabs.map(k => [kabKey(p, k), on >= total ? null : Object.keys(shown[p][k]).sort()])));
    };

    const kecCount = (g) => Object.values(g?.areas || {}).reduce((n, l) => n + (l?.length || 0), 0);
    const shopsIn = (g) => Object.entries(g?.areas || {}).reduce((n, [key, kecs]) => {
        const cut = key.indexOf('|');
        const kab = tree[key.slice(0, cut)]?.[key.slice(cut + 1)] || {};
        return n + (kecs || []).reduce((m, k) => m + (kab[k] || 0), 0);
    }, 0);
    const meta = teams.find(t => t.team === team);
    const adminName = meta?.admins.length ? meta.admins.join(', ') : 'no admin on the roster';
    const teamSize = Math.max(0, (meta?.people || 0) - (meta?.admins.length || 0));
    const waiting = customers.filter(c => c.holdTeam === team).length;

    const ref = () => doc(db, `artifacts/${appId}/users/${userId}/settings`, ACCESS_DOC_ID);
    const who = user?.displayName || user?.email || 'admin';

    const save = async () => {
        setBusy(true);
        try {
            await setDoc(ref(), { on: saved.on === true, teams: draft, updatedAt: serverTimestamp(), updatedBy: who });
            const g = draft[team] || {};
            notify(`Saved. ${team}: ${kecCount(g)} Kecamatan, ${shopsIn(g)} shops. Admin ${g.adminEdit !== false ? 'can edit' : 'view only'}, team ${g.teamEdit ? 'can edit' : 'view only'}.${saved.on ? '' : ' Folders are still OFF - nobody is limited yet.'}`);
            if (triggerCapy) triggerCapy('Customer access saved ✅');
        } catch (e) {
            notify(`Customer access was NOT saved: ${e.code || e.message}`);
        } finally { setBusy(false); }
    };

    const switchOn = async (on) => {
        if (on === (saved.on === true)) return;
        if (dirty) { notify('Save your ticks first - then switch.'); return; }
        if (on) {
            const empty = teams.filter(t => kecCount(saved.teams?.[t.team]) === 0).map(t => t.team);
            const lines = [
                'Turn folders ON? From now on each regional team sees only its ticked folders - in Customer Directory, the Sales Terminal and the map. Tier 1, 2 and 3 still see every shop.',
                empty.length ? `\n${empty.length} team${empty.length === 1 ? '' : 's'} with NO folders will see no shops: ${empty.join(', ')}.` : '',
                unfiled ? `\n${unfiled} shop${unfiled === 1 ? ' is' : 's are'} not in any folder yet (no Kecamatan, or not in capitals) - no team will see ${unfiled === 1 ? 'it' : 'them'} until you press Data Scrub in Customer Directory.` : '',
            ];
            if (!await confirmAction(lines.join('\n'))) return;
        } else if (!await confirmAction('Turn folders OFF? Every employee sees every shop again, and the Tiers & Logic edit option applies again.')) return;
        setBusy(true);
        try {
            await setDoc(ref(), { on, updatedAt: serverTimestamp(), updatedBy: who }, { merge: true });
            notify(on ? 'Folders are ON. Each team now sees only its ticked folders.' : 'Folders are OFF. Everyone sees every shop again.');
        } catch (e) {
            notify(`Not switched: ${e.code || e.message}`);
        } finally { setBusy(false); }
    };

    return (
        <div className="animate-fade-in">
            <div className="kpm-band">Customers · which shops each regional team can see</div>

            <div className="kpm-mod live">
                <div className="kpm-head">
                    <span className="slot">Access · 01</span>
                    <div className="line">
                        <h3>Limit shops by folder</h3>
                        <span className={`kpm-read ${saved.on ? 'on' : ''}`}>{saved.on ? 'On' : 'Off'}</span>
                    </div>
                    <p className="kpm-desc">
                        When <b>On</b>, each regional team sees only the folders ticked for it below - in Customer Directory,
                        the Sales Terminal and the map. Tier 1, 2 and 3 always see every shop.
                    </p>
                    {unfiled > 0 && (
                        <p className="kpm-desc">
                            <b>{unfiled} shop{unfiled === 1 ? ' is' : 's are'} not in a folder yet</b> (no Kecamatan, or not written in
                            capitals). No team sees {unfiled === 1 ? 'it' : 'them'} - press Data Scrub in Customer Directory first.
                        </p>
                    )}
                </div>
                <div className="kpm-shelf split">
                    <div className="kpm-switch" role="group" aria-label="Limit shops by folder">
                        <button type="button" aria-pressed={!saved.on} disabled={busy} onClick={() => switchOn(false)}>Off</button>
                        <button type="button" aria-pressed={!!saved.on} disabled={busy} onClick={() => switchOn(true)}>On</button>
                    </div>
                </div>
            </div>

            <div className="kpm-mod live">
                <div className="kpm-head">
                    <span className="slot">Access · 02</span>
                    <div className="line">
                        <h3>Team folders</h3>
                        <span className="kpm-read">{team ? `${kecCount(grant)} Kecamatan` : 'No teams'}</span>
                    </div>
                    <p className="kpm-desc">
                        Pick a team, then tick what it may see. A Provinsi or Kabupaten tick ticks everything inside it -
                        untick any Kecamatan to keep it out.
                    </p>
                </div>
                {teams.length === 0 ? (
                    <div className="kpm-shelf"><p className="kpm-desc">Nobody below Tier 2 is on Fleet &amp; Roster yet.</p></div>
                ) : (
                    <div className="kpm-shelf">
                        <div className="kpm-chips" aria-label="Regional team">
                            {teams.map(t => (
                                <button key={t.team} type="button" aria-pressed={t.team === team} onClick={() => setPick(t.team)}>
                                    {t.team}{t.admins.length ? ` · ${t.admins[0]}` : ''}
                                </button>
                            ))}
                        </div>

                        <div className="kpm-tree" aria-label={`Folders ${team} may see`}>
                            {Object.keys(shown).sort().map(p => {
                                const kabs = Object.keys(shown[p]).sort();
                                const total = kabs.reduce((n, k) => n + Object.keys(shown[p][k]).length, 0);
                                const on = kabs.reduce((n, k) => n + kabTicked(p, k), 0);
                                const open = openProv[p] !== false;
                                return (
                                    <div key={p}>
                                        <div className="row lvl1">
                                            <Tick state={tickState(on, total)} onClick={() => toggleProv(p)} label={`Provinsi ${p}`} />
                                            <button type="button" className="name" aria-expanded={open} onClick={() => setOpenProv(s => ({ ...s, [p]: !open }))}>
                                                <ChevronRight size={14} className={open ? 'rot' : ''} aria-hidden="true" /> {p}
                                            </button>
                                            <span className="count">{on}/{total}</span>
                                        </div>
                                        {open && kabs.map(k => {
                                            const kecs = Object.keys(shown[p][k]).sort();
                                            const kOn = kabTicked(p, k);
                                            const kOpen = !!openKab[kabKey(p, k)];
                                            return (
                                                <div key={k}>
                                                    <div className="row lvl2">
                                                        <Tick state={tickState(kOn, kecs.length)} onClick={() => toggleKab(p, k)} label={`Kabupaten ${k}`} />
                                                        <button type="button" className="name" aria-expanded={kOpen} onClick={() => setOpenKab(s => ({ ...s, [kabKey(p, k)]: !kOpen }))}>
                                                            <ChevronRight size={14} className={kOpen ? 'rot' : ''} aria-hidden="true" /> {k}
                                                        </button>
                                                        <span className="count">{kOn}/{kecs.length}</span>
                                                    </div>
                                                    {kOpen && kecs.map(kec => {
                                                        const ticked = (areas[kabKey(p, k)] || []).includes(kec);
                                                        const n = shown[p][k][kec];
                                                        return (
                                                            <div key={kec} className="row lvl3">
                                                                <Tick state={ticked ? 'all' : 'none'} onClick={() => toggleKec(p, k, kec)} label={`Kecamatan ${kec}`} />
                                                                <span className="name">{kec}</span>
                                                                <span className="count">{n} shop{n === 1 ? '' : 's'}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                            {Object.keys(shown).length === 0 && <p className="kpm-desc">No shop has a Kecamatan yet - press Data Scrub in Customer Directory.</p>}
                        </div>

                        <div className="kpm-field">
                            <span>Regional admin · {adminName}</span>
                            <div className="kpm-switch" role="group" aria-label="Regional admin can">
                                <button type="button" aria-pressed={grant.adminEdit === false} onClick={() => setGrant({ adminEdit: false })}>View only</button>
                                <button type="button" aria-pressed={grant.adminEdit !== false} onClick={() => setGrant({ adminEdit: true })}>View and edit</button>
                            </div>
                        </div>
                        <div className="kpm-field">
                            <span>Team · Tier 5 and 6 · {teamSize} {teamSize === 1 ? 'person' : 'people'}</span>
                            {/* (Tier 3 never appears here: it sees every shop, his 2026-10-20 call) */}
                            <div className="kpm-switch" role="group" aria-label="Team can">
                                <button type="button" aria-pressed={!grant.teamEdit} onClick={() => setGrant({ teamEdit: false })}>View only</button>
                                <button type="button" aria-pressed={!!grant.teamEdit} onClick={() => setGrant({ teamEdit: true })}>View and edit</button>
                            </div>
                        </div>
                        <p className="kpm-desc">
                            View only still lets them record a visit. <b>Temporary folder:</b> {waiting} new shop{waiting === 1 ? '' : 's'} waiting.
                            Only {adminName} sees it; new shops from this team will wait there for him to place them (next update).
                        </p>

                        <div className="kpm-acts">
                            {dirty && <span className="kpm-unsaved">Not saved yet</span>}
                            <button type="button" className="kpm-btn key" disabled={busy || !dirty} onClick={save}>{dirty ? 'Save' : 'Saved'}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
