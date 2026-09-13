'use strict';
// Captures the Devpost gallery images (1600×1000) replaying the demo in order.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5178';
const OUT = path.join(__dirname, 'gallery');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const shot = async (name) => { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(OUT, name), type: 'png' }); console.log('shot', name); };
  const scrollTo = async (sel, off = -60) => {
    const y = await page.locator(sel).first().evaluate((n, o) => n.getBoundingClientRect().top + window.scrollY + o, off);
    await page.evaluate((t) => window.scrollTo({ top: t }), y);
    await page.waitForTimeout(900);
    // force any pending reveals
    await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
    await page.waitForTimeout(900);
  };

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await shot('01-landing-hero.png');

  await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
  await shot('02-drop-screen.png');
  await page.click('button:has-text("Try the sample roll")');
  await page.waitForSelector('text=Rent left on the table');
  await shot('03-headline.png');
  await scrollTo('h3:has-text("Unit by unit")', -40);
  await shot('04-unit-bars.png');
  await page.click('button[role="tab"]:has-text("Lease timing")');
  await page.waitForTimeout(500);
  await shot('05-lease-timing.png');
  await scrollTo('h3:has-text("When your leases end")', -40);
  await shot('06-calendar.png');
  await scrollTo('h3:has-text("Renewal letters, written")', -40);
  await page.fill('input[placeholder="Your name or company"]', 'Rishik Rontala');
  await shot('07-letters.png');
  await scrollTo('h3:has-text("How the number is computed")', -60);
  await shot('08-method.png');
  await browser.close();
})();
