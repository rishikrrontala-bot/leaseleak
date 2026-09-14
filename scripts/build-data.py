"""Build public/data/{safmr,zori,income}.json from the raw source files.

Inputs (download first):
  FY27_safmrs.xlsx  https://www.huduser.gov/portal/datasets/fmr/fmr2027/FY27_safmrs.xlsx
  zori_zip.csv      https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_uc_sfrcondomfr_sm_month.csv
  data/acsdt5y2023-b19013.dat  (optional) https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/data/5YRData/acsdt5y2023-b19013.dat
Usage: python3 scripts/build-data.py FY27_safmrs.xlsx zori_zip.csv
"""
import csv, json, statistics, sys
import openpyxl

safmr_path, zori_path = sys.argv[1], sys.argv[2]
OUT = 'public/data/'

wb = openpyxl.load_workbook(safmr_path, read_only=True); ws = wb.worksheets[0]
areas, aidx, zips = [], {}, {}
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i == 0: continue
    z = str(row[0]).zfill(5); name = row[2]
    if name not in aidx: aidx[name] = len(areas); areas.append(name)
    vals = [row[3], row[6], row[9], row[12], row[15]]  # 0BR..4BR SAFMR columns
    if any(v is None for v in vals): continue
    zips[z] = [int(v) for v in vals] + [aidx[name]]
json.dump({'fy': 2027, 'areas': areas, 'zips': zips}, open(OUT + 'safmr.json', 'w'), separators=(',', ':'))

r = csv.reader(open(zori_path)); h = next(r); months = h[9:]
rows, nat, metro_series = [], [[] for _ in range(12)], {}
for row in r:
    z = row[2].zfill(5); metro = row[7]
    series = [(m, float(v)) for m, v in zip(months, row[9:]) if v]
    if not series: continue
    latest_m, latest = series[-1]
    yoy = next(((latest / v - 1) for m, v in series if m[:7] == f"{int(latest_m[:4]) - 1}-{latest_m[5:7]}"), None)
    by_year = {}
    for m, v in series:
        y = int(m[:4])
        if 2022 <= y <= 2025: by_year.setdefault(y, {})[int(m[5:7])] = v
    prof = [[] for _ in range(12)]
    for y, d in by_year.items():
        if len(d) == 12:
            mean = sum(d.values()) / 12
            for mo, v in d.items(): prof[mo - 1].append(v / mean)
    seas = [round(statistics.mean(p), 4) if p else None for p in prof]
    if all(s is not None for s in seas):
        metro_series.setdefault(metro, [[] for _ in range(12)])
        for i in range(12): nat[i].append(seas[i]); metro_series[metro][i].append(seas[i])
    rows.append((z, metro, latest_m, latest, yoy, seas, row[6], row[5]))
nat_seas = [round(statistics.mean(x), 4) for x in nat]
metro_seas = {m: [round(statistics.mean(x), 4) for x in s] for m, s in metro_series.items() if all(s)}
metros = list(metro_seas); midx = {m: i for i, m in enumerate(metros)}
zori = {}
for z, metro, lm, latest, yoy, seas, city, state in rows:
    e = {'r': round(latest), 'm': lm[:7], 'c': city, 's': state}
    if yoy is not None: e['y'] = round(yoy, 4)
    if metro in midx: e['k'] = midx[metro]
    if all(s is not None for s in seas): e['z'] = seas
    zori[z] = e
json.dump({'asof': months[-1][:7], 'national': nat_seas, 'metros': metros, 'metroSeason': [metro_seas[m] for m in metros], 'zips': zori}, open(OUT + 'zori.json', 'w'), separators=(',', ':'))
print('safmr', len(zips), 'zori', len(zori))

# ---- Census ACS 5-year median household income by ZCTA (B19013) ----
# Source (no API key needed): https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/data/5YRData/acsdt5y2023-b19013.dat
# Download to data/acsdt5y2023-b19013.dat. Rows are GEO_ID|estimate|MOE; ZCTAs are summary level 860 ("860Z200US" + ZIP).
income = {}
try:
    with open('data/acsdt5y2023-b19013.dat') as f:
        next(f)
        for line in f:
            geo, est, _ = line.rstrip('\n').split('|')
            if geo.startswith('860Z200US') and est and int(est) > 0:
                income[geo[-5:]] = int(est)
    json.dump({'vintage': '2019–2023 ACS 5-year', 'zips': income}, open(OUT + 'income.json', 'w'), separators=(',', ':'))
    print('income', len(income))
except FileNotFoundError:
    print('income: data/acsdt5y2023-b19013.dat not found, skipped')
