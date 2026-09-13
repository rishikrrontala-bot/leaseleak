import { useCallback, useEffect, useMemo, useState } from 'react';
import Dropzone from './Dropzone';
import Results from './Results';
import { parseCsvText, parseFile } from '../lib/parse';
import { analyze, loadSafmr, loadZori, preloadData } from '../lib/analyze';
import { SAMPLE_CSV } from '../lib/sample';
import type { ParsedRoll } from '../lib/types';
import { Link } from '../lib/router';

export default function Tool() {
  const [roll, setRoll] = useState<ParsedRoll | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cap, setCap] = useState(0.06);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadBoth>> | null>(null);

  useEffect(() => { preloadData(); }, []);

  const ingest = useCallback(async (parsed: ParsedRoll, name: string) => {
    if (parsed.units.length === 0) {
      const why = parsed.issues.slice(0, 3).map((i) => `row ${i.row}: ${i.message}`).join('; ');
      throw new Error(`No usable rows. We need at least a rent and a 5-digit ZIP per row. ${why ? `(${why})` : ''}`);
    }
    const d = await loadBoth();
    setData(d);
    setRoll(parsed);
    setFileName(name);
    setError(null);
  }, []);

  const onFile = useCallback(async (file: File) => {
    setBusy(true); setError(null);
    try {
      const parsed = await parseFile(file);
      await ingest(parsed, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.');
    } finally { setBusy(false); }
  }, [ingest]);

  const onSample = useCallback(async () => {
    setBusy(true); setError(null);
    try { await ingest(parseCsvText(SAMPLE_CSV), 'sample-rent-roll.csv (16 units, 3 buildings)'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load the sample.'); }
    finally { setBusy(false); }
  }, [ingest]);

  const analysis = useMemo(() => (roll && data ? analyze(roll.units, data.safmr, data.zori, cap) : null), [roll, data, cap]);

  return (
    <main className="min-h-screen px-5 pb-24 pt-6 sm:px-8">
      <header className="mx-auto mb-12 flex w-full max-w-6xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo /> LeaseLeak
        </Link>
        <nav className="flex items-center gap-5 t-small">
          <Link to="/pricing" className="text-paper/70 hover:text-paper">Pricing</Link>
          <a href="https://github.com/rishikrrontala-bot/leaseleak" className="text-paper/70 hover:text-paper" target="_blank" rel="noreferrer">Source</a>
        </nav>
      </header>

      {!analysis ? (
        <section className="mx-auto max-w-3xl">
          <h1 className="t-display-sm text-center">Drop your rent roll.</h1>
          <p className="t-lead mx-auto mt-4 max-w-xl text-center text-paper/75">
            Five seconds later: how much rent you're under the HUD benchmark, which leases end in the wrong month, and the renewal letters — written.
          </p>
          <div className="mt-10">
            <Dropzone onFile={onFile} onSample={onSample} busy={busy} error={error} />
          </div>
          {roll && roll.issues.length > 0 && (
            <p className="t-small mt-4 text-center text-paper/60">{roll.issues.length} rows skipped.</p>
          )}
        </section>
      ) : (
        <>
          {roll && roll.issues.length > 0 && (
            <p className="mx-auto mb-6 w-full max-w-6xl rounded-xl bg-field-2 px-4 py-3 t-small text-paper/70">
              {roll.issues.length} row{roll.issues.length === 1 ? '' : 's'} skipped: {roll.issues.slice(0, 4).map((i) => `row ${i.row} (${i.message.toLowerCase()})`).join(', ')}{roll.issues.length > 4 ? '…' : ''}
            </p>
          )}
          <Results analysis={analysis} fileName={fileName} cap={cap} onCap={setCap} onReset={() => { setRoll(null); setError(null); window.scrollTo({ top: 0 }); }} />
        </>
      )}
    </main>
  );
}

async function loadBoth() {
  const [safmr, zori] = await Promise.all([loadSafmr(), loadZori()]);
  return { safmr, zori };
}

export function Logo({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--color-paper)" />
      <path d="M18 14h8v28h20v8H18z" fill="var(--color-field)" />
      <circle cx="46" cy="20" r="6" fill="var(--color-ember)" />
    </svg>
  );
}
