import { useEffect, useMemo, useState } from 'react';
import type { Analysis } from '../lib/types';
import { aiAvailable, askRoll, buildBrief, fetchPlan, verify, type AskOut, type PlanOut } from '../lib/ai';
import { asset } from '../lib/router';
import { ArrowDR } from '../ui/Icons';

// Plans for the two built-in sample rolls were generated once by the live model and
// shipped as data, so the demo never depends on that day's API quota. Anything you
// upload is always live, and ?live=1 forces the samples live too.
interface CachedPlan { plan: PlanOut; model: string; generatedOn: string }
const liveOnly = () => new URLSearchParams(window.location.search).has('live');

const SUGGESTED = [
  'Which increases would you skip, and why?',
  'What should I do this month?',
  'Which building should I work on first?',
  'Who should I offer a longer lease to?',
  'Where does a voucher tenant make sense?',
];

// The advisor. The engine has already computed every number on this page; the
// model reads them and writes the plan. Nothing is sent until you ask, and
// tenant names never leave the browser. Every figure in the reply is checked
// back against the engine's numbers before it's shown.
export default function Plan({ analysis: a, cap, curve, sampleId = null }: { analysis: Analysis; cap: number; curve: number[]; sampleId?: string | null }) {
  const brief = useMemo(() => buildBrief(a, cap, curve), [a, cap, curve]);
  const [plan, setPlan] = useState<PlanOut | null>(null);
  const [model, setModel] = useState<string>('');
  const [cachedOn, setCachedOn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [thread, setThread] = useState<{ q: string; a: AskOut; model: string }[]>([]);
  const [asking, setAsking] = useState(false);

  // Sample roll → show the pre-generated plan instantly (unless ?live=1).
  // The component is keyed on the file in Results, so state resets per roll on its own.
  useEffect(() => {
    if (!sampleId || liveOnly() || !aiAvailable()) return;
    let cancelled = false;
    fetch(asset('/data/sample-plans.json')).then((r) => (r.ok ? r.json() : null)).then((j: Record<string, CachedPlan> | null) => {
      const c = j?.[sampleId];
      if (c && !cancelled) { setPlan(c.plan); setModel(c.model); setCachedOn(c.generatedOn); }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [sampleId]);

  if (!aiAvailable()) return null;

  const planText = plan ? [plan.headline, ...plan.actions.flatMap((x) => [x.title, x.why]), ...plan.skip, plan.caution].join('\n') : '';
  const check = plan ? verify(planText, brief) : null;

  const writePlan = async () => {
    setBusy(true); setError(null);
    try { const r = await fetchPlan(brief); setPlan(r.data); setModel(r.model); setCachedOn(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not reach the advisor.'); }
    finally { setBusy(false); }
  };
  const ask = async (question: string) => {
    if (!question.trim() || asking) return;
    setAsking(true); setError(null); setQ('');
    try {
      const r = await askRoll(brief, question, thread.map((t) => ({ q: t.q, a: t.a.answer })));
      setThread((t) => [...t, { q: question, a: r.data, model: r.model }]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not reach the advisor.'); }
    finally { setAsking(false); }
  };

  return (
    <section className="mt-16" aria-labelledby="plan">
      <div className="paper rounded-2xl p-6 sm:p-8">
        {!plan ? (
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <p className="eyebrow text-ink-2">Your plan</p>
              <h3 id="plan" className="t-h3 mt-2">Turn these numbers into three things to do this month.</h3>
              <p className="t-small mt-3 max-w-[60ch] text-ink-2">
                The advisor reads every figure on this page — all computed here in your browser from HUD, Zillow and Census data — and writes a short, prioritised memo.
                It can only cite numbers the engine produced; each one is checked back before it's shown.
                <strong className="text-ink"> Unit figures are sent to the model when you click; tenant names never are.</strong>
              </p>
            </div>
            <div className="md:col-span-4 md:text-right">
              <button type="button" className="btn-ink !px-6 !py-3" onClick={writePlan} disabled={busy}>
                {busy ? 'Reading your roll…' : 'Write my plan'} {!busy && <ArrowDR />}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-ink-2">Your plan</p>
                <h3 id="plan" className="serif mt-2 text-[1.6rem] leading-snug text-ink sm:text-[1.9rem]">{plan.headline}</h3>
              </div>
              <button type="button" className="btn-ghost !py-2 !text-[0.85rem]" onClick={writePlan} disabled={busy}>{busy ? 'Rewriting…' : cachedOn ? 'Rewrite live' : 'Rewrite'}</button>
            </div>

            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {plan.actions.map((x, i) => (
                <li key={i} className="rounded-xl bg-canvas px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="btn-circle num !h-8 !w-8 text-[0.75rem]">0{i + 1}</span>
                    <span className="eyebrow text-ink/55">{x.when}</span>
                  </div>
                  <h4 className="mt-3 font-medium leading-snug">{x.title}</h4>
                  <p className="t-small mt-2 text-ink-2">{x.why}</p>
                  {x.units.length > 0 && <p className="t-micro mt-3 text-ink/55">{x.units.map((u) => (/^\d|^[A-Z]?\d/.test(u) ? `Unit ${u}` : u)).join(' · ')}</p>}
                </li>
              ))}
            </ol>

            <div className="mt-6 grid gap-6 md:grid-cols-12">
              {plan.skip.length > 0 && (
                <div className="md:col-span-7">
                  <p className="eyebrow text-ember-3">Skip</p>
                  <ul className="t-small mt-2 space-y-1.5 text-ink-2">
                    {plan.skip.map((s, i) => <li key={i} className="flex gap-2"><span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />{s}</li>)}
                  </ul>
                </div>
              )}
              <div className={plan.skip.length > 0 ? 'md:col-span-5' : 'md:col-span-12'}>
                <p className="eyebrow text-ink/55">Caution</p>
                <p className="t-small mt-2 text-ink-2">{plan.caution}</p>
              </div>
            </div>

            {check && (
              <p className={`t-micro mt-6 flex items-center gap-2 ${check.unverified.length ? 'text-ember-3' : 'text-mint'}`}>
                <span aria-hidden="true">{check.unverified.length ? '△' : '✓'}</span>
                {check.verified} of {check.total} figures in this memo trace to the engine
                {check.unverified.length ? ` — could not verify: ${check.unverified.slice(0, 4).join(', ')}` : ''}.
                <span className="text-ink/45"> Written by {model || 'Gemini'}{cachedOn ? ` on ${cachedOn} for this sample roll — press Rewrite live for a fresh one` : ''}; computed by LeaseLeak.</span>
              </p>
            )}
          </>
        )}

        {/* Ask */}
        <div className={`${plan ? 'mt-8 border-t border-ink/10 pt-6' : 'mt-6 border-t border-ink/10 pt-6'}`}>
          {thread.length > 0 && (
            <ol className="mb-5 space-y-4">
              {thread.map((t, i) => {
                const v = verify(t.a.answer, brief);
                return (
                  <li key={i}>
                    <p className="t-small font-medium">{t.q}</p>
                    <p className="t-body mt-1 text-ink-2">{t.a.answer}</p>
                    <p className="t-micro mt-1 text-ink/50">
                      {t.a.confidence}{v.total ? ` · ${v.verified}/${v.total} figures verified` : ''}{v.unverified.length ? ` · unverified: ${v.unverified.slice(0, 3).join(', ')}` : ''} · {t.model}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
          <form className="flex flex-wrap items-center gap-3" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
            <input
              type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder={plan ? 'Ask about your roll…' : 'Or ask a question about your roll…'} aria-label="Ask about your roll"
              className="min-w-0 flex-1 rounded-full border border-ink/15 bg-white px-5 py-2.5 text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none"
              disabled={asking}
            />
            <button type="submit" className="btn-ink" disabled={asking || !q.trim()}>{asking ? 'Thinking…' : 'Ask'}</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button key={s} type="button" className="rounded-full border border-ink/12 bg-white/60 px-3 py-1.5 t-micro text-ink/75 hover:border-ink hover:text-ink disabled:opacity-50" onClick={() => void ask(s)} disabled={asking}>{s}</button>
            ))}
          </div>
          {error && <p role="alert" className="t-small mt-3 text-ember-3">{error}</p>}
        </div>
      </div>
    </section>
  );
}
