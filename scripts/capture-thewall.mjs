// Captures The Wall demo: the card thumbnail and the three screenshots shown on phones.
// Usage: npm run dev, then  npm i --no-save puppeteer-core@23 && node scripts/capture-thewall.mjs
// and copy .captures/thewall/*.png into src/projects/the-wall/media/.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = './.captures/thewall/';  // copied into the project afterwards: writing there directly reloads the dev page
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
await page.goto('http://localhost:4321/projets/the-wall/', { waitUntil: 'networkidle0' });
await page.waitForSelector('.tw .phone');
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: '.top, astro-dev-toolbar { display: none !important; } .tw .sb-log li.new, .tw tr.new td { animation: none !important; }' });

const wait = ms => new Promise(r => setTimeout(r, ms));
// one helper in the page: click a button of phone a or b by its text or label, or a tile containing a name
await page.evaluate(() => {
  const ph = k => document.querySelectorAll('.tw .phone')[k === 'a' ? 0 : 1];
  window.tap = (k, txt) => [...ph(k).querySelectorAll('button')].find(b => b.textContent.trim() === txt || b.getAttribute('aria-label') === txt).click();
  window.tile = (k, sel, name, inner) => { const t = [...ph(k).querySelectorAll(sel)].find(x => x.textContent.includes(name)); (inner ? t.querySelector(inner) : t).click(); };
  window.type = (k, text) => { const i = ph(k).querySelector('.compose input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, text); i.dispatchEvent(new Event('input', { bubbles: true })); };
});
const run = (fn, ...args) => page.evaluate(fn, ...args);
const phone = k => page.$$('.tw .phone').then(list => list[k === 'a' ? 0 : 1]);
const text = page.url().includes('/en/') ? { hi: 'Hi Samir, welcome to the wall!' } : { hi: 'Salut Samir, bienvenue sur le mur !' };

// Samir asks Nora; Nora sees Karim's and Samir's requests
await run(() => tap('b', 'Add Friends')); await wait(700);
await run(() => tile('b', '.users .tile', 'nora', 'button')); await wait(700);
await run(() => tap('a', 'Add Friends')); await wait(700);
await run(() => [...document.querySelectorAll('.tw .phone')[0].querySelectorAll('.abar button')].at(-1).click()); await wait(800);
await (await phone('a')).screenshot({ path: OUT + 'shot-requests.png' });

// accepted; Nora writes and sends a picture; Samir opens the conversation; Nora's ticks turn blue
await run(() => tile('a', '.reqs .tile', 'samir', '.ok')); await wait(800);
await run(() => tap('a', 'Message')); await wait(700);
await run(() => tile('a', '.tiles .tile', 'samir')); await wait(800);
await run(t => { type('a', t); }, text.hi); await wait(100);
await run(() => document.querySelectorAll('.tw .phone')[0].querySelector('.snd').click()); await wait(300);
await run(() => document.querySelectorAll('.tw .phone')[0].querySelector('.img').click()); await wait(200);
await run(() => document.querySelectorAll('.tw .phone')[0].querySelector('.gal button:nth-child(4)').click()); await wait(200);
await run(() => document.querySelectorAll('.tw .phone')[0].querySelector('.snd').click()); await wait(300);
await run(() => tap('b', 'Message')); await wait(700);
await run(() => tile('b', '.tiles .tile', 'nora')); await wait(900);
await run(() => document.querySelectorAll('.tw .phone')[0].querySelector('.abar .ib').click()); await wait(700);
await run(() => tile('a', '.tiles .tile', 'samir')); await wait(1000);
await wait(1800);  // let the highlights fade
await (await phone('a')).screenshot({ path: OUT + 'shot-chat.png' });
await (await page.$('.tw .sb')).screenshot({ path: OUT + 'shot-supabase.png' });
await (await page.$('.tw .stage')).screenshot({ path: OUT + 'thumbnail.png' });

await browser.close();
console.log('done');
