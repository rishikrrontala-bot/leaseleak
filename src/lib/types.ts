export type RawRow = Record<string, string | number | null | undefined>;

export interface Unit {
  id: string;            // unit label, e.g. "A-101"
  property?: string;     // building / address
  zip: string;           // 5-digit
  bedrooms: number;      // 0..4 (4 = 4+)
  rent: number;          // current monthly rent
  leaseEnd?: Date;
  leaseStart?: Date;
  tenant?: string;
  rowIndex: number;
}

export interface ParseIssue {
  row: number;
  message: string;
}

export interface ParsedRoll {
  units: Unit[];
  issues: ParseIssue[];
  columns: Record<string, string | null>; // canonical -> source header
  totalRows: number;
}

export interface SafmrData {
  fy: number;
  areas: string[];
  zips: Record<string, number[]>; // [0br,1br,2br,3br,4br,areaIdx]
}

export interface ZoriZip {
  r: number;      // latest typical asking rent (all bedrooms)
  m: string;      // as-of month "2026-07"
  c: string;      // city
  s: string;      // state
  y?: number;     // YoY change (fraction)
  k?: number;     // metro index
  z?: number[];   // 12-month seasonal index (Jan..Dec), mean = 1
}

export interface ZoriData {
  asof: string;
  national: number[];
  metros: string[];
  metroSeason: number[][];
  zips: Record<string, ZoriZip>;
}

export interface IncomeData {
  vintage: string;
  zips: Record<string, number>;  // ZIP -> median household income (ACS 5-year)
}

export interface UnitResult extends Unit {
  utilityAllowance: number;      // $/mo the landlord covers (0 unless the building is marked utilities-included)
  effectiveRent: number;         // rent + utilityAllowance — what FMR (a gross rent) is compared against
  fmr: number | null;            // HUD SAFMR for zip+bedrooms
  areaName: string | null;
  gapMonthly: number | null;     // fmr - rent (positive = under benchmark)
  gapAnnual: number | null;
  pctBelow: number | null;       // gap / fmr
  zoriRent: number | null;       // Zillow typical asking rent in ZIP
  zoriYoY: number | null;
  city: string | null;
  state: string | null;
  seasonal: number[];            // 12 idx (never null: falls back to national)
  seasonalSource: 'zip' | 'metro' | 'national';
  expiryMonth: number | null;    // 0..11
  expiryIndex: number | null;    // seasonal index at expiry month
  bestMonth: number;             // 0..11
  bestIndex: number;
  timingValueAnnual: number | null; // rent * (best/curr - 1) * 12
  daysToExpiry: number | null;
  suggestedRent: number | null;  // min(fmr − allowance, rent*(1+cap)) but never below rent
  suggestedIncrease: number | null;
  medianIncome: number | null;   // ZIP median household income
  currentBurden: number | null;  // rent×12 ÷ median income
  proposedBurden: number | null; // suggestedRent×12 ÷ median income
}

export interface AnalyzeOptions {
  utilities?: Record<string, boolean>;  // property -> landlord pays utilities
  income?: IncomeData | null;
}

export interface Analysis {
  units: UnitResult[];
  matched: number;
  unmatched: number;
  totalRent: number;
  totalGapAnnual: number;        // sum of positive gaps
  unitsUnder: number;
  unitsAtOrAbove: number;
  totalTimingValue: number;
  expiring60: UnitResult[];
  expiring90: UnitResult[];
  expiryByMonth: number[];       // count per month 0..11
  recoverableAtCap: number;      // sum of suggestedIncrease*12
  cap: number;
  asOf: Date;
  fy: number;
  zoriAsOf: string;
  incomeVintage: string | null;
}
