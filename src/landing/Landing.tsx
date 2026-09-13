import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, asset } from '../lib/router';
import { useRevealAll } from '../lib/reveal';
import { Logo } from '../tool/Tool';
import { preloadData } from '../lib/analyze';

const HeroObject = lazy(() => import('../three/HeroObject'));

const Arrow = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M4 10h12m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

function useMotionOK() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');
    const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
    setOk(!mq.matches && fine.matches && hasGL && window.innerWidth >= 768);
  }, []);
  return ok;
}

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

export default function Landing() {
  const root = useRevealAll<HTMLDivElement>();
  const motionOK = useMotionOK();
  const transit = useTransit(260);
  useEffect(() => { const t = setTimeout(preloadData, 2500); return () => clearTimeout(t); }, []);

  return (
    <div ref={root} className="relative">
      {/* paper grain over the whole hero surface */}
      <svg className="pointer-events-none absolute inset-0 -z-0 h-[100svh] w-full opacity-[0.07]" aria-hidden="true">
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight"><Logo /> LeaseLeak</Link>
        <nav className="flex items-center gap-6 t-small">
          <a href="#method" className="hidden text-paper/70 hover:text-paper sm:inline">How it works</a>
          <Link to="/pricing" className="text-paper/70 hover:text-paper">Pricing</Link>
          <Link to="/app" className="btn-ghost !py-2">Open the tool</Link>
        </nav>
      </header>

      {/* ============ 1 · HERO — the headline is the hero ============ */}
      <section className="relative z-10 mx-auto grid min-h-[86svh] w-full max-w-7xl grid-cols-1 items-end gap-8 px-5 pb-14 pt-8 sm:px-8 md:grid-cols-12">
        {/* The hero reveals on mount (is-in from the start), not on intersection. */}
        <div className="md:col-span-8 is-in" data-reveal>
          <h1 className="t-display text-paper">
            <span className="wipe-line">Your rent roll</span><br />
            <span className="wipe-line">is leaking</span>
            <span className="wipe-line ml-[0.18em] align-baseline">
              <span className="photo inline-block h-[0.72em] w-[1.6em] translate-y-[0.08em] rounded-[0.12em] align-baseline">
                <img src={asset("/photos/brownstones.jpg")} alt="A row of three-storey brick and brownstone apartment buildings on a city street" width={2000} height={1483} loading="eager" fetchPriority="high" />
              </span>
            </span><br />
            <span className="wipe-line">money.</span>
          </h1>
          <p className="t-lead measure mt-8 text-paper/80">
            Drop your rent roll. Five seconds later: how much rent you're under the HUD benchmark, which leases end in the wrong month, and the renewal letters — written.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link to="/app" className="link-arrow t-lead">Drop your rent roll <Arrow /></Link>
            <Link to="/app" className="btn-ghost">See the sample portfolio</Link>
          </div>
        </div>
        <div className="relative hidden aspect-square md:col-span-4 md:block" aria-hidden="true">
          {motionOK ? (
            <Suspense fallback={<DialStill />}><HeroObject /></Suspense>
          ) : <DialStill />}
        </div>
      </section>

      {/* ============ marquee strip ============ */}
      <div className="relative z-10 overflow-hidden border-y border-paper/10 py-4" aria-hidden="true">
        <div className="marquee t-small uppercase tracking-[0.14em] text-paper/60">
          {[0, 1].map((k) => (
            <span key={k} className="flex shrink-0 gap-12">
              {['38,601 ZIP codes', 'HUD Fair Market Rents · FY2027', 'Zillow ZORI · Jul 2026', 'Studio to 4+ bedrooms', 'Nothing leaves your browser', 'CSV or Excel', 'Letters in one click', '460 metros with seasonal curves'].map((t) => (
                <span key={t} className="flex items-center gap-12"><span>{t}</span><span className="h-1 w-1 rounded-full bg-ember" /></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ============ 2 · CAPABILITY — image as canvas, product crop ============ */}
      <section className="relative">
        <div className="photo photo--tint absolute inset-0">
          <img src={asset("/photos/mailboxes.jpg")} alt="A long corridor of dark wooden apartment mailboxes, receding to a vanishing point under warm ceiling light" width={2000} height={1333} loading="lazy" />
        </div>
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 70% at 30% 50%, rgb(15 46 34 / 0.92), rgb(15 46 34 / 0.55) 60%, rgb(15 46 34 / 0.35))' }} />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-5 py-24 sm:px-8 md:grid-cols-12 md:py-32">
          <div className="md:col-span-5" data-reveal>
            <h2 className="t-h2"><span className="wipe-line">One file in.</span><br /><span className="wipe-line">One number out.</span></h2>
            <p className="t-body measure mt-6 text-paper/80">
              Every unit is matched to the U.S. Department of Housing and Urban Development's Fair Market Rent for its exact ZIP code and bedroom count. The gap between that and what you're charging, summed and annualised, is the number.
            </p>
            <p className="t-body measure mt-4 text-paper/80">
              It's a conservative floor: Fair Market Rent is the 40th percentile of local rents. If you're under it, six in ten comparable homes rent for more than yours.
            </p>
          </div>
          <div className="md:col-span-7 md:pl-8" data-reveal>
            <div className="wipe rounded-2xl bg-field/90 p-6 shadow-2xl ring-1 ring-paper/10 backdrop-blur-sm sm:p-8">
              <p className="t-micro uppercase tracking-[0.14em] text-ember-3">Rent left on the table, per year</p>
              <p className="t-display-sm num mt-2">$29,280</p>
              <p className="t-body mt-3 text-paper/75">12 of 16 units rent below HUD's FY2027 Fair Market Rent. 4 are at or above it.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-field-2 px-4 py-3"><p className="t-micro uppercase tracking-[0.14em] text-paper/60">Recoverable this cycle</p><p className="t-h3 num mt-1">$12,540</p><p className="t-micro text-paper/60">increases capped at 6%</p></div>
                <div className="rounded-xl bg-field-2 px-4 py-3"><p className="t-micro uppercase tracking-[0.14em] text-paper/60">Lease-timing value</p><p className="t-h3 num mt-1">$6,581</p><p className="t-micro text-paper/60">if every lease ended in August</p></div>
              </div>
              <p className="t-micro mt-4 text-paper/50">Sample portfolio · 16 units in Austin, Columbus and Pittsburgh · real FY2027 benchmarks</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 3 · METHOD ============ */}
      <section id="method" className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 md:py-32">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5" data-reveal>
            <h2 className="t-h2"><span className="wipe-line">How it works</span></h2>
            <ol className="mt-10 space-y-8">
              {[
                ['Match', 'Each row of your roll is matched to HUD\'s Small Area Fair Market Rent for its ZIP and bedroom count — 38,601 ZIPs, studio to 4+ bedrooms, fiscal year 2027.'],
                ['Measure', 'Benchmark minus rent, per unit, per month. Units above the benchmark count for nothing; units below count twelve times.'],
                ['Time', 'Zillow\'s rent index for your ZIP becomes a 12-month seasonal curve. A lease ending in the trough re-signs at the trough; we quantify the difference and pick a term that ends at the peak.'],
                ['Write', 'One renewal letter per unit: the new rent (capped, never above the benchmark), the term, the notice language. Download all as a PDF.'],
              ].map(([h, p], i) => (
                <li key={h} className="grid grid-cols-[3rem_1fr] gap-4">
                  <span className="t-h3 num text-ember-3">0{i + 1}</span>
                  <div><h3 className="t-h3">{h}</h3><p className="t-body measure mt-2 text-paper/75">{p}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="self-end md:col-span-6 md:col-start-7" data-reveal>
            <div className="wipe">
              <div className="photo aspect-[4/3] rounded-2xl">
                <img src={asset("/photos/duplex.jpg")} alt="A wide brick duplex with yellow-trimmed windows and two matching front doors, set behind a lawn on an overcast day" width={2000} height={1500} loading="lazy" />
              </div>
            </div>
            <div className="paper mt-6 rounded-sm px-6 py-5 font-mono text-[0.9rem] leading-relaxed">
              <p className="t-micro mb-2 uppercase tracking-[0.14em] text-ink-2">The whole model</p>
              <p>gap<sub>unit</sub> = max(0, SAFMR<sub>zip,br</sub> − rent) × 12</p>
              <p>timing<sub>unit</sub> = rent × (idx<sub>peak</sub> ÷ idx<sub>lease end</sub> − 1) × 12</p>
              <p>renewal = min(SAFMR<sub>zip,br</sub>, rent × (1 + cap))</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 4 · PROOF — metrics over atmospheric photo ============ */}
      <section className="relative">
        <div className="photo absolute inset-0">
          <img src={asset("/photos/night-building.jpg")} alt="A four-storey brick apartment block at night, half its windows lit, with an empty paved courtyard in front" width={2000} height={1125} loading="lazy" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-field/70" />
        <div className="relative mx-auto flex min-h-[70svh] w-full max-w-7xl flex-col justify-end px-5 py-24 sm:px-8">
          <div data-reveal>
            <p className="t-micro uppercase tracking-[0.14em] text-ember-3">Built on public data, not opinions</p>
            <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['38,601', 'ZIP codes with a HUD benchmark for every bedroom count'],
                ['8,543', 'ZIPs with a Zillow rent index and their own seasonal curve'],
                ['40th', 'percentile — the benchmark is a floor, so the gap is a floor too'],
                ['0 bytes', 'of your rent roll leave the browser. Parsing and matching run locally.'],
              ].map(([n, t]) => (
                <div key={n}>
                  <p className="t-display-sm num wipe-up">{n}</p>
                  <p className="t-small mt-2 max-w-[28ch] text-paper/75">{t}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2" data-reveal>
            <blockquote className="wipe border-l-2 border-ember pl-5">
              <p className="t-body text-paper/85">"Fair Market Rents (FMRs) are set at the 40th percentile of gross rents for typical, non-substandard rental units occupied by recent movers in a local housing market."</p>
              <footer className="t-small mt-3 text-paper/60">— U.S. Department of Housing and Urban Development, Fair Market Rents overview</footer>
            </blockquote>
            <blockquote className="wipe border-l-2 border-ember pl-5">
              <p className="t-body text-paper/85">"Zillow Observed Rent Index (ZORI) is a smoothed measure of the typical observed market rate rent across a given region."</p>
              <footer className="t-small mt-3 text-paper/60">— Zillow Research, ZORI methodology</footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ============ 5 · SHOWCASE — product UI panel stack with horizontal transit ============ */}
      <section className="overflow-hidden py-24 md:py-32">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="grid gap-6 md:grid-cols-12" data-reveal>
            <h2 className="t-h2 md:col-span-7"><span className="wipe-line">Everything</span><br /><span className="wipe-line">on one page.</span></h2>
            <div className="md:col-span-5 md:self-end">
              <p className="t-body measure text-paper/75">The headline, the unit-by-unit bars, the seasonal calendar and the letters are one live page — on the sample portfolio or on your own file.</p>
              <Link to="/app" className="link-arrow mt-4">Open the tool <Arrow /></Link>
            </div>
          </div>
        </div>
        <div className="mt-12 pl-5 sm:pl-8 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
          <div ref={transit} className="transit flex gap-5 will-change-transform">
            <Panel title="Unit A1 · 2 BR · Austin 78704">
              <Bar rent={1750} fmr={2050} max={2200} />
              <p className="t-small mt-2 text-right num"><span className="text-ember-3 font-semibold">$3,600/yr</span> <span className="text-paper/60">$1,750 vs $2,050</span></p>
              <Bar rent={1850} fmr={1730} max={2200} above />
              <p className="t-small mt-2 text-right num"><span className="text-mint font-semibold">At or above</span> <span className="text-paper/60">$1,850 vs $1,730</span></p>
            </Panel>
            <Panel title="Leases ending · next 90 days">
              {[['Unit A1', '48 days', '$1,855'], ['Unit 101', '49 days', '$1,380'], ['Unit 6', '63 days', '$1,960']].map(([u, d, r]) => (
                <div key={u} className="flex items-center justify-between border-b border-paper/10 py-2 last:border-0">
                  <span className="t-small font-semibold">{u}</span>
                  <span className="t-small num text-right"><span className="text-ember-3">{d}</span><span className="block text-paper/60">renew at {r}</span></span>
                </div>
              ))}
            </Panel>
            <Panel title="Seasonal index · Austin 78704">
              <div className="flex h-16 items-end gap-1" aria-hidden="true">
                {[0.9884, 0.9948, 0.999, 1.0031, 1.0101, 1.0171, 1.0227, 1.015, 1.0016, 0.9876, 0.9801, 0.9805].map((v, i) => (
                  <div key={i} className={`flex-1 rounded-sm ${i === 6 ? 'bg-mint-2' : i === 10 ? 'bg-ember' : 'bg-paper/20'}`} style={{ height: `${20 + ((v - 0.9801) / 0.0426) * 80}%` }} />
                ))}
              </div>
              <p className="t-small mt-3 text-paper/70">Peak <span className="text-mint">July</span> · trough <span className="text-ember-3">November</span> · 4.3% swing</p>
            </Panel>
            <Panel title="Renewal letter · Unit A2" paper>
              <p className="text-[0.8rem] leading-relaxed text-ink" style={{ fontFamily: 'Georgia, serif' }}>Beginning February 1, 2027, the monthly rent will be $1,855, an adjustment of $105 per month… The renewal term is 18 months, ending July 31, 2028, when asking rents in ZIP 78704 are seasonally highest.</p>
            </Panel>
          </div>
        </div>
      </section>

      {/* ============ 6 · CLOSE ============ */}
      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-24 pt-8 sm:px-8 md:grid-cols-5">
        <div className="md:col-span-3" data-reveal>
          <h2 className="t-display-sm"><span className="wipe-line">Find out</span><br /><span className="wipe-line">what yours says.</span></h2>
          <p className="t-lead measure mt-6 text-paper/80">Free for up to five units, forever. No account. Your file stays on your machine.</p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link to="/app" className="link-arrow t-lead">Drop your rent roll <Arrow /></Link>
            <Link to="/pricing" className="btn-ghost">Pricing</Link>
          </div>
        </div>
        <div className="md:col-span-2" data-reveal>
          <div className="wipe">
            <div className="photo aspect-[4/5] rounded-2xl">
              <img src={asset("/photos/brownstones.jpg")} alt="Brownstone apartment buildings with fire escapes and street-level shopfronts" width={2000} height={1483} loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function DialStill() {
  // Still fallback for reduced motion / no WebGL / touch: the same dial, drawn in SVG.
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="ring" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#e6ebe8" /><stop offset="1" stopColor="#8fa199" /></linearGradient>
      </defs>
      <circle cx="200" cy="200" r="170" fill="none" stroke="url(#ring)" strokeWidth="26" />
      <circle cx="200" cy="200" r="140" fill="#143a2b" />
      {ticks.map((i) => {
        const a = (i / 60) * Math.PI * 2; const long = i % 5 === 0; const r1 = 120, r2 = long ? 100 : 110;
        return <line key={i} x1={200 + Math.cos(a) * r1} y1={200 + Math.sin(a) * r1} x2={200 + Math.cos(a) * r2} y2={200 + Math.sin(a) * r2} stroke={long ? '#f4efe3' : '#9fe1bd'} strokeWidth={long ? 2.5 : 1.5} />;
      })}
      <line x1="200" y1="200" x2={200 + Math.cos(2.2) * 110} y2={200 - Math.sin(2.2) * 110} stroke="#ff6b3d" strokeWidth="4" strokeLinecap="round" />
      <circle cx="200" cy="200" r="10" fill="#e9e1cf" />
    </svg>
  );
}

function Panel({ title, children, paper = false }: { title: string; children: React.ReactNode; paper?: boolean }) {
  return (
    <div className={`w-[18rem] shrink-0 rounded-2xl p-5 sm:w-[20rem] ${paper ? 'paper' : 'bg-field-2 ring-1 ring-paper/10'}`}>
      <p className={`t-micro mb-4 uppercase tracking-[0.14em] ${paper ? 'text-ink-2' : 'text-paper/60'}`}>{title}</p>
      {children}
    </div>
  );
}

function Bar({ rent, fmr, max, above = false }: { rent: number; fmr: number; max: number; above?: boolean }) {
  const rw = (rent / max) * 100, fw = (fmr / max) * 100;
  return (
    <div className="relative mt-4 h-6 rounded-md bg-field-3" aria-hidden="true">
      <div className="absolute inset-y-0 left-0 rounded-md bg-paper/10" style={{ width: `${fw}%` }} />
      <div className={`absolute inset-y-0 left-0 rounded-md ${above ? 'bg-mint-2' : 'bg-paper/80'}`} style={{ width: `${rw}%` }} />
      {!above && <div className="absolute inset-y-0 rounded-r-md bg-ember" style={{ left: `${rw}%`, width: `${fw - rw}%` }} />}
      <div className="absolute inset-y-[-3px] w-[2px] bg-paper" style={{ left: `calc(${fw}% - 1px)` }} />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-paper/10">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="flex items-center gap-2 font-semibold"><Logo /> LeaseLeak</p>
          <p className="t-small mt-3 max-w-[36ch] text-paper/60">Built solo by Rishik Rontala for VentureFix 2026. Not legal or financial advice; check your state's notice and rent-increase rules before sending anything.</p>
        </div>
        <div className="t-small text-paper/60 md:col-span-4">
          <p className="t-micro mb-2 uppercase tracking-[0.14em] text-paper/50">Data</p>
          <p><a className="underline underline-offset-4 hover:text-paper" href="https://www.huduser.gov/portal/datasets/fmr/smallarea/index.html" target="_blank" rel="noreferrer">HUD User — FY2027 Small Area Fair Market Rents</a> (public domain)</p>
          <p className="mt-1"><a className="underline underline-offset-4 hover:text-paper" href="https://www.zillow.com/research/data/" target="_blank" rel="noreferrer">Zillow Research — ZORI, ZIP level</a> (© Zillow, used with attribution)</p>
        </div>
        <div className="t-small text-paper/60 md:col-span-4">
          <p className="t-micro mb-2 uppercase tracking-[0.14em] text-paper/50">Photographs</p>
          <p>Brownstones — <a className="underline underline-offset-4 hover:text-paper" href="https://commons.wikimedia.org/w/index.php?curid=22881303" target="_blank" rel="noreferrer">Beyond My Ken</a>, CC BY-SA 4.0 · Mailboxes — <a className="underline underline-offset-4 hover:text-paper" href="https://commons.wikimedia.org/w/index.php?curid=188879772" target="_blank" rel="noreferrer">PattayaPatrol</a>, CC BY-SA 4.0 · Night building — <a className="underline underline-offset-4 hover:text-paper" href="https://commons.wikimedia.org/w/index.php?curid=176811029" target="_blank" rel="noreferrer">OathOn</a>, CC BY-SA 4.0 · Duplex — <a className="underline underline-offset-4 hover:text-paper" href="https://commons.wikimedia.org/w/index.php?curid=69291624" target="_blank" rel="noreferrer">Baltimore Heritage</a>, CC0. All graded.</p>
          <p className="mt-2">Satoshi typeface by Indian Type Foundry via Fontshare. <a className="underline underline-offset-4 hover:text-paper" href="https://github.com/rishikrrontala-bot/leaseleak" target="_blank" rel="noreferrer">Source on GitHub</a>.</p>
        </div>
      </div>
    </footer>
  );
}
