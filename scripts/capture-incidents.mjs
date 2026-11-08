// Captures the incident platform demo: the card thumbnail and the screenshots shown on phones.
// Usage: npm run dev, then  npm i --no-save puppeteer-core@23 && node scripts/capture-incidents.mjs [port]
// and copy .captures/incidents/*.png into src/projects/incidents-sla/media/.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = './.captures/incidents/'; // copied into the project afterwards: writing there directly reloads the dev page
mkdirSync(OUT, { recursive: true });
const port = process.argv[2] ?? '4321';
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${port}/projets/incidents-sla/`, { waitUntil: 'networkidle0' });
await page.waitForSelector('.inc .l-screen');
await page.addStyleTag({ content: '.top, astro-dev-toolbar { display: none !important; } .inc .reqs button.new, .inc tr.new td { animation: none !important; }' });

const wait = ms => new Promise(r => setTimeout(r, ms));
const run = (fn, ...args) => page.evaluate(fn, ...args);
await run(() => {
  window.vp = () => document.querySelector('.inc .viewport');
  window.press = txt => [...document.querySelectorAll('.inc button')].find(b => b.textContent.trim().startsWith(txt)).click();
  window.ticket = id => [...vp().querySelectorAll('tbody tr')].find(r => r.cells[0].textContent === `#${id}`).querySelector('.t-view').click();
});
const shot = async (selector, name) => (await page.$(selector)).screenshot({ path: `${OUT}${name}.png` });
const press = async (txt, ms = 350) => { await run(t => press(t), txt); await wait(ms); };

await run(() => document.querySelectorAll('.inc .accts button')[0].click()); await wait(250);
await run(() => vp().querySelector('.l-submit').click()); await wait(500);
await shot('.inc .browser', 'shot-dashboard');
await shot('.inc .stage', 'thumbnail');

await press('My Group');
await shot('.inc .browser', 'shot-group');

// an open ticket taken in charge, with its history
await run(() => ticket(6)); await wait(350);
await press('Assign to me');
await shot('.inc .browser', 'shot-detail');

// the technician's comment, at the bottom of the page
await page.type('.inc .d-action textarea', 'Commutateur redémarré, les baies sont de nouveau joignables.');
await run(() => { const m = vp().querySelector('.t-main'); m.scrollTop = m.scrollHeight; }); await wait(250);
await shot('.inc .browser', 'shot-action');

// the clock moved forward and the deadlines checked: alerts in the MySQL panel
await run(() => press('+30 min')); await wait(100);
await press('Lancer la vérification');
await run(() => document.querySelectorAll('.inc .tabs button')[1].click()); await wait(200);
await run(() => [...document.querySelectorAll('.inc .db-top .chips button')].find(b => b.textContent.startsWith('alerte')).click()); await wait(300);
await shot('.inc .back', 'shot-sla');

await browser.close();
