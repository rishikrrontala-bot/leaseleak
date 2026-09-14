import { useState } from 'react';
import type { Analysis } from '../lib/types';
import { fmtUSD, fmtPct, valueAtCap } from '../lib/analyze';

interface Props {
  analysis: Analysis;
  cap: number;
}

const money = (n: number) => fmtUSD(Math.round(n));

// What the rent gap is worth as building value. Income property is priced on
// NOI ÷ cap rate, so the same $/yr shows up as a much larger $ of equity.
export default function Equity({ analysis: a, cap }: Props) {
  const [capRate, setCapRate] = useState(0.06);
  const fullValue = valueAtCap(a.totalGapAnnual, capRate);
  const cycleValue = valueAtCap(a.recoverableAtCap, capRate);
  const perDollar = valueAtCap(1, capRate);

  return (
    <section className="mt-16" aria-labelledby="equity">
      <div className="grid gap-8 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-7">
          <p id="equity" className="t-micro uppercase tracking-[0.14em] text-mint">What the gap is worth</p>
          <div className="mt-3">
            <p key={`${a.totalGapAnnual}-${capRate}`} className="wipe-up-now t-display-sm num text-paper">{money(fullValue)}</p>
          </div>
          <p className="t-lead measure mt-5 text-paper/80">
            of building value, unrealised. Income property is priced on net operating income divided by a cap rate — at {fmtPct(capRate, 2)}, every $1 of yearly rent you recover adds about {fmtUSD(perDollar, { cents: true })} to what the building is worth.
          </p>
        </div>
        <div className="grid gap-4 self-end sm:grid-cols-2 md:col-span-5 md:grid-cols-1">
          <div className="rounded-2xl bg-field-2 px-5 py-4">
            <p className="t-micro uppercase tracking-[0.14em] text-paper/60">Added this renewal cycle</p>
            <p className="t-h2 num mt-1">{money(cycleValue)}</p>
            <p className="t-small mt-1 text-paper/60">if the increases capped at {fmtPct(cap, 0)} hold through the year</p>
          </div>
          <div className="rounded-2xl bg-field-2 px-5 py-4">
            <p className="t-micro uppercase tracking-[0.14em] text-paper/60">Per dollar of rent</p>
            <p className="t-h2 num mt-1">{fmtUSD(perDollar, { cents: true })}</p>
            <p className="t-small mt-1 text-paper/60">of value for each $1/yr of income at a {fmtPct(capRate, 2)} cap rate</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-field-2 px-5 py-4">
        <label htmlFor="caprate" className="t-small font-medium">Cap rate</label>
        <input
          id="caprate" type="range" min={0.04} max={0.10} step={0.0025} value={capRate}
          onChange={(e) => setCapRate(parseFloat(e.target.value))}
          className="w-48 accent-mint-2"
        />
        <span className="num t-small w-14 font-semibold">{fmtPct(capRate, 2)}</span>
        <span className="t-small text-paper/60">Small multifamily typically trades at 5–8%. A lower cap rate means each dollar of rent is worth more. Assumes the added rent flows through to NOI.</span>
      </div>
    </section>
  );
}
