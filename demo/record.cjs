'use strict';
/**
 * Records the LeaseLeak demo with Playwright: cursor overlay, burned-in captions,
 * and a cue log (demo/cues.json) so narration clips can be placed on the timeline.
 *
 *   node demo/record.cjs --rehearse   # verify selectors, no video
 *   node demo/record.cjs              # record demo/leaseleak-demo.webm
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5178';
const OUT_DIR = path.join(__dirname, 'out');
const REHEARSAL = process.argv.includes('--rehearse');
const NARRATION = JSON.parse(fs.readFileSync(path.join(__dirname, 'narration.json'), 'utf8'));
const W = 1280, H = 720;

let t0 = 0;
const cues = [];
const now = () => (Date.now() - t0) / 1000;

async function injectOverlays(page) {
  await page.evaluate(() => {
    if (!document.getElementById('demo-cursor')) {
      const cursor = document.createElement('div');
      cursor.id = 'demo-cursor';
      cursor.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="#10201a" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
      cursor.style.cssText = 'position:fixed;z-index:999999;pointer-events:none;width:26px;height:26px;left:-50px;top:-50px;transition:left 90ms,top 90ms;filter:drop-shadow(1px 1px 2px rgba(0,0,0,.45))';
      document.body.appendChild(cursor);
      document.addEventListener('mousemove', (e) => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; });
    }
    if (!document.getElementById('demo-subtitle')) {
      const bar = document.createElement('div');
      bar.id = 'demo-subtitle';
      bar.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);max-width:82%;z-index:999998;text-align:center;padding:10px 18px;border-radius:10px;background:rgba(16,32,26,.86);color:#f4efe3;font-family:Satoshi,-apple-system,"Segoe UI",sans-serif;font-size:19px;font-weight:500;line-height:1.35;letter-spacing:.005em;transition:opacity 220ms;opacity:0;pointer-events:none;box-shadow:0 8px 30px rgba(0,0,0,.35)';
      document.body.appendChild(bar);
    }
  });
}

async function caption(page, text) {
  await page.evaluate((t) => {
    const bar = document.getElementById('demo-subtitle'); if (!bar) return;
    if (t) { bar.textContent = t; bar.style.opacity = '1'; } else { bar.style.opacity = '0'; }
  }, text);
}

/** Start a narration cue: show its caption and log the time. Returns its duration. */
async function narrate(page, id) {
  const line = NARRATION.find((l) => l.id === id);
  await caption(page, line.caption);
  cues.push({ id, at: now() });
  console.log(`cue ${id} @ ${now().toFixed(2)}s`);
  return line.duration;
}

const sleep = (page, ms) => page.waitForTimeout(ms);

async function moveTo(page, locator, opts = {}) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (!box) throw new Error('no box for ' + locator);
  await page.mouse.move(box.x + box.width * (opts.fx ?? 0.5), box.y + box.height * (opts.fy ?? 0.5), { steps: opts.steps ?? 14 });
  return el;
}
async function moveAndClick(page, locator, label, opts = {}) {
  const el = await moveTo(page, locator, opts);
  await sleep(page, opts.pre ?? 350);
  await el.click();
  console.log('click', label);
  await sleep(page, opts.post ?? 600);
}
async function smoothScrollTo(page, locator, offset = -80, ms = 1100) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const y = await el.evaluate((n, off) => n.getBoundingClientRect().top + window.scrollY + off, offset);
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'smooth' }), y);
  await sleep(page, ms);
}

async function ensureVisible(page, selector, label) {
  const ok = await page.locator(selector).first().isVisible().catch(() => false);
  console.log(ok ? `REHEARSAL OK: ${label}` : `REHEARSAL FAIL: ${label} (${selector})`);
  return ok;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    ...(REHEARSAL ? {} : { recordVideo: { dir: OUT_DIR, size: { width: W, height: H } } }),
  });
  const page = await context.newPage();
  t0 = Date.now();

  try {
    // ---------- 0:00 open on the tool, drop the sample immediately ----------
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
    await injectOverlays(page);
    if (REHEARSAL) {
      let ok = true;
      ok &= await ensureVisible(page, 'button:has-text("Try the sample roll")', 'sample button');
      await page.click('button:has-text("Try the sample roll")');
      await page.waitForSelector('text=Rent left on the table');
      ok &= await ensureVisible(page, 'text=Rent left on the table', 'headline');
      ok &= await ensureVisible(page, 'h4:has-text("1704 S 5th St")', 'austin group');
      ok &= await ensureVisible(page, 'button[role="tab"]:has-text("Lease timing")', 'timing tab');
      ok &= await ensureVisible(page, 'h3:has-text("When your leases end")', 'expiries');
      ok &= await ensureVisible(page, 'h3:has-text("Renewal letters, written")', 'letters');
      ok &= await ensureVisible(page, 'button:has-text("letters (PDF)")', 'pdf button');
      ok &= await ensureVisible(page, 'h3:has-text("How the number is computed")', 'method');
      ok &= await ensureVisible(page, 'button:has-text("Upload another roll")', 'reset');
      console.log(ok ? 'REHEARSAL PASSED' : 'REHEARSAL FAILED');
      await browser.close();
      process.exit(ok ? 0 : 1);
    }

    await page.mouse.move(640, 80);
    await sleep(page, 700);
    let d = await narrate(page, '01');
    await moveAndClick(page, 'button:has-text("Try the sample roll")', 'sample', { post: 300 });
    await page.waitForSelector('text=Rent left on the table');
    await moveTo(page, 'text=Rent left on the table', { fx: 0.1, fy: 3.5, steps: 20 });
    await sleep(page, Math.max(0, d * 1000 - 2200));

    // ---------- problem + benchmark ----------
    d = await narrate(page, '02');
    await moveTo(page, 'text=Recoverable this renewal cycle', { fy: 2, steps: 20 });
    await sleep(page, 2200);
    await moveTo(page, 'text=Lease-timing value', { fy: 2, steps: 16 });
    await sleep(page, Math.max(0, d * 1000 - 2600));

    // ---------- unit bars ----------
    await smoothScrollTo(page, 'h4:has-text("1704 S 5th St")', -120);
    d = await narrate(page, '03');
    const a1 = page.locator('li', { hasText: 'A1' }).first();
    await moveTo(page, a1, { fx: 0.62, steps: 18 });
    await sleep(page, 2000);
    await moveTo(page, a1, { fx: 0.9, steps: 12 });
    await sleep(page, Math.max(0, d * 1000 - 2600));

    // ---------- timing view ----------
    d = await narrate(page, '04');
    await moveAndClick(page, 'button[role="tab"]:has-text("Lease timing")', 'timing tab', { post: 900 });
    await smoothScrollTo(page, 'h4:has-text("221 E 11th Ave")', -140, 900);
    const u6 = page.locator('li', { hasText: 'P. Haddad' }).first();
    await moveTo(page, page.locator('li', { hasText: '3 BR' }).nth(0), { fx: 0.55, steps: 16 }).catch(() => {});
    await sleep(page, Math.max(0, d * 1000 - 3000));
    void u6;

    // ---------- calendar + 90 days ----------
    await smoothScrollTo(page, 'h3:has-text("When your leases end")', -60);
    d = await narrate(page, '05');
    await moveTo(page, 'text=Next 90 days', { fy: 3, steps: 18 });
    await sleep(page, 1500);
    await moveTo(page, 'text=Next 90 days', { fy: 7, steps: 12 });
    await sleep(page, Math.max(0, d * 1000 - 2500));

    // ---------- letters ----------
    await smoothScrollTo(page, 'h3:has-text("Renewal letters, written")', -40);
    d = await narrate(page, '06');
    await page.locator('input[placeholder="Your name or company"]').fill('');
    await moveAndClick(page, 'input[placeholder="Your name or company"]', 'sign as', { post: 200 });
    await page.keyboard.type('Rishik Rontala', { delay: 45 });
    await sleep(page, 400);
    await moveTo(page, 'article', { fx: 0.5, fy: 0.45, steps: 18 });
    await sleep(page, 2600);
    await moveAndClick(page, 'button:has-text("letters (PDF)")', 'pdf', { post: 1200 });
    await sleep(page, Math.max(0, d * 1000 - 6800));

    // ---------- method ----------
    await smoothScrollTo(page, 'h3:has-text("How the number is computed")', -80);
    d = await narrate(page, '07');
    await moveTo(page, 'text=This is a conservative floor', { fx: 0.3, steps: 18 });
    await sleep(page, Math.max(0, d * 1000 - 1300));

    // ---------- close: back to the drop screen, then the landing ----------
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(page, 1000);
    d = await narrate(page, '08');
    await moveAndClick(page, 'button:has-text("Upload another roll")', 'reset', { post: 900 });
    await moveTo(page, '.dropzone', { fx: 0.5, fy: 0.45, steps: 20 });
    await sleep(page, 3200);
    await page.goto(`${BASE_URL}/`);
    await injectOverlays(page);
    await caption(page, NARRATION.find((l) => l.id === '08').caption);
    await page.mouse.move(980, 420, { steps: 20 });
    await sleep(page, Math.max(1500, d * 1000 - 5500));
    await caption(page, '');
    await sleep(page, 1200);
  } catch (err) {
    console.error('DEMO ERROR:', err);
  } finally {
    const total = now();
    await context.close();
    const video = page.video();
    if (video) {
      const src = await video.path();
      const dest = path.join(OUT_DIR, 'leaseleak-demo.webm');
      fs.copyFileSync(src, dest);
      console.log('Video saved:', dest, 'length ~', total.toFixed(1), 's');
    }
    fs.writeFileSync(path.join(OUT_DIR, 'cues.json'), JSON.stringify({ total, cues }, null, 1));
    await browser.close();
  }
})();
