# LeaseLeak

Drop your rent roll. Five seconds later: how much rent you're under the HUD benchmark, which leases end in the wrong month, and the renewal letters — written.

Built solo by Rishik Rontala for **VentureFix 2026** (Venture Build track). Live: https://rishikrrontala-bot.github.io/leaseleak/

## What it does

1. **Match** — every unit in your CSV/XLSX is matched to HUD's Small Area Fair Market Rent for its ZIP code and bedroom count (FY2027; 38,601 ZIPs, studio–4+ BR).
2. **Measure** — `gap = max(0, SAFMR − rent) × 12`, summed across the portfolio. FMR is the 40th percentile of local gross rents, so the number is a conservative floor.
3. **Time** — Zillow's ZORI rent index by ZIP (Jul 2026) becomes a 12-month seasonal curve (per ZIP → metro → national fallback). `timing = rent × (idx_peak ÷ idx_lease_end − 1) × 12`. The renewal term (6–18 months) is chosen so the next lease ends at the seasonal peak.
4. **Write** — one renewal letter per unit: `new rent = min(SAFMR, rent × (1 + cap))`, the term, notice language. Download all as PDF.
5. **Value** — the gap priced as building equity: `value = Σ gap ÷ cap rate`. On the sample portfolio $29,280/yr is ~$488,000 of value at a 6% cap. Cap rate is adjustable (4–10%).
6. **Vouchers** — HUD FMR is also the basis for Housing Choice Voucher payment standards. Units below the standard (`FMR × 90–110%`, set per housing authority) would earn `max(0, standard − rent) × 12` more from a voucher household — a way to close the gap at turnover without raising rent on a sitting tenant.
7. **Twelve months** — projected monthly income under three policies (do nothing / proposed renewals / every renewal at benchmark), each increase applied the month after its lease ends.
8. **Building grades** — one A–F grade per property on `gap ÷ gross rent` (A < 2%, B < 5%, C < 9%, D < 14%), sorted worst-first with $/door and a one-line diagnosis.
9. **Momentum** — the ZIP's ZORI year-over-year move classified as rising (≥ +3%), steady, or softening (≤ −1%), with renewal advice.
10. **Concentration** — share of monthly rent whose leases end in the same month, the loss if the two largest don't renew, and a staggered calendar across the above-average seasonal months when it lowers the peak.
11. **Utilities** — FMR is a gross rent; marking a building "we pay utilities" adds a typical allowance by bedroom count (`$95 / 120 / 150 / 180 / 210`) before comparing.
12. **Fairness** — each proposed rent as a share of the ZIP's median household income (Census ACS 5-year); above 30% is flagged in the letters list and summarised before download.
13. **If they leave** — every increase priced with turnover risk: stay = `increase × 12`; leave = `(benchmark − rent) × 12 − (rent × months vacant + make-ready)`; expected gain at an adjustable leave rate, payback months per unit, and the break-even leave rate.

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
- U.S. Census Bureau, *ACS 5-year 2019–2023, table B19013 (median household income by ZCTA)* — public domain. Built from the table-based summary file, no API key needed. https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/
- Photographs: CC BY-SA 4.0 / CC0 via Wikimedia Commons — see `public/photos/ATTRIBUTION.md`.
- Satoshi typeface — Indian Type Foundry, via Fontshare (free licence).
- Instrument Serif — Rodrigo Fuenzalida & Jordan Egstad, via Google Fonts (SIL OFL).
- Stack: React 19, Vite, Tailwind v4, PapaParse, SheetJS, jsPDF.

Not legal or financial advice. Check your state's notice and rent-increase rules before sending letters.
