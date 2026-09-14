import { useEffect, useRef } from 'react';
import { Link, asset } from '../lib/router';
import { useRevealAll } from '../lib/reveal';
import { preloadData } from '../lib/analyze';
import Nav from '../ui/Nav';
import { Logo } from '../ui/Logo';
import { Arrow, ArrowDR } from '../ui/Icons';

/** Horizontal transit: vertical scroll drives lateral movement of a row. */
function useTransit(range = 240) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      el.style.transform = `translate3d(${(0.5 - p) * range}px,0,0)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [range]);
  return ref;
}

/** The hero photo drifts a little slower than the page — depth without a 3D scene. */
function useParallax(factor = 0.18) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const update = () => { raf = 0; el.style.transform = `translate3d(0,${window.scrollY * factor}px,0) scale(1.06)`; };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [factor]);
  return ref;
}

export default function Landing() {
  const root = useRevealAll<HTMLDivElement>();
  const transit = useTransit(260);
  const parallax = useParallax();
  useEffect(() => { const t = setTimeout(preloadData, 2500); return () => clearTimeout(t); }, []);

  return (
    <div ref={root} className="relative">
      <Nav current="home" />

      {/* ============ 1 · HERO — one scene, one line of serif, one line of sans ============ */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <div ref={parallax} className="photo scene absolute inset-0">
          <img src={asset("/photos/duplex.jpg")} alt="A wide brick duplex with yellow-trimmed windows and two matching front doors, set behind a lawn on an overcast day" width={2000} height={1500} loading="eager" fetchPriority="high" />
        </div>
        {/* a soft pool of light behind the words */}
        <div className="pointer-events-none absolute inset-0 z-[1]" style={{ background: 'radial-gradient(60% 50% at 50% 52%, rgb(237 228 224 / 0.88), rgb(237 228 224 / 0.35) 60%, rgb(237 228 224 / 0) 80%)' }} aria-hidden="true" />

        <div className="relative z-[2] flex min-h-[100svh] flex-col items-center justify-center px-5 pb-28 pt-24 text-center sm:px-8">
          <div className="is-in" data-reveal>
            <p className="eyebrow text-ink/70"><span className="wipe-line">A rent-roll audit for small landlords</span></p>
            <h1 className="mt-5">
              <span className="block"><span className="t-hero-serif wipe-line">Your rent roll</span></span>
              <span className="-mt-[0.08em] block"><span className="t-hero-sans wipe-line">is leaking money.</span></span>
            </h1>
            <p className="t-body mx-auto mt-7 max-w-[44ch] text-ink/75">
              Drop it in. Five seconds later: how much rent you're under the HUD benchmark, which leases end in the wrong month, the renewal letters — written — and a plan for the month.
            </p>
            <div className="mt-9 flex flex-col items-center gap-4">
              <Link to="/app" className="btn-solid !px-6 !py-3 !text-base">Drop your rent roll <ArrowDR /></Link>
              <Link to="/app" className="t-small text-ink/70 underline decoration-ink/30 underline-offset-4 hover:text-ink">or see the sample portfolio</Link>
            </div>
          </div>
        </div>

        {/* bottom bar */}
        <div className="absolute inset-x-5 bottom-6 z-[2] grid grid-cols-2 items-center gap-4 sm:inset-x-8 sm:grid-cols-3">
          <Link to="/app" className="btn-ghost justify-self-start bg-white/60 !py-2 !text-[0.85rem] backdrop-blur-sm">
            <span className="num font-semibold">$29,280</span><span className="text-ink/70">on the sample roll</span>
          </Link>
          <p className="eyebrow hidden justify-self-center text-ink/60 sm:block">HUD <span className="mx-2 text-ember">⊕</span> Zillow <span className="mx-2 text-ember">⊕</span> Census</p>
          <p className="t-small justify-self-end text-ink/60">©2026</p>
        </div>
      </section>

      {/* ============ marquee strip ============ */}
      <div className="relative overflow-hidden border-y border-ink/10 py-3" aria-hidden="true">
        <div className="marquee eyebrow text-ink/55">
          {[0, 1].map((k) => (
            <span key={k} className="flex shrink-0 gap-12">
              {['38,601 ZIP codes', 'HUD Fair Market Rents · FY2027', 'Zillow ZORI · Jul 2026', 'Census ACS · median income', 'Studio to 4+ bedrooms', 'Your file never leaves your browser', 'CSV or Excel', 'Letters in one click', 'A plan, written by Gemini, checked by the engine'].map((t) => (
                <span key={t} className="flex items-center gap-12"><span>{t}</span><span className="h-1 w-1 rounded-full bg-ember" /></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ============ 2 · THE NUMBER ============ */}
      <section className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 md:py-36">
        <div className="text-center" data-reveal>
          <p className="eyebrow text-ink/60">The number</p>
          <h2 className="t-h2 mt-4"><span className="block"><span className="serif wipe-line font-normal">One file in.</span></span><span className="block"><span className="wipe-line">One number out.</span></span></h2>
          <p className="t-body mx-auto mt-6 max-w-[52ch] text-ink/75">
            Every unit is matched to the U.S. Department of Housing and Urban Development's Fair Market Rent for its exact ZIP code and bedroom count. The gap between that and what you're charging, summed and annualised, is the number.
          </p>
        </div>
        <div className="mx-auto mt-14 max-w-3xl" data-reveal>
          <div className="wipe paper rounded-2xl p-7 sm:p-10">
            <p className="eyebrow text-ember-3">Rent left on the table, per year</p>
            <p className="t-display-sm num mt-3">$29,280</p>
            <p className="t-body mt-3 text-ink-2">12 of 16 units rent below HUD's FY2027 Fair Market Rent. 4 are at or above it.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[['Recoverable this cycle', '$12,540', 'increases capped at 6%'], ['Lease-timing value', '$6,581', 'if every lease ended in August'], ['Building value', '$488,000', 'at a 6% cap rate']].map(([l, v, s]) => (
                <div key={l} className="rounded-xl bg-canvas px-4 py-3"><p className="eyebrow text-ink/55">{l}</p><p className="t-h3 num mt-1">{v}</p><p className="t-micro text-ink/55">{s}</p></div>
              ))}
            </div>
            <p className="t-micro mt-5 text-ink/50">Sample portfolio · 16 units in Austin, Columbus and Pittsburgh · real FY2027 benchmarks</p>
          </div>
          <p className="t-small mx-auto mt-6 max-w-[56ch] text-center text-ink/60">
            A conservative floor: Fair Market Rent is the 40th percentile of local rents. If you're under it, six in ten comparable homes rent for more than yours.
          </p>
        </div>
      </section>

      {/* ============ 2b · THE PLAN — what the AI does, and what it can't ============ */}
      <section className="border-t border-ink/10">
        <div className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 md:py-36">
          <div className="grid gap-10 md:grid-cols-12 md:items-start">
            <div className="md:col-span-5" data-reveal>
              <p className="eyebrow text-ink/60">Then the plan</p>
              <h2 className="t-h2 mt-4"><span className="block"><span className="serif wipe-line font-normal">Numbers are the easy part.</span></span><span className="block"><span className="wipe-line">Knowing what to do isn't.</span></span></h2>
              <p className="t-body mt-6 max-w-[46ch] text-ink/75">
                Every dollar on the page is computed here, in your browser, from public data. Then Gemini reads the whole picture — gaps, timing, grades, turnover risk, vouchers, fairness — and writes three things to do this month, in order, with the figures that justify each.
              </p>
              <p className="t-body mt-4 max-w-[46ch] text-ink/75">
                The model computes nothing. It can only cite numbers the engine produced, and each one is checked back before you see it. Ask it a question and it answers the same way.
              </p>
              <ul className="t-small mt-6 space-y-2 text-ink/70">
                <li className="flex gap-3"><span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-mint-2" />Code decides every number: benchmark, gap, term, letter, grade.</li>
                <li className="flex gap-3"><span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />AI decides what matters most and says it plainly — and reads exports our parser can't.</li>
                <li className="flex gap-3"><span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />Tenant names never leave your browser. Unit figures are sent only when you click.</li>
              </ul>
            </div>
            <div className="md:col-span-7" data-reveal>
              <div className="wipe paper rounded-2xl p-6 sm:p-8">
                <p className="eyebrow text-ink-2">Your plan · sample portfolio</p>
                <p className="serif mt-2 text-[1.5rem] leading-snug text-ink">Five leases end in the next 90 days and four of them are under benchmark — that's where $29,280 a year starts to come back.</p>
                <ol className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ['this week', 'Send the October letters', 'Units 3 and A1 end October 15 and 31. At the 6% cap that\'s +$85 and +$105 a month, both still under the HUD benchmark.'],
                    ['at renewal', 'Skip the $30 bump on A3', 'A move-out there costs about $3,200 and takes 107 months of the increase to recoup. Offer a longer term instead.'],
                    ['at turnover', 'List Unit 5 voucher-welcome', 'At $1,100 it is $230 a month under the payment standard — $2,760 a year more from a voucher household, paid direct.'],
                  ].map(([when, title, why]) => (
                    <li key={title} className="rounded-xl bg-canvas px-4 py-4">
                      <p className="eyebrow text-ink/55">{when}</p>
                      <p className="mt-2 font-medium leading-snug">{title}</p>
                      <p className="t-small mt-2 text-ink-2">{why}</p>
                    </li>
                  ))}
                </ol>
                <p className="t-micro mt-5 flex items-center gap-2 text-mint"><span aria-hidden="true">✓</span>9 of 9 figures in this memo trace to the engine.<span className="text-ink/45"> Written by Gemini; computed by LeaseLeak.</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 3 · METHOD ============ */}
      <section id="method" className="border-t border-ink/10">
        <div className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 md:py-36">
          <div className="text-center" data-reveal>
            <p className="eyebrow text-ink/60">Method</p>
            <h2 className="t-h2 mt-4"><span className="wipe-line">How it</span> <span className="serif wipe-line font-normal">works</span></h2>
          </div>
          <ol className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-5" data-reveal>
            {[
              ['Match', 'Each row of your roll is matched to HUD\'s Small Area Fair Market Rent for its ZIP and bedroom count — 38,601 ZIPs, studio to 4+ bedrooms, fiscal year 2027.'],
              ['Measure', 'Benchmark minus rent, per unit, per month. Units above the benchmark count for nothing; units below count twelve times.'],
              ['Time', 'Zillow\'s rent index for your ZIP becomes a 12-month seasonal curve. A lease ending in the trough re-signs at the trough; we quantify it and pick a term that ends at the peak.'],
              ['Write', 'One renewal letter per unit: the new rent (capped, never above the benchmark), the term, the notice language. Download all as a PDF.'],
              ['Plan', 'Gemini reads every figure the engine produced and writes three things to do this month. It can only cite numbers that exist — each one is checked back against the engine before you see it.'],
            ].map(([h, p], i) => (
              <li key={h}>
                <span className="btn-circle num !h-9 !w-9 text-[0.8rem] font-medium">0{i + 1}</span>
                <h3 className="t-h3 mt-5">{h}</h3>
                <p className="t-small mt-2 text-ink/70">{p}</p>
              </li>
            ))}
          </ol>

          <div className="mx-auto mt-16 max-w-3xl" data-reveal>
            <div className="wipe paper rounded-2xl px-6 py-6 font-mono text-[0.9rem] leading-relaxed sm:px-8">
              <p className="eyebrow mb-3 text-ink-2">The whole model</p>
              <p>gap<sub>unit</sub> = max(0, SAFMR<sub>zip,br</sub> − rent) × 12</p>
              <p>timing<sub>unit</sub> = rent × (idx<sub>peak</sub> ÷ idx<sub>lease end</sub> − 1) × 12</p>
              <p>renewal = min(SAFMR<sub>zip,br</sub>, rent × (1 + cap))</p>
              <p>value = Σ gap ÷ cap rate</p>
              <p>voucher<sub>unit</sub> = max(0, SAFMR<sub>zip,br</sub> × standard − rent) × 12</p>
              <p className="mt-3 text-ink-2">plan = Gemini(brief) · where brief ⊂ engine output, and every figure in plan ∈ brief</p>
            </div>
          </div>

          <div className="mt-24 md:mt-32" data-reveal>
            <div className="text-center">
              <p className="eyebrow text-ink/60">And on the same page</p>
              <h3 className="t-h3 mt-3">Nine more reads of the same roll — <span className="serif text-[1.15em] font-normal">no extra input.</span></h3>
            </div>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Equity', 'The gap priced as building value: annual rent ÷ cap rate. $29,280 a year is about $488,000 at 6%.'],
                ['Vouchers', 'Units below the Section 8 payment standard would earn more from a voucher household — a way to close the gap at turnover.'],
                ['Twelve months', 'Monthly income as each lease turns, under three policies: do nothing, proposed renewals, every renewal at benchmark.'],
                ['Building grades', 'One grade per property on the share of rent left on the table, worst first — the order to work in.'],
                ['Momentum', 'Each ZIP\'s year-over-year asking-rent move, and what it means: push now, hold steady, or favour retention.'],
                ['Concentration', 'How much income comes up for renewal in one month, and a staggered calendar when it would help.'],
                ['Utilities', 'Mark a building "we pay utilities" and the benchmark comparison adjusts, so the gap isn\'t overstated.'],
                ['Fairness', 'Every proposed rent against the ZIP\'s median household income. Above 30% gets flagged before you send.'],
                ['If they leave', 'Every increase priced with move-out risk: vacancy, make-ready, the re-let at benchmark — and the leave rate where it stops paying.'],
              ].map(([h, p]) => (
                <li key={h} className="rounded-2xl bg-white/50 p-5 ring-1 ring-ink/8">
                  <h4 className="font-medium">{h}</h4>
                  <p className="t-small mt-1.5 text-ink/65">{p}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============ 4 · PROOF — numbers over a washed photo ============ */}
      <section className="relative overflow-hidden">
        <div className="photo photo--tint absolute inset-0">
          <img src={asset("/photos/brownstones.jpg")} alt="A row of three-storey brick and brownstone apartment buildings on a city street" width={2000} height={1483} loading="lazy" />
        </div>
        <div className="pointer-events-none absolute inset-0 z-[1]" style={{ background: 'linear-gradient(180deg, var(--color-canvas), rgb(237 228 224 / 0.55) 30%, rgb(237 228 224 / 0.55) 70%, var(--color-canvas))' }} aria-hidden="true" />
        <div className="relative z-[2] mx-auto w-full max-w-7xl px-5 py-28 sm:px-8 md:py-40">
          <div className="text-center" data-reveal>
            <p className="eyebrow text-ink/60">Built on public data, not opinions</p>
          </div>
          <div className="mt-12 grid gap-10 text-center sm:grid-cols-2 lg:grid-cols-4" data-reveal>
            {[
              ['38,601', 'ZIP codes with a HUD benchmark for every bedroom count'],
              ['8,543', 'ZIPs with a Zillow rent index and their own seasonal curve'],
              ['30,618', 'ZIPs with a Census median household income for the fairness check'],
              ['0 names', 'ever leave your browser. Parsing and matching run locally; the advisor sees unit figures, only when you ask.'],
            ].map(([n, t]) => (
              <div key={n}>
                <p className="t-stat num wipe-up">{n}</p>
                <p className="t-small mx-auto mt-3 max-w-[26ch] text-ink/70">{t}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-20 grid max-w-5xl gap-6 md:grid-cols-2" data-reveal>
            <blockquote className="wipe rounded-2xl bg-white/55 p-6 ring-1 ring-ink/8 backdrop-blur-sm">
              <p className="serif text-[1.25rem] leading-snug text-ink">"Fair Market Rents are set at the 40th percentile of gross rents for typical, non-substandard rental units occupied by recent movers in a local housing market."</p>
              <footer className="t-small mt-4 text-ink/60">— U.S. Department of Housing and Urban Development</footer>
            </blockquote>
            <blockquote className="wipe rounded-2xl bg-white/55 p-6 ring-1 ring-ink/8 backdrop-blur-sm">
              <p className="serif text-[1.25rem] leading-snug text-ink">"Zillow Observed Rent Index is a smoothed measure of the typical observed market rate rent across a given region."</p>
              <footer className="t-small mt-4 text-ink/60">— Zillow Research, ZORI methodology</footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ============ 5 · SHOWCASE — product panels with horizontal transit ============ */}
      <section className="overflow-hidden py-24 md:py-36">
        <div className="mx-auto w-full max-w-7xl px-5 text-center sm:px-8" data-reveal>
          <p className="eyebrow text-ink/60">The product</p>
          <h2 className="t-h2 mt-4"><span className="serif wipe-line font-normal">Everything</span> <span className="wipe-line">on one page.</span></h2>
          <p className="t-body mx-auto mt-6 max-w-[54ch] text-ink/75">The headline, the equity behind it, building grades, the unit-by-unit bars, twelve months of cash flow, the seasonal calendar, the voucher option and the letters — one live page, on the sample portfolio or your own file.</p>
          <Link to="/app" className="btn-solid mt-8">Open the tool <ArrowDR /></Link>
        </div>
        <div className="mt-16 pl-5 sm:pl-8 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
          <div ref={transit} className="transit flex gap-5 will-change-transform">
            <Panel title="Unit A1 · 2 BR · Austin 78704">
              <Bar rent={1750} fmr={2050} max={2200} />
              <p className="t-small mt-2 text-right num"><span className="text-ember-3 font-semibold">$3,600/yr</span> <span className="text-ink/60">$1,750 vs $2,050</span></p>
              <Bar rent={1850} fmr={1730} max={2200} above />
              <p className="t-small mt-2 text-right num"><span className="text-mint font-semibold">At or above</span> <span className="text-ink/60">$1,850 vs $1,730</span></p>
            </Panel>
            <Panel title="Building by building">
              {[['D', '221 E 11th Ave', '$2,040/door'], ['C', '5400 Penn Ave', '$1,580/door'], ['B', '1704 S 5th St', '$900/door']].map(([g, n, d]) => (
                <div key={n} className="flex items-center gap-4 border-b border-ink/10 py-2.5 last:border-0">
                  <span className={`num text-[1.5rem] font-semibold leading-none ${g === 'D' ? 'text-ember-3' : g === 'B' ? 'text-mint' : 'text-ink'}`}>{g}</span>
                  <span className="t-small flex-1 font-medium">{n}</span>
                  <span className="t-small num text-ink/60">{d}</span>
                </div>
              ))}
            </Panel>
            <Panel title="Leases ending · next 90 days">
              {[['Unit 3', '31 days', '$1,535'], ['Unit A1', '47 days', '$1,855'], ['Unit 101', '48 days', '$1,380']].map(([u, d, r]) => (
                <div key={u} className="flex items-center justify-between border-b border-ink/10 py-2 last:border-0">
                  <span className="t-small font-medium">{u}</span>
                  <span className="t-small num text-right"><span className="text-ember-3">{d}</span><span className="block text-ink/60">renew at {r}</span></span>
                </div>
              ))}
            </Panel>
            <Panel title="Seasonal index · Austin 78704">
              <div className="flex h-16 items-end gap-1" aria-hidden="true">
                {[0.9884, 0.9948, 0.999, 1.0031, 1.0101, 1.0171, 1.0227, 1.015, 1.0016, 0.9876, 0.9801, 0.9805].map((v, i) => (
                  <div key={i} className={`flex-1 rounded-sm ${i === 6 ? 'bg-mint-2' : i === 10 ? 'bg-ember' : 'bg-ink/15'}`} style={{ height: `${20 + ((v - 0.9801) / 0.0426) * 80}%` }} />
                ))}
              </div>
              <p className="t-small mt-3 text-ink/70">Peak <span className="text-mint">July</span> · trough <span className="text-ember-3">November</span> · 4.3% swing</p>
            </Panel>
            <Panel title="Renewal letter · Unit A2" paper>
              <p className="serif text-[1rem] not-italic leading-relaxed text-ink" style={{ fontStyle: 'normal' }}>Beginning February 1, 2027, the monthly rent will be $1,855, an adjustment of $105 per month… The renewal term is 18 months, ending July 31, 2028, when asking rents in ZIP 78704 are seasonally highest.</p>
            </Panel>
          </div>
        </div>
      </section>

      {/* ============ 6 · CLOSE ============ */}
      <section className="relative overflow-hidden">
        <div className="photo scene absolute inset-0">
          <img src={asset("/photos/night-building.jpg")} alt="A four-storey brick apartment block at night, half its windows lit, with an empty paved courtyard in front" width={2000} height={1125} loading="lazy" />
        </div>
        <div className="pointer-events-none absolute inset-0 z-[1]" style={{ background: 'linear-gradient(180deg, var(--color-canvas), rgb(237 228 224 / 0.6) 40%, rgb(237 228 224 / 0.75))' }} aria-hidden="true" />
        <div className="relative z-[2] mx-auto flex min-h-[80svh] w-full max-w-7xl flex-col items-center justify-center px-5 py-28 text-center sm:px-8">
          <div data-reveal>
            <h2>
              <span className="block"><span className="t-hero-serif wipe-line">Find out</span></span>
              <span className="-mt-[0.08em] block"><span className="t-hero-sans wipe-line">what yours says.</span></span>
            </h2>
            <p className="t-body mx-auto mt-7 max-w-[40ch] text-ink/75">Free for up to five units, forever. No account. Your file stays on your machine.</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link to="/app" className="btn-solid !px-6 !py-3 !text-base">Drop your rent roll <ArrowDR /></Link>
              <Link to="/pricing" className="btn-ghost !py-3">Pricing <Arrow /></Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Panel({ title, children, paper = false }: { title: string; children: React.ReactNode; paper?: boolean }) {
  return (
    <div className={`w-[18rem] shrink-0 rounded-2xl p-5 sm:w-[20rem] ${paper ? 'paper' : 'bg-white/60 ring-1 ring-ink/8 backdrop-blur-sm'}`}>
      <p className="eyebrow mb-4 text-ink/55">{title}</p>
      {children}
    </div>
  );
}

function Bar({ rent, fmr, max, above = false }: { rent: number; fmr: number; max: number; above?: boolean }) {
  const rw = (rent / max) * 100, fw = (fmr / max) * 100;
  return (
    <div className="relative mt-4 h-6 rounded-md bg-canvas" aria-hidden="true">
      <div className="absolute inset-y-0 left-0 rounded-md bg-ink/8" style={{ width: `${fw}%` }} />
      <div className={`absolute inset-y-0 left-0 rounded-md ${above ? 'bg-mint-2' : 'bg-ink/70'}`} style={{ width: `${rw}%` }} />
      {!above && <div className="absolute inset-y-0 rounded-r-md bg-ember" style={{ left: `${rw}%`, width: `${fw - rw}%` }} />}
      <div className="absolute inset-y-[-3px] w-[2px] bg-ink" style={{ left: `calc(${fw}% - 1px)` }} />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-ink/10">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="flex items-center gap-2 font-medium"><Logo /> LeaseLeak</p>
          <p className="t-small mt-3 max-w-[36ch] text-ink/60">Built by Rishik Rontala. Not legal or financial advice; check your state's notice and rent-increase rules before sending anything.</p>
        </div>
        <div className="t-small text-ink/60 md:col-span-4">
          <p className="eyebrow mb-2 text-ink/50">Data</p>
          <p><a className="underline underline-offset-4 hover:text-ink" href="https://www.huduser.gov/portal/datasets/fmr/smallarea/index.html" target="_blank" rel="noreferrer">HUD User — FY2027 Small Area Fair Market Rents</a> (public domain)</p>
          <p className="mt-1"><a className="underline underline-offset-4 hover:text-ink" href="https://www.zillow.com/research/data/" target="_blank" rel="noreferrer">Zillow Research — ZORI, ZIP level</a> (© Zillow, used with attribution)</p>
          <p className="mt-1"><a className="underline underline-offset-4 hover:text-ink" href="https://www.census.gov/programs-surveys/acs" target="_blank" rel="noreferrer">U.S. Census Bureau — ACS 5-year, median household income</a> (public domain)</p>
        </div>
        <div className="t-small text-ink/60 md:col-span-4">
          <p className="eyebrow mb-2 text-ink/50">Photographs &amp; type</p>
          <p>Brownstones — <a className="underline underline-offset-4 hover:text-ink" href="https://commons.wikimedia.org/w/index.php?curid=22881303" target="_blank" rel="noreferrer">Beyond My Ken</a>, CC BY-SA 4.0 · Night building — <a className="underline underline-offset-4 hover:text-ink" href="https://commons.wikimedia.org/w/index.php?curid=176811029" target="_blank" rel="noreferrer">OathOn</a>, CC BY-SA 4.0 · Duplex — <a className="underline underline-offset-4 hover:text-ink" href="https://commons.wikimedia.org/w/index.php?curid=69291624" target="_blank" rel="noreferrer">Baltimore Heritage</a>, CC0. All graded.</p>
          <p className="mt-2">Advisor: Google Gemini, called through a key-holding proxy with unit figures only — never names. Satoshi by Indian Type Foundry via Fontshare · Instrument Serif by Rodrigo Fuenzalida &amp; Jordan Egstad (OFL). <a className="underline underline-offset-4 hover:text-ink" href="https://github.com/rishikrrontala-bot/leaseleak" target="_blank" rel="noreferrer">Source on GitHub</a>.</p>
        </div>
      </div>
    </footer>
  );
}
