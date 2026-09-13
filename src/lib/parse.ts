import Papa from 'papaparse';
import type { ParsedRoll, ParseIssue, RawRow, Unit } from './types';

// Column aliases, all lower-cased and stripped of non-alphanumerics.
const ALIASES: Record<string, string[]> = {
  id: ['unit', 'unitid', 'unitnumber', 'unitno', 'unitname', 'apt', 'apartment', 'suite', 'door', 'unit#'],
  property: ['property', 'building', 'address', 'propertyname', 'site', 'streetaddress', 'propertyaddress'],
  zip: ['zip', 'zipcode', 'postal', 'postalcode', 'zip5', 'zcta'],
  bedrooms: ['bedrooms', 'beds', 'br', 'bed', 'bd', 'bdrm', 'bdrms', 'unittype', 'type', 'bedroom'],
  rent: ['rent', 'monthlyrent', 'currentrent', 'leaserent', 'rentamount', 'contractrent', 'marketrent', 'rentmonth', 'price'],
  leaseEnd: ['leaseend', 'leaseenddate', 'expires', 'expiration', 'expiry', 'expirationdate', 'enddate', 'leaseexpiration', 'leaseexpires', 'moveout', 'endoflease', 'leaseto'],
  leaseStart: ['leasestart', 'leasestartdate', 'startdate', 'movein', 'moveindate', 'leasefrom'],
  tenant: ['tenant', 'tenantname', 'resident', 'residentname', 'name', 'lessee', 'occupant'],
};

const norm = (s: string) => String(s ?? '').toLowerCase().replace(/[^a-z0-9#]/g, '');

export function detectColumns(headers: string[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  const normed = headers.map((h) => ({ raw: h, n: norm(h) }));
  for (const [canon, aliases] of Object.entries(ALIASES)) {
    let hit: string | null = null;
    // exact alias first
    for (const a of aliases) {
      const m = normed.find((h) => h.n === a);
      if (m) { hit = m.raw; break; }
    }
    // then substring match
    if (!hit) {
      for (const a of aliases) {
        const m = normed.find((h) => h.n.includes(a) && a.length >= 3);
        if (m && !Object.values(out).includes(m.raw)) { hit = m.raw; break; }
      }
    }
    out[canon] = hit;
  }
  return out;
}

export function parseBedrooms(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return clampBr(v);
  const s = String(v).toLowerCase().trim();
  if (/studio|efficiency|^0\s*br|^0$|^eff/.test(s)) return 0;
  const m = s.match(/(\d+)\s*(br|bd|bed|b\b|x|\/)?/);
  if (m) return clampBr(parseInt(m[1], 10));
  return null;
}
const clampBr = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(4, Math.round(n))) : 0);

export function parseMoney(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[$,\s]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function parseDate(v: unknown): Date | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  if (typeof v === 'number') {
    // Excel serial date
    if (v > 20000 && v < 80000) {
      const d = new Date(Math.round((v - 25569) * 86400 * 1000));
      return isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  }
  const s = String(v).trim();
  // MM/DD/YYYY or M/D/YY
  const us = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (us) {
    let y = parseInt(us[3], 10); if (y < 100) y += 2000;
    const d = new Date(y, parseInt(us[1], 10) - 1, parseInt(us[2], 10));
    return isNaN(d.getTime()) ? undefined : d;
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const d = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
    return isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export function parseZip(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  const m = s.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (m) return m[1];
  if (/^\d{3,4}$/.test(s)) return s.padStart(5, '0');
  return null;
}

export function rowsToUnits(rows: RawRow[], headers: string[]): ParsedRoll {
  const columns = detectColumns(headers);
  const issues: ParseIssue[] = [];
  const units: Unit[] = [];
  const get = (r: RawRow, k: string) => (columns[k] ? r[columns[k] as string] : undefined);

  rows.forEach((r, i) => {
    const rowNum = i + 2;
    const empty = Object.values(r).every((v) => v === null || v === undefined || String(v).trim() === '');
    if (empty) return;
    const rent = parseMoney(get(r, 'rent'));
    let zip = parseZip(get(r, 'zip'));
    if (!zip && columns.property) zip = parseZip(get(r, 'property'));
    const bedrooms = parseBedrooms(get(r, 'bedrooms'));
    if (rent === null) { issues.push({ row: rowNum, message: 'No rent found' }); return; }
    if (!zip) { issues.push({ row: rowNum, message: 'No 5-digit ZIP found' }); return; }
    if (bedrooms === null) { issues.push({ row: rowNum, message: 'No bedroom count found (assumed 1BR)' }); }
    units.push({
      id: String(get(r, 'id') ?? `Row ${rowNum}`),
      property: get(r, 'property') != null ? String(get(r, 'property')) : undefined,
      zip,
      bedrooms: bedrooms ?? 1,
      rent,
      leaseEnd: parseDate(get(r, 'leaseEnd')),
      leaseStart: parseDate(get(r, 'leaseStart')),
      tenant: get(r, 'tenant') != null ? String(get(r, 'tenant')) : undefined,
      rowIndex: rowNum,
    });
  });
  return { units, issues, columns, totalRows: rows.length };
}

export async function parseFile(file: File): Promise<ParsedRoll> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: null, raw: true });
    const headers = rows.length ? Object.keys(rows[0]) : [];
    return rowsToUnits(rows, headers);
  }
  const text = await file.text();
  return parseCsvText(text);
}

export function parseCsvText(text: string): ParsedRoll {
  const res = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
  const headers = res.meta.fields ?? [];
  return rowsToUnits(res.data, headers);
}
