import { useMemo, useState } from 'react';
import type { Analysis } from '../lib/types';
import { fmtUSD, fmtPct, fmtDate, voucherOpportunity } from '../lib/analyze';

interface Props {
  analysis: Analysis;
}

const money = (n: number) => fmtUSD(Math.round(n));
const SHOW = 8;

// HUD FMR is the basis for the Housing Choice Voucher payment standard. Where a
// unit rents below it, a voucher household could pay up to the standard — most of
// it from the housing authority — so this is a second way to close the gap that
// doesn't involve raising rent on a sitting tenant.
export default function Vouchers({ analysis: a }: Props) {
  const [standardPct, setStandardPct] = useState(1.0);
  const [showAll, setShowAll] = useState(false);
  const v = useMemo(() => voucherOpportunity(a.units, standardPct), [a.units, standardPct]);
  const rows = showAll ? v.rows : v.rows.slice(0, SHOW);
  const states = useMemo(() => Array.from(new Set(a.units.map((u) => u.state).filter(Boolean))) as string[], [a.units]);

  return (
    <section className="mt-20" aria-labelledby="vouchers">
      <div className="grid gap-8 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-7">
          <h3 id="vouchers" className="t-h2">The voucher option</h3>
          <p className="t-body measure mt-3 text-paper/70">
            HUD's Fair Market Rent isn't only a benchmark — it's what Housing Choice Voucher (Section 8) payment standards are built on.
            Where a unit rents below the standard, a voucher household could pay up to it, with the housing authority's share deposited directly every month.
            It's a way to close the gap at turnover without raising rent on a sitting tenant.
          </p>
        </div>
        <div className="self-end md:col-span-5">
          <p className="t-micro uppercase tracking-[0.14em] text-ember-3">More from a voucher tenant, per year</p>
          <p key={`${v.upsideAnnual}`} className="wipe-up-now t-display-sm num mt-2 text-paper">{money(v.upsideAnnual)}</p>
          <p className="t-small mt-2 text-paper/70">
            {v.candidates} of {a.matched} units rent below the payment standard{v.strong > 0 ? ` · ${v.strong} would beat even the lowest standard a housing authority can set` : ''}.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-field-2 px-5 py-4">
        <label htmlFor="standard" className="t-small font-medium">Payment standard</label>
        <input
          id="standard" type="range" min={0.9} max={1.1} step={0.01} value={standardPct}
          onChange={(e) => setStandardPct(parseFloat(e.target.value))}
          className="w-48 accent-ember"
        />
        <span className="num t-small w-28 font-semibold">{fmtPct(standardPct, 0)} of FMR</span>
        <span className="t-small text-paper/60">Each housing authority sets its standard between 90% and 110% of FMR. Look yours up, or leave it at 100%.</span>
      </div>

      {v.candidates === 0 ? (
        <p className="t-body mt-8 text-paper/70">Every matched unit already rents at or above the payment standard — no voucher upside at this setting.</p>
      ) : (
        <>
          <ul className="mt-8 divide-y divide-paper/10 rounded-2xl bg-field-2">
            {rows.map(({ unit: u, standard, upsideMonthly, upsideAnnual }) => (
              <li key={u.rowIndex} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[1fr_11rem_8rem]">
                <div>
                  <p className="font-semibold">Unit {u.id} <span className="font-normal text-paper/60">· {u.property ?? 'Portfolio'}</span></p>
                  <p className="t-small text-paper/70">
                    {u.bedrooms === 0 ? 'Studio' : `${u.bedrooms} BR`} · {u.leaseEnd ? `lease ends ${fmtDate(u.leaseEnd)}` : 'no lease end on file'}
                  </p>
                </div>
                <p className="t-small num hidden text-paper/70 sm:block">
                  {money(u.rent)} <span className="text-paper/40">→</span> {money(standard)}
                  <span className="block text-paper/50">current → standard</span>
                </p>
                <div className="text-right num">
                  <p className="font-semibold text-ember-3">+{money(upsideAnnual)}/yr</p>
                  <p className="t-small text-paper/70">+{money(upsideMonthly)}/mo</p>
                </div>
              </li>
            ))}
          </ul>
          {v.rows.length > SHOW && (
            <button type="button" className="btn-ghost mt-4" onClick={() => setShowAll((s) => !s)}>
              {showAll ? 'Show fewer' : `Show all ${v.rows.length} units`}
            </button>
          )}
        </>
      )}

      <div className="t-small measure mt-6 space-y-2 text-paper/60">
        <p>
          <strong className="text-paper/80">Best used at turnover.</strong> When one of these leases ends and the tenant moves on, list the unit as voucher-welcome at the payment standard. The authority inspects the unit and checks the rent is reasonable against comparable unassisted homes nearby.
        </p>
        <p>
          Payment standards are set by each public housing authority between 90% and 110% of FMR (Small Area FMR areas can go higher with HUD approval).
          {states.length > 0 && ` Many states and cities — check ${states.join(', ')} — make it illegal to turn away a voucher holder under source-of-income laws, so the question is often not whether but how.`}
        </p>
      </div>
    </section>
  );
}
