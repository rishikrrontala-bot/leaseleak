// The AI layer. The engine computes; the model reads and writes.
//
// buildBrief() turns an Analysis into the compact JSON the model sees — every
// figure the engine produced, and never a tenant name. verify() then checks
// the model's prose against that brief, so the UI can show which figures are
// traceable to the engine and flag any that are not.
import type { Analysis } from './types';
import { buildingCards, cashflowProjection, expiryClustering, retention, valueAtCap, voucherOpportunity, MONTHS } from './analyze';

const ENDPOINT = (import.meta.env.VITE_AI_ENDPOINT as string | undefined)?.replace(/\/$/, '') ?? '/api';

const r0 = (n: number) => Math.round(n);
const pct = (n: number) => Math.round(n * 1000) / 10; // one decimal, as a percentage
const iso = (d?: Date) => (d ? d.toISOString().slice(0, 10) : null);

export interface Brief { [k: string]: unknown }

/** Everything the engine knows, as JSON. Tenant names are deliberately absent. */
export function buildBrief(a: Analysis, cap: number, curve: number[]): Brief {
  const cards = buildingCards(a);
  const cf = cashflowProjection(a);
  const cl = expiryClustering(a, curve);
  const v = voucherOpportunity(a.units, 1.0);
  const ret = retention(a.units);
  return {
    asOf: iso(a.asOf), fiscalYear: a.fy, zoriAsOf: a.zoriAsOf, capPct: pct(cap),
    portfolio: {
      units: a.units.length, matched: a.matched, unitsUnder: a.unitsUnder, unitsAtOrAbove: a.unitsAtOrAbove,
      monthlyRent: r0(a.totalRent), gapPerYear: r0(a.totalGapAnnual), recoverableAtCapPerYear: r0(a.recoverableAtCap),
      timingValuePerYear: r0(a.totalTimingValue), equityAt6PctCap: r0(valueAtCap(a.totalGapAnnual, 0.06)),
      next12mo: { doNothing: r0(cf.totals.current), proposed: r0(cf.totals.proposed), atBenchmark: r0(cf.totals.benchmark) },
      concentration: cl.peak ? { month: `${cl.peak.label} ${cl.peak.y}`, leases: cl.peak.count, shareOfIncomePct: pct(cl.peak.share), lossIfTwoLeave: r0(cl.lossIfTwoLeave), strongestMonths: cl.topMonths.map((m) => MONTHS[m]) } : null,
      vouchers: { unitsBelowStandard: v.candidates, upsidePerYear: r0(v.upsideAnnual), strongCandidates: v.strong },
      retention: { increasesOffered: ret.offered, grossPerYear: r0(ret.gross), expectedAt15PctLeavePerYear: r0(ret.expected), breakEvenLeavePct: ret.breakEvenLeaveRate === null ? null : pct(ret.breakEvenLeaveRate) },
    },
    buildings: cards.map((c) => ({
      name: c.property, zip: c.zip, city: c.city, state: c.state, units: c.units.length, grade: c.grade,
      gapPerYear: r0(c.gapAnnual), perDoorPerYear: r0(c.perDoor), leakPct: pct(c.leakPct), unitsUnder: c.under,
      leasesInBelowAverageMonth: c.badTiming, zoriYoYPct: c.yoy === null ? null : pct(c.yoy), momentum: c.momentum?.label ?? null,
    })),
    units: a.units.map((u) => {
      const rr = ret.rows.find((x) => x.unit.rowIndex === u.rowIndex);
      const vr = v.rows.find((x) => x.unit.rowIndex === u.rowIndex);
      return {
        id: u.id, building: u.property ?? null, zip: u.zip, bedrooms: u.bedrooms, rent: u.rent,
        utilityAllowance: u.utilityAllowance || undefined,
        hudBenchmark: u.fmr, gapPerYear: u.gapAnnual === null ? null : r0(Math.max(0, u.gapAnnual)), pctBelowBenchmark: u.pctBelow === null ? null : pct(Math.max(0, u.pctBelow)),
        proposedRent: u.suggestedRent, proposedIncreasePerMonth: u.suggestedIncrease,
        leaseEnd: iso(u.leaseEnd), daysToLeaseEnd: u.daysToExpiry, leaseEndsIn: u.expiryMonth === null ? null : MONTHS[u.expiryMonth], bestMonthToEnd: MONTHS[u.bestMonth],
        timingValuePerYear: u.timingValueAnnual === null ? null : r0(Math.max(0, u.timingValueAnnual)),
        zipMedianIncome: u.medianIncome, proposedRentBurdenPct: u.proposedBurden === null ? null : pct(u.proposedBurden),
        voucherUpsidePerYear: vr ? r0(vr.upsideAnnual) : 0,
        ifTheyLeave: rr ? { gainIfStayPerYear: r0(rr.gainStay), gainIfLeavePerYear: r0(rr.gainLeave), paybackMonths: Math.min(999, r0(rr.paybackMonths)) } : null,
      };
    }),
  };
}

export interface PlanOut { headline: string; actions: { title: string; why: string; units: string[]; when: string }[]; skip: string[]; caution: string }
export interface AskOut { answer: string; units: string[]; confidence: 'from the brief' | 'partly from the brief' | 'not in the brief' }
export interface AiResult<T> { data: T; model: string; usage: { input: number; output: number } }

async function post<T>(path: string, body: unknown): Promise<AiResult<T>> {
  const r = await fetch(`${ENDPOINT}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? `AI request failed (${r.status})`);
  return j as AiResult<T>;
}

export const fetchPlan = (brief: Brief) => post<PlanOut>('/plan', { brief });
export const askRoll = (brief: Brief, question: string, history: { q: string; a: string }[]) => post<AskOut>('/ask', { brief, question, history });
export const mapColumns = (headers: string[], sample: Record<string, unknown>[]) => post<Record<string, string | null>>('/map', { headers, sample });
export const inferZips = (addresses: string[]) => post<{ results: { address: string; zip: string | null; confidence: 'high' | 'medium' | 'low' }[] }>('/map', { addresses });

/** Is AI wired up on this deployment? (Pages builds without an endpoint get no AI UI.) */
export const aiAvailable = () => ENDPOINT !== '' && ENDPOINT !== 'off';

// ---- Grounding check: does every figure in the model's text exist in the brief? ----
function collectNumbers(x: unknown, out: Set<number>) {
  if (typeof x === 'number' && Number.isFinite(x)) { out.add(Math.round(x)); out.add(Math.round(x * 10) / 10); }
  else if (Array.isArray(x)) x.forEach((v) => collectNumbers(v, out));
  else if (x && typeof x === 'object') Object.values(x).forEach((v) => collectNumbers(v, out));
}
export interface Verification { total: number; verified: number; unverified: string[] }
/** Extract $ amounts, percentages and month counts from prose and check each against the brief's numbers. */
export function verify(text: string, brief: Brief): Verification {
  const known = new Set<number>(); collectNumbers(brief, known);
  // also allow ×12 / ÷12 of any known figure (per-month ↔ per-year) since the memo may restate either
  for (const n of Array.from(known)) { known.add(Math.round(n * 12)); known.add(Math.round(n / 12)); }
  const found = Array.from(text.matchAll(/\$\s?([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s?%|(\d+)\s(?:months?|mo\b)/g));
  let verified = 0; const unverified: string[] = [];
  for (const m of found) {
    const raw = m[1] ?? m[2] ?? m[3];
    const n = parseFloat(raw.replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    const ok = known.has(Math.round(n)) || known.has(Math.round(n * 10) / 10);
    if (ok) verified++; else unverified.push(m[0].trim());
  }
  return { total: found.length, verified, unverified };
}
