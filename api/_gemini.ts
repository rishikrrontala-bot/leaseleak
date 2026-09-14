// Shared plumbing for the Gemini-backed functions: origin check, rate limit,
// body limits, and one call helper that enforces JSON output against a schema.
import type { VercelRequest, VercelResponse } from '@vercel/node';

const MODELS = (process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []).concat(['gemini-2.5-flash', 'gemini-2.0-flash']);
const MAX_BODY = 200_000;          // bytes — a 200-unit brief is ~60 KB
const WINDOW_MS = 10 * 60_000;     // rate limit window
const MAX_PER_WINDOW = 30;         // per IP per window (best-effort; instances are ephemeral)

const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now); hits.set(ip, arr);
  return arr.length > MAX_PER_WINDOW;
}

function originAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin fetches often omit it
  try {
    const { hostname, protocol } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (protocol !== 'https:') return false;
    return hostname === 'rishikrrontala-bot.github.io' || hostname.endsWith('.vercel.app') || hostname.endsWith('leaseleak.app');
  } catch { return false; }
}

/** Common guard. Returns the parsed body, or null after having written an error response. */
export function guard<T = unknown>(req: VercelRequest, res: VercelResponse): T | null {
  const origin = (req.headers.origin as string | undefined);
  if (origin && originAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') { res.status(204).end(); return null; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return null; }
  if (!originAllowed(origin)) { res.status(403).json({ error: 'Origin not allowed' }); return null; }
  if (!process.env.GEMINI_API_KEY) { res.status(503).json({ error: 'AI is not configured on this deployment' }); return null; }
  const ip = ((req.headers['x-forwarded-for'] as string) ?? '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) { res.status(429).json({ error: 'Too many requests — try again in a few minutes' }); return null; }
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  if (raw.length > MAX_BODY) { res.status(413).json({ error: 'Request too large' }); return null; }
  try { return (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as T; }
  catch { res.status(400).json({ error: 'Bad JSON' }); return null; }
}

export interface GeminiCall {
  system: string;
  user: string;
  schema: Record<string, unknown>;   // JSON schema the model must satisfy
  temperature?: number;
  maxOutputTokens?: number;
}
export interface GeminiResult<T> { data: T; model: string; usage: { input: number; output: number } }

/** One JSON-mode call. Tries the configured model, then known fallbacks. */
export async function gemini<T>(call: GeminiCall): Promise<GeminiResult<T>> {
  const key = process.env.GEMINI_API_KEY!;
  let lastErr = '';
  for (const model of MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: call.system }] },
        contents: [{ role: 'user', parts: [{ text: call.user }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: call.schema,
          temperature: call.temperature ?? 0.3,
          maxOutputTokens: call.maxOutputTokens ?? 2048,
        },
      }),
    });
    if (r.status === 404) { lastErr = `model ${model} not found`; continue; }
    const j = await r.json() as Record<string, unknown>;
    if (!r.ok) { lastErr = JSON.stringify(j).slice(0, 300); if (r.status === 429 || r.status >= 500) continue; throw new Error(lastErr); }
    const text = (j as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    const usage = (j as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata;
    try {
      return { data: JSON.parse(text) as T, model, usage: { input: usage?.promptTokenCount ?? 0, output: usage?.candidatesTokenCount ?? 0 } };
    } catch { throw new Error('Model returned non-JSON output'); }
  }
  throw new Error(lastErr || 'No Gemini model available');
}

export function fail(res: VercelResponse, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  res.status(502).json({ error: msg.slice(0, 300) });
}
