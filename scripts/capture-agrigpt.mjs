// Captures the AgriGPT demo: the card thumbnail and the three annotated screenshots shown on phones.
// Usage: npm run dev, then  npm i --no-save puppeteer-core@23 && node scripts/capture-agrigpt.mjs
// and copy .captures/*.png into src/projects/agrigpt/media/.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = './.captures/';  // copied into the project afterwards: writing there directly reloads the dev page
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.goto('http://localhost:4321/projets/agrigpt/', { waitUntil: 'networkidle0' });
await page.waitForSelector('.agd .st-side .conv button');
await page.evaluate(() => document.fonts.ready);
// the site's fixed header would cover the top of every capture
await page.addStyleTag({ content: '.top { display: none !important; }' });

const clickText = (sel, text) => page.evaluate((s, t) => [...document.querySelectorAll(s)].find(b => b.textContent.includes(t)).click(), sel, text);
const clipOf = (from, to, pad = 0) => page.evaluate((f, t, p) => {
  const a = document.querySelector(f).getBoundingClientRect(), b = [...document.querySelectorAll(t)].at(-1).getBoundingClientRect();
  const main = document.querySelector('.agd .st-main').getBoundingClientRect();
  return { x: main.left, y: a.top - p + scrollY, width: main.width, height: b.bottom - a.top + 2 * p };
}, from, to, pad);
const scrollTo = sel => page.evaluate(s => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 20); }, sel);

// 1. thumbnail: the whole app with a sourced answer on screen
await clickText('.agd .conv button', 'Quelles sont les périodes');
await scrollTo('.agd .st');
await new Promise(r => setTimeout(r, 400));
await page.evaluate(() => document.querySelector('.agd .st-main').scrollTo(0, 0));
const st = await page.$('.agd .st');
await st.screenshot({ path: OUT + 'thumbnail.png' });

// 2. sourced answer: title, question and its answer
await scrollTo('.agd .st');
await page.evaluate(() => document.querySelector('.agd .st-main').scrollTo(0, 0));
await page.screenshot({ path: OUT + 'shot-answer.png', clip: await clipOf('.agd .st-head', '.agd .msg.bot', 18) });

// 3. off-topic question refused by the filter, in a new conversation
await clickText('.agd .st-side button', 'Nouvelle conversation');
await page.type('#agd-q', 'Quelle est la capitale du Maroc ?');
await clickText('.agd .st-input button', 'Envoyer');
await new Promise(r => setTimeout(r, 1700));
await page.evaluate(() => document.querySelector('.agd .st-main').scrollTo(0, 0));
await scrollTo('.agd .st');
await page.screenshot({ path: OUT + 'shot-refusal.png', clip: await clipOf('.agd .st-head', '.agd .msg.bot', 18) });

// 4. PDF export preview of the first conversation
await clickText('.agd .conv button', 'Quelles sont les périodes');
await clickText('.agd .st-btn', 'Exporter en PDF');
await clickText('.agd .st-btn', 'Télécharger le PDF');
await page.waitForSelector('.agd .pdf .page');
await scrollTo('.agd .st');
const pdf = await page.$('.agd .pdf .page');
await page.evaluate(() => { const p = document.querySelector('.agd .pdf .page'); p.style.maxHeight = 'none'; });
await pdf.screenshot({ path: OUT + 'shot-pdf.png' });

await browser.close();
console.log('done');
