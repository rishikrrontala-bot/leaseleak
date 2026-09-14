// POST /api/ask  { brief, question, history? }  →  an answer grounded in the engine's numbers.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { guard, gemini, fail } from './_gemini';

const SYSTEM = `You answer a landlord's questions about their rent roll inside LeaseLeak.
You receive a JSON brief from a deterministic engine: every figure in it was computed from public data (HUD FMR, Zillow ZORI, Census ACS). You compute nothing new.

Rules — strict:
1. Answer ONLY with numbers, unit IDs, properties and dates that appear in the brief, copied exactly. If the brief does not contain what is needed, say what is missing and, if a slider on the page would answer it (cap rate, leave rate, payment standard, utilities toggle), say which.
2. Be direct: lead with the answer, then the reasoning with figures. Under 120 words unless a list is genuinely needed.
3. Name units and buildings exactly as in the brief.
4. No legal advice; say "check your state's rules" where notice periods or rent caps matter.
5. Second person, plain, no exclamation marks.`;

const SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    units: { type: 'array', items: { type: 'string' }, description: 'Unit IDs referenced, exactly as in the brief.' },
    confidence: { type: 'string', enum: ['from the brief', 'partly from the brief', 'not in the brief'] },
  },
  required: ['answer', 'units', 'confidence'],
};

interface AskOut { answer: string; units: string[]; confidence: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = guard<{ brief: unknown; question: string; history?: { q: string; a: string }[] }>(req, res);
  if (!body) return;
  if (!body.brief || !body.question?.trim()) return res.status(400).json({ error: 'brief and question required' });
  const history = (body.history ?? []).slice(-4).map((h) => `Q: ${h.q}\nA: ${h.a}`).join('\n\n');
  const user = `BRIEF (JSON):\n${JSON.stringify(body.brief)}\n\n${history ? `EARLIER IN THIS CONVERSATION:\n${history}\n\n` : ''}QUESTION: ${body.question.trim().slice(0, 500)}`;
  try {
    const out = await gemini<AskOut>({ system: SYSTEM, user, schema: SCHEMA, temperature: 0.2, maxOutputTokens: 700 });
    res.status(200).json(out);
  } catch (e) { fail(res, e); }
}
