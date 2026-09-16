// POST /api/plan  { brief }  →  a prioritised plan memo, grounded in the engine's numbers.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { guard, gemini, fail } from './_gemini.js';

const SYSTEM = `You are the advisor inside LeaseLeak, a rent-roll audit tool for small landlords.
You receive a JSON brief produced by a deterministic engine: every dollar figure, percentage, date and unit ID in it was computed from public data (HUD Fair Market Rents, Zillow ZORI, Census ACS). You do not compute anything new.

Your job is judgment and language: decide what matters most, in what order, and say it plainly.

Rules — these are strict:
1. Use ONLY numbers, unit IDs, properties and dates that appear in the brief. Never invent, round differently, extrapolate, add, subtract or otherwise combine figures — cite each one individually, exactly as it appears. (A client-side check flags any figure that is not in the brief.)
2. Every action must name the units or buildings it applies to and the figure that justifies it.
3. Prefer actions that protect tenants and income together: long terms for good tenants, skipping increases that don't pay back, vouchers at turnover, timing leases to the seasonal peak.
4. Be concrete and short. A busy landlord should be able to act on this memo today.
5. Never give legal advice; where notice rules or rent caps matter, say "check your state's rules".
6. Write in the second person ("you"), no exclamation marks, no marketing. Complete sentences only.
7. Never write JSON field names (gainIfLeavePerYear, proposedRentBurdenPct…) — say it in words: "gain if they leave", "rent burden", "payback".
8. Formatting: dollars with thousands separators and no cents ($29,280); percentages to one decimal at most (14.2%); dates as "October 15" or "October 15, 2026", never ISO; unit IDs exactly as given (A3, 101).`;

const SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'One sentence: the single most important thing in this roll, with its figure.' },
    actions: {
      type: 'array', minItems: 3, maxItems: 5,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Imperative, under 12 words.' },
          why: { type: 'string', description: 'Two or three sentences citing the exact figures from the brief.' },
          units: { type: 'array', items: { type: 'string' }, description: 'Unit IDs or building names this applies to, exactly as in the brief.' },
          when: { type: 'string', enum: ['this week', 'this month', 'at renewal', 'at turnover'] },
        },
        required: ['title', 'why', 'units', 'when'],
      },
    },
    skip: { type: 'array', items: { type: 'string' }, description: 'Things the numbers say NOT to do, each with the figure. 0–3 items.' },
    caution: { type: 'string', description: 'One sentence on the biggest assumption or risk in these numbers.' },
  },
  required: ['headline', 'actions', 'skip', 'caution'],
};

interface PlanOut { headline: string; actions: { title: string; why: string; units: string[]; when: string }[]; skip: string[]; caution: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = guard<{ brief: unknown }>(req, res);
  if (!body) return;
  if (!body.brief) return res.status(400).json({ error: 'brief required' });
  try {
    const out = await gemini<PlanOut>({ system: SYSTEM, user: `BRIEF (JSON):\n${JSON.stringify(body.brief)}`, schema: SCHEMA, temperature: 0.25, maxOutputTokens: 3000, thinking: 512 });
    res.status(200).json(out);
  } catch (e) { fail(res, e); }
}
