import type { Analysis, SafmrData, Unit, UnitResult, ZoriData } from './types';
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
export function preloadData() { void loadSafmr(); void loadZori(); }

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const DAY = 86400 * 1000;

export function analyze(units: Unit[], safmr: SafmrData, zori: ZoriData, cap = 0.06, asOf = new Date()): Analysis {
  const results: UnitResult[] = units.map((u) => {
    const s = safmr.zips[u.zip];
    const z = zori.zips[u.zip];
    const fmr = s ? s[Math.min(4, u.bedrooms)] : null;
    const areaName = s ? safmr.areas[s[5]] : null;
    const gapMonthly = fmr !== null ? fmr - u.rent : null;
    const gapAnnual = gapMonthly !== null ? gapMonthly * 12 : null;
    const pctBelow = fmr ? (fmr - u.rent) / fmr : null;

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
      suggestedRent = Math.max(u.rent, Math.min(fmr, capped));
      // round to nearest $5 for a letter that reads like a human wrote it
      suggestedRent = Math.round(suggestedRent / 5) * 5;
      if (suggestedRent < u.rent) suggestedRent = u.rent;
      suggestedIncrease = suggestedRent - u.rent;
    }

    return {
      ...u,
      fmr, areaName, gapMonthly, gapAnnual, pctBelow,
      zoriRent: z ? z.r : null,
      zoriYoY: z?.y ?? null,
      city: z?.c ?? null,
      state: z?.s ?? null,
      seasonal, seasonalSource,
      expiryMonth, expiryIndex, bestMonth, bestIndex,
      timingValueAnnual, daysToExpiry, suggestedRent, suggestedIncrease,
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
