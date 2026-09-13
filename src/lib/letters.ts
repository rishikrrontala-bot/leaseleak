import type { UnitResult } from './types';
import { fmtDate, fmtUSD, MONTHS_LONG } from './analyze';

export interface LetterOptions {
  landlordName: string;
  noticeDays: number;      // e.g. 60
  asOf: Date;
  moveToBestMonth: boolean; // offer a term that ends in the best month
}

export interface Letter {
  unit: UnitResult;
  title: string;
  body: string;            // plain text, paragraphs separated by \n\n
  newRent: number;
  newEnd: Date | null;
  termMonths: number;
}

function addMonths(d: Date, n: number) {
  const x = new Date(d.getTime());
  x.setMonth(x.getMonth() + n);
  return x;
}
function endOfMonth(y: number, m: number) { return new Date(y, m + 1, 0); }

/** Pick a renewal term (6–18 months) so the new lease ends in the best seasonal month. */
export function chooseTerm(unit: UnitResult): { months: number; newEnd: Date | null } {
  if (!unit.leaseEnd) return { months: 12, newEnd: null };
  const start = new Date(unit.leaseEnd.getFullYear(), unit.leaseEnd.getMonth(), unit.leaseEnd.getDate() + 1);
  let best = { months: 12, newEnd: endOfMonth(addMonths(start, 12).getFullYear(), addMonths(start, 12).getMonth() - 1), idx: -1 };
  // 6–18 month terms are all common; pick the one whose end month has the highest
  // seasonal rent index, preferring the term closest to 12 (then the longer) on ties.
  for (const m of [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]) {
    const end = addMonths(start, m);
    const endM = new Date(end.getFullYear(), end.getMonth(), 0); // last day of the month before
    const idx = unit.seasonal[endM.getMonth()];
    const better = idx > best.idx + 1e-9
      || (Math.abs(idx - best.idx) <= 1e-9 && (Math.abs(m - 12) < Math.abs(best.months - 12) || (Math.abs(m - 12) === Math.abs(best.months - 12) && m > best.months)));
    if (better) best = { months: m, newEnd: endM, idx };
  }
  return { months: best.months, newEnd: best.newEnd };
}

export function buildLetter(unit: UnitResult, opts: LetterOptions): Letter {
  const newRent = unit.suggestedRent ?? unit.rent;
  const increase = newRent - unit.rent;
  const term = opts.moveToBestMonth ? chooseTerm(unit) : { months: 12, newEnd: unit.leaseEnd ? addMonths(unit.leaseEnd, 12) : null };
  const tenant = unit.tenant?.trim() || 'Resident';
  const where = [unit.property, unit.id ? `Unit ${unit.id}` : null].filter(Boolean).join(', ');
  const endStr = unit.leaseEnd ? fmtDate(unit.leaseEnd) : 'the end of your current term';
  const newStart = unit.leaseEnd ? fmtDate(new Date(unit.leaseEnd.getFullYear(), unit.leaseEnd.getMonth(), unit.leaseEnd.getDate() + 1)) : 'the day after your current lease ends';
  const newEndStr = term.newEnd ? fmtDate(term.newEnd) : 'twelve months later';

  const paras: string[] = [];
  paras.push(`${fmtDate(opts.asOf)}`);
  paras.push(`${tenant}\n${where}`);
  paras.push(`Dear ${tenant},`);
  paras.push(`Thank you for being a resident at ${unit.property ?? 'the property'}. Your current lease for Unit ${unit.id} ends on ${endStr}, and we would like to offer you a renewal.`);
  if (increase > 0) {
    paras.push(`Beginning ${newStart}, the monthly rent will be ${fmtUSD(newRent)}, an adjustment of ${fmtUSD(increase)} per month from your current rent of ${fmtUSD(unit.rent)}. This keeps your rent below the U.S. Department of Housing and Urban Development's published Fair Market Rent for a ${unit.bedrooms === 0 ? 'studio' : `${unit.bedrooms}-bedroom`} home in ZIP ${unit.zip} (${fmtUSD(unit.fmr ?? 0)} for fiscal year 2027).`);
  } else {
    paras.push(`We are pleased to offer renewal at your current rent of ${fmtUSD(unit.rent)} per month, beginning ${newStart}.`);
  }
  paras.push(`The renewal term is ${term.months} months, ending ${newEndStr}.${term.months !== 12 ? ` We have offered ${term.months === 8 || term.months === 11 || term.months === 18 ? "an" : "a"} ${term.months}-month term so that the lease ends in ${term.newEnd ? MONTHS_LONG[term.newEnd.getMonth()] : 'a peak month'}, when asking rents in ZIP ${unit.zip} are seasonally highest.` : ''} All other terms of your current lease remain the same.`);
  paras.push(`Please reply by ${fmtDate(new Date(opts.asOf.getTime() + 14 * 86400 * 1000))} to let us know whether you would like to renew. If you do not plan to renew, this letter also serves as written notice, given at least ${opts.noticeDays} days in advance where possible, that the current lease will end on ${endStr}.`);
  paras.push(`We appreciate you and hope you will stay.`);
  paras.push(`Sincerely,\n${opts.landlordName || 'The Management'}`);

  return {
    unit,
    title: `Lease renewal offer — Unit ${unit.id}`,
    body: paras.join('\n\n'),
    newRent,
    newEnd: term.newEnd,
    termMonths: term.months,
  };
}

export async function lettersToPdf(letters: Letter[], filename = 'LeaseLeak-renewal-letters.pdf') {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 72; const width = 612 - margin * 2;
  letters.forEach((l, i) => {
    if (i > 0) doc.addPage();
    doc.setFont('times', 'normal'); doc.setFontSize(11);
    let y = margin;
    for (const para of l.body.split('\n\n')) {
      const lines = doc.splitTextToSize(para, width) as string[];
      for (const line of lines) {
        if (y > 792 - margin) { doc.addPage(); y = margin; }
        doc.text(line, margin, y); y += 15;
      }
      y += 9;
    }
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text('Prepared with LeaseLeak · Benchmarks: HUD Small Area Fair Market Rents FY2027 · Not legal advice — check your state and local notice requirements.', margin, 792 - 40, { maxWidth: width });
    doc.setTextColor(0);
  });
  doc.save(filename);
}
