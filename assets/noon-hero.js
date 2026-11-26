/* Noon hero — Noon's own candles in 3D (three.js), modelled from the product photos and
   passing through the card's oval:
   - Strawberry whipped coupe: ribbed coupe glass on a slim stem and domed foot, filled with white
     wax, a piped cream rosette and two cone strawberries standing tip-up like ears.
   - Mango matcha bubble jar: bubble glass (rows of round lobes), mango → yellow → matcha layers with
     matcha drips, a pale matcha whipped top and mango cubes.
   - Strawberry matcha bubble jar: pink → cream → matcha layers, lime whipped top with strawberry
     crumbs and a cone strawberry.
   - Strawberry candle: the cone strawberry with a flat base and dimpled seeds, wick at the tip.
   Satin wax look: soft sheen and a light clear coat under a soft studio environment.
   The scene renders into the back canvas (behind the card); the top part of the same frame is copied
   to the front canvas, clipped above the oval's middle — so objects appear to pass through the window. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const V2 = (x, y) => new THREE.Vector2(x, y);
const TAU = Math.PI * 2;

/* ---------- Materials ---------- */

// Satin candle wax
const wax = (color, extra = {}) =>
  new THREE.MeshPhysicalMaterial({
    color, roughness: 0.52, metalness: 0, clearcoat: 0.22, clearcoatRoughness: 0.4,
    sheen: 0.55, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.5, envMapIntensity: 0.95, ...extra
  });
// Clear glass: mostly reflections
const glass = (extra = {}) =>
  new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, opacity: 0.2, roughness: 0.03, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.4, side: THREE.DoubleSide, depthWrite: false, ...extra
  });

const COL = {
  cream: 0xf6f1e8,
  berry: 0xa3142f,
  wick: 0xefe8dc,
  mango: 0xcf4a00,
  yellow: 0xe08c00,
  matchaDark: 0x3f6e22,
  matchaPale: 0xa9cc86,
  pink: 0xd9708f,
  vanilla: 0xf1e2cc,
  matcha: 0x5b8c3c,
  lime: 0xc8df8c,
  crumb: 0xd0303f
};

/* ---------- Geometry helpers ---------- */

// Smooth lathe from a few control points (Catmull-Rom)
function smoothProfile(points, steps) {
  const pts = new THREE.SplineCurve(points).getPoints(steps);
  pts[0].copy(points[0]);
  pts[pts.length - 1].copy(points[points.length - 1]);
  return pts;
}

// Radial displacement: fn(theta, y, r, index) -> new radius
function displace(geo, fn) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-6) continue;
    const th = Math.atan2(z, x);
    const nr = fn(th, y, r, i);
    pos.setXYZ(i, (x / r) * nr, y, (z / r) * nr);
  }
  return geo;
}

// Normals with the lathe/cylinder seam welded (no visible crease)
function finish(geo, ring, rows, rowStride, colStride) {
  geo.computeVertexNormals();
  const n = geo.attributes.normal;
  const v = new THREE.Vector3();
  for (let j = 0; j < rows; j++) {
    const a = j * rowStride;
    const b = j * rowStride + ring * colStride;
    v.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
    n.setXYZ(a, v.x, v.y, v.z);
    n.setXYZ(b, v.x, v.y, v.z);
  }
  n.needsUpdate = true;
  return geo;
}
// LatheGeometry(points, segs): index = i * points + j
const latheFinish = (geo, segs, npts) => finish(geo, segs, npts, 1, npts);
// CylinderGeometry(.., radial, height): torso index = y * (radial + 1) + x
const cylFinish = (geo, radial, height) => finish(geo, radial, height + 1, radial + 1, 1);

function paint(geo, fn) {
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    fn(c, pos.getX(i), pos.getY(i), pos.getZ(i), i);
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

// Piped whipped cream: a rope coiling up a dome (helical coils) with twisted star-tip grooves
// running diagonally across it, and a soft lip at the bottom that spills over the rim.
function pipedCream({ R, h, power = 0.55, coils = 2, coil = 0.07, grooves = 22, twist = 1.6, ridge = 0.05, lip = 0.1, peak = 0.06 }) {
  const RADIAL = 220;
  const HEIGHT = 170;
  const geo = new THREE.CylinderGeometry(1, 1, h, RADIAL, HEIGHT, false);
  geo.translate(0, h / 2, 0);
  displace(geo, (th, y, r) => {
    const t = clamp(y / h);
    let env = R * Math.pow(1 - t, power);
    env *= 1 - lip + lip * Math.sin(Math.min(t / 0.14, 1) * Math.PI * 0.5); // tucked-in bottom edge
    env *= 1 + 0.045 * Math.sin(3 * th + 5 * t) * Math.sin(2 * th - 7 * t + 1); // hand-piped, not perfect
    const u = coils * t - th / TAU; // helix phase
    const rope = Math.pow(Math.abs(Math.sin(Math.PI * u)), 0.55);
    const g = Math.pow((Math.cos(grooves * th + twist * TAU * t + 2 * Math.sin(3 * u)) + 1) / 2, 0.35);
    const fade = 1 - smooth(0.8, 1, t);
    return Math.max(0.001, env * (1 - coil + coil * rope - ridge * (1 - g) * fade)) * Math.min(1, r);
  });
  // soft little peak around the wick
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / h;
    if (t > 0.9) pos.setY(i, pos.getY(i) + peak * smooth(0.9, 1, t));
  }
  return cylFinish(geo, RADIAL, HEIGHT);
}

/* ---------- Cone strawberry (shared by every strawberry) ---------- */

let berryGeo = null;
function berryGeometry() {
  if (berryGeo) return berryGeo;
  const ctrl = [V2(0, 0), V2(0.22, 0), V2(0.33, 0.015), V2(0.4, 0.07), V2(0.43, 0.17), V2(0.42, 0.3), V2(0.375, 0.46), V2(0.3, 0.62), V2(0.2, 0.78), V2(0.1, 0.91), V2(0.03, 0.985), V2(0, 1)];
  const pts = smoothProfile(ctrl, 150);
  const SEG = 240;
  const geo = new THREE.LatheGeometry(pts, SEG);
  // radius of the profile at a height (for seed spacing per row)
  const radiusAt = (y) => {
    let best = pts[0];
    for (const p of pts) if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p;
    return best.x;
  };
  const ROWS = 10;
  const Y0 = 0.07;
  const Y1 = 0.93;
  const rowH = (Y1 - Y0) / ROWS;
  const rowCols = [];
  for (let k = 0; k <= ROWS + 1; k++) rowCols[k] = Math.max(4, Math.round((TAU * radiusAt(Y0 + k * rowH)) / 0.2));
  const RAD = 0.034;
  const DEPTH = 0.017;
  const shade = new Float32Array(geo.attributes.position.count).fill(1);
  displace(geo, (th, y, r, i) => {
    if (y < Y0 - RAD || y > Y1 + RAD || r < 0.05) return r;
    const v = (y - Y0) / rowH;
    let best = 9;
    for (const k of [Math.floor(v), Math.floor(v) + 1]) {
      if (k < 0 || k > ROWS) continue;
      const cols = rowCols[k];
      const a = (th / TAU) * cols + (k % 2 ? 0.5 : 0);
      const dx = (a - Math.round(a)) * ((TAU * r) / cols);
      const dy = (v - k) * rowH;
      best = Math.min(best, Math.hypot(dx, dy * 1.15));
    }
    if (best >= RAD) return r;
    const k = 1 - best / RAD;
    const d = k * k * (3 - 2 * k);
    shade[i] = 1 - 0.32 * d;
    return r - DEPTH * d;
  });
  paint(geo, (c, x, y, z, i) => c.setScalar(shade[i]));
  geo.scale(0.93, 1, 0.93); // a touch slimmer, like the moulded candles
  berryGeo = latheFinish(geo, SEG, pts.length);
  return berryGeo;
}
let berryMat = null;
function coneStrawberry(height = 1) {
  berryMat = berryMat || wax(COL.berry, { vertexColors: true, roughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color(0xff8a9c), envMapIntensity: 0.7 });
  const m = new THREE.Mesh(berryGeometry(), berryMat);
  m.scale.setScalar(height);
  return m;
}

/* ---------- Wick + flame anchor ---------- */

function wickAndFlameAnchor(group, y, flameScale = 1, len = 0.16, x = 0) {
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, len, 10), new THREE.MeshStandardMaterial({ color: COL.wick, roughness: 0.85 }));
  wick.position.set(x, y + len / 2 - 0.02, 0);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.9 }));
  tip.position.set(x, y + len - 0.02, 0);
  group.add(wick, tip);
  const anchor = new THREE.Object3D();
  anchor.position.set(x, y + len - 0.01, 0);
  group.add(anchor);
  return { anchor, flameScale };
}

/* ---------- Strawberry whipped coupe ---------- */

const RIBS = 46;
const ribbed = (y, r, from, to) => {
  // rounded vertical flutes
  return (th) => {
    if (y < from || y > to) return r;
    const k = smooth(from, from + 0.06, y) * (1 - smooth(to - 0.03, to, y));
    const rib = Math.pow(Math.abs(Math.cos((RIBS * th) / 2)), 0.4);
    return r * (1 + 0.02 * k * (rib - 0.6));
  };
};

function strawberryCoupe() {
  const g = new THREE.Group();
  const RIM = 1.86;
  const SEG = 368;
  // ribbed coupe glass: domed foot, slim stem, short wide bowl
  const outer = smoothProfile([
    V2(0, 0), V2(0.52, 0), V2(0.545, 0.015), V2(0.53, 0.035), V2(0.42, 0.055), V2(0.27, 0.085), V2(0.15, 0.13),
    V2(0.09, 0.19), V2(0.068, 0.27), V2(0.06, 0.4), V2(0.058, 0.6), V2(0.06, 0.78), V2(0.068, 0.88), V2(0.09, 0.94),
    V2(0.2, 0.975), V2(0.45, 0.995), V2(0.64, 1.025), V2(0.75, 1.07), V2(0.795, 1.14), V2(0.81, 1.28), V2(0.825, 1.5),
    V2(0.84, 1.72), V2(0.845, 1.85), V2(0.84, RIM)
  ], 150);
  const glassGeo = new THREE.LatheGeometry(outer, SEG);
  displace(glassGeo, (th, y, r) => ribbed(y, r, 1.0, 1.83)(th));
  g.add(new THREE.Mesh(latheFinish(glassGeo, SEG, outer.length), glass()));
  // white wax inside the bowl, ribbed too so the flutes read through the glass
  const inner = smoothProfile([V2(0, 1.01), V2(0.42, 1.02), V2(0.62, 1.045), V2(0.73, 1.09), V2(0.775, 1.16), V2(0.79, 1.3), V2(0.805, 1.52), V2(0.815, 1.72), V2(0.82, 1.82), V2(0, 1.83)], 80);
  const fillGeo = new THREE.LatheGeometry(inner, SEG);
  displace(fillGeo, (th, y, r) => ribbed(y, r, 1.05, 1.82)(th));
  g.add(new THREE.Mesh(latheFinish(fillGeo, SEG, inner.length), wax(COL.cream, { roughness: 0.6 })));
  // piped cream rosette spilling just over the rim
  const cream = new THREE.Mesh(pipedCream({ R: 0.96, h: 0.72, power: 0.55, coils: 1.6, coil: 0.12, grooves: 26, twist: 1.2, ridge: 0.05, lip: 0.14, peak: 0.08 }), wax(COL.cream, { roughness: 0.62, clearcoat: 0.1 }));
  cream.position.y = RIM - 0.07;
  g.add(cream);
  // two cone strawberries standing tip-up, leaning outwards like ears
  const left = coneStrawberry(0.62);
  left.position.set(-0.46, RIM + 0.12, 0.14);
  left.rotation.set(0.1, 0.4, 0.42);
  const right = coneStrawberry(0.6);
  right.position.set(0.45, RIM + 0.1, 0.2);
  right.rotation.set(0.12, -0.5, -0.4);
  g.add(left, right);
  const f = wickAndFlameAnchor(g, RIM - 0.07 + 0.72 + 0.06, 1, 0.14);
  return { group: g, height: RIM + 0.95, ...f };
}

/* ---------- Bubble jars ---------- */

const JAR_H = 1.6;
// rows of round lobes: [from, to, lobes, amplitude, phase]
// rows of round bubbles: [centre height (0–1), half height, bubbles around, size, phase]
const JAR_ROWS = [
  [0.13, 0.17, 7, 0.19, 0],
  [0.38, 0.16, 7, 0.16, 0.5],
  [0.61, 0.14, 7, 0.12, 0.08]
];
function bubbleRadius(th, y) {
  const h = y / JAR_H;
  let bump = 0;
  for (const [yc, hh, n, amp, ph] of JAR_ROWS) {
    const dy = (h - yc) / hh;
    if (Math.abs(dy) > 1.2) continue;
    const a = (th / TAU) * n - ph;
    const dt = (a - Math.round(a)) * 2; // -1..1 across one bubble
    const d2 = dt * dt * 0.9 + dy * dy;
    bump = Math.max(bump, amp * Math.sqrt(Math.max(0, 1 - d2 * 0.62)));
  }
  const body = 0.5 + bump;
  const neck = 0.555;
  let r = body + (neck - body) * smooth(0.68, 0.78, h);
  if (h < 0.04) r *= 0.8 + 0.2 * Math.sin((h / 0.04) * Math.PI * 0.5); // rounded base
  return r;
}
let jarGeo = null;
function bubbleJarGeometry() {
  if (jarGeo) return jarGeo;
  const SEG = 210;
  const prof = [V2(0, 0)];
  for (let i = 0; i <= 140; i++) prof.push(V2(1, (i / 140) * JAR_H));
  const geo = new THREE.LatheGeometry(prof, SEG);
  displace(geo, (th, y) => bubbleRadius(th, y));
  jarGeo = latheFinish(geo, SEG, prof.length);
  return jarGeo;
}

// layers: [[from, colour], ...] by height (0–1), with optional drips into the layer below
function layeredWax(layers, drips) {
  const geo = bubbleJarGeometry().clone();
  const stops = layers.map(([h, c]) => [h, new THREE.Color(c)]);
  paint(geo, (c, x, y, z) => {
    const th = Math.atan2(z, x);
    let h = y / JAR_H;
    if (drips) h += drips(th, h);
    let k = 0;
    while (k < stops.length - 1 && stops[k + 1][0] <= h) k++;
    const next = stops[Math.min(k + 1, stops.length - 1)];
    // short soft blend at each boundary
    const blend = next === stops[k] ? 0 : smooth(next[0] - 0.025, next[0] + 0.015, h);
    c.copy(stops[k][1]).lerp(next[1], blend);
    // a little mottling so the wax doesn't look flat
    c.multiplyScalar(0.96 + 0.04 * Math.sin(th * 13 + y * 31) * Math.sin(th * 7 - y * 17));
  });
  return geo;
}

function bubbleJarShell(g, waxGeo) {
  g.add(new THREE.Mesh(waxGeo, wax(0xffffff, { vertexColors: true, roughness: 0.36, clearcoat: 0.4, sheen: 0, envMapIntensity: 0.6 })));
  const shell = new THREE.Mesh(bubbleJarGeometry(), glass({ opacity: 0.08, envMapIntensity: 1.5 }));
  shell.scale.set(1.025, 1.03, 1.025);
  g.add(shell);
  // glass rim standing just above the wax
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.572, 0.012, 8, 96), glass({ opacity: 0.35 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = JAR_H * 1.03;
  g.add(rim);
}

function mangoMatchaJar() {
  const g = new THREE.Group();
  const drips = (th, h) => {
    // matcha running down into the yellow
    if (h < 0.34 || h > 0.54) return 0;
    const d = 0.1 * Math.pow(Math.max(0, Math.sin(5 * th + 0.7)), 7) + 0.06 * Math.pow(Math.max(0, Math.sin(9 * th + 2.1)), 9);
    return d * smooth(0.34, 0.44, h);
  };
  bubbleJarShell(g, layeredWax([[0, COL.mango], [0.22, COL.mango], [0.3, COL.yellow], [0.5, COL.matchaDark], [0.74, COL.matchaPale]], drips));
  // pale matcha whipped top
  const top = new THREE.Mesh(pipedCream({ R: 0.6, h: 0.26, power: 0.4, coils: 1.4, coil: 0.05, grooves: 16, twist: 1, ridge: 0.05, lip: 0.08, peak: 0.02 }), wax(COL.matchaPale, { roughness: 0.62 }));
  top.position.y = JAR_H - 0.04;
  g.add(top);
  // mango cubes
  const mango = wax(COL.mango, { roughness: 0.32, clearcoat: 0.6 });
  [[0.16, 0.06, 0.4, 0.1], [-0.17, 0.1, 1.9, -0.1], [0.0, -0.18, -0.9, 0.15]].forEach(([x, z, ry, rz]) => {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.13, 2, 2, 2), mango);
    cube.position.set(x, JAR_H + 0.2, z);
    cube.rotation.set(0.15, ry, rz);
    g.add(cube);
  });
  const f = wickAndFlameAnchor(g, JAR_H + 0.26, 0.9, 0.16);
  return { group: g, height: JAR_H + 0.5, ...f };
}

function strawberryMatchaJar() {
  const g = new THREE.Group();
  bubbleJarShell(g, layeredWax([[0, COL.pink], [0.24, COL.pink], [0.32, COL.vanilla], [0.47, COL.matcha], [0.76, COL.lime]]));
  // flat lime whipped top
  const top = new THREE.Mesh(pipedCream({ R: 0.6, h: 0.12, power: 0.25, coils: 1.2, coil: 0.03, grooves: 14, twist: 0.6, ridge: 0.03, lip: 0.05, peak: 0 }), wax(COL.lime, { roughness: 0.6 }));
  top.position.y = JAR_H - 0.03;
  g.add(top);
  // freeze-dried strawberry crumbs
  const crumbs = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.03, 0), wax(COL.crumb, { roughness: 0.7 }), 46);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let i = 0; i < 46; i++) {
    const a = i * 2.39996;
    const rr = 0.12 + 0.38 * Math.sqrt((i + 0.5) / 46);
    e.set(i, i * 1.7, i * 0.3);
    q.setFromEuler(e);
    const s = 0.7 + ((i * 37) % 10) / 14;
    m.compose(new THREE.Vector3(Math.cos(a) * rr, JAR_H + 0.08 + 0.02 * Math.sin(i), Math.sin(a) * rr), q, new THREE.Vector3(s, s * 0.6, s));
    crumbs.setMatrixAt(i, m);
  }
  g.add(crumbs);
  const berry = coneStrawberry(0.4);
  berry.position.set(-0.1, JAR_H + 0.05, 0.05);
  berry.rotation.set(0.05, 0.3, 0.08);
  g.add(berry);
  const f = wickAndFlameAnchor(g, JAR_H + 0.1, 0.85, 0.2, 0.12); // wick beside the berry
  return { group: g, height: JAR_H + 0.45, ...f };
}

/* ---------- Strawberry candle ---------- */

function strawberryCandle(size = 1.2) {
  const g = new THREE.Group();
  g.add(coneStrawberry(size));
  const f = wickAndFlameAnchor(g, size * 0.98, 0.8, 0.14);
  return { group: g, height: size * 1.12, ...f };
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

// Soft, neutral-warm studio so white wax stays white and glass catches clean highlights
function studioEnvironment(renderer) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#fffdf9');
  sky.addColorStop(0.45, '#f4ebe4');
  sky.addColorStop(0.7, '#cdb9ae');
  sky.addColorStop(1, '#6e5953');
  g.fillStyle = sky;
  g.fillRect(0, 0, 1024, 512);
  g.fillStyle = 'rgba(255,255,255,1)';
  g.fillRect(110, 70, 240, 130);
  g.fillRect(630, 100, 150, 80);
  g.fillRect(440, 30, 40, 200);
  g.fillStyle = 'rgba(255,226,190,0.85)';
  g.fillRect(860, 210, 120, 100);
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

  requestAnimationFrame(() => root.classList.add('is-in'));
  if (explore) {
    explore.addEventListener('click', (e) => {
      const target = document.getElementById(explore.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      if (window.noonScroll) window.noonScroll.scrollTo(target);
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: reduceMotion ? 'auto' : 'smooth' });
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
  renderer.toneMappingExposure = 1.08;
  const ctx2d = front.getContext('2d');

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  scene.add(new THREE.HemisphereLight(0xfffaf2, 0xb89a90, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9b8, 0.9);
  rim.position.set(4, -1, -3);
  scene.add(rim);

  const flameTex = flameTexture();
  const haloTex = haloTexture();
  const rig = new THREE.Group();
  scene.add(rig);

  // pos = centre of the object; tilt = lean on screen; spin = turns per second (radians);
  // m = the portrait (phone) placement, in world units
  const items = [
    { make: strawberryCoupe, scale: 1.0, pos: [0.2, 0.36, 0], m: { scale: 0.66, pos: [0, 0.56, 0] }, tilt: -0.16, lean: 0.2, spin: 0.3, delay: 0 },
    { make: mangoMatchaJar, scale: 0.8, pos: [2.75, -1.42, -1.2], m: { scale: 0.5, pos: [0.74, -0.85, -0.5] }, tilt: 0.3, lean: 0.06, spin: -0.24, delay: 0.25 },
    { make: () => strawberryCandle(1.15), scale: 1, pos: [-3.05, -1.4, -0.6], m: { scale: 0.58, pos: [-0.78, -0.95, 0.3] }, tilt: -0.26, lean: 0.25, spin: 0.36, delay: 0.4 },
    { make: strawberryMatchaJar, scale: 0.42, pos: [2.45, 1.3, 0.9], m: { scale: 0.36, pos: [0.82, 1.55, 0.6] }, tilt: 0.42, lean: 0.12, spin: -0.4, delay: 0.55 }
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
  let dpr = 1;
  let cut = 0;
  function resize() {
    W = root.clientWidth;
    H = root.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
    // only the part above the cut is ever visible on the front canvas
    const ch = Math.min(front.height, Math.max(1, Math.round(cut * dpr)));
    ctx2d.clearRect(0, 0, front.width, ch);
    ctx2d.drawImage(back, 0, 0, front.width, ch, 0, 0, front.width, ch);
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

// for the model checker page
export { strawberryCoupe, mangoMatchaJar, strawberryMatchaJar, strawberryCandle, studioEnvironment, flameTexture, haloTexture };
