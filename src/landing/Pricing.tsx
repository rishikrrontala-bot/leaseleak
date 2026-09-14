import { Link } from '../lib/router';
import Nav from '../ui/Nav';
import { Footer } from './Landing';

const tiers = [
  { name: 'Free', price: '$0', per: 'forever', units: 'Up to 5 units', bullets: ['Rent gap vs HUD benchmark', 'Lease-timing calendar', 'Renewal letters (PDF)', 'Runs in your browser'], cta: 'Start free', to: '/app', solid: false },
  { name: 'Landlord', price: '$19', per: 'per month', units: 'Up to 50 units', bullets: ['Everything in Free', 'Save rolls and re-run monthly', 'Zillow trend alerts per ZIP', 'Renewal reminders 90 days out'], cta: 'Start free, upgrade later', to: '/app', solid: true },
  { name: 'Portfolio', price: '$49', per: 'per month', units: 'Unlimited units', bullets: ['Everything in Landlord', 'Multiple owners and LLCs', 'Export to your property software', 'Priority support'], cta: 'Talk to us', to: 'mailto:hello@leaseleak.app', solid: false },
];

export default function Pricing() {
  return (
    <div>
      <Nav current="pricing" />
      <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <h1 className="t-display-sm text-center"><span className="serif font-normal">Priced per door,</span><br />not per feature.</h1>
        <p className="t-lead measure mx-auto mt-6 text-center text-ink/80">
          A single under-market unit costs the average small landlord more than a year of LeaseLeak. The free tier is genuinely free: five units, no account, nothing uploaded.
        </p>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.name} className={`flex flex-col rounded-2xl p-7 ${t.solid ? 'paper' : 'bg-white/50 ring-1 ring-ink/8'}`}>
              <p className={`t-micro uppercase tracking-[0.14em] ${t.solid ? 'text-ink-2' : 'text-ink/60'}`}>{t.name}</p>
              <p className="t-display-sm num mt-3">{t.price}</p>
              <p className={`t-small ${t.solid ? 'text-ink-2' : 'text-ink/60'}`}>{t.per} · {t.units}</p>
              <ul className={`t-body mt-6 space-y-2 ${t.solid ? 'text-ink' : 'text-ink/80'}`}>
                {t.bullets.map((b) => <li key={b} className="flex gap-3"><span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />{b}</li>)}
              </ul>
              <div className="mt-8">
                {t.to.startsWith('mailto:') ? (
                  <a href={t.to} className={t.solid ? 'btn-ink' : 'btn-ghost'}>{t.cta}</a>
                ) : (
                  <Link to={t.to} className={t.solid ? 'btn-ink' : 'btn-ghost'}>{t.cta}</Link>
                )}
              </div>
            </div>
          ))}
        </div>
        <section className="mt-20 grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4"><h2 className="t-h3">Who this is for</h2></div>
          <div className="t-body measure space-y-4 text-ink/80 md:col-span-8">
            <p>Individual investors own roughly seven in ten of the rental units in the United States, and most of them manage in a spreadsheet. Property-management software starts at a few dollars per unit per month and assumes you want to run your whole business inside it. LeaseLeak does one thing: it tells you what your rent roll is worth against public benchmarks and writes the letters.</p>
            <p>Paid tiers are on the way. The free tier is the product you can use today.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
