import React from 'react';
import WarehouseDeskNav from '../../components/WarehouseDeskNav.jsx';

/* The regional warehouse stage: the REAL nav strip, fed a fixed demo world.

   Same contract as `ShipmentPlanStage` — it mounts the component the screen mounts, so the
   tutorial cannot drift from the thing it teaches. Every `data-ponder` key the scene focuses on
   lives on `WarehouseDeskNav`, not on markup invented here.

   The BODY is deliberately a thin placeholder rather than a replica of the five tab panels. Two of
   those panels already have scenes of their own, and a hand-built copy of the other three would be
   a second version of the screen to keep correct — which is exactly the drift this stage exists to
   avoid. The scene teaches the desk; the panels teach themselves. */

const DEMO_TABS = [
    { id: 'incoming', label: 'Incoming',   count: 2 },
    { id: 'request',  label: 'Request',    count: 0 },
    { id: 'stock',    label: 'Stock',      count: 4 },
    { id: 'book',     label: 'Book',       count: 3 },
    { id: 'data',     label: 'Data Induk', count: 0 },
];

const DEMO_HEAD = {
    incoming: { title: 'Gudang BANDUNG', sub: 'on the way · count on arrival' },
    request:  { title: 'Request from HQ', sub: 'how many · ship to' },
    stock:    { title: 'On the shelf',    sub: 'per product · in Bks' },
    book:     { title: 'Buku Besar',      sub: 'every request, settled and open' },
    data:     { title: 'Data Induk',      sub: 'gudang · pabrik · orang' },
};

const BODY = {
    incoming: 'Kiriman yang sedang jalan, dan kotak hitungannya.',
    request:  'Pilih barang, isi jumlah — alamatnya sudah terkunci.',
    stock:    'Kartu per barang, dengan umur kiriman terlama.',
    book:     'Semua permintaan, beserta hasil hitungnya.',
    data:     'Pabrik, gudang dan orang — hanya bisa dibaca di sini.',
};

export default function RegionalWarehouseStage() {
    /* Clicking a tab in the tutorial moves the tutorial's own desk, so a beat that names a tab can
       be followed by hand as well as watched. */
    const [tab, setTab] = React.useState('incoming');
    return (
        <div className="py-5">
            <div className="flex flex-col bg-ground border border-line-2 rounded-2xl overflow-hidden">
                <WarehouseDeskNav
                    title={DEMO_HEAD[tab].title}
                    sub={DEMO_HEAD[tab].sub}
                    tabs={DEMO_TABS}
                    active={tab}
                    onPick={setTab}
                />
                <div className="p-6 text-center">
                    <p className="font-mono text-[11px] text-ink-muted tracking-widest">{BODY[tab]}</p>
                </div>
            </div>
        </div>
    );
}
