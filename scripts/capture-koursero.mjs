// Captures the Koursero demo: the card thumbnail and the three screenshots shown on phones.
// Usage: npm run dev, then  npm i --no-save puppeteer-core@23 && node scripts/capture-koursero.mjs [port]
// and copy .captures/koursero/*.png into src/projects/vente-formations/media/.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = './.captures/koursero/'; // copied into the project afterwards: writing there directly reloads the dev page
mkdirSync(OUT, { recursive: true });
const port = process.argv[2] ?? '4321';
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${port}/projets/vente-formations/`, { waitUntil: 'networkidle0' });
await page.waitForSelector('.ks .browser .card');
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: '.top, astro-dev-toolbar { display: none !important; } .ks .req.new, .ks tr.new td { animation: none !important; }' });

const wait = ms => new Promise(r => setTimeout(r, ms));
const run = (fn, ...args) => page.evaluate(fn, ...args);
await run(() => {
  const v = () => document.querySelector('.ks .view');
  window.click = txt => [...v().querySelectorAll('a,button')].find(a => a.textContent.trim() === txt).click();
  window.as = i => document.querySelectorAll('.ks .accts button')[i].click();
  window.submit = () => v().querySelector('form button[type=submit]').click();
  window.scrollView = y => { v().scrollTop = y; };
  window.tab = i => document.querySelectorAll('.ks .tabs button')[i].click();
});

// a visitor puts a course in the cart, then signs in: the saved cart comes back
await run(() => document.querySelectorAll('.ks .card')[5].querySelector('.btn-od').click()); await wait(400);
await run(() => click('Add to cart')); await wait(400);
await run(() => as(0)); await wait(400);
await run(() => submit()); await wait(500);
await run(() => scrollView(250)); await wait(300);
await (await page.$('.ks .browser')).screenshot({ path: OUT + 'shot-shop.png' });

await run(() => document.querySelector('.ks .cartbtn').click()); await wait(400);
await run(() => tab(1)); await wait(300);
await (await page.$('.ks .stage')).screenshot({ path: OUT + 'thumbnail.png' });
await (await page.$('.ks .browser')).screenshot({ path: OUT + 'shot-cart.png' });

// the admin's list of courses
await run(() => as(1)); await wait(400);
await run(() => submit()); await wait(400);
await run(() => [...document.querySelectorAll('.ks .mod a')].find(a => a.textContent === 'Formations').click()); await wait(400);
await run(() => tab(0)); await wait(300);
await (await page.$('.ks .browser')).screenshot({ path: OUT + 'shot-admin.png' });

await browser.close();
console.log('done');
