import { useMemo, useState } from 'react';
import type { Analysis, UnitResult } from '../lib/types';
import { fmtUSD, fmtPct, fmtDate, MONTHS, MONTHS_LONG, UTILITY_ALLOWANCE } from '../lib/analyze';
import { useRevealAll } from '../lib/reveal';
import Letters from './Letters';
import Equity from './Equity';
import Vouchers from './Vouchers';
import ReportCard from './ReportCard';
import CashFlow from './CashFlow';
import Retention from './Retention';
import Plan from './Plan';
import Clustering from './Clustering';
import MomentumBadge from './MomentumBadge';

interface Props {
  analysis: Analysis;
  fileName: string;
  cap: number;
  onCap: (c: number) => void;
  utilities: Record<string, boolean>;
  onUtilities: (property: string, paid: boolean) => void;
  aiNotes?: string[];
  onReset: () => void;
}

const money = (n: number) => fmtUSD(Math.round(n));

export default function Results({ analysis: a, fileName, cap, onCap, utilities, onUtilities, aiNotes = [], onReset }: Props) {
  const root = useRevealAll<HTMLDivElement>();
  const [view, setView] = useState<'gap' | 'timing'>('gap');

  const groups = useMemo(() => {
    const m = new Map<string, UnitResult[]>();
    for (const u of a.units) {
      const k = u.property ?? 'Portfolio';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(u);
    }
    return Array.from(m.entries());
  }, [a.units]);

  const maxRent = useMemo(() => Math.max(...a.units.map((u) => Math.max(u.effectiveRent, u.fmr ?? 0))), [a.units]);

  // 12-month window starting this month
  const months = useMemo(() => {
    const out: { y: number; m: number; label: string; count: number; units: UnitResult[] }[] = [];
    const start = new Date(a.asOf.getFullYear(), a.asOf.getMonth(), 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const units = a.units.filter((u) => u.leaseEnd && u.leaseEnd.getFullYear() === d.getFullYear() && u.leaseEnd.getMonth() === d.getMonth());
      out.push({ y: d.getFullYear(), m: d.getMonth(), label: MONTHS[d.getMonth()], count: units.length, units });
    }
    return out;
  }, [a]);

  // portfolio seasonal curve = average of unit curves (weighted by rent)
  const curve = useMemo(() => {
    const acc = new Array(12).fill(0) as number[]; let w = 0;
    for (const u of a.units) { u.seasonal.forEach((v, i) => { acc[i] += v * u.rent; }); w += u.rent; }
    return acc.map((v) => (w ? v / w : 1));
  }, [a.units]);
  const curveMin = Math.min(...curve), curveMax = Math.max(...curve);
  const bestMonth = curve.indexOf(curveMax);
  const worstMonth = curve.indexOf(curveMin);
  const inWorstHalf = a.units.filter((u) => u.expiryIndex !== null && u.expiryIndex < 1).length;

  return (
    <div ref={root} className="mx-auto w-full max-w-6xl">
      {/* ---- Header ---- */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-6">
        <div>
          <p className="t-micro uppercase tracking-[0.14em] text-ink/60">Rent roll</p>
          <h2 className="t-h3 mt-1">{fileName}</h2>
          <p className="t-small mt-1 text-ink/60">
            {a.units.length} units · {a.matched} matched to a HUD benchmark{a.unmatched ? ` · ${a.unmatched} unmatched ZIP` : ''} · as of {fmtDate(a.asOf)}
          </p>
          {aiNotes.length > 0 && (
            <ul className="t-small mt-2 space-y-0.5 text-ink/70">
              {aiNotes.map((n, i) => <li key={i} className="flex gap-2"><span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />{n}</li>)}
            </ul>
          )}
        </div>
        <button type="button" className="btn-ghost" onClick={onReset}>Upload another roll</button>
      </div>

      {/* ---- Headline ---- */}
      <section aria-labelledby="headline" className="grid gap-8 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-7">
          <p id="headline" className="t-micro uppercase tracking-[0.14em] text-ember-3">Rent left on the table, per year</p>
          <div className="mt-3">
            <p key={a.totalGapAnnual} className="wipe-up-now t-display num text-ink">{money(a.totalGapAnnual)}</p>
          </div>
          <p className="t-lead measure mt-5 text-ink/80">
            {a.unitsUnder} of {a.units.length} units rent below HUD's FY{a.fy} Fair Market Rent for their ZIP and bedroom count.
            {a.unitsAtOrAbove > 0 && ` ${a.unitsAtOrAbove} ${a.unitsAtOrAbove === 1 ? 'is' : 'are'} at or above it.`}
          </p>
        </div>
        <div className="grid gap-4 self-end sm:grid-cols-2 md:col-span-5 md:grid-cols-1">
          <Stat label="Recoverable this renewal cycle" value={money(a.recoverableAtCap)} sub={`with increases capped at ${fmtPct(cap, 0)} per unit`} />
          <Stat label="Lease-timing value" value={money(a.totalTimingValue)} sub={`if every lease ended in ${MONTHS_LONG[bestMonth]}, the seasonal peak`} />
        </div>
      </section>

      {/* ---- Cap control ---- */}
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-canvas-2 px-5 py-4">
        <label htmlFor="cap" className="t-small font-medium">Max increase per renewal</label>
        <input
          id="cap" type="range" min={0} max={0.15} step={0.01} value={cap}
          onChange={(e) => onCap(parseFloat(e.target.value))}
          className="w-48 accent-ember"
        />
        <span className="num t-small w-12 font-semibold">{fmtPct(cap, 0)}</span>
        <span className="t-small text-ink/60">Most small landlords keep renewals under 5–8% to hold good tenants. The cap never pushes a unit above its HUD benchmark.</span>
      </div>

      {/* ---- The advisor: AI reads the engine's numbers, writes the plan ---- */}
      <Plan analysis={a} cap={cap} curve={curve} />

      {/* ---- Equity ---- */}
      <Equity analysis={a} cap={cap} />

      {/* ---- Building report cards ---- */}
      <ReportCard analysis={a} />

      {/* ---- Unit bars ---- */}
      <section className="mt-16" aria-labelledby="units">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 id="units" className="t-h2">Unit by unit</h3>
            <p className="t-body mt-2 text-ink/70">Current rent against the HUD benchmark. Ember is the gap.</p>
          </div>
          <div role="tablist" aria-label="View" className="flex rounded-full border border-ink/20 p-1 t-small">
            {(['gap', 'timing'] as const).map((v) => (
              <button
                key={v} role="tab" aria-selected={view === v} type="button"
                className={`rounded-full px-4 py-1.5 font-medium transition-colors duration-150 ${view === v ? 'bg-ink text-ink' : 'text-ink/70'}`}
                onClick={() => setView(v)}
              >
                {v === 'gap' ? 'Rent gap' : 'Lease timing'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-10">
          {groups.map(([prop, units]) => {
            const gap = units.reduce((s, u) => s + Math.max(0, u.gapAnnual ?? 0), 0);
            const first = units[0];
            return (
              <div key={prop}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ink/10 pb-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="t-h3">{prop}</h4>
                    <MomentumBadge yoy={first.zoriYoY} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <p className="t-small text-ink/70">
                      {first.city && first.state ? `${first.city}, ${first.state} · ` : ''}ZIP {first.zip}
                      {first.zoriRent ? ` · Zillow asking ${money(first.zoriRent)}` : ''}
                      {' · '}<span className="text-ember-3 num">{money(gap)}/yr under</span>
                    </p>
                    {first.property && (
                      <label className="t-small flex cursor-pointer items-center gap-2 text-ink/70" title="HUD's benchmark is a gross rent. If you pay utilities here, we add a typical allowance before comparing.">
                        <input type="checkbox" className="h-4 w-4 accent-ember" checked={!!utilities[prop]} onChange={(e) => onUtilities(prop, e.target.checked)} />
                        We pay utilities
                      </label>
                    )}
                  </div>
                </div>
                <ul className="space-y-2">
                  {units.map((u) => (
                    <li key={u.rowIndex} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 sm:grid-cols-[6rem_1fr_11rem]">
                      <div className="t-small">
                        <span className="font-semibold">{u.id}</span>
                        <span className="block text-ink/60">{u.bedrooms === 0 ? 'Studio' : `${u.bedrooms} BR`}{u.utilityAllowance ? ` · +${money(u.utilityAllowance)} util.` : ''}{u.zipInferred ? <span title="ZIP inferred by AI from the address — verify" className="ml-1 text-ember-3">· ZIP {u.zip}?</span> : null}</span>
                      </div>
                      {view === 'gap' ? (
                        <GapBar u={u} max={maxRent} />
                      ) : (
                        <TimingCell u={u} />
                      )}
                      <div className="t-small text-right num">
                        {view === 'gap' ? (
                          u.fmr === null ? <span className="text-ink/50">No HUD data for ZIP</span> : (u.gapMonthly ?? 0) > 0 ? (
                            <><span className="font-semibold text-ember-3">{money(u.gapAnnual!)}/yr</span><span className="block text-ink/60">{money(u.effectiveRent)} vs {money(u.fmr)}</span></>
                          ) : (
                            <><span className="font-semibold text-mint">At or above</span><span className="block text-ink/60">{money(u.effectiveRent)} vs {money(u.fmr)}</span></>
                          )
                        ) : (
                          u.leaseEnd ? (
                            <><span className={`font-semibold ${(u.timingValueAnnual ?? 0) > 100 ? 'text-ember-3' : 'text-mint'}`}>{(u.timingValueAnnual ?? 0) > 100 ? `${money(u.timingValueAnnual!)}/yr` : 'Well timed'}</span><span className="block text-ink/60">ends {MONTHS[u.expiryMonth!]} · best {MONTHS[u.bestMonth]}</span></>
                          ) : <span className="text-ink/50">No lease end</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Cash flow ---- */}
      <CashFlow analysis={a} cap={cap} />

      {/* ---- Retention: the same increases, net of move-out risk ---- */}
      <Retention analysis={a} cap={cap} />

      {/* ---- Expirations ---- */}
      <section className="mt-20" aria-labelledby="expiries">
        <h3 id="expiries" className="t-h2">When your leases end</h3>
        <p className="t-body measure mt-2 text-ink/70">
          The curve is the seasonal rent index for your ZIPs (Zillow ZORI, {a.zoriAsOf}). Asking rents peak in {MONTHS_LONG[bestMonth]} and bottom out in {MONTHS_LONG[worstMonth]} —
          a {fmtPct(curveMax / curveMin - 1)} swing. {inWorstHalf} of your {a.units.filter((u) => u.leaseEnd).length} leases end in a below-average month.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SeasonChart months={months} curve={curve} />
          </div>
          <div className="lg:col-span-5">
            <p className="t-micro mb-3 uppercase tracking-[0.14em] text-ink/60">Next 90 days</p>
            {a.expiring90.length === 0 ? (
              <p className="t-body text-ink/70">No leases end in the next 90 days.</p>
            ) : (
              <ul className="divide-y divide-ink/10 rounded-2xl bg-canvas-2">
                {a.expiring90.map((u) => (
                  <li key={u.rowIndex} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="font-semibold">Unit {u.id} <span className="font-normal text-ink/60">· {u.property}</span></p>
                      <p className="t-small text-ink/70">Ends {fmtDate(u.leaseEnd!)} · {u.tenant ?? 'Resident'}</p>
                    </div>
                    <div className="text-right num">
                      <p className={`font-semibold ${u.daysToExpiry! <= 60 ? 'text-ember-3' : ''}`}>{u.daysToExpiry} days</p>
                      {u.suggestedIncrease ? <p className="t-small text-ink/70">renew at {money(u.suggestedRent!)}</p> : <p className="t-small text-mint">renew as is</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Clustering analysis={a} curve={curve} />
      </section>

      {/* ---- Vouchers ---- */}
      <Vouchers analysis={a} />

      {/* ---- Letters ---- */}
      <Letters analysis={a} />

      {/* ---- Method ---- */}
      <section className="mt-20 grid gap-8 border-t border-ink/15 pt-10 md:grid-cols-12" aria-labelledby="method">
        <div className="md:col-span-4">
          <h3 id="method" className="t-h3">How the number is computed</h3>
        </div>
        <div className="t-body measure space-y-4 text-ink/80 md:col-span-8">
          <p>
            For every unit we look up the U.S. Department of Housing and Urban Development's <strong className="text-ink">Small Area Fair Market Rent</strong> for its ZIP code and bedroom count (FY{a.fy}, 38,601 ZIPs, 0–4+ bedrooms).
            The gap is simply <span className="num font-mono text-[0.95em]">benchmark − current rent</span>, summed over the units that are below it and annualised.
          </p>
          <p>
            <strong className="text-ink">This is a conservative floor.</strong> Fair Market Rent is the 40th percentile of gross rents in the area — six in ten comparable homes rent for more than this — and it includes utilities. If your rent is below it, you are almost certainly below market.
          </p>
          <p>
            Lease timing uses Zillow's Observed Rent Index by ZIP ({a.zoriAsOf}), averaged into a 12-month seasonal profile from 2022–2025 (per ZIP where available, otherwise per metro, otherwise national). A lease that ends in the seasonal trough re-signs at the trough; the timing value is
            <span className="num font-mono text-[0.95em]"> rent × (peak index ÷ index at lease end − 1) × 12</span>.
          </p>
          <p>
            <strong className="text-ink">Equity</strong> prices the gap the way a buyer would: <span className="num font-mono text-[0.95em]">value = annual rent ÷ cap rate</span>. It assumes the recovered rent flows through to net operating income; the cap rate is yours to set.
          </p>
          <p>
            <strong className="text-ink">Utilities.</strong> Fair Market Rent is a gross rent. When you mark a building "we pay utilities", we add a typical allowance by bedroom count ({UTILITY_ALLOWANCE.map((v, i) => `${i === 0 ? 'studio' : `${i}BR`} $${v}`).join(', ')} per month) to your rent before comparing, so the gap isn't overstated. HUD's own allowance schedules vary by housing authority.
          </p>
          <p>
            <strong className="text-ink">Grades</strong> are the share of a building's gross rent left on the table: under 2% is an A, under 5% a B, under 9% a C, under 14% a D. <strong className="text-ink">Momentum</strong> is the ZIP's year-over-year change in Zillow's asking-rent index: rising above +3%, softening below −1%.
          </p>
          <p>
            <strong className="text-ink">Cash flow</strong> applies each unit's proposed rent from the first full month after its lease ends and sums the portfolio month by month. <strong className="text-ink">Concentration</strong> is the share of monthly rent whose leases end in the same month; the staggered alternative spreads them across the three strongest seasonal months, balancing by rent.
          </p>
          <p>
            <strong className="text-ink">Retention</strong> prices each increase two ways. If the tenant stays: <span className="num font-mono text-[0.95em]">increase × 12</span>. If they leave: <span className="num font-mono text-[0.95em]">(benchmark − rent) × 12 − (rent × months vacant + make-ready)</span>. The expected gain blends them at your leave rate; the break-even is the leave rate where it reaches zero.
          </p>
          <p>
            <strong className="text-ink">Vouchers</strong> compare each unit's rent to a Housing Choice Voucher payment standard, <span className="num font-mono text-[0.95em]">FMR × 90–110%</span>, set by the local housing authority. The upside is <span className="num font-mono text-[0.95em]">max(0, standard − rent) × 12</span>, subject to the authority's inspection and rent-reasonableness check.
          </p>
          <p className="t-small text-ink/60">
            Sources: HUD User, FY2027 Small Area FMRs (public domain). Zillow Research, ZORI ZIP-level (free for non-commercial use, attribution required).{a.incomeVintage ? ` U.S. Census Bureau, ${a.incomeVintage} estimates, median household income by ZIP (public domain).` : ''} Letters are drafts, not legal advice — check your state's notice and rent-increase rules.
          </p>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-canvas-2 px-5 py-4">
      <p className="t-micro uppercase tracking-[0.14em] text-ink/60">{label}</p>
      <p className="t-h2 num mt-1">{value}</p>
      <p className="t-small mt-1 text-ink/60">{sub}</p>
    </div>
  );
}

function GapBar({ u, max }: { u: UnitResult; max: number }) {
  const rentW = (u.effectiveRent / max) * 100;
  const fmrW = ((u.fmr ?? u.rent) / max) * 100;
  const under = (u.gapMonthly ?? 0) > 0;
  return (
    <div className="relative h-7 rounded-md bg-canvas-2" aria-label={`Rent ${money(u.rent)}, benchmark ${u.fmr !== null ? money(u.fmr) : 'unknown'}`}>
      {/* benchmark ghost */}
      {u.fmr !== null && <div className="absolute inset-y-0 left-0 rounded-md bg-ink/10" style={{ width: `${fmrW}%` }} />}
      {/* current rent (plus any utility allowance) */}
      <div className={`absolute inset-y-0 left-0 rounded-md ${under ? 'bg-ink/80' : 'bg-mint-2'}`} style={{ width: `${rentW}%` }} />
      {/* gap */}
      {under && u.fmr !== null && (
        <div className="absolute inset-y-0 rounded-r-md bg-ember" style={{ left: `${rentW}%`, width: `${fmrW - rentW}%` }} />
      )}
      {/* benchmark tick */}
      {u.fmr !== null && <div className="absolute inset-y-[-3px] w-[2px] bg-ink" style={{ left: `calc(${fmrW}% - 1px)` }} title={`HUD benchmark ${money(u.fmr)}`} />}
    </div>
  );
}

function TimingCell({ u }: { u: UnitResult }) {
  const min = Math.min(...u.seasonal), max = Math.max(...u.seasonal);
  return (
    <div className="flex h-7 items-end gap-[3px]" aria-label={u.expiryMonth !== null ? `Lease ends in ${MONTHS_LONG[u.expiryMonth]}` : 'No lease end date'}>
      {u.seasonal.map((v, i) => {
        const h = 20 + ((v - min) / (max - min || 1)) * 80;
        const isEnd = u.expiryMonth === i;
        const isBest = u.bestMonth === i;
        return <div key={i} className={`flex-1 rounded-sm ${isEnd ? 'bg-ember' : isBest ? 'bg-mint-2' : 'bg-ink/20'}`} style={{ height: `${h}%` }} title={`${MONTHS[i]} ${v.toFixed(3)}`} />;
      })}
    </div>
  );
}

function SeasonChart({ months, curve }: { months: { label: string; m: number; count: number; units: UnitResult[] }[]; curve: number[] }) {
  const min = Math.min(...curve), max = Math.max(...curve);
  const W = 600, H = 200, padX = 20, padTop = 20, padBot = 44;
  const xs = months.map((_, i) => padX + (i / 11) * (W - padX * 2));
  const ys = months.map((mo) => padTop + (1 - (curve[mo.m] - min) / (max - min || 1)) * (H - padTop - padBot));
  const path = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const maxCount = Math.max(1, ...months.map((m) => m.count));
  return (
    <figure className="rounded-2xl bg-canvas-2 p-4 sm:p-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Seasonal rent index with lease expirations by month">
        <line x1={padX} x2={W - padX} y1={padTop + (1 - (1 - min) / (max - min || 1)) * (H - padTop - padBot)} y2={padTop + (1 - (1 - min) / (max - min || 1)) * (H - padTop - padBot)} stroke="rgb(26 26 26 / 0.2)" strokeDasharray="3 4" />
        <path d={path} fill="none" stroke="var(--color-mint-2)" strokeWidth="2" strokeLinejoin="round" />
        {months.map((mo, i) => (
          <g key={i}>
            {mo.count > 0 && (
              <rect x={xs[i] - 9} y={H - padBot - 2 - (mo.count / maxCount) * 40} width={18} height={(mo.count / maxCount) * 40} rx={3} fill={curve[mo.m] < 1 ? 'var(--color-ember)' : 'var(--color-paper)'} opacity={0.9} />
            )}
            {mo.count > 0 && <text x={xs[i]} y={H - padBot - 6 - (mo.count / maxCount) * 40} textAnchor="middle" fontSize="11" fill="var(--color-paper)" className="num">{mo.count}</text>}
            <text x={xs[i]} y={H - 14} textAnchor="middle" fontSize="12" fill="rgb(26 26 26 / 0.65)">{mo.label}</text>
          </g>
        ))}
      </svg>
      <figcaption className="t-small mt-2 flex flex-wrap gap-4 text-ink/60">
        <span><span className="mr-1 inline-block h-2 w-4 rounded-sm bg-mint-2 align-middle" />Seasonal rent index</span>
        <span><span className="mr-1 inline-block h-2 w-3 rounded-sm bg-ember align-middle" />Leases ending in a below-average month</span>
        <span><span className="mr-1 inline-block h-2 w-3 rounded-sm bg-ink align-middle" />Leases ending in an above-average month</span>
      </figcaption>
    </figure>
  );
}
