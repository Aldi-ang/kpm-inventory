import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  ChevronLeft,
  FlaskConical,
  History,
  Package,
  Search,
  Tag,
  Undo2,
  Wrench,
} from 'lucide-react';
import { formatNumber, formatRupiah, tierPrice } from '../utils/helpers';

/**
 * Clean 20px vector biohazard icon for the Quarantine header.
 * Uses only --bio / --bio-glow tokens (the single green exception Aldi approved 2026-11-20).
 */
export function QuarantineBioIcon({ className = '' }) {
  return (
    <svg
      className={`kpm-bio-hazard ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="1.9" />
      <path d="M9.78 10.44a3.6 3.6 0 1 1 4.44 0M14.46 10.86a3.6 3.6 0 1 1-2.22 3.84M11.76 14.70a3.6 3.6 0 1 1-2.22-3.84" />
      <path d="M12 10.1V8.6M13.65 12.95l1.3.75M10.35 12.95l-1.3.75" />
    </svg>
  );
}

const METHOD_META = {
  REPAIR:   { label: 'Repair',            badge: 'Repaired',            danger: false },
  SELL:     { label: 'Sell again (RUSAK)', badge: 'Sold as RUSAK',       danger: false },
  SAMPLING: { label: 'Sample goods',      badge: 'Converted to sample', danger: false },
  RTV:      { label: 'Return to factory', badge: 'Returned (RTV)',      danger: false },
  PENALTY:  { label: 'Charge staff',      badge: 'Staff charge',        danger: true },
};

const HISTORY_FILTERS = [
  ['ALL', 'All'],
  ['REPAIR', 'Repair'],
  ['SELL', 'Sell again'],
  ['SAMPLING', 'Sample'],
  ['RTV', 'RTV'],
  ['PENALTY', 'Staff charge'],
];

const unitCostOf = (item) => Number(item?.priceDistributor || item?.hpp || item?.costPrice || 0);
const sunkCostOf = (item) => Number(item?.priceDistributor || item?.hpp || 0);

const motionOff = () =>
  typeof document !== 'undefined' &&
  (document.documentElement.classList.contains('lite-mode') ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));

function logDetailText(log) {
  if (typeof log.details === 'string') {
    if (log.method === 'RTV') return `Returned to factory · Surat Jalan Retur ${log.details}`;
    return log.details;
  }
  const d = log.details || {};
  if (log.method === 'REPAIR') {
    return `Repaired and returned to good Master Vault stock${d.note ? ` · ${d.note}` : ''}`;
  }
  if (log.method === 'SELL') {
    return `Put on sale as "${log.productName} · RUSAK"${d.price ? ` at ${formatRupiah(d.price)} per Bks` : ''}${d.to ? ` in ${d.to}` : ''}`;
  }
  if (log.method === 'SAMPLING') {
    return `Converted to promo sample (${log.qty} pcs)${d.to ? ` in ${d.to}` : ''}${d.reason ? ` · ${d.reason}` : ''}`;
  }
  if (log.method === 'RTV') {
    return `Returned to factory · Surat Jalan Retur ${d.rtvRef || '-'}`;
  }
  if (log.method === 'PENALTY') {
    return `Charged to ${d.agentName || 'Staff'} (${formatRupiah(log.totalValueHpp)} added to daily EOD Setoran)`;
  }
  return '';
}

export default function QuarantineBoard({
  facilities = [],
  activeFacility,
  onPickFacility,
  items = [],
  subTab = 'active',
  onSubTabChange,
  isHighCommand = false,
  logs = [],
  logsCount = 0,
  regionFilterSelect = null,
  inventory = [],
  onAction,
  leavingId = null,
  wide = true,
}) {
  const [search, setSearch] = useState('');
  const [selId, setSelId] = useState(null);
  const [phOpen, setPhOpen] = useState(false);
  const [phLeaving, setPhLeaving] = useState(false);
  const [histMethod, setHistMethod] = useState('ALL');

  const facItems = useMemo(
    () => items.filter((i) => i && i.facility === activeFacility && (i.damagedStock || 0) > 0),
    [items, activeFacility],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? facItems.filter((i) => (i.name || '').toLowerCase().includes(q)) : facItems;
  }, [facItems, search]);

  const selected = useMemo(
    () =>
      filtered.find((i) => i.id === selId) ||
      facItems.find((i) => i.id === selId) ||
      filtered[0] ||
      facItems[0] ||
      null,
    [filtered, facItems, selId],
  );

  // Close phone detail sheet smoothly if selected item left the warehouse
  useEffect(() => {
    if (!selected && phOpen) {
      setPhOpen(false);
      setPhLeaving(false);
    }
  }, [selected, phOpen]);

  const activeFacName = useMemo(
    () => facilities.find((f) => f.key === activeFacility)?.name || activeFacility,
    [facilities, activeFacility],
  );

  const totalBks = useMemo(
    () => facItems.reduce((sum, i) => sum + Number(i.damagedStock || 0), 0),
    [facItems],
  );
  const totalSunkHpp = useMemo(
    () => facItems.reduce((sum, i) => sum + Number(i.damagedStock || 0) * sunkCostOf(i), 0),
    [facItems],
  );

  const shownLogs = useMemo(
    () => (histMethod === 'ALL' ? logs : logs.filter((l) => l.method === histMethod)),
    [logs, histMethod],
  );

  const pickWarehouse = (key) => {
    setSelId(null);
    setPhOpen(false);
    setPhLeaving(false);
    onPickFacility(key);
  };

  const pickRow = (id) => {
    setSelId(id);
    if (!wide) {
      setPhLeaving(false);
      setPhOpen(true);
    }
  };

  const closePhoneDetail = () => {
    if (!phOpen) return;
    if (motionOff()) {
      setPhOpen(false);
      return;
    }
    setPhLeaving(true);
    setTimeout(() => {
      setPhOpen(false);
      setPhLeaving(false);
    }, 165);
  };

  const sellSrc = selected ? inventory.find((p) => p && p.id === selected.id) || selected : null;
  const retailPrice = sellSrc ? tierPrice(sellSrc, 'Retail') : 0;

  const listPane = (
    <div className="kpm-quar-list">
      <div className="kpm-quar-search">
        <div className="kpm-quar-sbox">
          <Search size={15} className="text-[var(--ink-dim)] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search damaged products"
            aria-label="Search damaged products"
          />
        </div>
      </div>
      <div className="kpm-quar-rows custom-scrollbar">
        {filtered.length === 0 ? (
          <p className="p-5 text-xs text-[var(--ink-dim)] m-0">
            No damaged products in {activeFacName}.
          </p>
        ) : (
          filtered.map((item) => {
            const isSel = selected && selected.id === item.id;
            const unitHpp = unitCostOf(item);
            return (
              <button
                key={`${item.facility}-${item.id}`}
                type="button"
                data-quar-row={item.id}
                onClick={() => pickRow(item.id)}
                className={`kpm-quar-row ${isSel ? 'sel' : ''} ${leavingId === item.id ? 'is-leaving' : ''}`}
              >
                <span className="ic">
                  <Package size={16} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="nm block">
                    {item.name}
                    {item.damagedFrom && <span className="kpm-quar-tag">RUSAK</span>}
                  </span>
                  <span className="sub block">{formatRupiah(unitHpp)} HPP / Bks</span>
                </span>
                <span className="text-right shrink-0">
                  <span className="qty block">{formatNumber(item.damagedStock)} Bks</span>
                  <span className="hpp block">{formatRupiah(Number(item.damagedStock || 0) * unitHpp)}</span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const detailPane = (
    <div key={selected ? `${selected.facility}-${selected.id}` : 'empty'} className="kpm-quar-detail custom-scrollbar">
      {selected ? (
        <>
          <div className="kpm-quar-card">
            <div className="flex items-center gap-3.5">
              <span className="w-12 h-12 rounded-xl border border-[var(--line-2)] bg-[var(--raised)] flex items-center justify-center text-[var(--accent-ink)] shrink-0">
                <Package size={20} />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-[var(--ink)] m-0 break-words">
                  {selected.name}
                  {selected.damagedFrom && <span className="kpm-quar-tag">Already RUSAK lot</span>}
                </h3>
                <p className="text-xs text-[var(--ink-dim)] mt-0.5 mb-0">
                  {(facilities.find((f) => f.key === selected.facility)?.name || selected.facility)} · Available in damaged stock
                </p>
              </div>
            </div>
            <div className="kpm-quar-dstats">
              <div>
                <small className="block text-[11px] text-[var(--ink-dim)] mb-0.5">Damaged stock</small>
                <strong className="text-base font-bold text-[var(--danger-ink)] font-mono tabular-nums">
                  {formatNumber(selected.damagedStock)} Bks
                </strong>
              </div>
              <div>
                <small className="block text-[11px] text-[var(--ink-dim)] mb-0.5">Value at cost (HPP)</small>
                <strong className="text-base font-bold text-[var(--ink)] font-mono tabular-nums">
                  {formatRupiah(Number(selected.damagedStock || 0) * unitCostOf(selected))}
                </strong>
              </div>
              <div>
                <small className="block text-[11px] text-[var(--ink-dim)] mb-0.5">Retail price</small>
                <strong className="text-base font-bold text-[var(--ink)] font-mono tabular-nums">
                  {retailPrice > 0 ? `${formatRupiah(retailPrice)} / Bks` : 'Not set'}
                </strong>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-dim)] mb-2">
              Ways to resolve this stock
            </div>
            <div className="kpm-quar-acts">
              {isHighCommand && selected.facility === 'MASTER' && (
                <button
                  type="button"
                  onClick={() => onAction(selected, 'REPAIR')}
                  className="kpm-quar-actbtn primary"
                >
                  <Wrench size={16} className="text-[var(--accent-ink)] shrink-0" />
                  <span className="flex-1 min-w-0">
                    <b className="block text-[13px] font-bold text-[var(--ink)]">Repair to good stock</b>
                    <span className="block text-[11px] text-[var(--ink-dim)] mt-0.5">
                      Move fixed Bks back to Master Vault (no write-off)
                    </span>
                  </span>
                </button>
              )}

              {!selected.damagedFrom && (
                <button
                  type="button"
                  onClick={() => onAction(selected, 'SELL')}
                  className="kpm-quar-actbtn primary"
                >
                  <Tag size={16} className="text-[var(--accent-ink)] shrink-0" />
                  <span className="flex-1 min-w-0">
                    <b className="block text-[13px] font-bold text-[var(--ink)]">Sell again as RUSAK</b>
                    <span className="block text-[11px] text-[var(--ink-dim)] mt-0.5">
                      Create a discounted or full-price RUSAK lot
                    </span>
                  </span>
                </button>
              )}

              {isHighCommand && (
                <>
                  <button
                    type="button"
                    onClick={() => onAction(selected, 'SAMPLING')}
                    className="kpm-quar-actbtn"
                  >
                    <FlaskConical size={16} className="text-[var(--ink-muted)] shrink-0" />
                    <span className="flex-1 min-w-0">
                      <b className="block text-[13px] font-bold text-[var(--ink)]">Convert to sample (pcs)</b>
                      <span className="block text-[11px] text-[var(--ink-dim)] mt-0.5">
                        Turn damaged packs into promo giveaway pieces
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onAction(selected, 'RTV')}
                    className="kpm-quar-actbtn"
                  >
                    <Undo2 size={16} className="text-[var(--ink-muted)] shrink-0" />
                    <span className="flex-1 min-w-0">
                      <b className="block text-[13px] font-bold text-[var(--ink)]">Return to factory (RTV)</b>
                      <span className="block text-[11px] text-[var(--ink-dim)] mt-0.5">
                        Write off against a Surat Jalan Retur number
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onAction(selected, 'PENALTY')}
                    className="kpm-quar-actbtn danger"
                  >
                    <BadgeDollarSign size={16} className="shrink-0" />
                    <span className="flex-1 min-w-0">
                      <b className="block text-[13px] font-bold">Charge staff</b>
                      <span className="block text-[11px] opacity-85 mt-0.5">
                        Charge damaged value to an agent&apos;s daily EOD Setoran
                      </span>
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="kpm-quar-card">
          <p className="m-0 text-sm text-[var(--ink-dim)]">No damaged goods in {activeFacName}.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="kpm-quar-wrap">
      <div className="kpm-quar-subbar">
        <div className="kpm-quar-seg" role="tablist" aria-label="Quarantine views">
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'active'}
            className={subTab === 'active' ? 'on' : ''}
            onClick={() => {
              setPhOpen(false);
              onSubTabChange('active');
            }}
          >
            Damaged stock
          </button>
          {isHighCommand && (
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'history'}
              className={subTab === 'history' ? 'on' : ''}
              onClick={() => {
                setPhOpen(false);
                onSubTabChange('history');
              }}
            >
              <History size={14} />
              <span>Action history ({formatNumber(logsCount)})</span>
            </button>
          )}
        </div>

        {subTab === 'active' && (
          <div key={activeFacility} className="kpm-quar-kpi">
            <span>
              Sunk value (HPP)
              <b className="val">{formatRupiah(totalSunkHpp)}</b>
            </span>
            <span className="sep" aria-hidden="true" />
            <span>
              <b>{formatNumber(totalBks)} Bks</b> in {activeFacName}
            </span>
          </div>
        )}
      </div>

      {subTab === 'active' ? (
        <>
          <div className="kpm-quar-whbar" role="tablist" aria-label="Warehouses">
            {facilities.map((fac) => {
              const bks = items
                .filter((x) => x && x.facility === fac.key)
                .reduce((sum, x) => sum + Number(x.damagedStock || 0), 0);
              const isSelected = activeFacility === fac.key;
              return (
                <button
                  key={fac.key}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => pickWarehouse(fac.key)}
                  className={`kpm-quar-whbtn ${isSelected ? 'on' : ''} ${bks > 0 ? 'hasdmg' : ''}`}
                >
                  <span>{fac.name}</span>
                  <span className="badge">{formatNumber(bks)} Bks</span>
                </button>
              );
            })}
          </div>

          <div key={activeFacility} className="kpm-quar-work">
            {!wide ? (
              phOpen && selected ? (
                <div className={`kpm-quar-ph-wrap ${phLeaving ? 'is-leaving' : ''}`}>
                  <div className="flex items-center gap-2 px-3.5 py-2 border-b border-[var(--line)] bg-[var(--panel)]">
                    <button
                      type="button"
                      onClick={closePhoneDetail}
                      className="min-h-11 px-3 rounded-lg border border-[var(--line-2)] text-[13px] font-semibold text-[var(--ink)] inline-flex items-center gap-1.5"
                    >
                      <ChevronLeft size={16} />
                      <span>Back to list</span>
                    </button>
                    <span className="ml-auto text-xs text-[var(--ink-dim)]">{activeFacName}</span>
                  </div>
                  {detailPane}
                </div>
              ) : (
                listPane
              )
            ) : (
              <>
                {listPane}
                {detailPane}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col bg-[var(--ground)]">
          <div className="kpm-quar-hist-tools">
            {regionFilterSelect}
            <div className="flex flex-wrap gap-1.5">
              {HISTORY_FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setHistMethod(key)}
                  className={`kpm-quar-pill ${histMethod === key ? 'on' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 space-y-3">
            {shownLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--ink-dim)] gap-2">
                <History size={36} className="opacity-50" />
                <p className="text-sm m-0">No action history matches this filter.</p>
              </div>
            ) : (
              shownLogs.map((log) => {
                const meta = METHOD_META[log.method] || {
                  badge: log.method,
                  danger: log.method === 'PENALTY',
                };
                const timeStr = log.timestamp?.seconds
                  ? new Date(log.timestamp.seconds * 1000).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Just now';
                const facName = facilities.find((f) => f.key === log.facility)?.name || log.facility;
                const detailLine = logDetailText(log);
                return (
                  <div
                    key={log.id}
                    className="border border-[var(--line)] rounded-xl bg-[var(--panel)] p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold ${
                            meta.danger
                              ? 'border-[var(--danger)] text-[var(--danger-ink)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]'
                              : 'border-[var(--accent-edge)] text-[var(--accent-ink)] bg-[color-mix(in_srgb,var(--gold)_13%,transparent)]'
                          }`}
                        >
                          {meta.badge}
                        </span>
                        <span className="text-xs text-[var(--ink-dim)] font-mono">{timeStr}</span>
                      </div>
                      <h4 className="font-bold text-[var(--ink)] text-sm mt-1.5 mb-0">
                        {formatNumber(log.qty)} Bks · {log.productName}
                      </h4>
                      <p className="text-xs text-[var(--ink-dim)] mt-0.5 mb-0">
                        {facName} · Recorded by {log.resolvedBy || 'System'}
                      </p>
                      {detailLine && (
                        <div className="mt-2 text-xs text-[var(--ink-muted)] px-2.5 py-1.5 rounded-lg bg-[var(--inset)] border border-[var(--line)] break-words">
                          {detailLine}
                        </div>
                      )}
                    </div>
                    <div className="sm:text-right shrink-0">
                      <div className="text-[11px] text-[var(--ink-dim)]">Value (HPP)</div>
                      <div className="font-bold text-sm text-[var(--ink)] font-mono tabular-nums">
                        {formatRupiah(log.totalValueHpp)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
