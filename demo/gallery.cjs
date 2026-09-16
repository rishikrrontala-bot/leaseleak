'use strict';
// Captures the Devpost gallery images (1600×1000) against the live site, replaying the demo in order.
//   node demo/gallery.cjs            (BASE_URL defaults to production)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE_URL = (process.env.BASE_URL || 'https://leaseleak.vercel.app').replace(/\/$/, '');
const OUT = path.join(__dirname, 'gallery');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const settle = async () => { await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in'))); await page.waitForTimeout(1100); };
  const shot = async (name) => { await settle(); await page.screenshot({ path: path.join(OUT, name), type: 'png' }); console.log('shot', name); };
  const scrollTo = async (sel, off = -110) => {
    const y = await page.locator(sel).first().evaluate((n, o) => n.getBoundingClientRect().top + window.scrollY + o, off);
    await page.evaluate((t) => window.scrollTo({ top: t }), y);
    await page.waitForTimeout(700);
  };

  // 01 landing hero
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await shot('01-hero.png');

  // 02 the plan (cached for the sample, so instant)
  await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
  await page.click('button:has-text("Try the sample roll")');
  await page.waitForSelector('text=Rent left on the table');
  await page.waitForSelector('button:has-text("Rewrite")', { timeout: 20000 });
  await scrollTo('#plan', -150);
  await shot('02-plan.png');

  // 03 grounding line + ask (live)
  await page.click('button:has-text("Which increases would you skip")');
  await page.waitForSelector('text=figures verified', { timeout: 90000 }).catch(() => console.log('ask did not return; shooting anyway'));
  await scrollTo('text=figures in this memo trace to the engine', -380);
  await shot('03-ask.png');

  // 04 headline
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.waitForTimeout(600);
  await shot('04-headline.png');

  // 05 grades  06 unit bars  07 cash flow  08 retention  09 letters
  await scrollTo('h3:has-text("Building by building")', -100); await shot('05-grades.png');
  await scrollTo('h3:has-text("Unit by unit")', -100); await shot('06-unit-bars.png');
  await scrollTo('h3:has-text("The next twelve months")', -100); await shot('07-cash-flow.png');
  await scrollTo('h3:has-text("If they leave")', -100); await shot('08-if-they-leave.png');
  await scrollTo('h3:has-text("Renewal letters, written")', -100);
  await page.fill('input[placeholder="Your name or company"]', 'Rishik Rontala');
  await shot('09-letters.png');

  // 10 messy export read with AI
  await page.click('button:has-text("Upload another roll")');
  await page.click('button:has-text("Try a messy export")');
  await page.waitForSelector('button:has-text("Let AI read the columns")');
  await page.click('button:has-text("Let AI read the columns")');
  await page.waitForSelector('text=read with AI', { timeout: 90000 });
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.waitForTimeout(600);
  await shot('10-messy-export.png');

  await browser.close();
})();
