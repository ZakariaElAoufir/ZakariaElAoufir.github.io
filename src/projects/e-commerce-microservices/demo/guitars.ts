// Product pictures for the sample catalogue. The repo ships one product photo (guitare.jpg); the others are drawn here,
// flat, in the same pose (standing, headstock up) so the shop's white "object-fit: contain" frames look like a real catalogue.

type Kind = 'strat' | 'lp' | 'tele' | 'acoustic' | 'classical' | 'bass' | 'uke';
type Look = { kind: Kind; body: string; edge?: string; guard?: string; board?: string };

export const LOOKS: Record<string, Look> = {
  'strat-blue': { kind: 'strat', body: '#8cc4c9', guard: '#f4f0e6', board: '#5a3a26' },
  'lp-ocean': { kind: 'lp', body: '#1f5566', edge: '#efe6cc', guard: '#efe6cc', board: '#3a2216' },
  tele: { kind: 'tele', body: '#e8b85a', guard: '#1d1d1d', board: '#d9a866' },
  acoustic: { kind: 'acoustic', body: '#e8c690', edge: '#3b2516', board: '#2e1d12' },
  classical: { kind: 'classical', body: '#d6a062', edge: '#6b3b1c', board: '#2e1d12' },
  bass: { kind: 'bass', body: '#1c1c21', guard: '#ece6d6', board: '#3a2216' },
  'strat-red': { kind: 'strat', body: '#b8222c', guard: '#f4f0e6', board: '#d9a866' },
  'lp-cherry': { kind: 'lp', body: '#8a1f1f', edge: '#8a1f1f', guard: '#151515', board: '#3a2216' },
  uke: { kind: 'uke', body: '#c98b4d', edge: '#5a3416', board: '#2e1d12' },
  sunburst: { kind: 'strat', body: '#b5532a', guard: '#151515', board: '#5a3a26' },
  white: { kind: 'tele', body: '#f2efe8', guard: '#1d1d1d', board: '#d9a866' },
  violet: { kind: 'lp', body: '#4d2b70', edge: '#efe6cc', guard: '#151515', board: '#3a2216' }
};

const MAPLE = '#e2b26a', CHROME = '#c7c9cc';
const svg = (inner: string) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 560"><ellipse cx="100" cy="550" rx="78" ry="6" fill="#000" opacity=".07"/>${inner}</svg>`);

// bodies, drawn for a neck centred on x = 100 that enters the body at y = 340
const BODY = {
  strat: 'M100 540C160 540 190 505 188 455C186 420 168 405 170 385C172 360 182 330 168 312C158 300 146 318 138 338C132 352 118 352 112 340H88C82 352 66 345 60 325C52 300 45 276 32 286C18 296 22 340 30 372C36 392 22 410 16 440C8 500 40 540 100 540Z',
  bass: 'M100 540C160 540 190 505 188 455C186 420 168 405 170 385C174 350 186 312 170 296C158 286 146 312 138 338C132 352 118 352 112 340H88C82 352 64 344 58 318C50 280 42 246 28 258C14 270 20 330 30 372C36 392 22 410 16 440C8 500 40 540 100 540Z',
  tele: 'M100 540C166 540 186 512 182 468C180 440 168 428 170 404C172 386 178 370 168 356H112V338H88C58 336 30 346 28 374C26 396 36 410 30 436C18 482 32 540 100 540Z',
  lp: 'M100 540C162 540 192 506 186 452C182 422 166 410 170 386C174 360 168 330 148 326C136 324 130 342 122 352H112V340H88C68 330 38 336 32 362C26 388 44 404 36 426C20 462 26 538 100 540Z',
  acoustic: 'M100 300C140 300 166 315 166 350C166 380 150 392 152 410C154 425 188 440 188 482C188 526 150 546 100 546C50 546 12 526 12 482C12 440 46 425 48 410C50 392 34 380 34 350C34 315 60 300 100 300Z'
};
const GUARD = {
  strat: 'M88 340H112C140 350 162 382 158 422C155 462 138 490 110 494C80 497 56 480 60 450C64 420 80 404 86 380Z',
  tele: 'M88 338H112V356H150C156 380 150 404 132 418C116 430 88 428 76 412C66 398 70 372 80 356C83 350 86 344 88 338Z',
  lp: 'M126 352L152 360L140 446L118 440Z'
};

const nut = 70;
const strings = (n: number, top: number, bottom: number, spread: number) =>
  Array.from({ length: n }, (_, i) => { const k = n === 1 ? 0 : i / (n - 1) - 0.5; return `<line x1="${100 + k * 14}" y1="${top}" x2="${100 + k * spread}" y2="${bottom}" stroke="#f6f6f6" stroke-width="${1.4 - i * 0.12}"/>`; }).join('');
const neck = (top: number, bottom: number, board: string, dots = true) => {
  const frets = Array.from({ length: 16 }, (_, i) => { const y = top + (bottom - top) * (1 - Math.pow(0.945, i + 1)) / (1 - Math.pow(0.945, 16)); return `<rect x="90" y="${y.toFixed(1)}" width="20" height="1.6" fill="#d6d6d6"/>`; });
  const at = (i: number) => top + (bottom - top) * (1 - Math.pow(0.945, i + 0.5)) / (1 - Math.pow(0.945, 16));
  const inlay = dots ? [3, 5, 7, 9].map(i => `<circle cx="100" cy="${at(i).toFixed(1)}" r="2.6" fill="#f2efe6"/>`).join('') + `<circle cx="96" cy="${at(12).toFixed(1)}" r="2.4" fill="#f2efe6"/><circle cx="104" cy="${at(12).toFixed(1)}" r="2.4" fill="#f2efe6"/>` : '';
  return `<rect x="89" y="${top}" width="22" height="${bottom - top}" fill="${board}"/>${frets.join('')}${inlay}<rect x="89" y="${top - 2}" width="22" height="4" fill="#f4f0e6"/>`;
};
const peg = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${CHROME}" stroke="#8a8c90" stroke-width="1"/>`;
const fenderHead = (top: number, n: number) => `<path d="M90 ${nut}V${top + 18}C90 ${top + 4} 102 ${top - 2} 112 ${top + 6}L128 ${top + 28}C134 ${top + 40} 124 ${nut - 22} 112 ${nut - 12}V${nut}Z" fill="${MAPLE}"/>`
  + Array.from({ length: n }, (_, i) => peg(98, top + 14 + i * ((nut - top - 22) / Math.max(1, n - 1)))).join('');
const gibsonHead = `<path d="M89 ${nut}L84 22C84 12 92 8 100 10C108 8 116 12 116 22L111 ${nut}Z" fill="#141414"/>` + [26, 40, 54].map(y => peg(82, y) + peg(118, y)).join('');

function draw(l: Look): string {
  const board = l.board ?? '#3a2216';
  switch (l.kind) {
    case 'strat': case 'bass': {
      const bass = l.kind === 'bass', top = bass ? 4 : 20;
      const pickups = bass
        ? '<rect x="84" y="404" width="32" height="12" rx="5" fill="#111"/><rect x="82" y="450" width="36" height="12" rx="5" fill="#111"/>'
        : [400, 426, 452].map((y, i) => `<rect x="${86 + i}" y="${y}" width="28" height="8" rx="4" fill="#f4f0e6" stroke="#bdb7a8"/>`).join('');
      return svg(`${fenderHead(top, bass ? 4 : 6)}${neck(nut, 346, board)}
        <path d="${BODY[l.kind]}" fill="${l.body}"/><path d="${GUARD.strat}" fill="${l.guard}" opacity=".95"/>${pickups}
        <rect x="84" y="478" width="32" height="12" rx="2" fill="${CHROME}"/>
        <circle cx="142" cy="452" r="6" fill="#f4f0e6" stroke="#bdb7a8"/><circle cx="148" cy="472" r="6" fill="#f4f0e6" stroke="#bdb7a8"/>${bass ? '' : '<circle cx="150" cy="492" r="6" fill="#f4f0e6" stroke="#bdb7a8"/>'}
        ${strings(bass ? 4 : 6, nut, 484, 26)}`);
    }
    case 'tele':
      return svg(`${fenderHead(20, 6)}${neck(nut, 346, board)}
        <path d="${BODY.tele}" fill="${l.body}"/><path d="${GUARD.tele}" fill="${l.guard}"/>
        <rect x="86" y="368" width="28" height="12" rx="5" fill="${CHROME}"/>
        <path d="M80 448H122V500H80Z" fill="${CHROME}"/><rect x="86" y="456" width="28" height="9" rx="3" fill="#2a2a2a"/>
        <path d="M140 440L176 470L170 478L134 448Z" fill="${CHROME}"/><circle cx="152" cy="454" r="5" fill="#2a2a2a"/><circle cx="164" cy="464" r="5" fill="#2a2a2a"/>
        ${strings(6, nut, 494, 26)}`);
    case 'lp': {
      const hb = (y: number) => `<rect x="80" y="${y}" width="40" height="22" rx="3" fill="${l.edge}"/><rect x="84" y="${y + 4}" width="32" height="14" rx="2" fill="#141414"/>`;
      return svg(`${gibsonHead}${neck(nut, 346, board)}
        <path d="${BODY.lp}" fill="${l.body}" stroke="${l.edge}" stroke-width="3"/><path d="${GUARD.lp}" fill="${l.guard}"/>
        ${hb(390)}${hb(436)}<rect x="82" y="470" width="36" height="5" rx="2" fill="${CHROME}"/><rect x="84" y="488" width="32" height="8" rx="3" fill="${CHROME}"/>
        ${[[140, 470], [160, 482], [136, 496], [156, 508]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#d29a3a" stroke="#7a5418"/>`).join('')}
        ${strings(6, nut, 492, 24)}`);
    }
    case 'acoustic': case 'classical': {
      const classical = l.kind === 'classical';
      const head = classical
        ? `<path d="M88 ${nut}L86 14H114L112 ${nut}Z" fill="${board}"/><rect x="92" y="22" width="5" height="40" rx="2" fill="#0d0907"/><rect x="103" y="22" width="5" height="40" rx="2" fill="#0d0907"/>${[30, 44, 58].map(y => peg(82, y) + peg(118, y)).join('')}`
        : `<path d="M89 ${nut}L86 18C86 12 92 10 100 10S114 12 114 18L111 ${nut}Z" fill="${board}"/>${[26, 40, 54].map(y => peg(82, y) + peg(118, y)).join('')}`;
      return svg(`${head}${neck(nut, 320, board, !classical)}
        <path d="${BODY.acoustic}" fill="${l.body}" stroke="${l.edge}" stroke-width="4"/>
        <circle cx="100" cy="382" r="27" fill="#1a110b"/><circle cx="100" cy="382" r="33" fill="none" stroke="${l.edge}" stroke-width="3"/>
        ${classical ? '' : `<path d="M126 404C140 404 148 416 148 430L132 446C126 436 120 424 120 414Z" fill="#2a1a10" opacity=".8"/>`}
        <rect x="74" y="474" width="52" height="12" rx="4" fill="${l.edge}"/><rect x="82" y="478" width="36" height="3" fill="#efe6cc"/>
        <rect x="89" y="318" width="22" height="30" fill="${board}"/>
        ${strings(6, nut, 478, 26)}`);
    }
    case 'uke':
      return svg(`<g transform="translate(100 560) scale(.82) translate(-100 -560)">
        <path d="M89 ${nut}L86 18C86 12 92 10 100 10S114 12 114 18L111 ${nut}Z" fill="${board}"/>${[30, 50].map(y => peg(82, y) + peg(118, y)).join('')}
        ${neck(nut, 320, board, false)}
        <path d="${BODY.acoustic}" fill="${l.body}" stroke="${l.edge}" stroke-width="4"/>
        <circle cx="100" cy="384" r="26" fill="#1a110b"/><rect x="76" y="476" width="48" height="12" rx="4" fill="${l.edge}"/>
        ${strings(4, nut, 480, 18)}</g>`);
  }
}

const cache = new Map<string, string>();
/** The picture of a product from its stored image_url ("/uploads/<millis>_<name>.jpg"); `photo` is the repo's guitare.jpg. */
export function pictureOf(imageUrl: string | null | undefined, photo: string): string {
  if (!imageUrl) return photo; // the admin page falls back to /assets/guitare.jpg
  const key = imageUrl.replace(/^.*_/, '').replace(/\.jpg$/, '');
  if (key === 'pacifica') return photo;
  if (!cache.has(key)) cache.set(key, draw(LOOKS[key] ?? LOOKS.sunburst));
  return cache.get(key)!;
}
/** What the admin's file input can pick from. */
export const PICKABLE = ['sunburst', 'white', 'violet', 'strat-red', 'acoustic', 'bass'];
