// Shared behaviour of the mockups: header state, mobile menu, reveal on scroll.
const bar = document.getElementById('top');
addEventListener('scroll', () => bar.classList.toggle('scrolled', scrollY > 40), { passive: true });

const burger = bar.querySelector('.burger');
burger.addEventListener('click', () => {
  const open = bar.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
});

const io = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}), { threshold: .15 });
document.querySelectorAll('.reveal').forEach(el => { if (!el.closest('.instant')) io.observe(el); });
