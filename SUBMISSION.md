# Devpost submission — GatewayGS Hackathon 2

Paste-ready for https://gatewaygs-hackathon-2.devpost.com → *My projects* → *Edit*. Fill the one `[YOU]` blank (video link).

---

## Project name

```
LeaseLeak
```

## Tagline (Devpost caps at 200 characters — this is 171)

```
Drop a rent roll. Five seconds later: how much rent you're under the HUD benchmark, the renewal letters — written — and a plan for the month, with every AI figure checked back.
```

## Links

| Field | Value |
|---|---|
| Try it out — live | `https://leaseleak.vercel.app/` |
| Try it out — the tool directly | `https://leaseleak.vercel.app/app` |
| Source code | `https://github.com/rishikrrontala-bot/leaseleak` |
| Video demo | `[YOU]` — upload `leaseleak/demo/out/leaseleak-demo.mp4` to YouTube as **Unlisted**, paste the link |

## Built with (tags)

```
gemini, google-gemini-api, vercel, typescript, react, vite, tailwindcss, papaparse, sheetjs, jspdf, census-geocoder, hud-fair-market-rents, zillow-zori, census-acs
```

## Gallery images (upload in this order; captions below each)

| File | Caption |
|---|---|
| `demo/gallery/02-plan.png` | The plan: Gemini reads every figure the engine produced and writes three to five things to do this month, in order, with the units and numbers behind each. Every figure is checked back — "26 of 26 figures in this memo trace to the engine." |
| `demo/gallery/03-ask.png` | Ask it anything. "Which increases would you skip?" — Unit 6 (54.1% rent burden) and A3 (107-month payback). Confidence and verification shown under every answer. |
| `demo/gallery/04-headline.png` | The number: a 16-unit sample portfolio is $29,280/yr under HUD's FY2027 Fair Market Rent; $12,540 recoverable this cycle at a 6% cap. Computed in the browser from public data. |
| `demo/gallery/10-messy-export.png` | A property-management export with no ZIP column and headers the parser has never seen. The AI maps the columns; the Census geocoder finds the ZIPs; the header says exactly what happened. Same $29,280. |
| `demo/gallery/05-grades.png` | One grade per building on the share of rent left on the table, worst first, with market momentum and advice. |
| `demo/gallery/07-cash-flow.png` | Twelve months of income under three policies — do nothing, proposed renewals, every renewal at benchmark — as each lease turns. |
| `demo/gallery/08-if-they-leave.png` | Every increase priced with move-out risk: gain if they stay, gain if they leave, payback months. The tenants you don't nudge. |
| `demo/gallery/09-letters.png` | Renewal letters, written: capped, never above the benchmark, timed to the seasonal peak, with a fairness check against the ZIP's median income. Ten letters, one PDF. |
| `demo/gallery/06-unit-bars.png` | Unit by unit: current rent (dark) against the HUD benchmark (tick). Ember is the gap. |
| `demo/gallery/01-hero.png` | Landing page. |

---

## Problem statement

Individual investors own most of America's small rental buildings — the fourplexes, duplexes and six-unit walk-ups — and most of them manage in a spreadsheet: a rent roll with a unit, a tenant, a rent and a lease end date. Nobody looks at that roll and says: *here is the money you're leaving on the table, here is which lease to fix first, and here is what to send.*

The costs are quiet and they compound. A unit that drifted $200 below market is $2,400 a year, every year, until someone notices. A lease that ends in January re-signs in January, the weakest month of the year. An increase sent to the wrong tenant triggers a move-out that costs more than the increase was worth. Property-management software wants to run the whole business; rent-comparison sites want one address at a time. The landlord with sixteen doors and a spreadsheet has neither the time nor the tooling to do this analysis, so they price by gut.

Who it affects: roughly 11 million individual landlords in the US, owning about seven in ten rental units. On the 16-unit sample portfolio in the demo, the gap is **$29,280 a year** — about **$488,000** of building value at a 6% cap rate.

## Solution overview

**Drop a rent roll (CSV or Excel, any column names). Five seconds later:**

1. **The number.** Every unit is matched to HUD's *Small Area Fair Market Rent* for its exact ZIP code and bedroom count (FY2027; 38,601 ZIPs, studio to 4+ bedrooms). `gap = max(0, benchmark − rent) × 12`, summed. A cap slider (default 6%) turns that into what's recoverable this renewal cycle without losing good tenants.
2. **The plan.** Gemini reads the full analysis and writes a short memo: a headline, three to five actions with the units and figures behind each, a "skip" list, and one caution. You can then ask it questions in plain English.
3. **The whole audit under it.** Building grades (A–F on the share of rent left on the table), unit-by-unit bars, twelve months of cash flow under three policies, lease-timing against each ZIP's seasonal curve (Zillow ZORI), expiration concentration, the Housing Choice Voucher option (HUD FMR is the payment-standard basis), a utilities correction, a fairness check against the ZIP's median household income (Census ACS), and move-out risk priced into every increase.
4. **Renewal letters, written.** One per unit: new rent (capped, never above the benchmark), a term chosen so the lease ends at the seasonal peak, notice language. Ten letters, one PDF.

Everything except the model call runs in the browser. There is no account and no upload of your file.

## AI usage explanation — what AI does, and what code does

This is the part I want to be precise about, because the tool is deliberately *not* an LLM guessing rents.

**Code decides every number.** The benchmark, the gap, the cap, the seasonal index, the best month, the renewal term, the grade, the cash-flow projection, the payback on a move-out, the voucher upside, the rent burden — all of it is a deterministic TypeScript engine over three public datasets (HUD FY2027 SAFMR, Zillow ZORI by ZIP, Census ACS 5-year median income). The same roll gives the same numbers every time, and a judge can recompute any of them by hand from the sources listed on the page.

**AI does two things code can't:**

- **It writes the plan.** After the engine runs, the client builds a *brief* — a JSON serialisation of everything the engine computed, with tenant names stripped — and sends it to `POST /api/plan`. A Vercel function holds the Gemini key and calls `gemini-3.6-flash` (with a chain of fallbacks) in JSON mode against a strict response schema. The system prompt forbids computing, combining or inventing figures: the model's job is judgment and language — what matters most, in what order, said plainly. `POST /api/ask` answers free-text questions the same way, with a `confidence` field the model must set to "from the brief", "partly from the brief" or "not in the brief".

- **It reads exports the parser can't.** Heuristic column detection handles clean files. When it fails — a real property-management export with `Mo. Rate`, `Apt #`, `2x1`, no ZIP column — `POST /api/map` sends the headers and six sample rows to the model and gets back a schema mapping. Missing ZIPs are looked up from street addresses with the **U.S. Census geocoder** first (exact, keyless, deterministic); only addresses it can't match go to the model, and those are marked "?" in the UI. The header then states exactly what happened: *"AI mapped property ← 'Bldg / Street', rent ← 'Mo. Rate', lease end ← 'Exp.' · 16 ZIPs looked up with the U.S. Census geocoder."*

**And the code checks the AI.** `verify()` in `src/lib/ai.ts` extracts every dollar amount, percentage and month-count from the model's prose and matches it against the set of numbers in the brief. The UI then says *"26 of 26 figures in this memo trace to the engine"* — or, when the model does something it shouldn't, flags it. During testing it caught the model adding two gaps into "$4,080", a correct sum the engine never produced; the line read *"23 of 24 figures trace to the engine — could not verify: $4,080."* That is the intended behaviour: the model is useful and it is watched.

**Why this model choice.** Gemini Flash is fast and cheap enough for a per-click call, supports JSON-schema output (which removed a whole class of parsing failures), and has a thinking budget I can set per call — 512 tokens for the plan, where prioritisation benefits from it, zero for the fast paths. The free tier is 20 requests a day *per model*, so the proxy chains six Flash models and remembers which are exhausted; the two sample rolls also ship with a plan generated once by the live model (labelled as such, with a "Rewrite live" button) so the demo never depends on that day's quota. Anything you upload is always live.

## How I built it

- **Data pipeline** (`scripts/build-data.py`): HUD's FY2027 SAFMR workbook (51,872 rows) → 1.5 MB JSON keyed by ZIP; Zillow's ZIP-level ZORI (8,543 ZIPs × 139 months) → latest rent, YoY, and a 12-month seasonal profile per ZIP with metro and national fallbacks; Census ACS table B19013 (30,618 ZCTAs) → median household income by ZIP. All lazy-loaded, ~330 KB gzipped each.
- **Parsing:** PapaParse + SheetJS with fuzzy column detection; `$1,750.00`, `10/31/26`, Excel serial dates, `Studio`, `2x1` all understood. Rows without a rent or a 5-digit ZIP are reported, not silently dropped — and now handed to the AI fallback.
- **Engine** (`src/lib/analyze.ts`): pure functions — `analyze`, `buildingCards`, `cashflowProjection`, `expiryClustering`, `retention`, `voucherOpportunity`, `valueAtCap`, `momentum`. Deterministic, testable without the UI.
- **AI layer:** `api/_gemini.ts` (origin allow-list, per-IP rate limit, 200 KB body cap, JSON-schema output, thinking budgets, retry on 503, quota-aware model fallback, 60 s function timeout), `api/plan.ts`, `api/ask.ts`, `api/map.ts`; `src/lib/ai.ts` (`buildBrief`, `verify`); `src/tool/Plan.tsx`.
- **UI:** React 19 + Vite + Tailwind v4. Satoshi and Instrument Serif, self-hosted. Reveal animations that respect `prefers-reduced-motion`. Film grain, one blush ground, ink on top.
- **Deployment:** Vercel (static site + functions), GitHub Pages mirror calling the same functions cross-origin. Demo video recorded with Playwright against the production URL, captions burned in, narration synthesised and mixed with ffmpeg.

## Challenges I ran into

- **Thinking models and JSON mode.** The first plan calls came back truncated: the model spent 1,729 tokens thinking inside an 1,800-token budget and had 52 left for the JSON. Fix: an explicit per-call thinking budget, and an output ceiling that adds it back.
- **The free tier is 20 requests per day per model.** I burned a day's quota on one model in twenty minutes of testing. The proxy now treats a daily-quota 429 as "next model, no retry", chains six Flash models, and remembers exhaustion until the Pacific-midnight reset. Sample rolls ship with a cached plan so judges never see an empty card.
- **The model was confidently wrong about a ZIP.** Asked for 5400 Penn Ave, Pittsburgh, it said 15201 with "high" confidence; the answer is 15206. The geocoder now goes first; the model only fills what the geocoder can't, and those ZIPs are flagged.
- **ESM on Vercel's Node runtime** needs explicit `.js` extensions on relative imports. `vercel dev` forgave it; production didn't.
- **Keeping the honest claim honest.** The old landing page said "nothing leaves your browser." With the advisor, unit figures do — on request. The copy now says "0 tenant names ever leave your browser," which is exactly true.

## Accomplishments I'm proud of

A memo a landlord can act on today, where every figure is traceable to a public dataset and the tool tells you when the model strayed. A messy real-world export that becomes the same clean number. And a page that reads like a product, not a prototype.

## What I learned

Where to draw the line between the model and the code. Rents are a place where a wrong number gets sent to a real tenant, so the model shouldn't be the source of numbers — but it is very good at reading a page of them and saying what to do. Making that boundary visible ("26 of 26 figures trace to the engine") turned out to matter as much as the boundary itself.

## What's next for LeaseLeak

Save rolls and re-run monthly with change alerts; state-specific notice periods and rent-cap rules baked into the letters; an audit PDF for lenders and partners; a renewal calendar export; and — with a paid key — letting the advisor call the engine as a tool for "what if" questions ("what if the cap were 4%?") instead of reading a fixed brief.

## Attribution

- **HUD User** — FY2027 Small Area Fair Market Rents (public domain).
- **Zillow Research** — Zillow Observed Rent Index, ZIP level (© Zillow; free for non-commercial use with attribution).
- **U.S. Census Bureau** — ACS 5-year 2019–2023, table B19013 (public domain); Census Geocoder.
- **Google Gemini** via the Gemini API; key held in a Vercel function.
- **Photographs** (all graded): brownstones by Beyond My Ken (CC BY-SA 4.0); night building by OathOn (CC BY-SA 4.0); duplex by Baltimore Heritage (CC0) — via Wikimedia Commons.
- **Type:** Satoshi (Indian Type Foundry via Fontshare); Instrument Serif (Rodrigo Fuenzalida & Jordan Egstad, SIL OFL).
- **Libraries:** React, Vite, Tailwind CSS, PapaParse, SheetJS, jsPDF — MIT/Apache.
- Narration in the video is synthesised (macOS). Built with AI assistance (Claude) for code and copy; every number on the page comes from the datasets above.
