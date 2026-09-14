import { fmtPct, momentum } from '../lib/analyze';

// Small pill: "Rising +5.0%" / "Steady +2.8%" / "Softening −0.7%" from the ZIP's ZORI year-over-year.
export default function MomentumBadge({ yoy }: { yoy: number | null }) {
  const m = momentum(yoy);
  if (!m || yoy === null) return null;
  const tone = m.kind === 'rising' ? 'bg-mint-2/15 text-mint' : m.kind === 'softening' ? 'bg-ember/15 text-ember-3' : 'bg-paper/10 text-paper/80';
  return (
    <span className={`t-micro inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${tone}`} title={m.advice}>
      <span aria-hidden="true">{m.kind === 'rising' ? '↗' : m.kind === 'softening' ? '↘' : '→'}</span>
      {m.label} <span className="num">{yoy >= 0 ? '+' : ''}{fmtPct(yoy)}</span>
    </span>
  );
}
