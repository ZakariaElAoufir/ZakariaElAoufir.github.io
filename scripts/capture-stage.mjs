// Captures the intern platform demo: the card thumbnail and the screenshots shown on phones.
// Usage: npm run dev, then  npm i --no-save puppeteer-core@23 && node scripts/capture-stage.mjs [port]
// and copy .captures/stage/*.png into src/projects/plateforme-stagiaires/media/.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = './.captures/stage/'; // copied into the project afterwards: writing there directly reloads the dev page
mkdirSync(OUT, { recursive: true });
const port = process.argv[2] ?? '4321';
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${port}/projets/plateforme-stagiaires/`, { waitUntil: 'networkidle0' });
await page.waitForSelector('.stg .lg-card');
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: '.top, astro-dev-toolbar { display: none !important; } .stg .reqs button.new, .stg tr.new td { animation: none !important; }' });

const wait = ms => new Promise(r => setTimeout(r, ms));
const run = (fn, ...args) => page.evaluate(fn, ...args);
await run(() => {
  window.vp = () => document.querySelector('.stg .viewport');
  window.press = txt => [...vp().querySelectorAll('button')].find(b => b.textContent.trim().startsWith(txt)).click();
  window.as = i => document.querySelectorAll('.stg .accts button')[i].click();
});
const shot = async (selector, name) => (await page.$(selector)).screenshot({ path: `${OUT}${name}.png` });

// Sara reaches the third step of the wizard
await run(() => as(0)); await wait(300);
await run(() => press('Accéder au dashboard')); await wait(400);
await run(() => press('Rejoindre ce sujet')); await wait(300);
await run(() => press('Suivant')); await wait(300);
await run(() => press('Team-ROOMS-1')); await wait(200);
await shot('.stg .browser', 'shot-subjects');

// Yassine's team, then the file viewer of the GitHub section
await run(() => [...vp().querySelectorAll('.round')].find(b => b.getAttribute('aria-label') === 'Fermer')?.click()); await wait(300);
await run(() => vp().querySelector('.out').click()); await wait(300);
await run(() => as(1)); await wait(300);
await run(() => press('Accéder au dashboard')); await wait(400);
await shot('.stg .browser', 'shot-team');
await run(() => [...vp().querySelectorAll('.secs button')].find(b => b.textContent.includes('GitHub')).click()); await wait(300);
await run(() => press('Fichiers')); await wait(300);
await run(() => press('backend')); await wait(200);
await run(() => press('src')); await wait(200);
await run(() => press('main')); await wait(200);
await run(() => press('java')); await wait(200);
await run(() => press('demo')); await wait(200);
await run(() => press('rooms')); await wait(200);
await run(() => press('ReservationService')); await wait(300);
await run(() => { vp().querySelector('.view').scrollTop = 250; }); await wait(200);
await shot('.stg .browser', 'shot-github');

// the mission assistant answers from the specification
await run(() => [...vp().querySelectorAll('.nav-bar nav button')].find(b => b.textContent.trim() === 'Missions').click()); await wait(300);
await run(() => press('Voir la mission en détail')); await wait(400);
await run(() => vp().querySelector('.chat-fab').click()); await wait(300);
await run(() => press('Quelles règles')); await wait(4500);
await run(() => { vp().querySelector('.chat-list').scrollTop = 0; }); await wait(200);
await shot('.stg .browser', 'shot-chat');
await shot('.stg .stage', 'thumbnail');

await browser.close();
console.log('done');
