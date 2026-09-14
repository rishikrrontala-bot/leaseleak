import type { Analysis, AnalyzeOptions, IncomeData, SafmrData, Unit, UnitResult, ZoriData } from './types';
import { asset } from './router';

let safmrCache: Promise<SafmrData> | null = null;
let zoriCache: Promise<ZoriData> | null = null;

export function loadSafmr(): Promise<SafmrData> {
  if (!safmrCache) safmrCache = fetch(asset('/data/safmr.json')).then((r) => r.json());
  return safmrCache;
}
export function loadZori(): Promise<ZoriData> {
  if (!zoriCache) zoriCache = fetch(asset('/data/zori.json')).then((r) => r.json());
  return zoriCache;
}
let incomeCache: Promise<IncomeData> | null = null;
export function loadIncome(): Promise<IncomeData> {
  if (!incomeCache) incomeCache = fetch(asset('/data/income.json')).then((r) => r.json());
  return incomeCache;
}
export function preloadData() { void loadSafmr(); void loadZori(); void loadIncome(); }

// FMR is a gross rent (utilities included). When the landlord pays utilities, the
// rent on the roll understates what the unit really earns, so we add a typical
// allowance by bedroom count before comparing. Rough national figures; HUD's
// utility allowance schedules vary by housing authority.
export const UTILITY_ALLOWANCE = [95, 120, 150, 180, 210]; // $/mo by bedrooms 0..4+

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const DAY = 86400 * 1000;

export function analyze(units: Unit[], safmr: SafmrData, zori: ZoriData, cap = 0.06, asOf = new Date(), opts: AnalyzeOptions = {}): Analysis {
  const results: UnitResult[] = units.map((u) => {
    const s = safmr.zips[u.zip];
    const z = zori.zips[u.zip];
    const fmr = s ? s[Math.min(4, u.bedrooms)] : null;
    const areaName = s ? safmr.areas[s[5]] : null;
    const utilityAllowance = u.property && opts.utilities?.[u.property] ? UTILITY_ALLOWANCE[Math.min(4, u.bedrooms)] : 0;
    const effectiveRent = u.rent + utilityAllowance;
    const gapMonthly = fmr !== null ? fmr - effectiveRent : null;
    const gapAnnual = gapMonthly !== null ? gapMonthly * 12 : null;
    const pctBelow = fmr ? (fmr - effectiveRent) / fmr : null;
    const medianIncome = opts.income?.zips[u.zip] ?? null;

    let seasonal: number[] = zori.national;
    let seasonalSource: UnitResult['seasonalSource'] = 'national';
    if (z?.z) { seasonal = z.z; seasonalSource = 'zip'; }
    else if (z && z.k !== undefined && zori.metroSeason[z.k]) { seasonal = zori.metroSeason[z.k]; seasonalSource = 'metro'; }

    let bestMonth = 0; let bestIndex = -Infinity;
    seasonal.forEach((v, i) => { if (v > bestIndex) { bestIndex = v; bestMonth = i; } });

    const expiryMonth = u.leaseEnd ? u.leaseEnd.getMonth() : null;
    const expiryIndex = expiryMonth !== null ? seasonal[expiryMonth] : null;
    const timingValueAnnual = expiryIndex !== null ? u.rent * (bestIndex / expiryIndex - 1) * 12 : null;
    const daysToExpiry = u.leaseEnd ? Math.round((u.leaseEnd.getTime() - asOf.getTime()) / DAY) : null;

    let suggestedRent: number | null = null;
    let suggestedIncrease: number | null = null;
    if (fmr !== null) {
      const capped = Math.round(u.rent * (1 + cap));
      suggestedRent = Math.max(u.rent, Math.min(fmr - utilityAllowance, capped));
      // round to nearest $5 for a letter that reads like a human wrote it
      suggestedRent = Math.round(suggestedRent / 5) * 5;
      if (suggestedRent < u.rent) suggestedRent = u.rent;
      suggestedIncrease = suggestedRent - u.rent;
    }

    return {
      ...u,
      utilityAllowance, effectiveRent,
      fmr, areaName, gapMonthly, gapAnnual, pctBelow,
      zoriRent: z ? z.r : null,
      zoriYoY: z?.y ?? null,
      city: z?.c ?? null,
      state: z?.s ?? null,
      seasonal, seasonalSource,
      expiryMonth, expiryIndex, bestMonth, bestIndex,
      timingValueAnnual, daysToExpiry, suggestedRent, suggestedIncrease,
      medianIncome,
      currentBurden: medianIncome ? (u.rent * 12) / medianIncome : null,
      proposedBurden: medianIncome && suggestedRent !== null ? (suggestedRent * 12) / medianIncome : null,
    };
  });

  const matched = results.filter((r) => r.fmr !== null).length;
  const totalGapAnnual = results.reduce((a, r) => a + Math.max(0, r.gapAnnual ?? 0), 0);
  const totalTimingValue = results.reduce((a, r) => a + Math.max(0, r.timingValueAnnual ?? 0), 0);
  const expiryByMonth = new Array(12).fill(0) as number[];
  results.forEach((r) => { if (r.expiryMonth !== null) expiryByMonth[r.expiryMonth]++; });
  const expiring60 = results.filter((r) => r.daysToExpiry !== null && r.daysToExpiry >= 0 && r.daysToExpiry <= 60).sort((a, b) => a.daysToExpiry! - b.daysToExpiry!);
  const expiring90 = results.filter((r) => r.daysToExpiry !== null && r.daysToExpiry >= 0 && r.daysToExpiry <= 90).sort((a, b) => a.daysToExpiry! - b.daysToExpiry!);
  const recoverableAtCap = results.reduce((a, r) => a + (r.suggestedIncrease ?? 0) * 12, 0);

  return {
    units: results,
    matched,
    unmatched: results.length - matched,
    totalRent: results.reduce((a, r) => a + r.rent, 0),
    totalGapAnnual,
    unitsUnder: results.filter((r) => (r.gapMonthly ?? 0) > 0).length,
    unitsAtOrAbove: results.filter((r) => r.fmr !== null && (r.gapMonthly ?? 0) <= 0).length,
    totalTimingValue,
    expiring60, expiring90, expiryByMonth,
    recoverableAtCap,
    cap,
    asOf,
    fy: safmr.fy,
    zoriAsOf: zori.asof,
    incomeVintage: opts.income?.vintage ?? null,
  };
}

export const fmtUSD = (n: number, opts: { cents?: boolean } = {}) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: opts.cents ? 2 : 0, minimumFractionDigits: opts.cents ? 2 : 0 }).format(n);
export const fmtPct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

// ---- Equity: what a change in annual income is worth at a cap rate ----
// Income property is priced on NOI ÷ cap rate, so $1/yr of recovered rent ≈ $1/capRate of value.
export const valueAtCap = (annualIncome: number, capRate: number) => (capRate > 0 ? annualIncome / capRate : 0);

// ---- Vouchers: HUD FMR is the basis for Housing Choice Voucher payment standards ----
// A unit renting below the payment standard could earn more from a voucher household,
// with the housing-authority share paid directly each month.
export interface VoucherRow {
  unit: UnitResult;
  standard: number;        // payment standard = FMR × standardPct
  upsideMonthly: number;   // max(0, standard − rent)
  upsideAnnual: number;
}
export interface VoucherSummary {
  rows: VoucherRow[];      // candidates only, largest upside first
  candidates: number;
  upsideAnnual: number;
  strong: number;          // rent < 90% of FMR: beats even the lowest standard a PHA can set
}
export function voucherOpportunity(units: UnitResult[], standardPct = 1.0): VoucherSummary {
  const rows = units
    .filter((u) => u.fmr !== null)
    .map((u) => {
      const standard = Math.round(u.fmr! * standardPct);
      const upsideMonthly = Math.max(0, standard - u.rent);
      return { unit: u, standard, upsideMonthly, upsideAnnual: upsideMonthly * 12 };
    })
    .filter((r) => r.upsideMonthly > 0)
    .sort((a, b) => b.upsideAnnual - a.upsideAnnual);
  return {
    rows,
    candidates: rows.length,
    upsideAnnual: rows.reduce((s, r) => s + r.upsideAnnual, 0),
    strong: units.filter((u) => u.fmr !== null && u.rent < u.fmr! * 0.9).length,
  };
}

// ---- Market momentum: what the ZIP's year-over-year rent move means for this renewal ----
export type MomentumKind = 'rising' | 'steady' | 'softening';
export interface Momentum { kind: MomentumKind; label: string; advice: string }
export function momentum(yoy: number | null): Momentum | null {
  if (yoy === null) return null;
  if (yoy >= 0.03) return { kind: 'rising', label: 'Rising', advice: 'Asking rents are moving up — push toward the benchmark this cycle.' };
  if (yoy <= -0.01) return { kind: 'softening', label: 'Softening', advice: 'Asking rents are slipping — favour retention: smaller increases, longer terms.' };
  return { kind: 'steady', label: 'Steady', advice: 'A normal market — renew at your cap.' };
}

// ---- Building report cards: one grade per property, worst first ----
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export interface BuildingCard {
  property: string;
  units: UnitResult[];
  matched: number;
  under: number;
  gapAnnual: number;
  grossAnnual: number;
  leakPct: number;        // gapAnnual ÷ grossAnnual — the share of income being left on the table
  perDoor: number;        // gapAnnual ÷ units
  avgBelow: number;       // mean pctBelow across under-benchmark units
  withEnd: number;
  badTiming: number;      // leases ending in a below-average month
  grade: Grade;
  yoy: number | null;
  momentum: Momentum | null;
  zip: string; city: string | null; state: string | null;
}
const gradeFor = (leakPct: number): Grade => (leakPct < 0.02 ? 'A' : leakPct < 0.05 ? 'B' : leakPct < 0.09 ? 'C' : leakPct < 0.14 ? 'D' : 'F');
export function buildingCards(a: Analysis): BuildingCard[] {
  const m = new Map<string, UnitResult[]>();
  for (const u of a.units) { const k = u.property ?? 'Portfolio'; if (!m.has(k)) m.set(k, []); m.get(k)!.push(u); }
  return Array.from(m.entries()).map(([property, units]) => {
    const matchedUnits = units.filter((u) => u.fmr !== null);
    const underUnits = matchedUnits.filter((u) => (u.gapMonthly ?? 0) > 0);
    const gapAnnual = underUnits.reduce((s, u) => s + u.gapAnnual!, 0);
    const grossAnnual = units.reduce((s, u) => s + u.rent * 12, 0);
    const leakPct = grossAnnual ? gapAnnual / grossAnnual : 0;
    const withEndUnits = units.filter((u) => u.expiryIndex !== null);
    const first = units[0];
    return {
      property, units,
      matched: matchedUnits.length, under: underUnits.length,
      gapAnnual, grossAnnual, leakPct,
      perDoor: units.length ? gapAnnual / units.length : 0,
      avgBelow: underUnits.length ? underUnits.reduce((s, u) => s + u.pctBelow!, 0) / underUnits.length : 0,
      withEnd: withEndUnits.length,
      badTiming: withEndUnits.filter((u) => u.expiryIndex! < 1).length,
      grade: matchedUnits.length ? gradeFor(leakPct) : 'C',
      yoy: first.zoriYoY, momentum: momentum(first.zoriYoY),
      zip: first.zip, city: first.city, state: first.state,
    };
  }).sort((x, y) => y.perDoor - x.perDoor);
}

// ---- Twelve-month cash flow: monthly income under three renewal policies ----
export interface CashflowMonth { y: number; m: number; label: string; current: number; proposed: number; benchmark: number }
export interface Cashflow { months: CashflowMonth[]; totals: { current: number; proposed: number; benchmark: number } }
export function cashflowProjection(a: Analysis): Cashflow {
  const start = new Date(a.asOf.getFullYear(), a.asOf.getMonth(), 1);
  const months: CashflowMonth[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    let current = 0, proposed = 0, benchmark = 0;
    for (const u of a.units) {
      // a renewal takes effect in the first full month after the lease ends
      const renewed = !!u.leaseEnd && u.leaseEnd < d;
      current += u.rent;
      proposed += renewed ? (u.suggestedRent ?? u.rent) : u.rent;
      benchmark += renewed && u.fmr !== null ? Math.max(u.rent, u.fmr - u.utilityAllowance) : u.rent;
    }
    months.push({ y: d.getFullYear(), m: d.getMonth(), label: MONTHS[d.getMonth()], current, proposed, benchmark });
  }
  const sum = (k: 'current' | 'proposed' | 'benchmark') => months.reduce((s, x) => s + x[k], 0);
  return { months, totals: { current: sum('current'), proposed: sum('proposed'), benchmark: sum('benchmark') } };
}

// ---- Expiry clustering: how much income comes up for renewal in one month, and a staggered alternative ----
export interface ClusterMonth { y: number; m: number; label: string; count: number; rent: number; share: number }
export interface Clustering {
  months: ClusterMonth[];           // next 12 months
  peak: ClusterMonth | null;        // month with the most rent up for renewal
  totalRent: number;
  lossIfTwoLeave: number;           // rent lost that month if the two largest leases in the peak month don't renew
  topMonths: number[];              // the above-average seasonal months (0..11), at least three
  staggered: number[];              // counts per forward month after spreading renewals across topMonths
  staggeredPeakShare: number;
  improves: boolean;                // staggering would lower the peak-month share
}
export function expiryClustering(a: Analysis, curve: number[]): Clustering {
  const start = new Date(a.asOf.getFullYear(), a.asOf.getMonth(), 1);
  const totalRent = a.units.reduce((s, u) => s + u.rent, 0);
  const months: ClusterMonth[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const us = a.units.filter((u) => u.leaseEnd && u.leaseEnd.getFullYear() === d.getFullYear() && u.leaseEnd.getMonth() === d.getMonth());
    const rent = us.reduce((s, u) => s + u.rent, 0);
    months.push({ y: d.getFullYear(), m: d.getMonth(), label: MONTHS[d.getMonth()], count: us.length, rent, share: totalRent ? rent / totalRent : 0 });
  }
  const peak = months.reduce<ClusterMonth | null>((best, x) => (x.count && (!best || x.rent > best.rent) ? x : best), null);
  let lossIfTwoLeave = 0;
  if (peak) {
    const rents = a.units.filter((u) => u.leaseEnd && u.leaseEnd.getFullYear() === peak.y && u.leaseEnd.getMonth() === peak.m).map((u) => u.rent).sort((x, y) => y - x);
    lossIfTwoLeave = rents.slice(0, 2).reduce((s, r) => s + r, 0);
  }
  // the above-average seasonal months (at least three), by the portfolio curve
  const ranked = curve.map((v, i) => [v, i] as const).sort((x, y) => y[0] - x[0]);
  const topMonths = ranked.slice(0, Math.max(3, ranked.filter(([v]) => v >= 1).length)).map(([, i]) => i).sort((x, y) => x - y);
  // spread every lease with an end date across those months, balancing by rent
  const load = new Map<number, number>(topMonths.map((m) => [m, 0]));
  const staggeredByMonth = new Array(12).fill(0) as number[];
  for (const u of [...a.units].filter((u) => u.leaseEnd).sort((x, y) => y.rent - x.rent)) {
    const target = topMonths.reduce((best, m) => (load.get(m)! < load.get(best)! ? m : best), topMonths[0]);
    load.set(target, load.get(target)! + u.rent);
    staggeredByMonth[target]++;
  }
  const staggered = months.map((x) => staggeredByMonth[x.m]);
  const staggeredPeakShare = totalRent ? Math.max(...Array.from(load.values())) / totalRent : 0;
  const improves = !!peak && staggeredPeakShare < peak.share - 0.02;
  return { months, peak, totalRent, lossIfTwoLeave, topMonths, staggered, staggeredPeakShare, improves };
}
