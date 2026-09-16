import { useCallback, useEffect, useMemo, useState } from 'react';
import Dropzone from './Dropzone';
import Results from './Results';
import { parseCsvText, parseFile, rowsToUnits } from '../lib/parse';
import { analyze, loadIncome, loadSafmr, loadZori, preloadData } from '../lib/analyze';
import { SAMPLE_CSV, SAMPLE_MESSY_CSV } from '../lib/sample';
import { aiAvailable, inferZips, mapColumns } from '../lib/ai';
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
  const [aiNotes, setAiNotes] = useState<string[]>([]);
  const [sampleId, setSampleId] = useState<string | null>(null); // which built-in sample is loaded, if any
  // a roll the heuristics couldn't read, held so the AI fallback can try
  const [repairable, setRepairable] = useState<{ parsed: ParsedRoll; name: string } | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadBoth>> | null>(null);

  useEffect(() => { preloadData(); }, []);

  const ingest = useCallback(async (parsed: ParsedRoll, name: string, notes: string[] = []) => {
    const skipped = parsed.totalRows - parsed.units.length;
    // Heuristics failed on most of the file: offer the AI fallback instead of an error.
    if ((parsed.units.length === 0 || skipped / Math.max(1, parsed.totalRows) >= 0.3) && aiAvailable() && notes.length === 0) {
      setRepairable({ parsed, name });
      if (parsed.units.length === 0) return;
    }
    if (parsed.units.length === 0) {
      const why = parsed.issues.slice(0, 3).map((i) => `row ${i.row}: ${i.message}`).join('; ');
      throw new Error(`No usable rows. We need at least a rent and a 5-digit ZIP per row. ${why ? `(${why})` : ''}`);
    }
    const d = await loadBoth();
    setData(d);
    setUtilities({});
    setAiNotes(notes);
    setRoll(parsed);
    setFileName(name);
    setError(null);
    window.scrollTo({ top: 0 });
  }, []);

  // The AI fallback: map columns the heuristics missed, then infer ZIPs from addresses.
  const aiRepair = useCallback(async () => {
    if (!repairable) return;
    const { parsed, name } = repairable;
    setBusy(true); setError(null);
    try {
      const notes: string[] = [];
      const sample = parsed.rows.slice(0, 6);
      const m = await mapColumns(parsed.headers, sample);
      const mapped = Object.entries(m.data).filter(([k, v]) => v && v !== parsed.columns[k]);
      if (mapped.length) notes.push(`AI mapped ${mapped.map(([k, v]) => `${label(k)} ← "${v}"`).join(', ')}.`);
      let next = rowsToUnits(parsed.rows, parsed.headers, { columns: m.data });

      // rows still lacking a ZIP but carrying an address: ask for the ZIP
      const propCol = next.columns.property;
      const missing = next.issues.filter((i) => /ZIP/.test(i.message));
      if (propCol && missing.length) {
        const addrByRow = new Map<number, string>();
        parsed.rows.forEach((r, i) => { const a = r[propCol]; if (a != null && String(a).trim()) addrByRow.set(i + 2, String(a).trim()); });
        const addresses = Array.from(new Set(missing.map((i) => addrByRow.get(i.row)).filter(Boolean) as string[]));
        if (addresses.length) {
          const z = await inferZips(addresses);
          const rows = z.data.results.filter((r) => r.zip && r.confidence !== 'low');
          const zipFor = new Map(rows.map((r) => [r.address, r.zip!]));
          const fromModel = new Set(rows.filter((r) => r.source === 'model').map((r) => r.address));
          const zipByRow: Record<number, string> = {}; const zipInferredRows = new Set<number>();
          for (const i of missing) { const a = addrByRow.get(i.row); if (a && zipFor.has(a)) { zipByRow[i.row] = zipFor.get(a)!; if (fromModel.has(a)) zipInferredRows.add(i.row); } }
          const geo = Object.keys(zipByRow).length - zipInferredRows.size;
          if (geo) notes.push(`${geo} ZIP${geo === 1 ? '' : 's'} looked up from street addresses with the U.S. Census geocoder.`);
          if (zipInferredRows.size) notes.push(`${zipInferredRows.size} ZIP${zipInferredRows.size === 1 ? '' : 's'} the geocoder couldn't match were inferred by AI — marked “?” below; verify before you send anything.`);
          next = rowsToUnits(parsed.rows, parsed.headers, { columns: m.data, zipByRow, zipInferredRows });
        }
      }
      if (next.units.length === 0) throw new Error('Even with AI help we could not find a rent and a ZIP per row. Check the file has both.');
      setRepairable(null);
      await ingest(next, `${name} · read with AI`, notes.length ? notes : ['AI re-read the file.']);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The AI fallback failed.');
    } finally { setBusy(false); }
  }, [repairable, ingest]);

  const onFile = useCallback(async (file: File) => {
    setBusy(true); setError(null); setRepairable(null); setSampleId(null);
    try {
      const parsed = await parseFile(file);
      await ingest(parsed, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.');
    } finally { setBusy(false); }
  }, [ingest]);

  const onSample = useCallback(async () => {
    setBusy(true); setError(null); setRepairable(null); setSampleId('clean');
    try { await ingest(parseCsvText(SAMPLE_CSV), 'sample-rent-roll.csv (16 units, 3 buildings)'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load the sample.'); }
    finally { setBusy(false); }
  }, [ingest]);

  const onMessy = useCallback(async () => {
    setBusy(true); setError(null); setRepairable(null); setSampleId('messy');
    try { await ingest(parseCsvText(SAMPLE_MESSY_CSV), 'pm-software-export.csv (16 units, no ZIP column)'); }
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
            <Dropzone onFile={onFile} onSample={onSample} onMessy={aiAvailable() ? onMessy : undefined} busy={busy} error={error} />
          </div>
          {repairable && (
            <div className="paper mx-auto mt-6 max-w-3xl rounded-2xl p-6">
              <p className="eyebrow text-ink-2">We couldn't read this one on our own</p>
              <p className="t-body mt-2 text-ink">
                {repairable.parsed.units.length} of {repairable.parsed.totalRows} rows had a rent and a ZIP we could find.
                {' '}Columns we recognised: {Object.entries(repairable.parsed.columns).filter(([, v]) => v).map(([k, v]) => `${label(k)} ← "${v}"`).join(', ') || 'none'}.
              </p>
              <p className="t-small mt-3 text-ink-2">
                The fallback sends the column headers and six sample rows to the model to work out which column is which. Missing ZIPs are looked up from street addresses with the U.S. Census geocoder; only addresses it can't match go to the model, and those are marked so you can check them. Tenant names in those six rows are included; nothing else leaves your browser.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="button" className="btn-ink" onClick={aiRepair} disabled={busy}>{busy ? 'Reading with AI…' : 'Let AI read the columns'}</button>
                <button type="button" className="btn-ghost" onClick={() => setRepairable(null)} disabled={busy}>Cancel</button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <>
          {roll && roll.issues.length > 0 && (
            <p className="mx-auto mb-6 w-full max-w-6xl rounded-xl bg-canvas-2 px-4 py-3 t-small text-ink/70">
              {roll.issues.length} row{roll.issues.length === 1 ? '' : 's'} skipped: {roll.issues.slice(0, 4).map((i) => `row ${i.row} (${i.message.toLowerCase()})`).join(', ')}{roll.issues.length > 4 ? '…' : ''}
            </p>
          )}
          <Results analysis={analysis} fileName={fileName} cap={cap} onCap={setCap} utilities={utilities} onUtilities={onUtilities} aiNotes={aiNotes} sampleId={sampleId} onReset={() => { setRoll(null); setError(null); setAiNotes([]); setRepairable(null); setSampleId(null); window.scrollTo({ top: 0 }); }} />
        </>
      )}
    </main>
  );
}

const LABELS: Record<string, string> = { id: 'unit', property: 'property', zip: 'ZIP', bedrooms: 'bedrooms', rent: 'rent', leaseEnd: 'lease end', leaseStart: 'lease start', tenant: 'tenant' };
const label = (k: string) => LABELS[k] ?? k;

async function loadBoth() {
  // income is optional: the fairness check is skipped if it fails to load
  const [safmr, zori, income] = await Promise.all([loadSafmr(), loadZori(), loadIncome().catch(() => null)]);
  return { safmr, zori, income };
}

