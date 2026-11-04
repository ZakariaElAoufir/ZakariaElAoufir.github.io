// Captures the MCommerce demo: the card thumbnail and the three screenshots shown on phones.
// Usage: npm run dev, then  npm i --no-save puppeteer-core@23 && node scripts/capture-ecommerce.mjs
// and copy .captures/ecommerce/*.png into src/projects/e-commerce-microservices/media/.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = './.captures/ecommerce/'; // copied into the project afterwards: writing there directly reloads the dev page
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
await page.goto('http://localhost:4321/projets/e-commerce-microservices/', { waitUntil: 'networkidle0' });
await page.waitForSelector('.ec .browser');
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: '.top, astro-dev-toolbar { display: none !important; } .ec .reqs button.new, .ec tr.new td { animation: none !important; }' });

const wait = ms => new Promise(r => setTimeout(r, ms));
const run = (fn, ...args) => page.evaluate(fn, ...args);
await run(() => {
  const v = () => document.querySelector('.ec .viewport');
  window.$ = sel => v().querySelector(sel);
  window.$$ = sel => [...v().querySelectorAll(sel)];
  window.set = (el, val) => {
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };
});

// the customer signs in and sorts the catalogue by price, high to low
await run(() => document.querySelectorAll('.ec .accts button')[0].click()); await wait(200);
await run(() => $('.login-btn').click()); await wait(500);
await run(() => set($('.shop-sort'), 'desc')); await wait(300);
await run(() => { document.querySelector('.ec .view').scrollTop = 330; }); await wait(300);
await (await page.$('.ec .browser')).screenshot({ path: OUT + 'shot-shop.png' });
await (await page.$('.ec .stage')).screenshot({ path: OUT + 'thumbnail.png' }); // the card picture: the shop and a request's journey

// a guitar goes to the cart, then the payment: the panel shows the checkout's journey
await run(() => $$('.product-card').find(c => c.textContent.includes('Sonic Blue')).querySelector('.details-btn').click()); await wait(400);
await run(() => $('.add-cart').click()); await wait(300);
await run(() => $('.cart-btn').click()); await wait(400);
await run(() => $('.checkout-btn').click()); await wait(400);
await run(() => { const f = $$('.fields input'); set(f[0], 'YASSINE B'); set(f[1], '4242 4242 4242 4242'); set(f[2], '08/28'); set(f[3], '123'); }); await wait(200);
await run(() => $('.pay-btn').click()); await wait(1200);
await run(() => [...document.querySelectorAll('.ec .reqs button')].find(b => b.textContent.includes('checkout')).click()); await wait(1900);
await (await page.$('.ec .back')).screenshot({ path: OUT + 'shot-trace.png' });

// the admin manages the catalogue
await run(() => $('.logout').click()); await wait(300);
await run(() => document.querySelectorAll('.ec .accts button')[1].click()); await wait(200);
await run(() => $('.login-btn').click()); await wait(500);
await (await page.$('.ec .browser')).screenshot({ path: OUT + 'shot-admin.png' });

await browser.close();
console.log('done');
