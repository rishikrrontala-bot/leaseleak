import { Link } from '../lib/router';
import { Logo } from './Logo';
import { ArrowDR } from './Icons';

// Fixed, transparent, and small: wordmark left, three links and a round button right.
export default function Nav({ current = '' }: { current?: 'home' | 'pricing' | 'app' | '' }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-5 sm:px-8" style={{ background: 'linear-gradient(180deg, rgb(237 228 224 / 0.9) 0%, rgb(237 228 224 / 0.6) 55%, rgb(237 228 224 / 0) 100%)', paddingBottom: '2.25rem' }}>
      <Link to="/" className="flex items-center gap-2 text-[1.05rem] font-medium tracking-[-0.02em]">
        <Logo className="h-6 w-6" /> LeaseLeak
      </Link>
      <nav className="flex items-center gap-5 t-small sm:gap-7">
        {current !== 'home' && <Link to="/" className="hidden text-ink/80 hover:text-ink sm:inline">Home</Link>}
        {current === 'home' && <a href="#method" className="hidden text-ink/80 hover:text-ink sm:inline">How it works</a>}
        <Link to="/pricing" className={`hidden sm:inline ${current === 'pricing' ? 'text-ink' : 'text-ink/80 hover:text-ink'}`}>Pricing</Link>
        <Link to="/app" className={current === 'app' ? 'text-ink' : 'text-ink/80 hover:text-ink'}>Open the tool</Link>
        <Link to="/app" className="btn-circle" aria-label="Open the tool"><ArrowDR className="h-4 w-4" /></Link>
      </nav>
    </header>
  );
}
