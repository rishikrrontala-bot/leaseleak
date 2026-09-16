// Generate public/data/sample-plans.json: one plan per built-in sample roll, from the live API.
//   VITE_AI_ENDPOINT=https://leaseleak.vercel.app/api npx vite-node scripts/cache-sample-plans.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsvText } from '../src/lib/parse';
import { analyze } from '../src/lib/analyze';
import { buildBrief, fetchPlan, verify } from '../src/lib/ai';
import { SAMPLE_CSV, SAMPLE_MESSY_CSV } from '../src/lib/sample';

const safmr = JSON.parse(readFileSync('public/data/safmr.json', 'utf8'));
const zori = JSON.parse(readFileSync('public/data/zori.json', 'utf8'));
const income = JSON.parse(readFileSync('public/data/income.json', 'utf8'));
const curveOf = (a: ReturnType<typeof analyze>) => { const acc = new Array(12).fill(0); let w = 0; for (const u of a.units) { u.seasonal.forEach((v, i) => { acc[i] += v * u.rent; }); w += u.rent; } return acc.map((v) => v / w); };
const out: Record<string, unknown> = {};
const generatedOn = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
for (const [id, csv] of [['clean', SAMPLE_CSV], ['messy', SAMPLE_MESSY_CSV]] as const) {
  // the messy roll only differs in how it was read; once parsed with the AI mapping it is the same portfolio
  const units = parseCsvText(id === 'clean' ? csv : SAMPLE_CSV).units;
  const a = analyze(units, safmr, zori, 0.06, new Date(), { income });
  const brief = buildBrief(a, 0.06, curveOf(a));
  const r = await fetchPlan(brief);
  const text = [r.data.headline, ...r.data.actions.flatMap((x) => [x.title, x.why]), ...r.data.skip, r.data.caution].join('\n');
  const v = verify(text, brief);
  console.log(id, '←', r.model, `| verified ${v.verified}/${v.total}`, v.unverified.length ? `unverified: ${v.unverified.join(', ')}` : '', '\n  ', r.data.headline);
  out[id] = { plan: r.data, model: r.model, generatedOn, verified: `${v.verified}/${v.total}` };
}
writeFileSync('public/data/sample-plans.json', JSON.stringify(out, null, 1));
console.log('wrote public/data/sample-plans.json');
