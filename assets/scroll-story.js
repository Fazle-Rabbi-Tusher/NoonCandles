/* Noon Candles — Scroll story, scrubbed frame by frame by scroll.
   1 bright hero (copy + product photo in an arch) → 2 the room dims; the arch glides to the centre
   and becomes a window onto a real candle photo → 3 the candle lights; the arch opens to full screen
   while zooming into the flame → 4 its light floods the screen, the Noon mark appears
   → 5 the light splits into two photo orbs → 6 a cluster of photo orbs + stats.
   Orb positions are offsets from the stage centre in units of U = min(width, height). */
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

  const K = (dx, dy, d, o = 1) => ({ dx, dy, d, o });

  // ---- Timeline -----------------------------------------------------------
  const T = {
    // 1 · Bright hero
    hero: [[0, { x: 0, o: 1 }], [0.02, { x: 0, o: 1 }], [0.075, { x: -0.06, o: 0 }]],
    down: [[0, 1], [0.018, 0]],
    // Arch frame: centre (x, y as fractions of the screen), k = 0 arch box → 1 full screen, r = arch roundness
    frameWide: [
      [0, { x: 0.735, y: 0.55, k: 0, r: 1 }],
      [0.025, { x: 0.735, y: 0.55, k: 0, r: 1 }],
      [0.09, { x: 0.5, y: 0.53, k: 0, r: 1 }],
      [0.16, { x: 0.5, y: 0.53, k: 0, r: 1 }],
      [0.27, { x: 0.5, y: 0.5, k: 1, r: 0 }]
    ],
    frameNarrow: [
      [0, { x: 0.5, y: 0.72, k: 0, r: 1 }],
      [0.025, { x: 0.5, y: 0.72, k: 0, r: 1 }],
      [0.09, { x: 0.5, y: 0.54, k: 0, r: 1 }],
      [0.16, { x: 0.5, y: 0.54, k: 0, r: 1 }],
      [0.27, { x: 0.5, y: 0.5, k: 1, r: 0 }]
    ],
    night: [[0.025, 0], [0.09, 1]],
    heroImg: [[0.045, 1], [0.095, 0]],
    // Candle photo inside the frame: zoom (z × cover), flame height (ty, fraction of frame), opacity
    photo: [
      [0, { z: 1.03, ty: 0.5, o: 0 }],
      [0.045, { z: 1.03, ty: 0.5, o: 0 }],
      [0.095, { z: 1.05, ty: 0.5, o: 1 }],
      [0.16, { z: 1.15, ty: 0.5, o: 1 }],
      [0.27, { z: 4.4, ty: 0.5, o: 1 }],
      [0.33, { z: 5.6, ty: 0.5, o: 1 }],
      [0.36, { z: 6, ty: 0.5, o: 0 }]
    ],
    shade: [[0.06, 0.92], [0.105, 0.92], [0.16, 0.1], [0.22, 0]],
    bloom: [[0.1, { d: 0.1, o: 0 }], [0.16, { d: 0.85, o: 0.85 }], [0.27, { d: 2.4, o: 1 }], [0.36, { d: 3, o: 0 }]],
    warm: [[0.1, 0], [0.18, 0.5], [0.3, 0.6]],

    // 3 · Statement while zooming into the flame
    statement: [[0.16, { y: 0.05, o: 0 }], [0.2, { y: 0, o: 1 }], [0.25, { y: -0.01, o: 1 }], [0.29, { y: -0.05, o: 0 }]],

    // 4 · Light floods the screen (radius as a fraction of the screen diagonal)
    fill: [[0.26, 0], [0.35, 1.15]],
    mark: [[0.34, { o: 0, s: 0.88 }], [0.38, { o: 1, s: 1 }], [0.43, { o: 1, s: 1 }], [0.47, { o: 0, s: 1.06 }]],
    dusk: [[0.43, 0], [0.51, 1]],
    dim: [[0.75, 0], [0.88, 0.35]],

    // 5 · The light divides into two
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

  const BOKEH = [
    [-0.9, -0.25, 0.42],
    [0.88, -0.05, 0.3],
    [-0.62, 0.42, 0.16],
    [0.6, 0.48, 0.2],
    [0.36, -0.5, 0.1]
  ];

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
      const ph = this.layer.photo;
      this.photo = ph
        ? { iw: +ph.dataset.iw || 1000, ih: +ph.dataset.ih || 1000, fx: +ph.dataset.fx || 0.5, fy: +ph.dataset.fy || 0.5 }
        : null;
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
      if (next) next.addEventListener('click', () => this.scrollToProgress(0.16));
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
      this.wide = this.W >= 900;
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
      if (this.reduce) p = p < 0.04 ? 0 : p < 0.15 ? 0.14 : p < 0.3 ? 0.21 : p < 0.48 ? 0.4 : p < 0.8 ? 0.62 : 1;

      // Header: dark text on the bright hero and the bright light scene, light text over the dark scenes
      if (this.header) {
        const under = rect.top <= this.headerH + 1 && rect.bottom > this.headerH;
        const bright = p < 0.06 || (p > 0.28 && p < 0.47);
        this.header.classList.toggle('is-on-dark', under && !bright);
      }
      if (!inView) return;

      const L = this.layer;
      const { W, H, U, D } = this;

      // 1 · Hero copy slides away
      const hero = sample(T.hero, p);
      L.hero.style.transform = `translate3d(${hero.x * W}px, 0, 0)`;
      L.hero.style.opacity = hero.o;
      L.hero.style.visibility = hero.o <= 0.001 ? 'hidden' : 'visible';
      L.hero.style.pointerEvents = hero.o > 0.6 ? 'auto' : 'none';
      if (L.down) {
        const d = sample(T.down, p);
        L.down.style.opacity = d;
        L.down.style.pointerEvents = d > 0.5 ? 'auto' : 'none';
      }
      if (L.night) L.night.style.opacity = sample(T.night, p);

      // 2 · The arch frame
      const f = sample(this.wide ? T.frameWide : T.frameNarrow, p);
      const archH = this.wide ? H * 0.78 : H * 0.4;
      const archW = this.wide ? Math.min(W * 0.36, archH * 0.74) : Math.min(W * 0.76, archH * 0.78);
      const fw = lerp(archW, W * 1.04, f.k);
      const fh = lerp(archH, H * 1.04, f.k);
      const fl = f.x * W - fw / 2;
      const ft = f.y * H - fh / 2;
      const rTop = (f.r * fw) / 2;
      const rBottom = f.r * 28;
      L.frame.style.width = fw + 'px';
      L.frame.style.height = fh + 'px';
      L.frame.style.transform = `translate3d(${fl}px, ${ft}px, 0)`;
      L.frame.style.borderRadius = `${rTop}px ${rTop}px ${rBottom}px ${rBottom}px`;
      L.frame.style.visibility = p > 0.37 ? 'hidden' : 'visible';
      if (L.heroimg) L.heroimg.style.opacity = sample(T.heroImg, p);

      // Candle photo inside the frame, flame kept on the zoom point
      let fx = fl + fw / 2;
      let fy = ft + fh / 2;
      if (L.photo && this.photo) {
        const ph = sample(T.photo, p);
        const { iw, ih } = this.photo;
        const s = Math.max(fw / iw, fh / ih) * ph.z;
        const pw = iw * s;
        const phh = ih * s;
        let left = fw / 2 - this.photo.fx * pw;
        let top = ph.ty * fh - this.photo.fy * phh;
        left = Math.min(0, Math.max(fw - pw, left));
        top = Math.min(0, Math.max(fh - phh, top));
        const lfx = left + this.photo.fx * pw;
        const lfy = top + this.photo.fy * phh;
        fx = fl + lfx;
        fy = ft + lfy;
        L.photo.style.width = pw + 'px';
        L.photo.style.height = phh + 'px';
        L.photo.style.transform = `translate3d(${left}px, ${top}px, 0)`;
        L.photo.style.opacity = ph.o;
        if (L.shade) {
          L.shade.style.opacity = sample(T.shade, p);
          L.shade.style.setProperty('--fx', lfx + 'px');
          L.shade.style.setProperty('--fy', lfy + 'px');
        }
      }

      // Bloom + warm room, centred on the flame
      const g = sample(T.bloom, p);
      this.place(L.glow, fx, fy, g.d * U, g.o);
      this.root.style.setProperty('--fx', fx + 'px');
      this.root.style.setProperty('--fy', fy + 'px');
      L.warm.style.opacity = sample(T.warm, p);

      // Bokeh in the dark room
      const night = clamp((p - 0.08) / 0.05) * (1 - clamp((p - 0.3) / 0.06));
      BOKEH.forEach(([dx, dy, d], i) => {
        this.placeOrb('k' + (i + 1), p, { dx, dy: dy - p * 0.5, d, o: 0.5 * night });
      });

      // 3 · Statement
      const st = sample(T.statement, p);
      L.statement.style.transform = `translate(-50%, ${st.y * H}px)`;
      L.statement.style.opacity = st.o;

      // 4 · Light floods out from the flame, feathered edge
      const r = sample(T.fill, p) * D;
      L.fill.style.visibility = r > 0.5 ? 'visible' : 'hidden';
      L.fill.classList.toggle('is-full', p >= 0.355);
      const mask = `radial-gradient(circle ${Math.max(1, r)}px at ${fx}px ${fy}px, #000 ${r * 0.55}px, rgba(0,0,0,.6) ${r * 0.8}px, transparent ${r}px)`;
      L.fill.style.webkitMaskImage = mask;
      L.fill.style.maskImage = mask;
      const m = sample(T.mark, p);
      L.mark.style.opacity = m.o;
      L.mark.style.transform = `translate(-50%, -50%) scale(${m.s})`;
      L.dusk.style.opacity = sample(T.dusk, p);
      L.dim.style.opacity = sample(T.dim, p);

      // 5 · Two orbs
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
