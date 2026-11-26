/* Noon Candles — theme scripts (vanilla, no dependencies) */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const theme = window.theme || { routes: {}, strings: {} };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parseHTML = (html) => new DOMParser().parseFromString(html, 'text/html');

  /* ---------------------------------------------------------------- Toast */
  let toastTimer;
  function toast(message) {
    const el = $('[data-toast]');
    if (!el) return;
    el.innerHTML = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3200);
  }

  /* --------------------------------------------------------------- Header */
  function initHeader() {
    const wrapper = $('[data-header]');
    if (!wrapper) return;
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      const y = window.scrollY;
      wrapper.classList.toggle('is-scrolled', y > 8);
      const menuOpen = document.body.classList.contains('is-locked');
      if (wrapper.dataset.sticky === 'hide' && !menuOpen) {
        wrapper.classList.toggle('is-hidden', y > lastY && y > 320);
      }
      lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------- Drawers & modals */
  let lastFocus = null;
  function openPanel(id) {
    const panel = document.getElementById(id);
    if (!panel) return;
    lastFocus = document.activeElement;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    const focusTarget = $('[data-autofocus]', panel) || $('button, a, input', panel);
    if (focusTarget) setTimeout(() => focusTarget.focus(), 60);
  }
  function closePanel(panel) {
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    if (!$('.drawer.is-open, .search-modal.is-open')) document.body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  function initPanels() {
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open]');
      if (opener) {
        const id = opener.dataset.open;
        if (id === 'CartDrawer' && theme.cartType !== 'drawer') return; // fall back to /cart link
        e.preventDefault();
        openPanel(id);
        return;
      }
      const closer = e.target.closest('[data-close]');
      if (closer) {
        e.preventDefault();
        closePanel(closer.closest('.drawer, .search-modal'));
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') $$('.drawer.is-open, .search-modal.is-open').forEach(closePanel);
    });
  }

  /* --------------------------------------------------------- Reveal */
  function initReveal(root = document) {
    const items = $$('[data-reveal]:not(.is-revealed)', root);
    const splits = $$('[data-split]:not(.is-split)', root);
    splits.forEach(splitText);
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach((el) => el.classList.add('is-revealed'));
      splits.forEach((el) => el.classList.add('is-split-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(entry.target.hasAttribute('data-split') ? 'is-split-in' : 'is-revealed');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach((el) => io.observe(el));
    splits.forEach((el) => io.observe(el));
  }

  function splitText(el) {
    el.classList.add('is-split');
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const word = document.createElement('span');
            word.className = 'word';
            Array.from(part).forEach((ch) => {
              const c = document.createElement('span');
              c.className = 'char';
              c.style.setProperty('--i', i++);
              c.textContent = ch;
              word.appendChild(c);
            });
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    el.setAttribute('aria-label', el.textContent.trim());
    walk(el);
    $$('.word', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
  }

  /* -------------------------------------------------------- Counters */
  function initCounters(root = document) {
    const els = $$('[data-count-to]', root);
    if (!els.length) return;
    const run = (el) => {
      const target = parseFloat(el.dataset.countTo) || 0;
      const suffix = el.dataset.suffix || '';
      const duration = 1800;
      const fmt = new Intl.NumberFormat(document.documentElement.lang || 'en');
      if (reduceMotion) { el.textContent = fmt.format(target) + suffix; return; }
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = fmt.format(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    els.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------ Tabs */
  function initTabs(root = document) {
    $$('[data-tabs]', root).forEach((tabsRoot) => {
      const tabs = $$('[role="tab"]', tabsRoot);
      const select = (tab) => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.setAttribute('aria-selected', on);
          t.tabIndex = on ? 0 : -1;
          const panel = document.getElementById(t.getAttribute('aria-controls'));
          if (!panel) return;
          panel.hidden = !on;
          if (on) {
            panel.classList.remove('is-entering');
            void panel.offsetWidth;
            panel.classList.add('is-entering');
          }
        });
      };
      tabs.forEach((tab, idx) => {
        tab.addEventListener('click', () => select(tab));
        tab.addEventListener('keydown', (e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
          next.focus();
          select(next);
        });
      });
    });
  }

  /* -------------------------------------------------------- Carousel */
  function initCarousels(root = document) {
    $$('[data-carousel]', root).forEach((c) => {
      const track = $('[data-carousel-track]', c);
      if (!track) return;
      const by = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
      $$('[data-carousel-prev]', c).forEach((b) => b.addEventListener('click', () => by(-1)));
      $$('[data-carousel-next]', c).forEach((b) => b.addEventListener('click', () => by(1)));
    });
  }

  /* ------------------------------------------------------------ Video */
  function initVideos(root = document) {
    $$('[data-video-toggle]', root).forEach((btn) => {
      const video = document.getElementById(btn.dataset.videoToggle) || $('video', btn.closest('[data-video-root]'));
      if (!video) return;
      btn.addEventListener('click', () => {
        if (video.paused) { video.play(); btn.textContent = btn.dataset.pause; }
        else { video.pause(); btn.textContent = btn.dataset.play; }
      });
    });
    // Pause off-screen autoplay videos to save battery
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!target.autoplay) return;
          if (isIntersecting && !target.dataset.userPaused) target.play().catch(() => {});
          else target.pause();
        });
      }, { threshold: 0.1 });
      $$('video[autoplay]', root).forEach((v) => io.observe(v));
    }
    if (reduceMotion) $$('video[autoplay]', root).forEach((v) => v.pause());
  }

  /* ---------------------------------------------- Announcement slider */
  function initAnnouncement() {
    $$('[data-announcement]').forEach((bar) => {
      const slides = $$('.announcement__slide', bar);
      if (slides.length < 2 || reduceMotion) return;
      let i = 0;
      setInterval(() => {
        slides[i].classList.remove('is-active');
        i = (i + 1) % slides.length;
        slides[i].classList.add('is-active');
      }, parseInt(bar.dataset.speed, 10) * 1000 || 5000);
    });
  }

  /* --------------------------------------------------------- Quantity */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-qty-step]');
    if (!btn) return;
    const input = $('input', btn.closest('.quantity'));
    if (!input) return;
    const min = parseInt(input.min, 10) || 0;
    const max = input.max ? parseInt(input.max, 10) : Infinity;
    const next = Math.min(max, Math.max(min, (parseInt(input.value, 10) || 0) + parseInt(btn.dataset.qtyStep, 10)));
    if (next === parseInt(input.value, 10)) return;
    input.value = next;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* ------------------------------------------------------------- Cart */
  const Cart = {
    sectionIds() {
      return Array.from(new Set($$('[data-cart-section]').map((el) => el.dataset.cartSection)));
    },
    async request(url, body) {
      const sections = this.sectionIds();
      if (sections.length) body.sections = sections.join(',');
      body.sections_url = window.location.pathname;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.status) throw new Error(data.description || data.message || theme.strings.cartError);
      return data;
    },
    render(sections) {
      if (!sections) return;
      Object.entries(sections).forEach(([id, html]) => {
        if (!html) return;
        const doc = parseHTML(html);
        $$(`[data-cart-section="${id}"]`).forEach((target) => {
          const source = $(`[data-cart-section="${id}"]`, doc);
          if (source) target.innerHTML = source.innerHTML;
        });
        const counter = $('[data-cart-count-source]', doc);
        if (counter) this.setCount(counter.dataset.cartCountSource);
      });
      initReveal();
    },
    setCount(count) {
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = parseInt(count, 10) > 0 ? count : '';
        el.classList.remove('is-bumped');
        void el.offsetWidth;
        el.classList.add('is-bumped');
      });
    },
    async add(formData) {
      const body = { items: [{ id: Number(formData.get('id')), quantity: Number(formData.get('quantity') || 1) }] };
      const props = {};
      for (const [k, v] of formData.entries()) {
        const m = k.match(/^properties\[(.+)\]$/);
        if (m && v) props[m[1]] = v;
      }
      if (Object.keys(props).length) body.items[0].properties = props;
      if (formData.get('selling_plan')) body.items[0].selling_plan = formData.get('selling_plan');
      const data = await this.request(`${theme.routes.cartAdd}.js`, body);
      this.render(data.sections);
      if (!data.sections || !Object.keys(data.sections).length) await this.refreshCount();
      return data;
    },
    async change(line, quantity) {
      const data = await this.request(`${theme.routes.cartChange}.js`, { line, quantity });
      this.render(data.sections);
      this.setCount(data.item_count);
      return data;
    },
    async refreshCount() {
      const res = await fetch(`${theme.routes.cart}.js`, { headers: { Accept: 'application/json' } });
      const cart = await res.json();
      this.setCount(cart.item_count);
    },
  };
  window.NoonCart = Cart;

  // Add-to-cart forms (product page + quick add)
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[data-product-form]');
    if (!form) return;
    e.preventDefault();
    const btn = $('[type="submit"]', form);
    const errorEl = $('[data-form-error]', form.closest('[data-product]') || form);
    if (btn) { btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true'); }
    if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }
    try {
      await Cart.add(new FormData(form));
      if (theme.cartType === 'drawer' && $('#CartDrawer')) openPanel('CartDrawer');
      else toast(`${theme.strings.added} <a href="${theme.routes.cart}" style="text-decoration:underline">→</a>`);
    } catch (err) {
      if (errorEl) { errorEl.textContent = err.message; errorEl.hidden = false; }
      else toast(err.message);
    } finally {
      if (btn) { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); }
    }
  });

  // Line item quantity / remove (drawer + cart page)
  let changeTimer;
  document.addEventListener('change', (e) => {
    const input = e.target.closest('[data-line-qty]');
    if (!input) return;
    clearTimeout(changeTimer);
    changeTimer = setTimeout(() => updateLine(input.dataset.lineQty, input.value, input.closest('.cart-item')), 300);
  });
  document.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-line-remove]');
    if (!rm) return;
    e.preventDefault();
    updateLine(rm.dataset.lineRemove, 0, rm.closest('.cart-item'));
  });
  async function updateLine(line, qty, row) {
    if (row) row.classList.add('is-updating');
    try { await Cart.change(Number(line), Number(qty)); }
    catch (err) { toast(err.message); if (row) row.classList.remove('is-updating'); }
  }

  // Cart note (debounced save)
  let noteTimer;
  document.addEventListener('input', (e) => {
    const note = e.target.closest('[data-cart-note]');
    if (!note) return;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      fetch(`${theme.routes.cartUpdate}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.value }),
      });
    }, 500);
  });

  /* ---------------------------------------------------------- Product */
  function initProducts(root = document) {
    $$('[data-product]', root).forEach((product) => {
      if (product.dataset.ready) return;
      product.dataset.ready = '1';
      const jsonEl = $('[data-product-json]', product);
      if (!jsonEl) return;
      const data = JSON.parse(jsonEl.textContent);
      const idInput = $('form[data-product-form] input[name="id"]', product);
      const picker = $('[data-variant-picker]', product);

      // Gallery: thumbs / dashes, optional swipeable track
      const slides = $$('[data-media-id]', product).filter((el) => el.classList.contains('media-slide'));
      const thumbs = $$('[data-thumb]', product);
      const track = $('[data-gallery-track]', product);
      const markCurrent = (mediaId) => {
        slides.forEach((s) => s.classList.toggle('is-active', s.dataset.mediaId === String(mediaId)));
        thumbs.forEach((t) => t.setAttribute('aria-current', t.dataset.thumb === String(mediaId)));
      };
      const showMedia = (mediaId) => {
        if (!mediaId) return;
        markCurrent(mediaId);
        const slide = slides.find((s) => s.dataset.mediaId === String(mediaId));
        if (track && slide) track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
      };
      thumbs.forEach((t) => t.addEventListener('click', () => showMedia(t.dataset.thumb)));
      if (track) {
        let st;
        track.addEventListener('scroll', () => {
          clearTimeout(st);
          st = setTimeout(() => {
            const i = Math.round(track.scrollLeft / (track.clientWidth || 1));
            if (slides[i]) markCurrent(slides[i].dataset.mediaId);
          }, 80);
        }, { passive: true });
      }

      if (!picker) return;
      const fieldsets = $$('fieldset', picker);

      const currentOptions = () => fieldsets.map((fs) => {
        const checked = $('input:checked', fs);
        return checked ? checked.value : null;
      });

      const markAvailability = (selected) => {
        fieldsets.forEach((fs, pos) => {
          $$('input', fs).forEach((input) => {
            const opts = selected.slice();
            opts[pos] = input.value;
            const match = data.variants.find((v) => v.options.every((o, i) => o === opts[i]));
            input.classList.toggle('is-unavailable', !match || !match.available);
          });
        });
      };

      picker.addEventListener('change', async () => {
        const selected = currentOptions();
        const variant = data.variants.find((v) => v.options.every((o, i) => o === selected[i]));
        markAvailability(selected);
        const buyBtn = $('[data-add-button]', product);
        if (!variant) {
          if (buyBtn) { buyBtn.disabled = true; $('span', buyBtn).textContent = theme.strings.unavailable; }
          return;
        }
        idInput.value = variant.id;
        if (variant.featured_media) showMedia(variant.featured_media.id);
        if (product.dataset.updateUrl !== 'false') {
          const url = new URL(window.location.href);
          url.searchParams.set('variant', variant.id);
          window.history.replaceState({}, '', url.toString());
        }
        // Re-render price / button / inventory from the server for exact money formatting
        try {
          const res = await fetch(`${product.dataset.url}?variant=${variant.id}&section_id=${product.dataset.section}`);
          const doc = parseHTML(await res.text());
          $$('[data-dynamic]', product).forEach((el) => {
            const fresh = $(`[data-dynamic="${el.dataset.dynamic}"]`, doc);
            if (fresh) el.replaceWith(fresh);
          });
        } catch (_) { /* keep current UI if the fetch fails */ }
      });
      markAvailability(currentOptions());
    });
  }

  /* ------------------------------------------------ Recommendations */
  function initRecommendations() {
    $$('[data-recommendations]').forEach(async (el) => {
      try {
        const res = await fetch(el.dataset.url);
        const doc = parseHTML(await res.text());
        const fresh = $('[data-recommendations]', doc);
        if (fresh && fresh.innerHTML.trim()) {
          el.innerHTML = fresh.innerHTML;
          initReveal(el);
        } else {
          el.closest('.shopify-section')?.remove();
        }
      } catch (_) { /* ignore */ }
    });
  }

  /* ---------------------------------------------- Collection facets */
  function initFacets() {
    $$('form[data-facets]').forEach((form) => {
      let t;
      form.addEventListener('change', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          const params = new URLSearchParams(new FormData(form));
          for (const [k, v] of Array.from(params.entries())) if (v === '') params.delete(k);
          const sort = $('[data-sort-by]');
          if (sort && sort.value) params.set('sort_by', sort.value);
          window.location.search = params.toString();
        }, 450);
      });
    });
    $$('[data-sort-by]').forEach((sel) => sel.addEventListener('change', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', sel.value);
      url.searchParams.delete('page');
      window.location.href = url.toString();
    }));
    $$('[data-facets-toggle]').forEach((btn) => btn.addEventListener('click', () => {
      const target = document.getElementById(btn.getAttribute('aria-controls'));
      const open = target.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open);
    }));
  }

  /* -------------------------------------------------- Localization */
  document.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-localization-select]');
    if (sel) sel.form.submit();
  });

  /* ------------------------------------------- Scroll progress (--p) */
  // Sets --p (0 → 1) on [data-scroll-progress] while it scrolls through the viewport (sticky scenes).
  const progressEls = new Set();
  let progressTick = false;
  function updateProgress() {
    progressTick = false;
    const vh = window.innerHeight;
    progressEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
      el.style.setProperty('--p', p.toFixed(4));
    });
  }
  function initProgress(root = document) {
    $$('[data-scroll-progress]', root).forEach((el) => progressEls.add(el));
    updateProgress();
  }
  window.addEventListener('scroll', () => {
    if (!progressTick && progressEls.size) { progressTick = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });

  /* ------------------------------------------------------------ Init */
  function init(root = document) {
    initProgress(root);
    initReveal(root);
    initCounters(root);
    initTabs(root);
    initCarousels(root);
    initVideos(root);
    initProducts(root);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initPanels();
    initAnnouncement();
    initRecommendations();
    initFacets();
    init();
  });

  // Theme editor support
  document.addEventListener('shopify:section:load', (e) => init(e.target));
  document.addEventListener('shopify:section:select', (e) => {
    $$('[data-reveal]', e.target).forEach((el) => el.classList.add('is-revealed'));
    if (e.target.querySelector('#CartDrawer')) openPanel('CartDrawer');
  });
  document.addEventListener('shopify:section:deselect', (e) => {
    const drawer = e.target.querySelector('#CartDrawer');
    if (drawer) closePanel(drawer);
  });
})();
