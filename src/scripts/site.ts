// Shared behaviour of every page: header state, mobile menu, reveal on scroll, rain.

const bar = document.getElementById('top');
if (bar) {
  addEventListener('scroll', () => bar.classList.toggle('scrolled', scrollY > 40), { passive: true });
  const burger = bar.querySelector<HTMLButtonElement>('.burger');
  burger?.addEventListener('click', () => {
    const open = bar.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? burger.dataset.close! : burger.dataset.open!);
  });
}

const io = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}), { threshold: .15 });
document.querySelectorAll('.reveal').forEach(el => { if (!el.closest('.instant')) io.observe(el); });

// Rain over the city, slanted by the wind. Desktop only (wide screen, mouse), never with reduced motion.
// One canvas, about a hundred short strokes, drawn at 30 frames a second: cheap enough for an old laptop.
const rainCanvas = document.querySelector<HTMLCanvasElement>('.city canvas');
const rainQuery = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
const ctx = rainCanvas?.getContext('2d');
if (rainCanvas && ctx) {
  const WIND = .32;              // horizontal drift per unit of fall, about 18 degrees off vertical
  type Drop = { x: number; y: number; len: number; speed: number; alpha: number };
  let drops: Drop[] = [], frame = 0, last = 0;

  const newDrop = (anywhere: boolean): Drop => ({
    x: Math.random() * (innerWidth + innerHeight * WIND) - innerHeight * WIND,
    y: anywhere ? Math.random() * innerHeight : -30,
    len: 10 + Math.random() * 16,
    speed: 7 + Math.random() * 7,
    alpha: .18 + Math.random() * .3
  });
  const resize = () => {
    rainCanvas.width = innerWidth; rainCanvas.height = innerHeight;
    drops = Array.from({ length: Math.round(innerWidth / 16) }, () => newDrop(true));
  };
  const draw = (now: number) => {
    frame = requestAnimationFrame(draw);
    if (now - last < 33) return;
    last = now;
    ctx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
    ctx.lineWidth = 2;
    for (const d of drops) {
      d.y += d.speed; d.x += d.speed * WIND;
      if (d.y > innerHeight) Object.assign(d, newDrop(false));
      ctx.strokeStyle = `rgba(200, 204, 255, ${d.alpha})`;
      ctx.beginPath();
      ctx.moveTo(Math.round(d.x), Math.round(d.y));
      ctx.lineTo(Math.round(d.x - d.len * WIND), Math.round(d.y - d.len));
      ctx.stroke();
    }
  };
  const toggle = () => {
    cancelAnimationFrame(frame);
    if (rainQuery.matches) { resize(); frame = requestAnimationFrame(draw); }
    else ctx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
  };
  rainQuery.addEventListener('change', toggle);
  addEventListener('resize', () => { if (rainQuery.matches) resize(); });
  toggle();
}
