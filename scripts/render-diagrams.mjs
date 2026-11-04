// Renders every diagrams/*.mmd of a project to a themed SVG next to it, with headless Chrome.
// Usage (puppeteer-core is not a project dependency):
//   npm i --no-save puppeteer-core@23 && node scripts/render-diagrams.mjs src/projects/<slug>
import puppeteer from 'puppeteer-core';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.argv[2], 'diagrams');
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setContent(`<html><head>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600&display=swap" rel="stylesheet">
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: false, theme: 'base', fontFamily: 'Archivo, sans-serif',
      themeVariables: { background: '#12122f', primaryColor: '#1a1a4d', primaryTextColor: '#e8e8fa', primaryBorderColor: '#9fa3f5',
        secondaryColor: '#262673', tertiaryColor: '#12122f', lineColor: '#9fa3f5', textColor: '#e8e8fa', fontSize: '15px',
        actorBkg: '#262673', actorBorder: '#9fa3f5', actorTextColor: '#e8e8fa', signalColor: '#9fa3f5', signalTextColor: '#e8e8fa',
        labelBoxBkgColor: '#262673', labelBoxBorderColor: '#9fa3f5', labelTextColor: '#e8e8fa', loopTextColor: '#e8e8fa',
        noteBkgColor: '#262673', noteTextColor: '#e8e8fa', altSectionBkgColor: '#1a1a4d', edgeLabelBackground: '#12122f',
        attributeBackgroundColorOdd: '#1a1a4d', attributeBackgroundColorEven: '#12122f' },
      flowchart: { curve: 'step' } });
    window.render = async (id, src) => (await mermaid.render(id, src)).svg;
    window.ready = true;
  </script></head><body></body></html>`);
await page.waitForFunction('window.ready === true && document.fonts.status === "loaded"', { timeout: 30000 });

for (const file of readdirSync(dir).filter(f => f.endsWith('.mmd'))) {
  const name = file.replace(/\.mmd$/, '');
  const id = 'd-' + name.replace(/\W/g, '-');
  const svg = await page.evaluate((i, s) => window.render(i, s), id, readFileSync(join(dir, file), 'utf8'));
  writeFileSync(join(dir, name + '.svg'), svg);
  console.log('rendered', name);
}
await browser.close();
