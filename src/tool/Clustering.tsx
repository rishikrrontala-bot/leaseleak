import { useMemo } from 'react';
import type { Analysis } from '../lib/types';
import { expiryClustering, fmtUSD, fmtPct, MONTHS_LONG } from '../lib/analyze';

const money = (n: number) => fmtUSD(Math.round(n));

// How much of the portfolio's income comes up for renewal in one month, and what
// the calendar would look like if renewals were spread across the three strongest
// seasonal months instead of piling into one.
export default function Clustering({ analysis: a, curve }: { analysis: Analysis; curve: number[] }) {
  const c = useMemo(() => expiryClustering(a, curve), [a, curve]);
  if (!c.peak) return null;
  const peakUnits = c.peak.count;
  const withEnd = a.units.filter((u) => u.leaseEnd).length;
  const concentrated = c.peak.share >= 0.2;
  const maxCount = Math.max(1, ...c.months.map((m) => m.count), ...c.staggered);

  return (
    <div className="mt-10 grid gap-8 rounded-2xl bg-field-2 p-5 sm:p-6 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <p className="t-micro uppercase tracking-[0.14em] text-paper/60">Concentration</p>
        <p className="t-h3 mt-2">
          {peakUnits} of {withEnd} leases end in {MONTHS_LONG[c.peak.m]}{concentrated ? ' — that’s a lot at once.' : '.'}
        </p>
        <p className="t-body mt-3 text-paper/75">
          That's <span className="num font-semibold text-paper">{fmtPct(c.peak.share, 0)}</span> of your monthly income up for renewal in one month.
          If the two largest don't renew, you're down <span className="num font-semibold text-ember-3">{money(c.lossIfTwoLeave)}</span> that month while you re-let.
        </p>
        <p className="t-small mt-3 text-paper/60">
          {c.improves
            ? `Spreading renewals across ${c.topMonths.map((m) => MONTHS_LONG[m]).join(', ')} — the above-average months in your ZIPs — would cap any one month at ${fmtPct(c.staggeredPeakShare, 0)} of income. Choose 6–18-month terms so leases land there.`
            : `Your calendar is already well spread — no month carries more than ${fmtPct(c.peak.share, 0)}. Keep it that way as you renew: aim for the above-average months (${c.topMonths.map((m) => MONTHS_LONG[m].slice(0, 3)).join(', ')}) without piling into one.`}
        </p>
      </div>
      <div className="lg:col-span-7">
        <Rows label="Today" counts={c.months.map((m) => m.count)} months={c.months} max={maxCount} tone="bg-ember" />
        {c.improves && <Rows label="Staggered" counts={c.staggered} months={c.months} max={maxCount} tone="bg-mint-2" className="mt-4" />}
      </div>
    </div>
  );
}

function Rows({ label, counts, months, max, tone, className = '' }: { label: string; counts: number[]; months: { label: string; share: number }[]; max: number; tone: string; className?: string }) {
  return (
    <div className={className}>
      <p className="t-micro mb-2 uppercase tracking-[0.14em] text-paper/60">{label}</p>
      <div className="grid grid-cols-12 items-end gap-1" style={{ height: 64 }} role="img" aria-label={`${label}: leases ending per month`}>
        {counts.map((n, i) => (
          <div key={i} className="flex h-full flex-col justify-end">
            {n > 0 && <span className="num t-micro mb-0.5 text-center text-paper/70">{n}</span>}
            <div className={`w-full rounded-sm ${n ? tone : 'bg-paper/10'}`} style={{ height: n ? `${Math.max(8, (n / max) * 44)}px` : 2 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-12 gap-1">
        {months.map((m, i) => <span key={i} className="t-micro text-center text-paper/50">{m.label}</span>)}
      </div>
    </div>
  );
}
