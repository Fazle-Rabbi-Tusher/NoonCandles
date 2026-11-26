/* Noon Candles — Scroll story: a burning candle, scrubbed frame by frame by scroll.
   Scroll position (0 → 1 through the section) drives a keyframed timeline.
   Positions are offsets from the stage centre in units of U = min(width, height),
   so the composition keeps its shape on every screen size. */
(() => {
  'use strict';

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /** Sample a keyframe track [[p, value], ...] at progress p (numbers or flat objects). */
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

  // Orb keyframe: dx, dy from centre (U), diameter (U), opacity
  const K = (dx, dy, d, o = 1) => ({ dx, dy, d, o });

  // Candle SVG is 200 × 300; flame centre sits at y = 30 → 10% from the top
  const CANDLE_RATIO = 200 / 300;
  const FLAME_Y = 0.1;

  // ---- Timeline -----------------------------------------------------------
  const T = {
    // 1 · Unlit candle + headline
    hero: [[0, { y: 0, o: 1 }], [0.035, { y: 0, o: 1 }], [0.11, { y: -0.22, o: 0 }]],
    down: [[0, 1], [0.02, 0]],
    candle: [
      [0, { dx: 0, dy: 0.3, h: 0.62, o: 1 }],
      [0.11, { dx: 0, dy: 0.24, h: 0.66, o: 1 }],
      [0.27, { dx: 0, dy: 1.3, h: 3.3, o: 1 }],
      [0.34, { dx: 0, dy: 1.5, h: 3.8, o: 0 }]
    ],
    // 2 · Ignite: flame grows, room warms
    ignite: [[0.025, { o: 0, s: 0.15 }], [0.075, { o: 1, s: 1 }]],
    glow: [[0.025, { d: 0, o: 0 }], [0.085, { d: 1.1, o: 0.95 }], [0.27, { d: 2.6, o: 1 }], [0.36, { d: 3.2, o: 0 }]],
    warm: [[0.025, 0], [0.1, 0.85], [0.3, 1]],

    // 3 · Statement while zooming into the flame
    statement: [[0.13, { y: 0.05, o: 0 }], [0.18, { y: 0, o: 1 }], [0.24, { y: -0.01, o: 1 }], [0.28, { y: -0.05, o: 0 }]],

    // 4 · Light floods the screen (circle radius as a fraction of the screen diagonal)
    fill: [[0.25, 0], [0.34, 0.75]],
    mark: [[0.33, { o: 0, s: 0.88 }], [0.37, { o: 1, s: 1 }], [0.43, { o: 1, s: 1 }], [0.47, { o: 0, s: 1.06 }]],
    dusk: [[0.43, 0], [0.51, 1]],
    dim: [[0.75, 0], [0.88, 0.35]],

    // 5 · The light divides into two flames
    a: [
      [0.46, K(0, 0, 0.2, 0)],
      [0.5, K(0, 0, 0.92, 1)],
      [0.53, K(-0.05, 0, 0.92)],
      [0.58, K(-0.22, 0, 0.86)],
      [0.62, K(-0.3, 0, 0.8)],
      [0.66, K(-0.2, -0.17, 0.72)],
      [0.7, K(0, -0.33, 0.64)],
      [0.75, K(-0.15, -0.12, 0.58)],
      [0.8, K(-0.08, -0.06, 0.52)],
      [0.88, K(-0.2, -0.16, 0.5)]
    ],
    b: [
      [0.5, K(0, 0, 0.92, 0)],
      [0.515, K(0, 0, 0.92, 1)],
      [0.53, K(0.05, 0, 0.92)],
      [0.58, K(0.22, 0, 0.86)],
      [0.62, K(0.3, 0, 0.8)],
      [0.66, K(0.2, 0.2, 0.72)],
      [0.7, K(0, 0.33, 0.64)],
      [0.75, K(0.17, 0.12, 0.58)],
      [0.8, K(0.08, 0.08, 0.52)],
      [0.88, K(0.22, 0.12, 0.56)]
    ],

    // 6 · Finale copy
    final: [[0.86, { y: 0.04, o: 0 }], [0.93, { y: 0, o: 1 }]]
  };

  // Background bokeh (drift upward as you scroll)
  const BOKEH = [
    [-0.9, -0.25, 0.42],
    [0.88, -0.05, 0.3],
    [-0.62, 0.42, 0.16],
    [0.6, 0.48, 0.2],
    [0.36, -0.5, 0.1]
  ];

  // Finale cluster: s1–s6 can hold photos, s7–s10 are small flames
  const SWARM = [
    [-0.95, -0.4, 0.9],
    [-0.36, -0.36, 0.26],
    [0.06, -0.46, 0.18],
    [0.36, -0.38, 0.18],
    [-0.52, 0.04, 0.2],
    [-0.06, 0.52, 0.34],
    [0.64, -0.5, 0.05],
    [-0.18, 0.14, 0.08],
    [0.7, 0.5, 0.07],
    [0.58, -0.62, 0.4]
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
        if (this.ticking) return;
        this.ticking = true;
        requestAnimationFrame(() => { this.ticking = false; this.update(); });
      };
      this.onResize = () => { this.measure(); this.update(); };
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onResize);
      const next = root.querySelector('[data-story-next]');
      if (next) next.addEventListener('click', () => this.scrollToProgress(0.09));
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
      this.D = Math.hypot(this.W, this.H);
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

    place(el, x, y, size, o) {
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0)`;
      el.style.opacity = o;
      el.style.visibility = o <= 0.001 || size < 1 ? 'hidden' : 'visible';
    }

    placeOrb(name, p, v) {
      const el = this.orbs[name];
      if (!el) return;
      v = v || sample(T[name], p);
      this.place(el, this.W / 2 + v.dx * this.U, this.H / 2 + v.dy * this.U, Math.max(0, v.d * this.U), v.o);
    }

    update() {
      let { p, rect } = this.progress();
      const inView = rect.bottom > 0 && rect.top < window.innerHeight;

      // Reduced motion: jump between key frames instead of moving
      if (this.reduce) p = p < 0.05 ? 0 : p < 0.15 ? 0.1 : p < 0.3 ? 0.2 : p < 0.48 ? 0.4 : p < 0.8 ? 0.62 : 1;

      // Header: light text over the dark scenes, dark text while the screen is flooded with light
      if (this.header) {
        const under = rect.top <= this.headerH + 1 && rect.bottom > this.headerH;
        const brightScene = p > 0.28 && p < 0.47;
        this.header.classList.toggle('is-on-dark', under && !brightScene);
      }
      if (!inView) return;

      const L = this.layer;
      const { W, H, U, D } = this;

      // 1 · Hero copy
      const hero = sample(T.hero, p);
      L.hero.style.transform = `translate(-50%, ${hero.y * H}px)`;
      L.hero.style.opacity = hero.o;
      L.hero.style.visibility = hero.o <= 0.001 ? 'hidden' : 'visible';
      if (L.down) {
        const d = sample(T.down, p);
        L.down.style.opacity = d;
        L.down.style.pointerEvents = d > 0.5 ? 'auto' : 'none';
      }

      // Candle (and where its flame is on screen)
      const c = sample(T.candle, p);
      const ch = c.h * U;
      const cw = ch * CANDLE_RATIO;
      const cx = W / 2 + c.dx * U;
      const cy = H / 2 + c.dy * U;
      const fx = cx;
      const fy = cy - ch / 2 + ch * FLAME_Y;
      L.candle.style.width = cw + 'px';
      L.candle.style.height = ch + 'px';
      L.candle.style.transform = `translate3d(${cx - cw / 2}px, ${cy - ch / 2}px, 0)`;
      L.candle.style.opacity = c.o;
      L.candle.style.visibility = c.o <= 0.001 ? 'hidden' : 'visible';
      const ig = sample(T.ignite, p);
      L.candle.style.setProperty('--ignite', ig.o.toFixed(3));
      L.candle.style.setProperty('--ignite-s', ig.s.toFixed(3));

      // 2 · Glow + warm room, centred on the flame
      const g = sample(T.glow, p);
      this.place(L.glow, fx, fy, g.d * U, g.o);
      this.root.style.setProperty('--fx', fx + 'px');
      this.root.style.setProperty('--fy', fy + 'px');
      L.warm.style.opacity = sample(T.warm, p);

      // Bokeh drift
      BOKEH.forEach(([dx, dy, d], i) => {
        const lit = clamp((p - 0.03) / 0.06);
        this.placeOrb('k' + (i + 1), p, { dx, dy: dy - p * 0.5, d, o: (0.35 + lit * 0.65) * (1 - clamp((p - 0.3) / 0.06)) });
      });

      // 3 · Statement
      const st = sample(T.statement, p);
      L.statement.style.transform = `translate(-50%, ${st.y * H}px)`;
      L.statement.style.opacity = st.o;

      // 4 · Light floods out from the flame
      const r = sample(T.fill, p) * D;
      L.fill.style.visibility = r > 0.5 ? 'visible' : 'hidden';
      L.fill.classList.toggle('is-full', p >= 0.34);
      L.fill.style.clipPath = `circle(${r}px at ${fx}px ${fy}px)`;
      const m = sample(T.mark, p);
      L.mark.style.opacity = m.o;
      L.mark.style.transform = `translate(-50%, -50%) scale(${m.s})`;
      L.dusk.style.opacity = sample(T.dusk, p);
      L.dim.style.opacity = sample(T.dim, p);

      // 5 · Two flames
      this.placeOrb('a', p);
      this.placeOrb('b', p);

      // 6 · Cluster + finale
      for (let i = 1; i <= SWARM.length; i++) this.placeOrb('s' + i, p);
      const fin = sample(T.final, p);
      L.final.style.opacity = fin.o;
      L.final.style.transform = `translateY(${fin.y * H}px)`;
      L.final.classList.toggle('is-live', fin.o > 0.6);
      this.stats.forEach((el, i) => {
        const t = ease(clamp((p - (STATS_START + i * 0.025)) / 0.05));
        el.style.opacity = t;
        el.style.transform = `translateY(${(1 - t) * 16}px)`;
      });
    }
  }

  const instances = new Map();
  function init(scope = document) {
    scope.querySelectorAll('[data-story]').forEach((el) => {
      if (!instances.has(el)) instances.set(el, new Story(el));
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

  document.addEventListener('shopify:section:load', (e) => init(e.target));
  document.addEventListener('shopify:section:unload', (e) => teardown(e.target));
})();
