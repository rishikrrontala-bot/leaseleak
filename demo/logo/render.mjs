import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const FIELD = '#1a1a1a', PAPER = '#ede4e0', EMBER = '#ff6b3d';

// The mark from src/tool/Tool.tsx: rounded square, "L", ember dot.
const mark = (bg, fg) => `
  <rect width="64" height="64" rx="14" fill="${bg}"/>
  <path d="M18 14h8v28h20v8H18z" fill="${fg}"/>
  <circle cx="46" cy="20" r="6" fill="${EMBER}"/>`;

const variants = {
  // mark filling the whole canvas (matches favicon)
  'logo-field':        { bg: 'none',  svg: mark(FIELD, PAPER) },
  'logo-paper':        { bg: 'none',  svg: mark(PAPER, FIELD) },
  // mark on a padded background — safest for Devpost thumbnail (it crops/rounds)
  'thumb-field':       { bg: FIELD,  svg: `<g transform="translate(12 12) scale(0.625)">${mark(PAPER, FIELD)}</g>` },
  'thumb-paper':       { bg: PAPER,  svg: `<g transform="translate(12 12) scale(0.625)">${mark(FIELD, PAPER)}</g>` },
};

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, v] of Object.entries(variants)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${v.bg !== 'none' ? `<rect width="64" height="64" fill="${v.bg}"/>` : ''}${v.svg}</svg>`;
  writeFileSync(`demo/logo/${name}.svg`, svg);
  for (const size of [512, 1024]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.screenshot({ path: `demo/logo/${name}-${size}.png`, omitBackground: true });
  }
}
await browser.close();
console.log('done');
