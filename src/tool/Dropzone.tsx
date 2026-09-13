import { useRef, useState } from 'react';
import { SAMPLE_CSV, TEMPLATE_CSV } from '../lib/sample';

interface Props {
  onFile: (file: File) => void;
  onSample: () => void;
  busy: boolean;
  error: string | null;
}

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function Dropzone({ onFile, onSample, busy, error }: Props) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop your rent roll here or press Enter to choose a file"
        className={`dropzone rounded-2xl px-6 py-14 text-center sm:px-12 sm:py-20 ${over ? 'is-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ''; }}
        />
        <svg aria-hidden="true" viewBox="0 0 48 48" className="mx-auto mb-6 h-12 w-12 text-ember" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M24 30V10m0 0-7 7m7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 30v6a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4v-6" strokeLinecap="round" />
        </svg>
        <p className="t-h3 mb-2">{busy ? 'Reading your rent roll…' : 'Drop your rent roll here'}</p>
        <p className="t-body mx-auto max-w-md text-paper/70">
          CSV or Excel. Any column names — we look for unit, ZIP, bedrooms, rent and lease end. Nothing leaves your browser.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <span className="btn-solid">Choose a file</span>
          <button
            type="button"
            className="btn-ghost"
            onClick={(e) => { e.stopPropagation(); onSample(); }}
            disabled={busy}
          >
            Try the sample roll (16 units)
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 t-small text-paper/60">
        <span>Columns we understand: Property · Unit · Tenant · Beds · Rent · Lease Start · Lease End · ZIP</span>
        <span className="flex gap-4">
          <button type="button" className="link-arrow" onClick={() => download('leaseleak-template.csv', TEMPLATE_CSV)}>Template CSV</button>
          <button type="button" className="link-arrow" onClick={() => download('leaseleak-sample-rent-roll.csv', SAMPLE_CSV)}>Sample CSV</button>
        </span>
      </div>
      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-ember/50 bg-ember/10 px-4 py-3 t-small text-ember-3">
          {error}
        </div>
      )}
    </div>
  );
}
