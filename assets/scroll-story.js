/* Noon Candles — Scroll story, scrubbed frame by frame by scroll.
   (optional bright hero) → the candle in an arch lights up → the arch opens while we move into the
   flame (sharp photo crossfades to a soft-focus copy, so it never pixelates) → its light floods the
   screen, the Noon mark appears → the light splits into two photo orbs → a cluster of orbs + stats.

   Performance: progress is eased toward the scroll position (smooth, not jumpy), and everything that
   moves uses transform / opacity / clip-path only — no width/height changes while scrolling. */
(() => {
  'use strict';

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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

  // Where the dark candle part begins; without a bright hero photo we start here
  const DARK_START = 0.095;

  // ---- Timeline -----------------------------------------------------------
  const T = {
    hero: [[0, { x: 0, o: 1 }], [0.02, { x: 0, o: 1 }], [0.075, { x: -0.06, o: 0 }]],
    down: [[0, 1], [0.018, 0]],
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
    frameCentered: [
      [0, { x: 0.5, y: 0.53, k: 0, r: 1 }],
      [0.16, { x: 0.5, y: 0.53, k: 0, r: 1 }],
      [0.27, { x: 0.5, y: 0.5, k: 1, r: 0 }]
    ],
    night: [[0.025, 0], [0.09, 1]],
    heroImg: [[0.045, 1], [0.095, 0]],
    // Candle photo: gentle zoom only (z × cover of the arch); soft copy takes over as we go deeper
    photo: [
      [0, { z: 1.03, ty: 0.5, o: 0 }],
      [0.045, { z: 1.03, ty: 0.5, o: 0 }],
      [0.095, { z: 1.04, ty: 0.5, o: 1 }],
      [0.16, { z: 1.12, ty: 0.5, o: 1 }],
      [0.27, { z: 1.9, ty: 0.5, o: 1 }],
      [0.31, { z: 2.2, ty: 0.5, o: 1 }],
      [0.34, { z: 2.35, ty: 0.5, o: 0 }]
    ],
    soft: [[0.15, 0], [0.23, 1]],
    shade: [[0.06, 0.92], [0.105, 0.92], [0.16, 0.1], [0.22, 0]],
    bloom: [[0.1, { d: 0.1, o: 0 }], [0.16, { d: 0.85, o: 0.85 }], [0.27, { d: 2.2, o: 1 }], [0.36, { d: 2.8, o: 0 }]],
    warm: [[0.1, 0], [0.18, 0.5], [0.3, 0.6]],
    statement: [[0.16, { y: 0.05, o: 0 }], [0.2, { y: 0, o: 1 }], [0.25, { y: -0.01, o: 1 }], [0.29, { y: -0.05, o: 0 }]],
    // Light floods out from the flame: a soft disc scaling up (fraction of the screen diagonal)
    flood: [[0.24, { s: 0, o: 0 }], [0.255, { s: 0.15, o: 1 }], [0.34, { s: 1.6, o: 1 }]],
    fill: [[0.335, 0], [0.345, 1]],
    mark: [[0.34, { o: 0, s: 0.88 }], [0.38, { o: 1, s: 1 }], [0.43, { o: 1, s: 1 }], [0.47, { o: 0, s: 1.06 }]],
    dusk: [[0.43, 0], [0.51, 1]],
    dim: [[0.75, 0], [0.88, 0.35]],
    a: [
      [0.46, K(0, 0, 0.2, 0)], [0.5, K(0, 0, 0.92, 1)], [0.53, K(-0.05, 0, 0.92)], [0.58, K(-0.22, 0, 0.86)],
      [0.62, K(-0.3, 0, 0.8)], [0.66, K(-0.2, -0.17, 0.72)], [0.7, K(0, -0.33, 0.64)], [0.75, K(-0.15, -0.12, 0.58)],
      [0.8, K(-0.08, -0.06, 0.52)], [0.88, K(-0.2, -0.16, 0.5)]
    ],
    b: [
      [0.5, K(0, 0, 0.92, 0)], [0.515, K(0, 0, 0.92, 1)], [0.53, K(0.05, 0, 0.92)], [0.58, K(0.22, 0, 0.86)],
      [0.62, K(0.3, 0, 0.8)], [0.66, K(0.2, 0.2, 0.72)], [0.7, K(0, 0.33, 0.64)], [0.75, K(0.17, 0.12, 0.58)],
      [0.8, K(0.08, 0.08, 0.52)], [0.88, K(0.22, 0.12, 0.56)]
    ],
    final: [[0.86, { y: 0.04, o: 0 }], [0.93, { y: 0, o: 1 }]]
  };

  const BOKEH = [[-0.9, -0.25, 0.42], [0.88, -0.05, 0.3], [-0.62, 0.42, 0.16], [0.6, 0.48, 0.2], [0.36, -0.5, 0.1]];
  const SWARM = [
    [-0.95, -0.4, 0.9], [-0.36, -0.36, 0.26], [0.06, -0.46, 0.18], [0.36, -0.38, 0.18], [-0.52, 0.04, 0.2],
    [-0.06, 0.52, 0.34], [0.64, -0.5, 0.05], [-0.18, 0.14, 0.08], [0.7, 0.5, 0.07], [0.58, -0.62, 0.4]
  ];
  SWARM.forEach(([dx, dy, d], i) => {
    const start = 0.82 + i * 0.008;
    T['s' + (i + 1)] = [[start, K(dx, dy + 0.06, 0, 0)], [start + 0.07, K(dx, dy, d, 1)]];
  });
  const STATS_START = 0.9;
  const maxD = (track) => Math.max(...track.map(([, v]) => v.d || 0));

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
      this.soft = root.querySelector('.story__photo-soft');
      this.noBright = !this.layer.heroimg && !this.layer.hero;
      const ph = this.layer.photo;
      this.photo = ph ? { iw: +ph.dataset.iw || 1000, ih: +ph.dataset.ih || 1000, fx: +ph.dataset.fx || 0.5, fy: +ph.dataset.fy || 0.5 } : null;
      this.cur = null;
      this.raf = 0;
      this.loop = () => {
        this.raf = 0;
        const { p: target, rect } = this.progress();
        if (this.cur === null || this.reduce) this.cur = target;
        else {
          // time-based easing: same feel at any frame rate (~0.2s to catch up)
          const now = performance.now();
          const dt = Math.min(120, now - (this.last || now - 16));
          this.last = now;
          // while the page glides (smooth-scroll.js) follow it almost directly; ease only real jumps
          const tau = window.noonScroll && window.noonScroll.gliding() ? 14 : 65;
          this.cur += (target - this.cur) * (1 - Math.exp(-dt / tau));
        }
        if (Math.abs(target - this.cur) < 0.0003) this.cur = target;
        this.render(this.cur, rect);
        if (this.cur !== target) this.raf = requestAnimationFrame(this.loop);
        else this.last = 0;
      };
      this.onScroll = () => { if (!this.raf) this.raf = requestAnimationFrame(this.loop); };
      this.onResize = () => { this.measure(); this.cur = null; this.onScroll(); };
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onResize);
      const next = root.querySelector('[data-story-next]');
      if (next) next.addEventListener('click', () => this.scrollToProgress(0.16));
      this.measure();
      this.onScroll();
    }

    destroy() {
      window.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('resize', this.onResize);
      if (this.header) this.header.classList.remove('is-on-dark');
    }

    measure() {
      const W = (this.W = this.stage.clientWidth);
      const H = (this.H = this.stage.clientHeight);
      this.U = Math.min(W, H);
      this.D = Math.hypot(W, H);
      this.wide = W >= 900;
      this.headerH = this.header ? this.header.getBoundingClientRect().height : 0;
      // Fixed base sizes — animation only scales these
      this.base = {};
      Object.keys(this.orbs).forEach((name) => {
        let d = 0.9;
        if (T[name]) d = maxD(T[name]);
        else if (/^k\d/.test(name)) d = BOKEH[+name.slice(1) - 1][2];
        const px = Math.max(1, d * this.U);
        this.base[name] = px;
        this.orbs[name].style.width = px + 'px';
        this.orbs[name].style.height = px + 'px';
      });
      this.glowBase = 2.8 * this.U;
      this.layer.glow.style.width = this.layer.glow.style.height = this.glowBase + 'px';
      this.floodBase = this.D * 1.6;
      if (this.layer.flood) this.layer.flood.style.width = this.layer.flood.style.height = this.floodBase + 'px';
      // Photo base: cover of the full-screen frame at z = 1
      if (this.photo) {
        this.photoS0 = Math.max((W * 1.04) / this.photo.iw, (H * 1.04) / this.photo.ih);
        this.layer.photo.style.width = this.photo.iw * this.photoS0 + 'px';
        this.layer.photo.style.height = this.photo.ih * this.photoS0 + 'px';
      }
    }

    progress() {
      const rect = this.root.getBoundingClientRect();
      const total = this.root.offsetHeight - this.H;
      let p = clamp(-rect.top / (total || 1));
      if (this.noBright) p = DARK_START + p * (1 - DARK_START);
      return { p, rect };
    }

    scrollToProgress(p) {
      const top = this.root.getBoundingClientRect().top + window.scrollY;
      const total = this.root.offsetHeight - this.H;
      if (window.noonScroll) window.noonScroll.scrollTo(top + total * p, { duration: 1.6 });
      else window.scrollTo({ top: top + total * p, behavior: this.reduce ? 'auto' : 'smooth' });
    }

    place(el, x, y, d, o, base) {
      const k = Math.max(0, d) / base;
      el.style.transform = `translate3d(${(x - base / 2).toFixed(1)}px, ${(y - base / 2).toFixed(1)}px, 0) scale(${k.toFixed(4)})`;
      el.style.opacity = o;
      el.style.visibility = o <= 0.001 || k < 0.002 ? 'hidden' : 'visible';
    }

    placeOrb(name, p, v) {
      const el = this.orbs[name];
      if (!el) return;
      v = v || sample(T[name], p);
      this.place(el, this.W / 2 + v.dx * this.U, this.H / 2 + v.dy * this.U, v.d * this.U, v.o, this.base[name]);
    }

    render(p, rect) {
      if (this.reduce) p = p < 0.04 ? 0 : p < 0.15 ? 0.14 : p < 0.3 ? 0.21 : p < 0.48 ? 0.4 : p < 0.8 ? 0.62 : 1;

      if (this.header) {
        const under = rect.top <= this.headerH + 1 && rect.bottom > this.headerH;
        const bright = (!this.noBright && p < 0.06) || (p > 0.28 && p < 0.47);
        this.header.classList.toggle('is-on-dark', under && !bright);
      }
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const L = this.layer;
      const { W, H, U } = this;

      if (L.hero) {
        const hero = sample(T.hero, p);
        L.hero.style.transform = `translate3d(${hero.x * W}px, 0, 0)`;
        L.hero.style.opacity = hero.o;
        L.hero.style.visibility = hero.o <= 0.001 ? 'hidden' : 'visible';
        L.hero.style.pointerEvents = hero.o > 0.6 ? 'auto' : 'none';
      }
      if (L.down) {
        const d = sample(T.down, p);
        L.down.style.opacity = d;
        L.down.style.pointerEvents = d > 0.5 ? 'auto' : 'none';
      }
      if (L.night) L.night.style.opacity = this.noBright ? 1 : sample(T.night, p);

      // Arch window: a clip on a full-screen layer (no layout work)
      const f = sample(!L.hero ? T.frameCentered : this.wide ? T.frameWide : T.frameNarrow, p);
      const archH = this.wide ? H * 0.78 : H * 0.48;
      const archW = this.wide ? Math.min(W * 0.36, archH * 0.74) : Math.min(W * 0.8, archH * 0.74);
      const fw = lerp(archW, W * 1.04, f.k);
      const fh = lerp(archH, H * 1.04, f.k);
      const fl = f.x * W - fw / 2;
      const ft = f.y * H - fh / 2;
      const rt = (f.r * fw) / 2;
      const rb = f.r * 28;
      L.frame.style.clipPath = `inset(${ft.toFixed(1)}px ${(W - fl - fw).toFixed(1)}px ${(H - ft - fh).toFixed(1)}px ${fl.toFixed(1)}px round ${rt.toFixed(1)}px ${rt.toFixed(1)}px ${rb.toFixed(1)}px ${rb.toFixed(1)}px)`;
      L.frame.style.visibility = p > 0.36 ? 'hidden' : 'visible';
      if (L.heroimg) L.heroimg.style.opacity = sample(T.heroImg, p);

      // Candle photo inside the arch, flame kept on the zoom point
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
        fx = fl + left + this.photo.fx * pw;
        fy = ft + top + this.photo.fy * phh;
        const k = s / this.photoS0;
        L.photo.style.transform = `translate3d(${(fl + left).toFixed(1)}px, ${(ft + top).toFixed(1)}px, 0) scale(${k.toFixed(4)})`;
        L.photo.style.opacity = ph.o;
        if (this.soft) this.soft.style.opacity = sample(T.soft, p);
        if (L.shade) {
          L.shade.style.opacity = sample(T.shade, p);
          L.shade.style.setProperty('--fx', fx.toFixed(1) + 'px');
          L.shade.style.setProperty('--fy', fy.toFixed(1) + 'px');
        }
      }

      const g = sample(T.bloom, p);
      this.place(L.glow, fx, fy, g.d * U, g.o, this.glowBase);
      this.root.style.setProperty('--fx', fx.toFixed(1) + 'px');
      this.root.style.setProperty('--fy', fy.toFixed(1) + 'px');
      L.warm.style.opacity = sample(T.warm, p);

      const night = clamp((p - 0.08) / 0.05) * (1 - clamp((p - 0.3) / 0.06));
      BOKEH.forEach(([dx, dy, d], i) => this.placeOrb('k' + (i + 1), p, { dx, dy: dy - p * 0.5, d, o: 0.5 * night }));

      const st = sample(T.statement, p);
      L.statement.style.transform = `translate(-50%, ${(st.y * H).toFixed(1)}px)`;
      L.statement.style.opacity = st.o;

      // Light floods out from the flame, then the bright scene takes over
      if (L.flood) {
        const fl2 = sample(T.flood, p);
        this.place(L.flood, fx, fy, fl2.s * this.D, fl2.o * (1 - clamp((p - 0.36) / 0.02)), this.floodBase);
      }
      const fillO = sample(T.fill, p);
      L.fill.style.opacity = fillO;
      L.fill.style.visibility = fillO > 0.001 ? 'visible' : 'hidden';
      const m = sample(T.mark, p);
      L.mark.style.opacity = m.o;
      L.mark.style.transform = `translate(-50%, -50%) scale(${m.s})`;
      L.dusk.style.opacity = sample(T.dusk, p);
      L.dim.style.opacity = sample(T.dim, p);

      this.placeOrb('a', p);
      this.placeOrb('b', p);
      for (let i = 1; i <= SWARM.length; i++) this.placeOrb('s' + i, p);
      const fin = sample(T.final, p);
      L.final.style.opacity = fin.o;
      L.final.style.transform = `translateY(${(fin.y * H).toFixed(1)}px)`;
      L.final.classList.toggle('is-live', fin.o > 0.6);
      this.stats.forEach((el, i) => {
        const t = ease(clamp((p - (STATS_START + i * 0.025)) / 0.05));
        el.style.opacity = t;
        el.style.transform = `translateY(${((1 - t) * 16).toFixed(1)}px)`;
      });
    }
  }

  const instances = new Map();
  function init(scope = document) {
    scope.querySelectorAll('[data-story]').forEach((el) => { if (!instances.has(el)) instances.set(el, new Story(el)); });
  }
  function teardown(scope) {
    scope.querySelectorAll('[data-story]').forEach((el) => {
      const inst = instances.get(el);
      if (inst) { inst.destroy(); instances.delete(el); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
  window.addEventListener('load', () => instances.forEach((s) => s.onResize()));
  document.addEventListener('shopify:section:load', (e) => init(e.target));
  document.addEventListener('shopify:section:unload', (e) => teardown(e.target));
})();
