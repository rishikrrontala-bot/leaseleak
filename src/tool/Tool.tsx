import { useCallback, useEffect, useMemo, useState } from 'react';
import Dropzone from './Dropzone';
import Results from './Results';
import { parseCsvText, parseFile } from '../lib/parse';
import { analyze, loadIncome, loadSafmr, loadZori, preloadData } from '../lib/analyze';
import { SAMPLE_CSV } from '../lib/sample';
import type { ParsedRoll } from '../lib/types';
import Nav from '../ui/Nav';
export { Logo } from '../ui/Logo';

export default function Tool() {
  const [roll, setRoll] = useState<ParsedRoll | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cap, setCap] = useState(0.06);
  const [utilities, setUtilities] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<Awaited<ReturnType<typeof loadBoth>> | null>(null);

  useEffect(() => { preloadData(); }, []);

  const ingest = useCallback(async (parsed: ParsedRoll, name: string) => {
    if (parsed.units.length === 0) {
      const why = parsed.issues.slice(0, 3).map((i) => `row ${i.row}: ${i.message}`).join('; ');
      throw new Error(`No usable rows. We need at least a rent and a 5-digit ZIP per row. ${why ? `(${why})` : ''}`);
    }
    const d = await loadBoth();
    setData(d);
    setUtilities({});
    setRoll(parsed);
    setFileName(name);
    setError(null);
    window.scrollTo({ top: 0 });
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

  const analysis = useMemo(() => (roll && data ? analyze(roll.units, data.safmr, data.zori, cap, new Date(), { utilities, income: data.income }) : null), [roll, data, cap, utilities]);
  const onUtilities = useCallback((property: string, paid: boolean) => setUtilities((u) => ({ ...u, [property]: paid })), []);

  return (
    <main className="min-h-screen px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
      <Nav current="app" />

      {!analysis ? (
        <section className="mx-auto max-w-3xl">
          <h1 className="t-display-sm text-center">Drop your <span className="serif font-normal">rent roll.</span></h1>
          <p className="t-lead mx-auto mt-4 max-w-xl text-center text-ink/75">
            Five seconds later: how much rent you're under the HUD benchmark, which leases end in the wrong month, and the renewal letters — written.
          </p>
          <div className="mt-10">
            <Dropzone onFile={onFile} onSample={onSample} busy={busy} error={error} />
          </div>
          {roll && roll.issues.length > 0 && (
            <p className="t-small mt-4 text-center text-ink/60">{roll.issues.length} rows skipped.</p>
          )}
        </section>
      ) : (
        <>
          {roll && roll.issues.length > 0 && (
            <p className="mx-auto mb-6 w-full max-w-6xl rounded-xl bg-canvas-2 px-4 py-3 t-small text-ink/70">
              {roll.issues.length} row{roll.issues.length === 1 ? '' : 's'} skipped: {roll.issues.slice(0, 4).map((i) => `row ${i.row} (${i.message.toLowerCase()})`).join(', ')}{roll.issues.length > 4 ? '…' : ''}
            </p>
          )}
          <Results analysis={analysis} fileName={fileName} cap={cap} onCap={setCap} utilities={utilities} onUtilities={onUtilities} onReset={() => { setRoll(null); setError(null); window.scrollTo({ top: 0 }); }} />
        </>
      )}
    </main>
  );
}

async function loadBoth() {
  // income is optional: the fairness check is skipped if it fails to load
  const [safmr, zori, income] = await Promise.all([loadSafmr(), loadZori(), loadIncome().catch(() => null)]);
  return { safmr, zori, income };
}

