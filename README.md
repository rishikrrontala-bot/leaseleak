# LeaseLeak

Drop your rent roll. Five seconds later: how much rent you're under the HUD benchmark, which leases end in the wrong month, and the renewal letters — written.

Built solo by Rishik Rontala for **VentureFix 2026** (Venture Build track). Live: https://rishikrrontala-bot.github.io/leaseleak/

## What it does

1. **Match** — every unit in your CSV/XLSX is matched to HUD's Small Area Fair Market Rent for its ZIP code and bedroom count (FY2027; 38,601 ZIPs, studio–4+ BR).
2. **Measure** — `gap = max(0, SAFMR − rent) × 12`, summed across the portfolio. FMR is the 40th percentile of local gross rents, so the number is a conservative floor.
3. **Time** — Zillow's ZORI rent index by ZIP (Jul 2026) becomes a 12-month seasonal curve (per ZIP → metro → national fallback). `timing = rent × (idx_peak ÷ idx_lease_end − 1) × 12`. The renewal term (6–18 months) is chosen so the next lease ends at the seasonal peak.
4. **Write** — one renewal letter per unit: `new rent = min(SAFMR, rent × (1 + cap))`, the term, notice language. Download all as PDF.

Everything runs in the browser. No upload, no account.

## Run it

```bash
npm install
npm run dev
```

`public/data/safmr.json` and `public/data/zori.json` are built from the raw HUD and Zillow files with `scripts/build-data.py`.

## Data & licences

- HUD User, *FY2027 Small Area Fair Market Rents* — public domain. https://www.huduser.gov/portal/datasets/fmr/smallarea/index.html
- Zillow Research, *ZORI (ZIP level, smoothed, all homes)* — © Zillow, free for non-commercial use with attribution. https://www.zillow.com/research/data/
- Photographs: CC BY-SA 4.0 / CC0 via Wikimedia Commons — see `public/photos/ATTRIBUTION.md`.
- Satoshi typeface — Indian Type Foundry, via Fontshare (free licence).
- Stack: React 19, Vite, Tailwind v4, PapaParse, SheetJS, jsPDF, three.js / React Three Fiber.

Not legal or financial advice. Check your state's notice and rent-increase rules before sending letters.
