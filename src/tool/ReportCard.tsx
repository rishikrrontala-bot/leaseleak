import { useMemo } from 'react';
import type { Analysis } from '../lib/types';
import { buildingCards, fmtUSD, fmtPct, type Grade } from '../lib/analyze';
import MomentumBadge from './MomentumBadge';

const money = (n: number) => fmtUSD(Math.round(n));

const GRADE_TONE: Record<Grade, string> = {
  A: 'text-mint', B: 'text-mint', C: 'text-ink', D: 'text-ember-3', F: 'text-ember',
};

// One grade per property so a portfolio owner knows where to start. Grade is the
// share of gross income being left on the table; the line under it says why.
export default function ReportCard({ analysis: a }: { analysis: Analysis }) {
  const cards = useMemo(() => buildingCards(a), [a]);
  if (cards.length < 2) return null; // a single building is already the whole page

  return (
    <section className="mt-20" aria-labelledby="buildings">
      <div className="mb-6">
        <h3 id="buildings" className="t-h2">Building by building</h3>
        <p className="t-body measure mt-2 text-ink/70">
          Graded on the share of gross rent left on the table. Worst first — this is the order to work in.
        </p>
      </div>
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c, i) => (
          <li key={c.property} className="grid grid-cols-[4.5rem_1fr] gap-4 rounded-2xl bg-canvas-2 p-5">
            <div className="text-center">
              <p className={`t-display-sm num leading-none ${GRADE_TONE[c.grade]}`}>{c.grade}</p>
              <p className="t-micro mt-2 text-ink/50">#{i + 1}</p>
            </div>
            <div className="min-w-0">
              <h4 className="t-h3 truncate">{c.property}</h4>
              <p className="t-small text-ink/60">{c.city && c.state ? `${c.city}, ${c.state} · ` : ''}ZIP {c.zip} · {c.units.length} units</p>
              <p className="num mt-3 text-[1.35rem] font-semibold leading-tight">
                <span className={c.perDoor > 0 ? 'text-ember-3' : 'text-mint'}>{money(c.perDoor)}</span>
                <span className="t-small font-normal text-ink/60"> per door, per year</span>
              </p>
              <p className="t-small mt-2 text-ink/75">
                {c.matched === 0
                  ? 'No HUD benchmark for this ZIP.'
                  : c.under === 0
                    ? 'Every unit at or above the benchmark.'
                    : `${c.under} of ${c.matched} units under benchmark, averaging ${fmtPct(c.avgBelow, 0)} below — ${fmtPct(c.leakPct, 1)} of gross rent.`}
                {c.withEnd > 0 && c.badTiming > 0 && ` ${c.badTiming} of ${c.withEnd} leases end in a below-average month.`}
              </p>
              {c.momentum && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <MomentumBadge yoy={c.yoy} />
                  <span className="t-small text-ink/60">{c.momentum.advice}</span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
