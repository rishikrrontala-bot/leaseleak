import { useMemo, useState } from 'react';
import type { Analysis } from '../lib/types';
import { fmtUSD, fmtPct, retention, RETENTION_DEFAULTS } from '../lib/analyze';

const money = (n: number) => fmtUSD(Math.round(n));
const SHOW = 6;

// Every other number on the page assumes the tenant stays. This one prices the
// chance they don't: vacancy, make-ready, and the re-let at benchmark, blended
// into an expected gain — and the leave rate at which the increases stop paying.
export default function Retention({ analysis: a, cap }: { analysis: Analysis; cap: number }) {
  const [leaveRate, setLeaveRate] = useState(RETENTION_DEFAULTS.leaveRate);
  const [vacancyMonths, setVacancyMonths] = useState(RETENTION_DEFAULTS.vacancyMonths);
  const [makeReady, setMakeReady] = useState(RETENTION_DEFAULTS.makeReady);
  const [showAll, setShowAll] = useState(false);
  const r = useMemo(() => retention(a.units, { leaveRate, vacancyMonths, makeReady }), [a.units, leaveRate, vacancyMonths, makeReady]);
  if (r.offered === 0) return null;
  const rows = showAll ? r.rows : r.rows.slice(0, SHOW);
  const haircut = r.gross ? 1 - r.expected / r.gross : 0;
  const expectedLeavers = Math.round(r.offered * leaveRate);

  return (
    <section className="mt-20" aria-labelledby="retention">
      <div className="grid gap-8 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-7">
          <h3 id="retention" className="t-h2">If they leave</h3>
          <p className="t-body measure mt-3 text-ink/70">
            The numbers above assume every tenant renews. Some won't. A move-out means a month or so of no rent and a make-ready bill — but the unit re-lets at the benchmark, which on an under-market unit is often worth more than the increase you were offering.
            This is the same {r.offered} increases with that priced in.
          </p>
        </div>
        <div className="self-end md:col-span-5">
          <p className="eyebrow text-ember-3">Expected gain, net of turnover</p>
          <p key={Math.round(r.expected)} className="wipe-up-now t-display-sm num mt-2 text-ink">{money(r.expected)}</p>
          <p className="t-small mt-2 text-ink/70">
            against {money(r.gross)} if everyone stays{haircut > 0.005 ? ` — a ${fmtPct(haircut, 0)} haircut` : ''}.
            {r.breakEvenLeaveRate !== null
              ? ` You still come out ahead until about ${fmtPct(r.breakEvenLeaveRate, 0)} of tenants leave.`
              : ' Even if every tenant left, re-letting at the benchmark would leave you ahead.'}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-3 rounded-2xl bg-canvas-2 px-5 py-4 sm:grid-cols-3">
        <Control id="leave" label="Tenants who leave" value={`${fmtPct(leaveRate, 0)} · ~${expectedLeavers} of ${r.offered}`} min={0} max={0.5} step={0.01} v={leaveRate} set={setLeaveRate} hint={`Small landlords see 10–20% turnover a year; a ${fmtPct(cap, 0)} increase nudges it up.`} />
        <Control id="vacancy" label="Months vacant" value={`${vacancyMonths.toFixed(1)} mo`} min={0} max={3} step={0.5} v={vacancyMonths} set={setVacancyMonths} hint="Between the old tenant's last day and the new one's first rent." />
        <Control id="makeready" label="Make-ready cost" value={money(makeReady)} min={0} max={5000} step={100} v={makeReady} set={setMakeReady} hint="Cleaning, paint, small repairs, listing. Per move-out." />
      </div>

      <ul className="mt-8 divide-y divide-ink/10 rounded-2xl bg-canvas-2">
        {rows.map(({ unit: u, increase, gainStay, gainLeave, turnoverCost, paybackMonths }) => (
          <li key={u.rowIndex} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[1fr_9rem_9rem_8rem]">
            <div>
              <p className="font-medium">Unit {u.id} <span className="font-normal text-ink/60">· {u.property ?? 'Portfolio'}</span></p>
              <p className="t-small text-ink/70">+{money(increase)}/mo · {fmtPct(increase / u.rent, 1)} increase · {u.tenant ?? 'resident'}</p>
            </div>
            <p className="t-small num hidden text-ink/70 sm:block">{money(gainStay)}<span className="block text-ink/50">if they stay</span></p>
            <p className={`t-small num hidden sm:block ${gainLeave < 0 ? 'text-ember-3' : 'text-mint'}`}>{gainLeave < 0 ? '−' : '+'}{money(Math.abs(gainLeave))}<span className="block text-ink/50">if they leave</span></p>
            <div className="text-right num">
              <p className={`font-medium ${paybackMonths > 12 ? 'text-ember-3' : 'text-ink'}`}>{paybackMonths >= 99 ? '99+' : paybackMonths.toFixed(0)} mo</p>
              <p className="t-small text-ink/60">to recoup {money(turnoverCost)}</p>
            </div>
          </li>
        ))}
      </ul>
      {r.rows.length > SHOW && (
        <button type="button" className="btn-ghost mt-4" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Show fewer' : `Show all ${r.rows.length} units`}
        </button>
      )}
      <p className="t-small measure mt-6 text-ink/60">
        Sorted by payback: the top rows are where a move-out hurts most relative to the increase. Ember means a move-out costs more than a year of the increase — those are the tenants to offer a longer term or a smaller step. Re-let rent assumes the HUD benchmark; your market may be higher.
      </p>
    </section>
  );
}

function Control({ id, label, value, min, max, step, v, set, hint }: { id: string; label: string; value: string; min: number; max: number; step: number; v: number; set: (n: number) => void; hint: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="t-small font-medium">{label}</label>
        <span className="num t-small font-semibold">{value}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(parseFloat(e.target.value))} className="mt-2 w-full accent-ember" />
      <p className="t-micro mt-1 text-ink/55">{hint}</p>
    </div>
  );
}
