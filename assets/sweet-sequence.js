/* Noon — Sweet sequence: a scroll-scrubbed, frame-by-frame section.
   Scroll progress p (0 → 1 through the section) drives keyframed tracks. */
(() => {
  'use strict';

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const range = (p, a, b) => ease(clamp((p - a) / (b - a)));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class Sweet {
    constructor(root) {
      this.root = root;
      this.stage = root.querySelector('[data-sq-stage]');
      this.el = {};
      root.querySelectorAll('[data-sq]').forEach((n) => (this.el[n.dataset.sq] = n));
      this.cards = Array.from(root.querySelectorAll('[data-sq-card]'));
      this.words = Array.from(root.querySelectorAll('.sq__words span'));
      this.header = document.querySelector('[data-header]');
      this.cur = null;
      this.raf = 0;
      this.loop = () => {
        this.raf = 0;
        const rect = this.root.getBoundingClientRect();
        const total = this.root.offsetHeight - this.H;
        const target = clamp(-rect.top / (total || 1));
        if (this.cur === null || reduce) this.cur = target;
        else {
          // time-based easing: same feel at any frame rate (~0.2s to catch up)
          const now = performance.now();
          const dt = Math.min(120, now - (this.last || now - 16));
          this.last = now;
          this.cur += (target - this.cur) * (1 - Math.exp(-dt / 65));
        }
        if (Math.abs(target - this.cur) < 0.0003) this.cur = target;
        this.update(this.cur, rect);
        if (this.cur !== target) this.raf = requestAnimationFrame(this.loop);
        else this.last = 0;
      };
      this.onScroll = () => { if (!this.raf) this.raf = requestAnimationFrame(this.loop); };
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', () => { this.measure(); this.cur = null; this.onScroll(); });
      this.measure();
      this.onScroll();
    }

    measure() {
      this.W = this.stage.clientWidth;
      this.H = this.stage.clientHeight;
      this.wide = this.W >= 900;
      this.headerH = this.header ? this.header.getBoundingClientRect().height : 0;
      const { W, H, wide, el } = this;
      this.S = wide ? Math.min(H * 0.56, W * 0.36) : W * 0.62;
      [el.glass, el.pale].forEach((n) => { n.style.width = n.style.height = this.S + 'px'; });
      this.cw = wide ? H * 0.28 : W * 0.34;
      this.ch = this.cw * 1.36;
      this.cards.forEach((c) => { c.style.width = this.cw + 'px'; c.style.height = this.ch + 'px'; });
    }

    move(el, cx, cy, size, k = 1) {
      el.style.transform = `translate3d(${(cx - size / 2).toFixed(1)}px, ${(cy - size / 2).toFixed(1)}px, 0) scale(${k.toFixed(4)})`;
    }

    box(el, cx, cy, w, h) {
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      el.style.transform = `translate3d(${cx - w / 2}px, ${cy - h / 2}px, 0)`;
    }

    update(p, rect) {
      if (reduce) p = p < 0.15 ? 0 : p < 0.35 ? 0.34 : p < 0.58 ? 0.5 : p < 0.85 ? 0.7 : 1;

      // Header: light text while the dark scene sits under it
      if (this.header && rect.top <= this.headerH + 1 && rect.bottom > this.headerH) {
        this.header.classList.toggle('is-on-dark', p < 0.185);
      }
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const { W, H, wide, el } = this;

      // 1 · glass frame + facts
      const S = this.S;
      const gy = wide ? H / 2 : H * 0.42;
      this.move(el.glass, W / 2, gy, S);
      const factsOut = 1 - range(p, 0.1, 0.18);
      if (el.facts) el.facts.style.opacity = factsOut;
      if (el.intro) el.intro.style.opacity = factsOut;

      // 2 · light panel rises from the bottom
      const lt = 1 - range(p, 0.04, 0.2);
      el.light.style.clipPath = `inset(${(lt * 100).toFixed(3)}% 0 0 0)`;

      // 3 · pale card grows until its circle fills the left half (top half on phones)
      const grow = range(p, 0.2, 0.34);
      const endDia = wide ? H * 1.04 : W * 1.08;
      const sEnd = endDia / (0.94 * S);
      const endX = wide ? Math.max(H * 0.52, W * 0.25) : W / 2;
      const endY = wide ? H / 2 : H * 0.3;
      const pcx = lerp(W / 2, endX, grow);
      const pcy = lerp(gy, endY, grow);
      this.move(el.pale, pcx, pcy, S, lerp(1, sEnd, grow));

      // 4 · big line + word-by-word line
      const bigIn = range(p, 0.36, 0.42);
      const bigOut = range(p, 0.53, 0.58);
      el.big.style.opacity = bigIn * (1 - bigOut);
      el.big.style.transform = `translate(-50%, calc(-50% + ${((1 - bigIn) * 0.04 - bigOut * 0.04) * H}px))`;
      const wordsVis = range(p, 0.42, 0.45) * (1 - range(p, 0.56, 0.6));
      el.words.style.opacity = wordsVis;
      const lit = range(p, 0.44, 0.54) * this.words.length;
      this.words.forEach((w, i) => w.classList.toggle('is-on', i < lit));

      // 5 · background splits, statement appears
      el.quad.style.transform = `scaleY(${range(p, 0.56, 0.64)})`;
      const pr = range(p, 0.6, 0.67);
      el.promise.style.opacity = pr;
      el.promise.style.transform = wide ? `translateY(calc(-50% + ${(1 - pr) * 0.03 * H}px))` : `translateY(${(1 - pr) * 0.03 * H}px)`;
      el.end.style.opacity = range(p, 0.86, 0.93);

      // 6 · product: appears blurred, sharpens, then multiplies into a row
      const cw = this.cw;
      const ch = this.ch;
      const appear = range(p, 0.34, 0.42);
      const sharp = range(p, 0.72, 0.8);
      const spread = range(p, 0.78, 0.92);
      const baseX = endX - (wide ? W * 0.1 + W * 0.02 * spread : W * 0.16 * spread);
      const offsets = wide ? [0, 0.055, 0.105, 0.15] : [0, 0.14, 0.26, 0.36];
      const lift = [0, -0.018, -0.034, -0.048];
      const scale = [1, 0.93, 0.86, 0.8];
      this.cards.forEach((card, i) => {
        const vis = i === 0 ? appear : spread;
        const cx = baseX + offsets[i] * W * spread;
        const cy = endY + lift[i] * H * spread;
        const sc = lerp(1, scale[i], spread);
        card.style.transform = `translate3d(${cx - cw / 2}px, ${cy - ch / 2}px, 0) scale(${sc})`;
        card.style.opacity = vis;
        card.style.zIndex = String(10 - i);
        card.style.filter = `blur(${((1 - sharp) * 16).toFixed(2)}px)`;
      });
      this.root.classList.toggle('is-live', p > 0.9);
      this.root.classList.toggle('is-final', p > 0.92);
    }
  }

  const init = (scope = document) => scope.querySelectorAll('[data-sweet]').forEach((n) => { if (!n.__sweet) n.__sweet = new Sweet(n); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
  window.addEventListener('load', () => document.querySelectorAll('[data-sweet]').forEach((n) => n.__sweet && (n.__sweet.measure(), (n.__sweet.cur = null), n.__sweet.onScroll())));
  document.addEventListener('shopify:section:load', (e) => init(e.target));
})();
