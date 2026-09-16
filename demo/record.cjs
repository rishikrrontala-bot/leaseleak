'use strict';
/**
 * Records the LeaseLeak demo with Playwright against the LIVE site: cursor overlay,
 * burned-in captions, and a cue log (demo/out/cues.json) so narration clips can be
 * placed on the timeline by demo/mix.py.
 *
 *   node demo/record.cjs --rehearse   # verify selectors + AI round-trips, no video
 *   node demo/record.cjs              # record demo/out/leaseleak-demo.webm
 *
 * BASE_URL defaults to production so the video is also proof the deployment works.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = (process.env.BASE_URL || 'https://leaseleak.vercel.app').replace(/\/$/, '');
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
      cursor.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="#1a1a1a" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
      cursor.style.cssText = 'position:fixed;z-index:999999;pointer-events:none;width:26px;height:26px;left:-50px;top:-50px;transition:left 90ms,top 90ms;filter:drop-shadow(1px 1px 2px rgba(0,0,0,.35))';
      document.body.appendChild(cursor);
      document.addEventListener('mousemove', (e) => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; });
    }
    if (!document.getElementById('demo-subtitle')) {
      const bar = document.createElement('div');
      bar.id = 'demo-subtitle';
      bar.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);max-width:80%;z-index:999998;text-align:center;padding:10px 18px;border-radius:12px;background:rgba(26,26,26,.9);color:#fbf8f6;font-family:Satoshi,-apple-system,"Segoe UI",sans-serif;font-size:19px;font-weight:500;line-height:1.35;letter-spacing:.005em;transition:opacity 220ms;opacity:0;pointer-events:none;box-shadow:0 8px 30px rgba(0,0,0,.25)';
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

/** Start a narration cue: show its caption and log the time. Returns its duration in ms. */
async function narrate(page, id) {
  const line = NARRATION.find((l) => l.id === id);
  await caption(page, line.caption);
  cues.push({ id, at: now() });
  console.log(`cue ${id} @ ${now().toFixed(2)}s`);
  return line.duration * 1000;
}

const sleep = (page, ms) => page.waitForTimeout(Math.max(0, ms));

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
  console.log('click', label, `@ ${now().toFixed(2)}s`);
  await sleep(page, opts.post ?? 600);
}
/** Scroll so the element sits `offset` px below the top (the fixed nav is ~90px). */
async function smoothScrollTo(page, locator, offset = -110, ms = 1100) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const y = await el.evaluate((n, off) => n.getBoundingClientRect().top + window.scrollY + off, offset);
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'smooth' }), y);
  await sleep(page, ms);
  // force any pending reveal animations so nothing is mid-wipe on camera
  await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
}

/** The answer renders with a verification line; an error renders as role=alert. Retry once on error. */
async function waitForAnswer(page) {
  const ok = page.locator('text=figures verified').first();
  const err = page.locator('section[aria-labelledby="plan"] [role="alert"]').first();
  await Promise.race([ok.waitFor({ timeout: 60000 }), err.waitFor({ timeout: 60000 })]);
  if (await err.isVisible().catch(() => false)) {
    console.log('ask error, retrying:', await err.textContent());
    await page.locator('button:has-text("Which increases would you skip")').first().click();
    await ok.waitFor({ timeout: 60000 });
  }
}
async function askWithRetry(page) {
  await page.click('button:has-text("Which increases would you skip")');
  await waitForAnswer(page);
}

async function ensureVisible(page, selector, label) {
  const ok = await page.locator(selector).first().isVisible().catch(() => false);
  console.log(ok ? `REHEARSAL OK: ${label}` : `REHEARSAL FAIL: ${label} (${selector})`);
  return ok;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    ...(REHEARSAL ? {} : { recordVideo: { dir: OUT_DIR, size: { width: W, height: H } } }),
  });
  const page = await context.newPage();
  t0 = Date.now();

  try {
    await page.goto(`${BASE_URL}/app?live=1`, { waitUntil: 'networkidle' });
    await injectOverlays(page);

    if (REHEARSAL) {
      let ok = true;
      ok &= await ensureVisible(page, 'button:has-text("Try the sample roll")', 'sample button');
      ok &= await ensureVisible(page, 'button:has-text("Try a messy export")', 'messy button');
      await page.click('button:has-text("Try the sample roll")');
      await page.waitForSelector('text=Rent left on the table');
      ok &= await ensureVisible(page, 'button:has-text("Write my plan")', 'plan button');
      const tPlan = Date.now();
      await page.click('button:has-text("Write my plan")');
      await page.waitForSelector('button:has-text("Rewrite")', { timeout: 90000 });
      console.log(`REHEARSAL OK: plan arrived in ${((Date.now() - tPlan) / 1000).toFixed(1)}s`);
      ok &= await ensureVisible(page, 'text=figures in this memo trace to the engine', 'grounding line');
      const tAsk = Date.now();
      await askWithRetry(page);
      console.log(`REHEARSAL OK: answer arrived in ${((Date.now() - tAsk) / 1000).toFixed(1)}s`);
      for (const [sel, label] of [
        ['h3:has-text("Building by building")', 'grades'], ['h3:has-text("Unit by unit")', 'unit bars'], ['h3:has-text("The next twelve months")', 'cash flow'],
        ['h3:has-text("If they leave")', 'retention'], ['h3:has-text("When your leases end")', 'calendar'], ['h3:has-text("The voucher option")', 'vouchers'],
        ['h3:has-text("Renewal letters, written")', 'letters'], ['button:has-text("letters (PDF)")', 'pdf button'], ['button:has-text("Upload another roll")', 'reset'],
      ]) ok &= await ensureVisible(page, sel, label);
      await page.click('button:has-text("Upload another roll")');
      await page.click('button:has-text("Try a messy export")');
      ok &= await ensureVisible(page, 'button:has-text("Let AI read the columns")', 'AI repair offer');
      const tMap = Date.now();
      await page.click('button:has-text("Let AI read the columns")');
      await page.waitForSelector('text=read with AI', { timeout: 60000 });
      console.log(`REHEARSAL OK: messy export read in ${((Date.now() - tMap) / 1000).toFixed(1)}s`);
      ok &= await ensureVisible(page, 'text=Census geocoder', 'geocoder note');
      console.log(ok ? 'REHEARSAL PASSED' : 'REHEARSAL FAILED');
      await browser.close();
      process.exit(ok ? 0 : 1);
    }

    // ---------- 01 · open on the tool, drop the sample ----------
    await page.mouse.move(640, 90);
    await sleep(page, 900);
    let d = await narrate(page, '01');
    await sleep(page, 1600);
    await moveAndClick(page, 'button:has-text("Try the sample roll")', 'sample', { post: 300 });
    await page.waitForSelector('text=Rent left on the table');
    await moveTo(page, 'text=Rent left on the table', { fx: 0.12, fy: 3.4, steps: 22 });
    // fire the AI request now so the memo is ready when the camera gets there
    await page.locator('button:has-text("Write my plan")').first().dispatchEvent('click');
    console.log(`plan requested @ ${now().toFixed(2)}s`);
    await sleep(page, d - 4200);

    // ---------- 02 · the benchmark ----------
    d = await narrate(page, '02');
    await moveTo(page, 'text=Recoverable this renewal cycle', { fy: 2, steps: 20 });
    await sleep(page, 2600);
    await moveTo(page, 'text=Lease-timing value', { fy: 2, steps: 16 });
    await sleep(page, 2600);
    await moveTo(page, 'text=Rent left on the table', { fx: 0.5, fy: 5.5, steps: 16 });
    await sleep(page, d - 6800);

    // ---------- 06 · tour the audit while the plan generates ----------
    d = await narrate(page, '06');
    const step = d / 5;
    for (const sel of ['h3:has-text("Building by building")', 'h3:has-text("Unit by unit")', 'h3:has-text("The next twelve months")', 'h3:has-text("If they leave")', 'h3:has-text("The voucher option")']) {
      await smoothScrollTo(page, sel, -110, 800);
      await moveTo(page, sel, { fx: 0.2, fy: 2.6, steps: 10 });
      await sleep(page, step - 900);
    }

    // ---------- 03 · the plan ----------
    await page.waitForSelector('button:has-text("Rewrite")', { timeout: 90000 });
    // fire the question now so the answer is ready two beats from here
    await page.locator('button:has-text("Which increases would you skip")').first().dispatchEvent('click');
    console.log(`ask requested @ ${now().toFixed(2)}s`);
    await smoothScrollTo(page, '#plan', -150, 1200);
    d = await narrate(page, '03');
    await moveTo(page, '#plan', { fx: 0.3, fy: 1.2, steps: 18 });
    await sleep(page, 2400);
    const cards = page.locator('section[aria-labelledby="plan"] ol > li');
    for (let i = 0; i < Math.min(3, await cards.count()); i++) { await moveTo(page, cards.nth(i), { fx: 0.5, fy: 0.35, steps: 14 }); await sleep(page, 1700); }
    await sleep(page, d - 2400 - 3 * 1900);

    // ---------- 04 · the grounding check ----------
    d = await narrate(page, '04');
    const ground = page.locator('text=figures in this memo trace to the engine').first();
    await smoothScrollTo(page, ground, -420, 1000);
    await moveTo(page, ground, { fx: 0.18, steps: 20 });
    await sleep(page, d - 1500);

    // ---------- 05 · ask ----------
    d = await narrate(page, '05');
    await waitForAnswer(page);
    const answer = page.locator('section[aria-labelledby="plan"] ol li p.t-body').last();
    await smoothScrollTo(page, answer, -300, 900);
    await moveTo(page, answer, { fx: 0.25, fy: 0.4, steps: 18 });
    await sleep(page, d - 1200);

    // ---------- 07 · letters ----------
    await smoothScrollTo(page, 'h3:has-text("Renewal letters, written")', -110);
    d = await narrate(page, '07');
    await page.locator('input[placeholder="Your name or company"]').fill('');
    await moveAndClick(page, 'input[placeholder="Your name or company"]', 'sign as', { post: 150 });
    await page.keyboard.type('Rishik Rontala', { delay: 40 });
    await sleep(page, 300);
    await moveTo(page, 'article', { fx: 0.5, fy: 0.45, steps: 18 });
    await sleep(page, 2000);
    await moveAndClick(page, 'button:has-text("letters (PDF)")', 'pdf', { post: 800 });
    await sleep(page, d - 5200);

    // ---------- 08 · the messy export ----------
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(page, 900);
    d = await narrate(page, '08');
    await moveAndClick(page, 'button:has-text("Upload another roll")', 'reset', { post: 700 });
    await moveAndClick(page, 'button:has-text("Try a messy export")', 'messy', { post: 700 });
    await smoothScrollTo(page, 'button:has-text("Let AI read the columns")', -420, 800);
    await moveAndClick(page, 'button:has-text("Let AI read the columns")', 'ai repair', { post: 200 });
    await page.waitForSelector('text=read with AI', { timeout: 60000 });
    await moveTo(page, 'text=Census geocoder', { fx: 0.3, steps: 18 });
    await sleep(page, 2200);
    await moveTo(page, 'text=Rent left on the table', { fx: 0.12, fy: 3.4, steps: 16 });
    await sleep(page, d - 11500 > 1500 ? d - 11500 : 1500);

    // ---------- 09 · close on the landing ----------
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await injectOverlays(page);
    d = await narrate(page, '09');
    await page.mouse.move(640, 560, { steps: 24 });
    await sleep(page, d + 400);
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
