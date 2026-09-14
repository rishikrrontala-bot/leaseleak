// POST /api/map  { headers, sample }         →  which column is which
// POST /api/map  { addresses: string[] }     →  ZIP codes inferred from street addresses
// The heuristic parser handles clean files; this is the fallback for the messy ones.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { guard, gemini, fail } from './_gemini';

const CANON = ['id', 'property', 'zip', 'bedrooms', 'rent', 'leaseEnd', 'leaseStart', 'tenant'] as const;

const MAP_SYSTEM = `You map the columns of a landlord's rent-roll spreadsheet to a fixed schema.
Schema fields: id (unit label), property (building or street address), zip (5-digit ZIP), bedrooms (count or unit type like "2BR"/"Studio"), rent (current monthly rent in dollars), leaseEnd (lease end/expiration date), leaseStart, tenant (resident name).
Return, for each field, the EXACT source header that holds it, or null if none does. Use the sample rows to disambiguate (e.g. a column of $1,750-style values is rent; a column of 5-digit numbers is zip; "Sq Ft" is NOT bedrooms). Never map one header to two fields. Do not guess wildly — null is a valid answer.`;
const MAP_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(CANON.map((k) => [k, { type: 'string', nullable: true }])),
  required: [...CANON],
};

const ZIP_SYSTEM = `You infer the 5-digit US ZIP code for street addresses that include at least a city and state.
Return one entry per input address, in the same order, with the ZIP as a 5-digit string, and confidence "high" only when the street, city and state together pin a single ZIP; "medium" when the city/state has a few ZIPs and this is the most likely; "low" otherwise. If an address has no city or state, return zip null and confidence "low". Do not invent cities.`;
const ZIP_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          zip: { type: 'string', nullable: true },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['address', 'zip', 'confidence'],
      },
    },
  },
  required: ['results'],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = guard<{ headers?: string[]; sample?: Record<string, unknown>[]; addresses?: string[] }>(req, res);
  if (!body) return;
  try {
    if (Array.isArray(body.addresses)) {
      const addresses = Array.from(new Set(body.addresses.map((a) => String(a).trim()).filter(Boolean))).slice(0, 60);
      if (!addresses.length) return res.status(400).json({ error: 'addresses required' });
      const out = await gemini<{ results: { address: string; zip: string | null; confidence: string }[] }>({
        system: ZIP_SYSTEM, user: `ADDRESSES (JSON array):\n${JSON.stringify(addresses)}`, schema: ZIP_SCHEMA, temperature: 0, maxOutputTokens: 2000,
      });
      // sanity: only accept well-formed 5-digit ZIPs
      out.data.results = out.data.results.map((r) => ({ ...r, zip: r.zip && /^\d{5}$/.test(r.zip) ? r.zip : null }));
      return res.status(200).json(out);
    }
    if (Array.isArray(body.headers)) {
      const headers = body.headers.map(String).slice(0, 60);
      const sample = (body.sample ?? []).slice(0, 6);
      const out = await gemini<Record<string, string | null>>({
        system: MAP_SYSTEM, user: `HEADERS: ${JSON.stringify(headers)}\n\nSAMPLE ROWS (JSON): ${JSON.stringify(sample)}`, schema: MAP_SCHEMA, temperature: 0, maxOutputTokens: 600,
      });
      // only accept headers that actually exist, and never the same header twice
      const seen = new Set<string>();
      for (const k of CANON) {
        const v = out.data[k];
        if (!v || !headers.includes(v) || seen.has(v)) out.data[k] = null; else seen.add(v);
      }
      return res.status(200).json(out);
    }
    res.status(400).json({ error: 'headers+sample or addresses required' });
  } catch (e) { fail(res, e); }
}
