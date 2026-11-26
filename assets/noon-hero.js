/* Noon hero — Noon's own candles in 3D (three.js), passing through the card's oval:
   a whipped coupe with strawberries (the hero), a layered bubble jar, a strawberry candle and a loose
   strawberry. Glossy wax look: clearcoat + sheen under a soft studio environment.
   The scene renders into the back canvas (behind the card); the same frame is copied to the front
   canvas, clipped above the oval's middle — so objects appear to pass through the window. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const V2 = (x, y) => new THREE.Vector2(x, y);

/* ---------- Materials (shared "glossy wax" look) ---------- */
const wax = (color, sheen = 0xffffff, extra = {}) =>
  new THREE.MeshPhysicalMaterial({
    color, roughness: 0.38, metalness: 0, clearcoat: 0.85, clearcoatRoughness: 0.14,
    sheen: 0.8, sheenColor: new THREE.Color(sheen), sheenRoughness: 0.45, envMapIntensity: 1.1, ...extra
  });
const glass = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, opacity: 0.26, roughness: 0.05, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false
  });

/* ---------- Geometry helpers ---------- */

// Radial displacement of a lathe/cylinder geometry: fn(theta, y, r) -> new radius
function displace(geo, fn) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    if (r < 1e-6) continue;
    const th = Math.atan2(v.z, v.x);
    const nr = fn(th, v.y, r);
    pos.setXYZ(i, Math.cos(th) * nr, v.y, Math.sin(th) * nr);
  }
  geo.computeVertexNormals();
  return geo;
}

// Piped whipped swirl (star-tip ridges spiralling up to a soft peak)
function swirlGeometry({ R, h, tiers = 2.6, lobes = 8, turns = 2.2, ridge = 0.075 }) {
  const geo = new THREE.CylinderGeometry(1, 1, h, 160, 220, false);
  geo.translate(0, h / 2, 0);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = clamp(v.y / h);
    const rv = Math.hypot(v.x, v.z);
    const th = Math.atan2(v.z, v.x);
    const env = R * Math.pow(1 - t, 0.6) * (0.76 + 0.24 * Math.pow(Math.abs(Math.sin(Math.PI * tiers * t)), 0.5));
    const r = env * (1 + ridge * Math.cos(lobes * (th + t * Math.PI * 2 * turns))) * rv;
    // a little curl at the very top
    const curl = t > 0.86 ? (t - 0.86) * 0.9 * R : 0;
    pos.setXYZ(i, Math.cos(th) * r + curl, v.y, Math.sin(th) * r);
  }
  geo.computeVertexNormals();
  return geo;
}

// Sculpted strawberry: rounded shoulders, pointed tip, seeds and leaves
function strawberry(size = 1) {
  const g = new THREE.Group();
  const body = new THREE.SphereGeometry(1, 56, 56);
  const shape = (x, y, z) => {
    const t = (y + 1) / 2;
    let k = 0.6 + 0.4 * Math.pow(t, 0.8);
    if (y < -0.15) k *= 1 + (y + 0.15) * 0.42;
    return [x * k, y * 1.16, z * k];
  };
  const pos = body.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const [x, y, z] = shape(pos.getX(i), pos.getY(i), pos.getZ(i));
    pos.setXYZ(i, x, y, z);
  }
  body.computeVertexNormals();
  g.add(new THREE.Mesh(body, wax(0xc01a39, 0xff8fa8, { roughness: 0.3, clearcoat: 1 })));

  // seeds — instanced, laid on the surface
  const seedGeo = new THREE.SphereGeometry(0.032, 8, 8);
  seedGeo.scale(1, 1.7, 1);
  const N = 70;
  const seeds = new THREE.InstancedMesh(seedGeo, new THREE.MeshStandardMaterial({ color: 0xf3d48a, roughness: 0.45 }), N);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  let n = 0;
  for (let i = 0; i < N * 1.4 && n < N; i++) {
    const y = 1 - (i / (N * 1.4 - 1)) * 2;
    if (y > 0.82) continue;
    const rad = Math.sqrt(1 - y * y);
    const phi = i * 2.399963;
    const [px, py, pz] = shape(Math.cos(phi) * rad, y, Math.sin(phi) * rad);
    const normal = new THREE.Vector3(px, py * 0.6, pz).normalize();
    q.setFromUnitVectors(up, normal);
    m.compose(new THREE.Vector3(px, py, pz).multiplyScalar(0.995), q, new THREE.Vector3(1, 1, 1));
    seeds.setMatrixAt(n++, m);
  }
  seeds.count = n;
  g.add(seeds);

  // leaves
  const leafMat = wax(0x4f8a3a, 0xc8f0a0, { roughness: 0.45 });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.62, 8), leafMat);
    leaf.scale.set(1, 1, 0.32);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.2, 1.12, Math.sin(a) * 0.2);
    leaf.rotation.set(0, -a, 0);
    leaf.rotateZ(-1.15);
    g.add(leaf);
  }
  g.scale.setScalar(size);
  return g;
}

function wickAndFlameAnchor(group, y, flameScale = 1) {
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.9 }));
  wick.position.y = y + 0.06;
  group.add(wick);
  const anchor = new THREE.Object3D();
  anchor.position.y = y + 0.15;
  group.add(anchor);
  return { anchor, flameScale };
}

/* ---------- Noon products ---------- */

function whippedCoupe() {
  const g = new THREE.Group();
  // fluted coupe glass on a stem
  const prof = [V2(0, 0), V2(0.56, 0), V2(0.6, 0.03), V2(0.5, 0.07), V2(0.12, 0.12), V2(0.07, 0.3), V2(0.065, 0.85), V2(0.11, 0.98), V2(0.4, 1.06), V2(0.68, 1.2), V2(0.82, 1.42), V2(0.86, 1.6), V2(0.84, 1.62)];
  const glassGeo = displace(new THREE.LatheGeometry(prof, 120), (th, y, r) => (y > 1.0 ? r * (1 + 0.035 * Math.cos(30 * th)) : r));
  g.add(new THREE.Mesh(glassGeo, glass()));
  // wax filling inside the bowl
  const fill = new THREE.LatheGeometry([V2(0, 1.02), V2(0.38, 1.07), V2(0.64, 1.21), V2(0.77, 1.42), V2(0.8, 1.56), V2(0, 1.56)], 96);
  g.add(new THREE.Mesh(fill, wax(0xf6ead6)));
  // piped whipped top
  const cream = new THREE.Mesh(swirlGeometry({ R: 0.88, h: 1.05, tiers: 2.2, lobes: 7, turns: 1.25, ridge: 0.12 }), wax(0xf7ecd8, 0xffffff, { roughness: 0.48, clearcoat: 0.6 }));
  cream.position.y = 1.5;
  g.add(cream);
  // strawberries on the cream
  const s1 = strawberry(0.27);
  s1.position.set(0.42, 1.86, 0.24);
  s1.rotation.set(0.2, 0.4, -0.65);
  const s2 = strawberry(0.24);
  s2.position.set(-0.4, 1.8, -0.2);
  s2.rotation.set(-0.3, -0.8, 0.6);
  g.add(s1, s2);
  const f = wickAndFlameAnchor(g, 2.53, 1);
  return { group: g, height: 2.75, ...f };
}

function bubbleJar() {
  const g = new THREE.Group();
  const H = 2.05;
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const y = (i / 64) * H;
    const bulge = Math.pow(Math.sin((Math.PI * y) / 0.68), 2);
    let r = 0.55 + 0.11 * bulge;
    if (y < 0.12) r *= 0.82 + (y / 0.12) * 0.18;
    pts.push(V2(r, y));
  }
  pts.unshift(V2(0, 0));
  const glassGeo = displace(new THREE.LatheGeometry(pts, 120), (th, y, r) => r * (1 + 0.045 * Math.cos(7 * th + y * 2.2)));
  g.add(new THREE.Mesh(glassGeo, glass()));
  // layered wax (mango → yellow → matcha), vertex coloured
  const inner = displace(new THREE.LatheGeometry(pts.map((p) => V2(p.x * 0.92, Math.min(p.y, H - 0.08))), 96), (th, y, r) => r * (1 + 0.04 * Math.cos(7 * th + y * 2.2)));
  const cols = [];
  const stops = [[0, new THREE.Color(0xf28c28)], [0.32, new THREE.Color(0xf6c23a)], [0.52, new THREE.Color(0x7fa94f)], [0.8, new THREE.Color(0xa9cb8a)], [1, new THREE.Color(0xc3dca8)]];
  const ip = inner.attributes.position;
  const c = new THREE.Color();
  for (let i = 0; i < ip.count; i++) {
    const t = clamp(ip.getY(i) / H);
    let k = 1;
    while (k < stops.length - 1 && stops[k][0] < t) k++;
    const [t0, c0] = stops[k - 1];
    const [t1, c1] = stops[k];
    c.copy(c0).lerp(c1, clamp((t - t0) / (t1 - t0 || 1)));
    cols.push(c.r, c.g, c.b);
  }
  inner.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.add(new THREE.Mesh(inner, wax(0xffffff, 0xffffff, { vertexColors: true, roughness: 0.32 })));
  // whipped matcha top + mango pieces
  const top = new THREE.Mesh(swirlGeometry({ R: 0.56, h: 0.5, tiers: 1.4, lobes: 8, turns: 1.4, ridge: 0.06 }), wax(0x9fc27e, 0xeaffd0, { roughness: 0.5 }));
  top.position.y = H - 0.08;
  g.add(top);
  const mangoMat = wax(0xf29a33, 0xffd59a, { roughness: 0.28, clearcoat: 1 });
  [[0.18, 0.12, 0.3], [-0.2, 0.08, 1.8], [0.02, 0.2, -1]].forEach(([x, z, ry]) => {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.16), mangoMat);
    cube.position.set(x, H + 0.18, z);
    cube.rotation.set(0.3, ry, 0.2);
    g.add(cube);
  });
  const f = wickAndFlameAnchor(g, H + 0.38, 0.9);
  return { group: g, height: H + 0.5, ...f };
}

function strawberryCandle(size = 0.62) {
  const g = new THREE.Group();
  const berry = strawberry(size);
  berry.position.y = size * 1.16;
  g.add(berry);
  const f = wickAndFlameAnchor(g, size * 2.4, 0.8);
  return { group: g, height: size * 2.6, ...f };
}

function looseStrawberry(size = 0.34) {
  const g = new THREE.Group();
  const berry = strawberry(size);
  berry.position.y = size * 1.16;
  g.add(berry);
  return { group: g, height: size * 2.3, anchor: null };
}

/* ---------- Light & environment ---------- */

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

/* ---------- Scene ---------- */

function initHero(root) {
  if (root.__nh) return;
  root.__nh = true;
  const back = root.querySelector('[data-nh-back]');
  const front = root.querySelector('[data-nh-front]');
  const card = root.querySelector('[data-nh-card]');
  const progressBar = root.querySelector('[data-nh-progress]');
  const explore = root.querySelector('[data-nh-explore]');

  // the hero fills the screen below whatever sits above it (the announcement bar)
  const fit = () => {
    const top = root.getBoundingClientRect().top + window.scrollY;
    root.style.setProperty('--nh-above', (top < 200 ? Math.max(0, Math.round(top)) : 0) + 'px');
  };
  fit();
  window.addEventListener('resize', fit);

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
  scene.add(new THREE.HemisphereLight(0xfff4e8, 0x5b1a2b, 0.6));
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

  // pos = centre of the object; tilt = lean on screen; spin = turns per second (radians);
  // m = the portrait (phone) placement, in world units
  const items = [
    { make: whippedCoupe, scale: 1.02, pos: [0.2, 0.42, 0], m: { scale: 0.68, pos: [0, 0.6, 0] }, tilt: -0.22, lean: 0.18, spin: 0.3, delay: 0 },
    { make: bubbleJar, scale: 0.78, pos: [2.75, -1.45, -1.2], m: { scale: 0.5, pos: [0.74, -0.85, -0.5] }, tilt: 0.34, lean: -0.12, spin: -0.24, delay: 0.25 },
    { make: () => strawberryCandle(0.58), scale: 1, pos: [-3.05, -1.45, -0.6], m: { scale: 0.55, pos: [-0.78, -0.95, 0.3] }, tilt: -0.32, lean: 0.25, spin: 0.36, delay: 0.4 },
    { make: () => looseStrawberry(0.26), scale: 1, pos: [2.45, 1.38, 0.9], m: { scale: 0.8, pos: [0.82, 1.58, 0.6] }, tilt: 0.6, lean: -0.3, spin: -0.5, delay: 0.55 }
  ].map((cfg) => {
    const obj = cfg.make();
    // centre vertically around the middle of the object
    const holder = new THREE.Group();
    obj.group.position.y = -obj.height / 2;
    holder.add(obj.group);
    rig.add(holder);
    let flame = null;
    let halo = null;
    let light = null;
    if (obj.anchor) {
      flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      light = new THREE.PointLight(0xffb066, 2, 3.2, 2);
      scene.add(flame, halo, light);
    }
    return { ...cfg, obj, holder, flame, halo, light, at: cfg.pos };
  });

  let W = 1;
  let H = 1;
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
    const aspect = W / H;
    const portrait = aspect < 0.85;
    rig.scale.setScalar(portrait ? 1 : clamp(aspect / 1.55, 0.5, 1));
    const spread = clamp(aspect / 0.46, 1, 1.5);
    items.forEach((it) => {
      const c = portrait ? it.m : it;
      it.at = portrait ? [c.pos[0] * spread, c.pos[1], c.pos[2]] : c.pos;
      it.holder.scale.setScalar(c.scale);
    });
    const r = card.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    root.style.setProperty('--nh-cut', r.top - rr.top + r.height * 0.49 + 'px');
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

    items.forEach((it, i) => {
      const intro = reduceMotion ? 1 : easeOut(clamp((t - 0.25 - it.delay) / 1.6));
      it.holder.position.set(it.at[0], it.at[1] + (1 - intro) * 3.2 + q * (2 + i * 0.6) + Math.sin(t * 0.8 + i) * 0.05, it.at[2]);
      it.holder.rotation.set(it.lean, (reduceMotion ? 0.6 : t * it.spin) + (1 - intro) * 1.4, it.tilt + q * 0.2 * (i % 2 ? -1 : 1));
      it.holder.updateMatrixWorld();
      if (!it.flame) return;
      it.obj.anchor.getWorldPosition(tmp);
      const f = reduceMotion ? 0 : flicker(t, i * 3.7);
      const s = it.holder.scale.x * rig.scale.x * (it.obj.flameScale || 1);
      const sx = 0.22 * s * (1 + f * 0.05);
      const sy = 0.54 * s * (1 + f * 0.09);
      it.flame.position.set(tmp.x, tmp.y + sy * 0.32, tmp.z);
      it.flame.scale.set(sx, sy, 1);
      it.flame.material.opacity = intro * (0.9 + f * 0.1);
      it.halo.position.copy(it.flame.position);
      it.halo.scale.setScalar(1.15 * s * (1 + f * 0.04));
      it.halo.material.opacity = intro * 0.7;
      it.light.position.copy(it.flame.position);
      it.light.intensity = intro * (1.9 + f * 0.35);
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
    if (entry.isIntersecting && !running && !reduceMotion) {
      running = true;
      raf = requestAnimationFrame(loop);
    } else if (!entry.isIntersecting) {
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
