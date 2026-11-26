/* Noon — smooth scrolling for the whole site (Lenis, from jsDelivr).
   Mouse-wheel and trackpad scrolling glide instead of stepping; touch scrolling stays native.
   Scroll-driven sections read window.scrollY every frame, so they move in step with the glide.
   Turned off for reduced motion and inside the theme editor; if the library can't load,
   the site simply keeps native scrolling. */
import Lenis from 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.mjs';

const html = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const editor = window.Shopify && window.Shopify.designMode;

if (!reduce && !editor && !window.noonScroll) {
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1, syncTouch: false });

  // panels that scroll on their own keep their own scrolling
  const PANELS = '.drawer__body, .search-modal, .mobile-menu, [data-scroll-panel]';
  const markPanels = (scope) => scope.querySelectorAll(PANELS).forEach((el) => el.setAttribute('data-lenis-prevent', ''));
  markPanels(document);
  document.addEventListener('shopify:section:load', (e) => markPanels(e.target));

  // keep the page still while a drawer, menu or modal is open
  const sync = () => (document.body.classList.contains('is-locked') ? lenis.stop() : lenis.start());
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  sync();

  // in-page links glide too
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.matches('[class*="skip"]')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash.length < 2) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.2 });
    history.pushState(null, '', url.hash);
  });

  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  window.noonScroll = {
    lenis,
    // target: an element, a selector or a pixel offset
    scrollTo: (target, options = {}) => lenis.scrollTo(target, { duration: 1.2, ...options }),
    // true while the page is gliding from wheel or trackpad input
    gliding: () => lenis.isScrolling === 'smooth'
  };
  html.dataset.smoothScroll = '';
}
