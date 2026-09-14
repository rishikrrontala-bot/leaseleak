import { useEffect, useMemo, useState } from 'react';
import type { Analysis } from '../lib/types';
import { buildLetter, lettersToPdf } from '../lib/letters';
import { fmtUSD, fmtPct, MONTHS_LONG } from '../lib/analyze';

export default function Letters({ analysis: a }: { analysis: Analysis }) {
  const [landlord, setLandlord] = useState(() => { try { return localStorage.getItem('ll.landlord') ?? ''; } catch { return ''; } });
  const [noticeDays, setNoticeDays] = useState(60);
  const [moveToBest, setMoveToBest] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { try { localStorage.setItem('ll.landlord', landlord); } catch { /* private mode */ } }, [landlord]);

  // default selection: everything that ends within 180 days, else everything with a lease end
  useEffect(() => {
    const soon = a.units.filter((u) => u.daysToExpiry !== null && u.daysToExpiry >= 0 && u.daysToExpiry <= 180);
    const pick = (soon.length ? soon : a.units.filter((u) => u.leaseEnd)).map((u) => u.rowIndex);
    setSelected(new Set(pick));
    setPreview(pick[0] ?? null);
  }, [a]);

  const opts = useMemo(() => ({ landlordName: landlord, noticeDays, asOf: a.asOf, moveToBestMonth: moveToBest }), [landlord, noticeDays, a.asOf, moveToBest]);
  const letters = useMemo(() => a.units.filter((u) => selected.has(u.rowIndex)).map((u) => buildLetter(u, opts)), [a.units, selected, opts]);
  const previewLetter = useMemo(() => {
    const u = a.units.find((x) => x.rowIndex === preview);
    return u ? buildLetter(u, opts) : null;
  }, [a.units, preview, opts]);
  const totalIncrease = letters.reduce((s, l) => s + (l.newRent - l.unit.rent) * 12, 0);
  // fairness: the proposed rent as a share of the ZIP's median household income; 30% is the usual affordability line
  const BURDEN_LINE = 0.3;
  const burdened = letters.filter((l) => l.unit.medianIncome && (l.newRent * 12) / l.unit.medianIncome > BURDEN_LINE);
  const withIncome = letters.filter((l) => l.unit.medianIncome).length;

  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <section className="mt-20" aria-labelledby="letters">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h3 id="letters" className="t-h2">Renewal letters, written</h3>
          <p className="t-body measure mt-2 text-paper/70">
            One letter per unit: the new rent (capped, never above the HUD benchmark), a term that ends in the seasonal peak, and the notice language. Edit anything before you send.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="t-small font-medium">Sign as</span>
              <input
                type="text" value={landlord} onChange={(e) => setLandlord(e.target.value)} placeholder="Your name or company"
                className="mt-1 w-full rounded-xl border border-paper/20 bg-field-2 px-4 py-2.5 text-paper placeholder:text-paper/40 focus:border-ember focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-6">
              <label className="block">
                <span className="t-small font-medium">Notice period</span>
                <select value={noticeDays} onChange={(e) => setNoticeDays(parseInt(e.target.value, 10))} className="mt-1 block rounded-xl border border-paper/20 bg-field-2 px-4 py-2.5 text-paper focus:border-ember focus:outline-none">
                  {[30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
                </select>
              </label>
              <label className="flex items-end gap-3 pb-2">
                <input type="checkbox" checked={moveToBest} onChange={(e) => setMoveToBest(e.target.checked)} className="h-5 w-5 accent-ember" />
                <span className="t-small font-medium">Offer a term that ends in the peak month</span>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <p className="t-micro mb-2 uppercase tracking-[0.14em] text-paper/60">Units ({selected.size} selected)</p>
            <ul className="max-h-72 divide-y divide-paper/10 overflow-y-auto rounded-2xl bg-field-2">
              {a.units.filter((u) => u.leaseEnd).map((u) => (
                <li key={u.rowIndex}>
                  <label className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${preview === u.rowIndex ? 'bg-field-3' : ''}`}>
                    <input type="checkbox" checked={selected.has(u.rowIndex)} onChange={() => toggle(u.rowIndex)} className="h-4 w-4 accent-ember" />
                    <button type="button" className="flex flex-1 items-center justify-between text-left" onClick={() => setPreview(u.rowIndex)}>
                      <span className="t-small"><span className="font-semibold">Unit {u.id}</span> <span className="text-paper/60">· {u.tenant ?? 'Resident'}</span></span>
                      <span className="t-small num flex items-center gap-2 text-paper/70">
                        {u.proposedBurden !== null && u.proposedBurden > BURDEN_LINE && (
                          <span className="inline-block h-2 w-2 rounded-full bg-ember" title={`Proposed rent is ${fmtPct(u.proposedBurden, 0)} of the ZIP's median household income`} aria-label="Above the 30% affordability line" />
                        )}
                        {u.suggestedIncrease ? `+${fmtUSD(u.suggestedIncrease)}/mo` : 'no change'}
                      </span>
                    </button>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button" className="btn-solid" disabled={busy || letters.length === 0}
              onClick={async () => { setBusy(true); try { await lettersToPdf(letters); } finally { setBusy(false); } }}
            >
              {busy ? 'Building PDF…' : `Download ${letters.length} letter${letters.length === 1 ? '' : 's'} (PDF)`}
            </button>
            <span className="t-small num text-paper/70">{fmtUSD(Math.round(totalIncrease))}/yr in proposed increases</span>
          </div>

          {withIncome > 0 && (
            <div className="mt-6 rounded-2xl bg-field-2 px-5 py-4">
              <p className="t-micro uppercase tracking-[0.14em] text-paper/60">Fairness check</p>
              {burdened.length === 0 ? (
                <p className="t-small mt-2 text-paper/75">
                  Every proposed rent is under 30% of its ZIP's median household income — the usual affordability line. These are increases a tenant can absorb.
                </p>
              ) : (
                <>
                  <p className="t-small mt-2 text-paper/75">
                    <span className="font-semibold text-ember-3">{burdened.length} of {withIncome}</span> proposed rents would be above 30% of the ZIP's median household income.
                    Those tenants are the likeliest to move — consider a smaller increase or a longer term for them.
                  </p>
                  <ul className="t-small mt-2 flex flex-wrap gap-x-4 gap-y-1 text-paper/60">
                    {burdened.map((l) => <li key={l.unit.rowIndex} className="num">Unit {l.unit.id} · {fmtPct((l.newRent * 12) / l.unit.medianIncome!, 0)}</li>)}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        {/* Paper preview — the material switch */}
        <div className="lg:col-span-7">
          <div className="relative">
            <div className="paper absolute inset-x-6 -bottom-3 top-3 -z-0 rounded-sm opacity-60" aria-hidden="true" />
            <div className="paper absolute inset-x-3 -bottom-1.5 top-1.5 -z-0 rounded-sm opacity-80" aria-hidden="true" />
            <article className="paper relative rounded-sm px-8 py-10 sm:px-12 sm:py-14" aria-live="polite">
              {previewLetter ? (
                <>
                  <p className="t-micro mb-6 uppercase tracking-[0.14em] text-ink-2">Preview · {previewLetter.title}</p>
                  <div className="space-y-4 font-serif text-[1.02rem] leading-relaxed text-ink" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                    {previewLetter.body.split('\n\n').map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
                  </div>
                  <p className="t-micro mt-8 text-ink-2/70">
                    New rent {fmtUSD(previewLetter.newRent)} · {previewLetter.termMonths}-month term{previewLetter.newEnd ? ` ending ${MONTHS_LONG[previewLetter.newEnd.getMonth()]} ${previewLetter.newEnd.getFullYear()}` : ''} · HUD benchmark {fmtUSD(previewLetter.unit.fmr ?? 0)}
                    {previewLetter.unit.medianIncome ? ` · ${fmtPct((previewLetter.newRent * 12) / previewLetter.unit.medianIncome, 0)} of the ZIP's median household income (${fmtUSD(previewLetter.unit.medianIncome)})` : ''}
                  </p>
                </>
              ) : (
                <p className="text-ink-2">Select a unit with a lease end date to preview its letter.</p>
              )}
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
