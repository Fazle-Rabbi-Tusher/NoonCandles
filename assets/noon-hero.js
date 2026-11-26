/* Noon hero — two glossy twisted candles rendered with three.js, passing through the card's oval.
   The scene renders once into the back canvas (behind the card); the same frame is copied to the
   front canvas, which is clipped to the area above the oval's middle — so the candles look like
   they pass through the window. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Procedural pieces ---------- */

// Fluted wax that spirals as it rises, tapering slightly, with a softened top edge
function twistedCandleGeometry({ height, radius, lobes, turns, depth }) {
  const geo = new THREE.CylinderGeometry(radius, radius, height, 180, 260, false);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = (v.y + height / 2) / height;
    const rv = Math.hypot(v.x, v.z);
    if (rv < 1e-6) continue;
    const theta = Math.atan2(v.z, v.x);
    const taper = 1 - 0.14 * t;
    const flute = 1 + depth * Math.cos(lobes * (theta + t * Math.PI * 2 * turns));
    let r = radius * taper * flute * (rv / radius);
    const edge = height / 2 - v.y;
    if (edge < 0.1) r *= 1 - Math.pow(1 - edge / 0.1, 2) * 0.1;
    pos.setXYZ(i, Math.cos(theta) * r, v.y, Math.sin(theta) * r);
  }
  geo.computeVertexNormals();
  return geo;
}

function flameTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 178, 4, 64, 150, 120);
  grad.addColorStop(0, 'rgba(255,255,246,1)');
  grad.addColorStop(0.18, 'rgba(255,244,200,1)');
  grad.addColorStop(0.42, 'rgba(255,196,96,0.95)');
  grad.addColorStop(0.7, 'rgba(255,128,40,0.45)');
  grad.addColorStop(1, 'rgba(255,100,30,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(64, 8);
  g.bezierCurveTo(78, 70, 112, 120, 104, 180);
  g.bezierCurveTo(98, 228, 30, 228, 24, 180);
  g.bezierCurveTo(16, 120, 50, 70, 64, 8);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function haloTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,214,150,0.55)');
  grad.addColorStop(0.35, 'rgba(255,170,90,0.18)');
  grad.addColorStop(1, 'rgba(255,140,60,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Soft studio environment for glossy reflections (no extra modules needed)
function studioEnvironment(renderer) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#fffaf4');
  sky.addColorStop(0.45, '#f3dcd2');
  sky.addColorStop(0.7, '#b9727f');
  sky.addColorStop(1, '#3d0c18');
  g.fillStyle = sky;
  g.fillRect(0, 0, 1024, 512);
  // softboxes
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.fillRect(120, 70, 220, 120);
  g.fillRect(640, 110, 140, 70);
  g.fillStyle = 'rgba(255,214,170,0.8)';
  g.fillRect(860, 220, 120, 90);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}

function makeCandle({ color, sheen, height, radius, lobes, turns, depth, flameTex, haloTex }) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    twistedCandleGeometry({ height, radius, lobes, turns, depth }),
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.32,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      sheen: 0.7,
      sheenColor: sheen,
      sheenRoughness: 0.45,
      envMapIntensity: 1.15
    })
  );
  group.add(body);

  const topY = height / 2;
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.74, 48),
    new THREE.MeshStandardMaterial({ color: 0xfff1dc, emissive: 0xffb070, emissiveIntensity: 0.35, roughness: 0.25 })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = topY - 0.012;
  group.add(pool);

  const wick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.016, 0.16, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.9 })
  );
  wick.position.y = topY + 0.07;
  group.add(wick);

  // Flame and halo are sprites so they always point up on screen, even when the candle tilts
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  const light = new THREE.PointLight(0xffb066, 2.2, 3.2, 2);
  const anchor = new THREE.Object3D();
  anchor.position.y = topY + 0.16;
  group.add(anchor);
  return { group, flame, halo, light, anchor, base: { fw: radius * 0.52, fh: radius * 1.25 } };
}

/* ---------- Scene ---------- */

function initHero(root) {
  const back = root.querySelector('[data-nh-back]');
  const front = root.querySelector('[data-nh-front]');
  const card = root.querySelector('[data-nh-card]');
  const progressBar = root.querySelector('[data-nh-progress]');
  const explore = root.querySelector('[data-nh-explore]');

  requestAnimationFrame(() => root.classList.add('is-in'));
  if (explore) {
    explore.addEventListener('click', (e) => {
      const target = document.getElementById(explore.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: back, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    root.classList.add('nh--nogl');
    return;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const ctx2d = front.getContext('2d');

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  scene.add(new THREE.HemisphereLight(0xfff4e8, 0x5b1a2b, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc6a0, 0.9);
  rim.position.set(4, -2, -3);
  scene.add(rim);

  const flameTex = flameTexture();
  const haloTex = haloTexture();
  const rig = new THREE.Group();
  scene.add(rig);

  const main = makeCandle({ color: 0x8e1739, sheen: new THREE.Color(0xff9ab8), height: 3.3, radius: 0.43, lobes: 6, turns: 1.15, depth: 0.13, flameTex, haloTex });
  const second = makeCandle({ color: 0xf1dfc2, sheen: new THREE.Color(0xffffff), height: 2.5, radius: 0.34, lobes: 5, turns: 0.9, depth: 0.12, flameTex, haloTex });
  const candles = [
    { c: main, pos: new THREE.Vector3(0.3, -0.1, 0), tilt: -0.36, lean: 0.22, spin: 0.32, delay: 0 },
    { c: second, pos: new THREE.Vector3(2.75, -1.55, -1.2), tilt: 0.42, lean: -0.18, spin: -0.26, delay: 0.25 }
  ];
  candles.forEach(({ c }) => {
    rig.add(c.group);
    scene.add(c.flame, c.halo, c.light);
  });

  let W = 1;
  let H = 1;
  let cut = 0;
  function resize() {
    W = root.clientWidth;
    H = root.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    front.width = Math.round(W * dpr);
    front.height = Math.round(H * dpr);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    // Narrow screens: shrink and recentre the candles
    const aspect = W / H;
    const s = clamp(aspect / 1.55, 0.5, 1);
    rig.scale.setScalar(s);
    rig.position.x = aspect < 1 ? -0.15 : 0;
    // Oval middle, relative to the hero
    const r = card.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    cut = r.top - rr.top + r.height * 0.49;
    root.style.setProperty('--nh-cut', cut + 'px');
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const flicker = (t, seed) => Math.sin(t * 9.1 + seed) * 0.5 + Math.sin(t * 15.7 + seed * 2) * 0.3 + Math.sin(t * 3.3 + seed) * 0.2;
  const tmp = new THREE.Vector3();
  const start = performance.now();

  function frame(now) {
    const t = (now - start) / 1000;
    const rect = root.getBoundingClientRect();
    const q = clamp(-rect.top / Math.max(1, rect.height));
    if (progressBar) progressBar.style.transform = `scaleX(${0.35 + q * 0.65})`;

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    rig.rotation.y = pointer.x * 0.12;
    rig.rotation.x = pointer.y * 0.06;

    candles.forEach(({ c, pos, tilt, lean, spin, delay }, i) => {
      const intro = reduceMotion ? 1 : easeOut(clamp((t - 0.25 - delay) / 1.6));
      c.group.position.set(pos.x, pos.y + (1 - intro) * 3.2 + q * (2.2 + i) + Math.sin(t * 0.8 + i) * 0.05, pos.z);
      c.group.rotation.set(lean, (reduceMotion ? 0.6 : t * spin) + (1 - intro) * 1.4, tilt + q * 0.25 * (i ? -1 : 1));
      c.group.updateMatrixWorld();
      // flame follows the wick but stays upright
      c.anchor.getWorldPosition(tmp);
      const f = reduceMotion ? 0 : flicker(t, i * 3.7);
      const sx = c.base.fw * rig.scale.x * (1 + f * 0.05);
      const sy = c.base.fh * rig.scale.x * (1 + f * 0.09);
      c.flame.position.set(tmp.x, tmp.y + sy * 0.32, tmp.z);
      c.flame.scale.set(sx, sy, 1);
      c.flame.material.opacity = intro * (0.9 + f * 0.1);
      c.halo.position.copy(c.flame.position);
      c.halo.scale.setScalar(c.base.fh * 3.2 * rig.scale.x * (1 + f * 0.04));
      c.halo.material.opacity = intro * 0.9;
      c.light.position.copy(c.flame.position);
      c.light.intensity = intro * (2.1 + f * 0.35);
    });

    renderer.render(scene, camera);
    ctx2d.clearRect(0, 0, front.width, front.height);
    ctx2d.drawImage(back, 0, 0, front.width, front.height);
  }

  let running = false;
  let raf = 0;
  const loop = (now) => {
    frame(now);
    if (running) raf = requestAnimationFrame(loop);
  };
  const io = new IntersectionObserver(([entry]) => {
    const visible = entry.isIntersecting;
    if (visible && !running && !reduceMotion) {
      running = true;
      raf = requestAnimationFrame(loop);
    } else if (!visible) {
      running = false;
      cancelAnimationFrame(raf);
    }
  });
  io.observe(root);

  resize();
  frame(performance.now());
  window.addEventListener('resize', () => { resize(); frame(performance.now()); });
  if (reduceMotion) window.addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true });
}

document.querySelectorAll('[data-noon-hero]').forEach(initHero);
document.addEventListener('shopify:section:load', (e) => e.target.querySelectorAll('[data-noon-hero]').forEach(initHero));
