import { useMemo } from 'react';
import type { Analysis } from '../lib/types';
import { cashflowProjection, fmtUSD, fmtPct } from '../lib/analyze';

const money = (n: number) => fmtUSD(Math.round(n));

// Monthly rental income for the next twelve months under three policies:
// leave every rent alone, send the proposed (capped) renewals, or take every
// unit to its benchmark at renewal. Each increase lands the month after the lease ends.
export default function CashFlow({ analysis: a, cap }: { analysis: Analysis; cap: number }) {
  const cf = useMemo(() => cashflowProjection(a), [a]);
  const gainProposed = cf.totals.proposed - cf.totals.current;
  const gainBenchmark = cf.totals.benchmark - cf.totals.current;
  const last = cf.months[11];

  return (
    <section className="mt-20" aria-labelledby="cashflow">
      <div className="grid gap-8 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-7">
          <h3 id="cashflow" className="t-h2">The next twelve months</h3>
          <p className="t-body measure mt-3 text-paper/70">
            Monthly income as each lease comes up. Increases take effect the month after a lease ends, so the lines fan out as the year goes on.
            By {last.label} {last.y}, proposed renewals put you at {money(last.proposed)} a month against {money(last.current)} today.
          </p>
        </div>
        <div className="self-end md:col-span-5">
          <p className="t-micro uppercase tracking-[0.14em] text-ember-3">Extra income over the next twelve months</p>
          <p key={gainProposed} className="wipe-up-now t-display-sm num mt-2 text-paper">+{money(gainProposed)}</p>
          <p className="t-small mt-2 text-paper/70">with renewals capped at {fmtPct(cap, 0)} · +{money(gainBenchmark)} if every renewal went to the benchmark</p>
        </div>
      </div>

      <Chart cf={cf} />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Total label="Do nothing" value={cf.totals.current} tone="bg-paper/40" />
        <Total label={`Proposed renewals (${fmtPct(cap, 0)} cap)`} value={cf.totals.proposed} tone="bg-ember" delta={gainProposed} />
        <Total label="Every renewal at benchmark" value={cf.totals.benchmark} tone="bg-mint-2" delta={gainBenchmark} />
      </div>
    </section>
  );
}

function Total({ label, value, tone, delta }: { label: string; value: number; tone: string; delta?: number }) {
  return (
    <div className="rounded-2xl bg-field-2 px-5 py-4">
      <p className="t-micro flex items-center gap-2 uppercase tracking-[0.14em] text-paper/60"><span className={`inline-block h-2 w-4 rounded-sm ${tone}`} />{label}</p>
      <p className="t-h3 num mt-1">{money(value)}<span className="t-small font-normal text-paper/60"> / 12 mo</span></p>
      {delta !== undefined && <p className={`t-small num mt-0.5 ${delta > 0 ? 'text-mint' : 'text-paper/60'}`}>{delta > 0 ? '+' : ''}{money(delta)}</p>}
    </div>
  );
}

function Chart({ cf }: { cf: ReturnType<typeof cashflowProjection> }) {
  const W = 600, H = 220, padL = 8, padR = 64, padTop = 16, padBot = 32;
  const all = cf.months.flatMap((m) => [m.current, m.proposed, m.benchmark]);
  const lo = Math.min(...all), hi = Math.max(...all);
  const span = hi - lo || 1;
  const min = lo - span * 0.15, max = hi + span * 0.15;
  const x = (i: number) => padL + (i / 11) * (W - padL - padR);
  const y = (v: number) => padTop + (1 - (v - min) / (max - min)) * (H - padTop - padBot);
  const path = (k: 'current' | 'proposed' | 'benchmark') => cf.months.map((m, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(m[k]).toFixed(1)}`).join(' ');
  const last = cf.months[11];
  // three end labels; nudge apart if they collide
  const labels = ([['benchmark', 'var(--color-mint-2)'], ['proposed', 'var(--color-ember)'], ['current', 'rgb(244 239 227 / 0.6)']] as const)
    .map(([k, color]) => ({ k, color, y: y(last[k]), text: fmtUSD(Math.round(last[k])) }))
    .sort((p, q) => p.y - q.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 13) labels[i].y = labels[i - 1].y + 13;

  return (
    <figure className="mt-8 rounded-2xl bg-field-2 p-4 sm:p-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Projected monthly income for the next twelve months under three renewal policies">
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={padL} x2={W - padR} y1={padTop + t * (H - padTop - padBot)} y2={padTop + t * (H - padTop - padBot)} stroke="rgb(244 239 227 / 0.08)" />
        ))}
        <path d={path('current')} fill="none" stroke="rgb(244 239 227 / 0.5)" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />
        <path d={path('benchmark')} fill="none" stroke="var(--color-mint-2)" strokeWidth="2" strokeLinejoin="round" />
        <path d={path('proposed')} fill="none" stroke="var(--color-ember)" strokeWidth="2.5" strokeLinejoin="round" />
        {cf.months.map((m, i) => (
          <text key={i} x={x(i)} y={H - 10} textAnchor={i === 0 ? 'start' : i === 11 ? 'end' : 'middle'} fontSize="12" fill="rgb(244 239 227 / 0.65)">{m.label}</text>
        ))}
        {labels.map((l) => (
          <text key={l.k} x={W - padR + 8} y={l.y + 4} fontSize="12" fill={l.color} className="num">{l.text}</text>
        ))}
      </svg>
      <figcaption className="t-small mt-2 flex flex-wrap gap-4 text-paper/60">
        <span><span className="mr-1 inline-block h-0.5 w-4 border-t-2 border-dashed border-paper/50 align-middle" />Do nothing</span>
        <span><span className="mr-1 inline-block h-2 w-4 rounded-sm bg-ember align-middle" />Proposed renewals</span>
        <span><span className="mr-1 inline-block h-2 w-4 rounded-sm bg-mint-2 align-middle" />Every renewal at benchmark</span>
      </figcaption>
    </figure>
  );
}
