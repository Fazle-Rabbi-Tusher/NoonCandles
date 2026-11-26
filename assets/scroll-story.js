/* Noon Candles — Scroll story
   Scroll position (0 → 1 through the section) scrubs a keyframed timeline.
   Orb positions are offsets from the stage centre in units of U = min(width, height),
   so the composition keeps its shape on every screen. */
(() => {
  'use strict';

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /** Sample a keyframe track [[p, value], ...] at progress p. Values are numbers or flat objects. */
  function sample(track, p) {
    if (p <= track[0][0]) return track[0][1];
    for (let i = 1; i < track.length; i++) {
      const [p1, v1] = track[i];
      if (p <= p1) {
        const [p0, v0] = track[i - 1];
        const t = ease(clamp((p - p0) / (p1 - p0 || 1)));
        if (typeof v1 === 'number') return lerp(v0, v1, t);
        const out = {};
        for (const k in v1) out[k] = lerp(v0[k] === undefined ? v1[k] : v0[k], v1[k], t);
        return out;
      }
    }
    return track[track.length - 1][1];
  }

  // Orb keyframe: dx, dy from centre (in U), diameter (in U), opacity
  const K = (dx, dy, d, o = 1) => ({ dx, dy, d, o });

  // ---- Timeline -----------------------------------------------------------
  const T = {
    // 1 · Hero
    hero: [[0, { y: 0, o: 1 }], [0.025, { y: -0.03, o: 1 }], [0.09, { y: -0.42, o: 0 }]],
    down: [[0, 1], [0.02, 0]],
    h1: [[0, K(0, -0.62, 1.5)], [0.1, K(0, -1.2, 1.5)]],
    h2: [[0, K(0, 0.86, 1.2)], [0.12, K(0, 0.2, 1.2)]],

    // 2 · Statement panel slides up
    panel: [[0.03, 1], [0.12, 0]],
    statement: [[0.07, { y: 0.06, o: 0 }], [0.13, { y: 0, o: 1 }], [0.3, { y: -0.02, o: 1 }], [0.36, { y: -0.04, o: 0.6 }]],

    // 3 · Shape reveal: width (U) and centre y (fraction of height)
    reveal: [
      [0.16, { w: 0, y: 1.2 }],
      [0.2, { w: 0.6, y: 1.02 }],
      [0.28, { w: 1.25, y: 0.82 }],
      [0.37, { w: 4.2, y: 0.55 }]
    ],
    mark: [[0.36, { o: 0, s: 0.85 }], [0.39, { o: 1, s: 1 }], [0.43, { o: 1, s: 1 }], [0.46, { o: 0, s: 1.08 }]],
    dim: [[0.7, 0], [0.86, 0.32]],

    // 4 · One orb divides into two
    a: [
      [0.18, K(0, 0.18, 0.86)],
      [0.37, K(0, 0, 0.92)],
      [0.44, K(0, 0, 0.92)],
      [0.48, K(-0.05, 0, 0.92)],
      [0.54, K(-0.22, 0, 0.86)],
      [0.59, K(-0.3, 0, 0.8)],
      [0.64, K(-0.2, -0.17, 0.72)],
      [0.69, K(0, -0.33, 0.64)],
      [0.75, K(-0.15, -0.12, 0.58)],
      [0.8, K(-0.08, -0.06, 0.52)],
      [0.88, K(-0.2, -0.16, 0.5)]
    ],
    b: [
      [0.44, K(0, 0, 0.92, 0)],
      [0.46, K(0, 0, 0.92, 1)],
      [0.48, K(0.05, 0, 0.92)],
      [0.54, K(0.22, 0, 0.86)],
      [0.59, K(0.3, 0, 0.8)],
      [0.64, K(0.2, 0.2, 0.72)],
      [0.69, K(0, 0.33, 0.64)],
      [0.75, K(0.17, 0.12, 0.58)],
      [0.8, K(0.08, 0.08, 0.52)],
      [0.88, K(0.22, 0.12, 0.56)]
    ],

    // 5 · Many orbs + final copy
    final: [[0.86, { y: 0.04, o: 0 }], [0.93, { y: 0, o: 1 }]]
  };

  // Swarm: small orbs bloom in, staggered
  const SWARM = [
    [-0.98, -0.42, 0.95],
    [-0.32, -0.42, 0.15],
    [-0.04, -0.47, 0.045],
    [0.3, -0.36, 0.055],
    [0.16, -0.46, 0.08],
    [0.62, -0.28, 0.045],
    [-0.56, -0.04, 0.1],
    [-0.12, 0.22, 0.1],
    [-0.1, 0.56, 0.38],
    [0.58, -0.58, 0.46]
  ];
  SWARM.forEach(([dx, dy, d], i) => {
    const start = 0.82 + i * 0.008;
    T['s' + (i + 1)] = [[start, K(dx, dy + 0.06, 0, 0)], [start + 0.07, K(dx, dy, d, 1)]];
  });

  const STATS_START = 0.9;

  // ---- Controller ---------------------------------------------------------
  class Story {
    constructor(root) {
      this.root = root;
      this.stage = root.querySelector('[data-story-stage]');
      this.header = document.querySelector('[data-header]');
      this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.orbs = {};
      root.querySelectorAll('[data-orb]').forEach((el) => (this.orbs[el.dataset.orb] = el));
      this.layer = {};
      root.querySelectorAll('[data-layer]').forEach((el) => (this.layer[el.dataset.layer] = el));
      this.stats = Array.from(root.querySelectorAll('.story__stat'));
      this.ticking = false;
      this.onScroll = () => {
        if (!this.ticking) {
          this.ticking = true;
          requestAnimationFrame(() => { this.ticking = false; this.update(); });
        }
      };
      this.onResize = () => { this.measure(); this.update(); };
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onResize);
      const next = root.querySelector('[data-story-next]');
      if (next) next.addEventListener('click', () => this.scrollToProgress(0.15));
      this.measure();
      this.update();
    }

    destroy() {
      window.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('resize', this.onResize);
      if (this.header) this.header.classList.remove('is-on-dark');
    }

    measure() {
      this.W = this.stage.clientWidth;
      this.H = this.stage.clientHeight;
      this.U = Math.min(this.W, this.H);
      this.headerH = this.header ? this.header.getBoundingClientRect().height : 0;
    }

    progress() {
      const rect = this.root.getBoundingClientRect();
      const total = this.root.offsetHeight - this.H;
      return { p: clamp(-rect.top / (total || 1)), rect };
    }

    scrollToProgress(p) {
      const top = this.root.getBoundingClientRect().top + window.scrollY;
      const total = this.root.offsetHeight - this.H;
      window.scrollTo({ top: top + total * p, behavior: this.reduce ? 'auto' : 'smooth' });
    }

    placeOrb(name, p) {
      const el = this.orbs[name];
      if (!el || !T[name]) return;
      const v = sample(T[name], p);
      const size = Math.max(0, v.d * this.U);
      const x = this.W / 2 + v.dx * this.U;
      const y = this.H / 2 + v.dy * this.U;
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0)`;
      el.style.opacity = v.o;
      el.style.visibility = v.o <= 0.001 || size < 1 ? 'hidden' : 'visible';
    }

    update() {
      let { p, rect } = this.progress();
      const inView = rect.bottom > 0 && rect.top < window.innerHeight;

      // Header turns light while the dark story sits under it
      if (this.header) {
        const under = rect.top <= this.headerH + 1 && rect.bottom > this.headerH;
        this.header.classList.toggle('is-on-dark', under);
      }
      if (!inView) return;

      // Reduced motion: jump between key frames instead of moving
      if (this.reduce) p = p < 0.08 ? 0 : p < 0.3 ? 0.15 : p < 0.62 ? 0.55 : 1;

      const L = this.layer;
      const { H, U, W } = this;

      // 1 · Hero
      const hero = sample(T.hero, p);
      L.hero.style.transform = `translate(-50%, calc(-50% + ${hero.y * H}px))`;
      L.hero.style.opacity = hero.o;
      L.hero.style.visibility = hero.o <= 0.001 ? 'hidden' : 'visible';
      if (L.down) {
        const d = sample(T.down, p);
        L.down.style.opacity = d;
        L.down.style.pointerEvents = d > 0.5 ? 'auto' : 'none';
      }
      this.placeOrb('h1', p);
      this.placeOrb('h2', p);

      // 2 · Panel + statement
      L.panel.style.transform = `translate3d(0, ${sample(T.panel, p) * 100}%, 0)`;
      L.panel.style.visibility = p > 0.42 ? 'hidden' : 'visible';
      const st = sample(T.statement, p);
      L.statement.style.transform = `translateY(${st.y * H}px)`;
      L.statement.style.opacity = st.o;

      // 3 · Reveal shape
      const rv = sample(T.reveal, p);
      const isArch = this.root.classList.contains('story--arch');
      const mw = rv.w * U;
      const mh = isArch ? mw * 1.3 : mw;
      const mx = W / 2 - mw / 2;
      const my = rv.y * H - mh / 2;
      // opacity (not visibility) so child orbs can't override it and leak through
      L.reveal.style.opacity = rv.w > 0.001 ? 1 : 0;
      L.reveal.classList.toggle('is-full', p >= 0.37);
      L.reveal.style.webkitMaskSize = `${mw}px ${mh}px`;
      L.reveal.style.maskSize = `${mw}px ${mh}px`;
      L.reveal.style.webkitMaskPosition = `${mx}px ${my}px`;
      L.reveal.style.maskPosition = `${mx}px ${my}px`;
      if (L.dim) L.dim.style.opacity = sample(T.dim, p);
      if (L.mark) {
        const m = sample(T.mark, p);
        L.mark.style.opacity = m.o;
        L.mark.style.transform = `scale(${m.s})`;
      }

      // 4 · Split
      this.placeOrb('a', p);
      this.placeOrb('b', p);

      // 5 · Swarm + finale
      for (let i = 1; i <= SWARM.length; i++) this.placeOrb('s' + i, p);
      const fin = sample(T.final, p);
      L.final.style.opacity = fin.o;
      L.final.style.transform = `translateY(${fin.y * H}px)`;
      L.final.classList.toggle('is-live', fin.o > 0.6);
      this.stats.forEach((el, i) => {
        const s0 = STATS_START + i * 0.025;
        const t = ease(clamp((p - s0) / 0.05));
        el.style.opacity = t;
        el.style.transform = `translateY(${(1 - t) * 16}px)`;
      });
    }
  }

  const instances = new Map();
  function init(scope = document) {
    scope.querySelectorAll('[data-story]').forEach((el) => {
      if (instances.has(el)) return;
      instances.set(el, new Story(el));
    });
  }
  function teardown(scope) {
    scope.querySelectorAll('[data-story]').forEach((el) => {
      const inst = instances.get(el);
      if (inst) { inst.destroy(); instances.delete(el); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
  window.addEventListener('load', () => instances.forEach((s) => { s.measure(); s.update(); }));

  // Theme editor
  document.addEventListener('shopify:section:load', (e) => init(e.target));
  document.addEventListener('shopify:section:unload', (e) => teardown(e.target));
})();
