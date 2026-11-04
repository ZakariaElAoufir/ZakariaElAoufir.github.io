// Captures the MEDIGOO demo: the card thumbnail and the three screenshots shown on phones.
// Usage: npm run dev, then  npm i --no-save puppeteer-core@23 && node scripts/capture-hospital.mjs
// and copy .captures/hospital/*.png into src/projects/rendez-vous-hospitaliers/media/.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = './.captures/hospital/'; // copied into the project afterwards: writing there directly reloads the dev page
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
await page.goto('http://localhost:4321/projets/rendez-vous-hospitaliers/', { waitUntil: 'networkidle0' });
await page.waitForSelector('.md .phone');
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: '.top, astro-dev-toolbar { display: none !important; } .md tr.new td, .md .as-log li.new, .md .heads { animation: none !important; }' });

const wait = ms => new Promise(r => setTimeout(r, ms));
const run = (fn, ...args) => page.evaluate(fn, ...args);
await run(() => {
  const s = () => document.querySelector('.md .scr');
  window.tap = (txt, root) => [...(root ?? s()).querySelectorAll('button')].find(b => b.textContent.trim() === txt).click();
  window.as = i => document.querySelectorAll('.md .accts button')[i].click();
  window.cards = sel => [...s().querySelectorAll(sel)];
  window.typeIn = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
});

// the patient books Dr. Benali's first free slot, with a reason
await run(() => as(0)); await wait(200);
await run(() => tap('Login')); await wait(400);
await run(() => tap('Rendez-vous')); await wait(400);
await run(() => tap('Réserver', cards('.mcard')[0])); await wait(300);
await run(() => typeIn(document.querySelector('.md .adlg input'), 'Essoufflement à l’effort')); await wait(2200); // the login toast fades
await (await page.$('.md .phone')).screenshot({ path: OUT + 'shot-patient.png' });
await run(() => tap('Confirmer')); await wait(300);

// the doctor marks Omar's visit done and sends Sara a reminder (permission granted once)
await run(() => as(1)); await wait(200);
await run(() => tap('Login')); await wait(400);
await run(() => tap('Rendez-vous')); await wait(400);
await run(() => { const sel = cards('.rcard')[0].querySelector('select'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, 'terminé'); sel.dispatchEvent(new Event('change', { bubbles: true })); });
await run(() => tap('Mettre à jour', cards('.rcard')[0])); await wait(300);
await run(() => tap('Envoyer rappel', cards('.rcard')[1])); await wait(300);
await run(() => tap('Autoriser')); await wait(300);
await run(() => tap('Envoyer rappel', cards('.rcard')[1])); await wait(2200); // the toast fades, the heads-up stays
await (await page.$('.md .phone')).screenshot({ path: OUT + 'shot-doctor.png' });
await (await page.$('.md .as')).screenshot({ path: OUT + 'shot-inspector.png' });
await (await page.$('.md .stage')).screenshot({ path: OUT + 'thumbnail.png' });

await browser.close();
console.log('done');
