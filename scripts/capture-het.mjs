// Captures the Home Energy Tracker demo: the card thumbnail and the three annotated screenshots shown on phones.
// Usage: npm run dev, then  npm i --no-save puppeteer-core@23 && node scripts/capture-het.mjs
// and copy .captures/het/*.png into src/projects/home-energy-tracker/media/.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = './.captures/het/';  // copied into the project afterwards: writing there directly reloads the dev page
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto('http://localhost:4321/projets/home-energy-tracker/', { waitUntil: 'networkidle0' });
await page.waitForSelector('.het .op');
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: '.top, astro-dev-toolbar { display: none !important; }' });

const click = (sel, text) => page.evaluate((s, t) => [...document.querySelectorAll(s)].find(b => !t || b.textContent.includes(t)).click(), sel, text);
const wait = ms => new Promise(r => setTimeout(r, ms));
const toWindow = () => page.evaluate(() => window.scrollTo(0, document.querySelector('.het .window').getBoundingClientRect().top + scrollY - 10));

// a low threshold so alerts come quickly, then the simulator
await page.evaluate(() => {
  const range = document.querySelector('.het .ctrl input[type=range]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(range, '40');
  range.dispatchEvent(new Event('input', { bubbles: true }));
});
await click('.het .ctrl .btn');

// 1. API: authorize, then ask the local AI for saving tips
await click('.het .sw-btn', 'Authorize');
await click('.het .sw-modal .sw-btn', 'Keycloak');
await click('.het .sw-modal .sw-btn', 'Authorize');
await page.evaluate(() => [...document.querySelectorAll('.het .op .head')].find(h => h.textContent.includes('saving-tips')).click());
await click('.het .op.open .try');
await click('.het .op.open .exec');
await wait(2400);
await toWindow();
const op = await page.$('.het .op.open');
await op.evaluate(el => el.scrollIntoView({ block: 'start' }));
await wait(300);
const clip = await page.evaluate(() => {
  const o = document.querySelector('.het .op.open').getBoundingClientRect(), a = document.querySelector('.het .app').getBoundingClientRect();
  return { x: o.left, y: o.top + scrollY, width: o.width, height: Math.min(o.bottom, a.bottom) - o.top };
});
await page.screenshot({ path: OUT + 'shot-api.png', clip });

// 2. Grafana, after a few simulator runs: thumbnail and phone shot
await wait(16000);
await click('.het .btab', 'Grafana');
await wait(2500);
await toWindow();
await (await page.$('.het .app')).screenshot({ path: OUT + 'thumbnail.png' });
const gf = await page.$('.het .gf');
const box = await gf.boundingBox();
await page.screenshot({ path: OUT + 'shot-grafana.png', clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 560) } });

// 3. Mailpit: the latest alert e-mail
await click('.het .btab', 'Mailpit');
await wait(400);
await click('.het .mp-item');
await wait(300);
await (await page.$('.het .mp-msg')).screenshot({ path: OUT + 'shot-mail.png' });

await browser.close();
console.log('done');
