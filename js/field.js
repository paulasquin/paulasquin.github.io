// One particle field shared by the whole page. Every section names a shape
// (data-shape); the particles fly from the current shape to the next one.
// Each particle carries a "kind" (integer part of w) and a parameter (fraction
// of w) that the vertex shader animates: plume streaming, waves, network
// forward pass, breathing, orbits.
import * as THREE from 'three';

const K = { STILL: 0, PLUME: 1, WAVE: 2, EDGE: 3, NODE: 4, BREATH: 5, ORBIT: 6, WING: 7, SCAN: 8, FILM: 9, AUDIO: 10, PATCH: 11, IRIS: 12 };

/* ---------------- shapes ---------------- */

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

class Shape {
  constructor(n) {
    this.n = n;
    this.pos = new Float32Array(n * 4);
    this.col = new Float32Array(n * 3);
    this.i = 0;
  }
  push(x, y, z, kind, param, c) {
    if (this.i >= this.n) return;
    const i = this.i++;
    this.pos.set([x, y, z, kind + Math.min(param, 0.999)], i * 4);
    this.col.set([c.r, c.g, c.b], i * 3);
  }
  get full() { return this.i >= this.n; }
}

const C = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const lerpC = (a, b, t) => a.clone().lerp(b, t);

function orb(n) {
  const s = new Shape(n), r = rng(1);
  const cyan = C('#6fd6ff'), violet = C('#8b7bff'), warm = C('#ffb37a');
  const nSphere = Math.floor(n * 0.62);
  for (let i = 0; i < nSphere; i++) {
    const y = 1 - (2 * (i + 0.5)) / nSphere, rad = Math.sqrt(1 - y * y), a = i * 2.399963;
    const R = 1.45 + (r() - 0.5) * 0.05;
    s.push(Math.cos(a) * rad * R, y * R, Math.sin(a) * rad * R, K.STILL, 0, lerpC(violet, cyan, (y + 1) / 2).multiplyScalar(0.55 + r() * 0.45));
  }
  while (!s.full) {
    const a = r() * Math.PI * 2, R = 2.05 + Math.pow(r(), 1.6) * 1.05;
    const c = lerpC(warm, cyan, (R - 2.05) / 1.05).multiplyScalar(0.35 + r() * 0.6);
    s.push(Math.cos(a) * R, (r() - 0.5) * 0.04, Math.sin(a) * R, K.ORBIT, r(), c);
  }
  return s;
}

function galaxy(n) {
  const s = new Shape(n), r = rng(2);
  const core = C('#ffd2a6'), mid = C('#8b7bff'), rim = C('#6fd6ff');
  while (!s.full) {
    const arm = Math.floor(r() * 3), t = Math.pow(r(), 0.7), R = 0.15 + t * 3.1;
    const a = arm * (Math.PI * 2 / 3) + R * 1.35 + (r() - 0.5) * (0.5 + t * 0.4);
    const spread = (r() - 0.5) * 0.25 * (1 - t * 0.5);
    const c = (t < 0.4 ? lerpC(core, mid, t / 0.4) : lerpC(mid, rim, (t - 0.4) / 0.6)).multiplyScalar(0.5 + r() * 0.9);
    s.push(Math.cos(a) * R + spread, (r() - 0.5) * 0.14 * (1.2 - t), Math.sin(a) * R + spread, K.ORBIT, r(), c);
  }
  return s;
}

function net(n) {
  const s = new Shape(n), r = rng(3);
  const layers = [5, 8, 10, 8, 4], nodes = [];
  layers.forEach((count, li) => {
    const x = -2.1 + (4.2 * li) / (layers.length - 1);
    for (let j = 0; j < count; j++) {
      const y = (j - (count - 1) / 2) * 0.36;
      nodes.push({ li, x, y, z: -Math.cos(y * 0.8) * 0.35 + 0.35 });
    }
  });
  const nodeC = C('#efeaff'), a = C('#a78bff'), b = C('#4fe0c0');
  const perNode = Math.floor((n * 0.16) / nodes.length);
  for (const nd of nodes) {
    for (let k = 0; k < perNode; k++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, rad = 0.075 * Math.cbrt(r()), q = Math.sqrt(1 - u * u);
      s.push(nd.x + q * Math.cos(th) * rad, nd.y + u * rad, nd.z + q * Math.sin(th) * rad, K.NODE, r(), nodeC.clone().multiplyScalar(0.6 + r() * 0.4));
    }
  }
  const edges = [];
  for (const p of nodes) for (const q of nodes) if (q.li === p.li + 1) edges.push([p, q]);
  while (!s.full) {
    const [p, q] = edges[Math.floor(r() * edges.length)], t = r();
    const c = lerpC(a, b, (p.x + t * (q.x - p.x) + 2.1) / 4.2).multiplyScalar(0.3 + r() * 0.4);
    s.push(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t, p.z + (q.z - p.z) * t, K.EDGE, t, c);
  }
  return s;
}

function ion(n) {
  const s = new Shape(n), r = rng(4);
  const body = C('#9fb4dc'), grid = C('#ffb37a'), p0 = C('#bff0ff'), p1 = C('#8b7bff');
  const x0 = 1.0, len = 1.35, R = 0.58; // grid at x0, plume towards -x: the whole piece is centred
  const nBody = Math.floor(n * 0.3), nGrid = Math.floor(n * 0.14);
  for (let i = 0; i < nBody; i++) {
    const a = r() * Math.PI * 2, u = r();
    if (u < 0.82) {
      s.push(x0 + u / 0.82 * len, Math.cos(a) * R, Math.sin(a) * R, K.STILL, 0, body.clone().multiplyScalar(0.4 + r() * 0.4));
    } else {
      const rr = Math.sqrt(r()) * R;
      s.push(x0 + len, Math.cos(a) * rr, Math.sin(a) * rr, K.STILL, 0, body.clone().multiplyScalar(0.3 + r() * 0.3));
    }
  }
  for (let i = 0; i < nGrid; i++) {
    const g = i % 2, y = (r() * 2 - 1) * R, z = (r() * 2 - 1) * R;
    if (y * y + z * z > R * R) { i--; continue; }
    const cell = 0.12, on = Math.abs((((y / cell) % 1) + 1) % 1 - 0.5) > 0.36 || Math.abs((((z / cell) % 1) + 1) % 1 - 0.5) > 0.36;
    if (!on && y * y + z * z < (R - 0.04) ** 2) { i--; continue; }
    s.push(x0 - g * 0.09, y, z, K.STILL, 0, grid.clone().multiplyScalar(g ? 0.5 + r() * 0.3 : 0.75 + r() * 0.25));
  }
  while (!s.full) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * (R - 0.14);
    s.push(x0 - 0.12, Math.cos(a) * rr, Math.sin(a) * rr, K.PLUME, r(), lerpC(p0, p1, r()).multiplyScalar(0.5 + r() * 0.5));
  }
  return s;
}

function wave(n) {
  const s = new Shape(n), r = rng(5);
  const deep = C('#3b3f8f'), glint = C('#ffd2a6'), cell = C('#2a3c78'), edge = C('#ffb37a'), sun = C('#fff1dc');
  const nWing = Math.floor(n * 0.26), nSun = Math.floor(n * 0.06);
  // Flying wing: span 2.6, swept leading edge, winglets — proportions of the 2017 drawing.
  const half = 1.3, root = 0.82, tip = 0.42, sweep = 0.78, wy = 0.45;
  const tilt = new THREE.Euler(0.7, -0.22, 0.1), v = new THREE.Vector3();
  const pushWing = (x, y, z, c) => {
    v.set(x, y - wy, z).applyEuler(tilt);
    s.push(v.x, v.y + wy, v.z, K.WING, 0, c);
  };
  for (let i = 0; i < nWing; i++) {
    const u = r();
    if (u < 0.9) {
      const sx = (r() * 2 - 1) * half, f = Math.abs(sx) / half, chord = root + (tip - root) * f;
      const le = sweep * f, c = r(), z = le + c * chord - root / 2;
      const thick = 0.06 * (1 - f * 0.5) * Math.sin(Math.PI * Math.min(1, c * 1.15));
      const isEdge = c < 0.05 || c > 0.96 || f > 0.97;
      pushWing(sx, wy + thick * (r() < 0.6 ? 1 : -0.3), z, isEdge ? edge.clone().multiplyScalar(0.8) : lerpC(cell, deep, r()).multiplyScalar(1.1 + r() * 0.6));
    } else {
      const side = r() < 0.5 ? -1 : 1, h = r() * 0.28, c = r() * tip * (1 - h * 1.2);
      pushWing(side * half, wy + h, sweep + c - root / 2 + h * 0.25, edge.clone().multiplyScalar(0.5 + r() * 0.4));
    }
  }
  for (let i = 0; i < nSun; i++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 0.42;
    s.push(Math.cos(a) * rr * 1.1 - 0.6, 1.25 + Math.sin(a) * rr, -3.2, K.STILL, 0, sun.clone().multiplyScalar(0.5 + r() * 0.5));
  }
  while (!s.full) {
    const x = (r() * 2 - 1) * 3.2, z = -3.2 + r() * 4.4;
    const g = Math.exp(-((x + 0.6) ** 2) * 1.6) * (0.3 + 0.7 * (1 - (z + 3.2) / 4.4));
    s.push(x, -0.85, z, K.WAVE, r(), lerpC(deep, glint, Math.min(1, g * 1.4)).multiplyScalar(0.3 + r() * 0.45 + g * 0.5));
  }
  return s;
}

function lung(n) {
  const s = new Shape(n), r = rng(6);
  const airway = C('#f4e9ff'), low = C('#4fe0c0'), high = C('#ff7a8a');
  // Lobes: narrow at the apex, wide at the base, domed by the diaphragm, cut on the heart side.
  const lobe = (side) => ({ c: new THREE.Vector3(side * 0.84, -0.3, 0), rx: side < 0 ? 0.66 : 0.72, ry: 1.25, rz: 0.55 });
  const shell = (p, side) => {
    const L = lobe(side), y = (p.y - L.c.y) / L.ry, w = 0.55 + 0.45 * (1 - y) / 2;
    const x = (p.x - L.c.x) / (L.rx * w), z = (p.z - L.c.z) / L.rz, xm = x * side;
    if (xm < (side < 0 && y < 0.1 ? -0.3 : -0.6)) return 2;
    if (y < -0.98 + 0.32 * (1 - x * x)) return 2;
    return x * x + y * y + z * z;
  };
  const inside = (p, side) => shell(p, side) < 1;
  const inLobe = (side) => {
    const L = lobe(side);
    for (;;) {
      const p = new THREE.Vector3((r() * 2 - 1) * L.rx + L.c.x, (r() * 2 - 1) * L.ry + L.c.y, (r() * 2 - 1) * L.rz + L.c.z);
      if (inside(p, side)) return p;
    }
  };
  // Bronchial tree: each branch heads for a random point of its lobe.
  const segs = [];
  const grow = (p, d, len, depth, side) => {
    const q = p.clone().addScaledVector(d, len);
    segs.push([p, q, depth]);
    if (depth === 0) return;
    for (let k = 0; k < 2; k++) {
      const nd = inLobe(side).sub(q).normalize().lerp(d, 0.35).normalize();
      grow(q, nd, len * 0.72, depth - 1, side);
    }
  };
  const carina = new THREE.Vector3(0, 0.62, 0);
  segs.push([new THREE.Vector3(0, 1.55, 0), carina, 7]);
  for (const side of [-1, 1]) grow(carina, new THREE.Vector3(side * 0.8, -0.45, 0).normalize(), 0.5, 6, side);
  const ventil = (p) => Math.min(1, Math.max(0, 0.5 - p.y * 0.32 - p.z * 0.35 + (r() - 0.5) * 0.2));
  const nAir = Math.floor(n * 0.24), nSurf = Math.floor(n * 0.3);
  for (let i = 0; i < nAir; i++) {
    const [a, b, depth] = segs[Math.floor(r() * segs.length)], t = r();
    const w = 0.01 + depth * 0.008, j = () => (r() - 0.5) * w;
    s.push(a.x + (b.x - a.x) * t + j(), a.y + (b.y - a.y) * t + j(), a.z + (b.z - a.z) * t + j(), K.BREATH, r(), airway.clone().multiplyScalar(0.35 + depth * 0.07 + r() * 0.25));
  }
  for (let i = 0; i < nSurf; i++) {
    const side = r() < 0.5 ? -1 : 1, p = inLobe(side);
    if (shell(p, side) < 0.86) { i--; continue; }
    s.push(p.x, p.y, p.z, K.BREATH, r(), lerpC(low, high, ventil(p)).multiplyScalar(0.3 + r() * 0.3));
  }
  while (!s.full) {
    // Alveoli: the volume, coloured like an EIT ventilation map.
    const p = inLobe(r() < 0.5 ? -1 : 1);
    s.push(p.x, p.y, p.z, K.BREATH, r(), lerpC(low, high, ventil(p)).multiplyScalar(0.3 + r() * 0.55));
  }
  return s;
}


// Meero: a lens seen from the front, its iris twisting open and shut.
function lens(n) {
  const s = new Shape(n), r = rng(7);
  const steel = C('#9fb4dc'), blade = C('#8c93c8'), edge = C('#ffd2a6'), glint = C('#6fd6ff'), warm = C('#ffb37a');
  const R = 1.45, iris = 0.42, blades = 7;
  const nBarrel = Math.floor(n * 0.24), nBlades = Math.floor(n * 0.5);
  for (let i = 0; i < nBarrel; i++) {
    const a = r() * Math.PI * 2, u = r();
    if (u < 0.35) s.push(Math.cos(a) * R, Math.sin(a) * R, -r() * 0.7, K.STILL, 0, steel.clone().multiplyScalar(0.25 + r() * 0.3));
    else if (u < 0.75) {
      const rr = [R, R - 0.06, 1.3][Math.floor(r() * 3)];
      s.push(Math.cos(a) * rr, Math.sin(a) * rr, 0, K.STILL, 0, steel.clone().multiplyScalar(0.5 + r() * 0.4));
    } else {
      const k = Math.round(a / (Math.PI * 2) * 90) / 90 * Math.PI * 2, rr = 1.32 + r() * 0.08; // knurled focus ring
      s.push(Math.cos(k) * rr, Math.sin(k) * rr, 0.02, K.STILL, 0, edge.clone().multiplyScalar(0.3 + r() * 0.3));
    }
  }
  // Blades: each edge is a straight line tangent to the opening, the shading follows it.
  const sector = (Math.PI * 2) / blades, edgeAngle = (rr) => Math.atan2(Math.sqrt(Math.max(0, rr * rr - iris * iris)), iris);
  for (let i = 0; i < nBlades; i++) {
    if (r() < 0.28) {
      const k = Math.floor(r() * blades), a = k * sector, t = r() * Math.sqrt(1.25 ** 2 - iris ** 2);
      const x = iris * Math.cos(a) - t * Math.sin(a), y = iris * Math.sin(a) + t * Math.cos(a);
      s.push(x, y, -0.14, K.IRIS, r(), edge.clone().multiplyScalar(0.8 + r() * 0.5));
      continue;
    }
    const rr = iris + Math.sqrt(r()) * (1.25 - iris), a = r() * Math.PI * 2;
    const f = ((((a - edgeAngle(rr)) / sector) % 1) + 1) % 1;
    s.push(Math.cos(a) * rr, Math.sin(a) * rr, -0.15 - f * 0.04, K.IRIS, r(), blade.clone().multiplyScalar(0.1 + f * f * 0.5 + r() * 0.08));
  }
  while (!s.full) {
    const rr = Math.sqrt(r()) * iris, a = r() * Math.PI * 2, x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    const g = Math.exp(-((x + 0.12) ** 2 + (y - 0.14) ** 2) * 30);
    s.push(x, y, -0.3, K.IRIS, r(), lerpC(glint, warm, (y + iris) / (2 * iris)).multiplyScalar(0.15 + r() * 0.2 + g * 1.2));
  }
  return s;
}

// Baracoda: a patch of skin cells, a lesion glowing under UV, a scanning ring.
function skin(n) {
  const s = new Shape(n), r = rng(8);
  const tissue = C('#ffb8a6'), uv = C('#a78bff'), lesion = C('#ff4fd8'), core = C('#3b1d6e');
  const R = 1.75, cell = 0.21, seeds = [];
  for (let gx = -10; gx <= 10; gx++) for (let gy = -10; gy <= 10; gy++) seeds.push([(gx + (r() - 0.5) * 0.8) * cell, (gy + (r() - 0.5) * 0.8) * cell]);
  const bulge = (x, y) => 0.35 * (1 - (x * x + y * y) / (R * R));
  const lesionR = (a) => 0.38 * (1 + 0.22 * Math.sin(3 * a) + 0.12 * Math.sin(5 * a + 1));
  const nLesion = Math.floor(n * 0.16), nRing = Math.floor(n * 0.08);
  for (let i = 0; i < nLesion; i++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * lesionR(a), x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    s.push(x, y, bulge(x, y) + 0.02, K.STILL, 0, lerpC(lesion, core, rr / lesionR(a)).multiplyScalar(0.6 + r() * 0.6));
  }
  for (let i = 0; i < nRing; i++) {
    const a = r() * Math.PI * 2, rr = 1 + (r() - 0.5) * 0.04;
    s.push(Math.cos(a) * rr, Math.sin(a) * rr, 0.3, K.SCAN, 0, uv.clone().multiplyScalar(0.6 + r() * 0.5));
  }
  while (!s.full) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * R, x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    let d1 = 9, d2 = 9;
    for (const [sx, sy] of seeds) {
      const d = Math.hypot(x - sx, y - sy);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const wall = d2 - d1 < 0.022;
    if (!wall && r() > 0.14) continue;
    const fade = 1 - (rr / R) ** 3;
    s.push(x, y, bulge(x, y), K.STILL, 0, tissue.clone().multiplyScalar((wall ? 0.4 : 0.14) * fade + r() * 0.08));
  }
  return s;
}

// AIVE: a film strip sliding along a curved screen, its soundtrack below.
const FILM_R = 3.2, FILM_SPAN = 0.95;
function film(n) {
  const s = new Shape(n), r = rng(9);
  const strip = C('#2b2f55'), hole = C('#efeaff'), wave0 = C('#ff7a8a'), wave1 = C('#ffb37a');
  const palettes = [['#ffb37a', '#3b3f8f'], ['#6fd6ff', '#1f3b5a'], ['#ff7a8a', '#2a1f4f'], ['#4fe0c0', '#1a3a3a'], ['#ffd2a6', '#5a3b2f'], ['#a78bff', '#1d1d4a']].map(([a, b]) => [C(a), C(b)]);
  const frames = 8, nWave = Math.floor(n * 0.16);
  const place = (sArc, y) => {
    const phi = sArc * FILM_SPAN;
    return [Math.sin(phi) * FILM_R, y, (Math.cos(phi) - 1) * FILM_R + 0.6];
  };
  for (let i = 0; i < nWave; i++) {
    const bars = 64, b = Math.floor(r() * bars), x = -2.4 + (4.8 * (b + 0.5)) / bars;
    const h = 0.08 + 0.32 * Math.abs(Math.sin(b * 0.37) * Math.sin(b * 0.11 + 1)) + r() * 0.02, v = r() * 2 - 1;
    s.push(x, -1.15 + v * h, 0.4, K.AUDIO, b / bars, lerpC(wave0, wave1, b / bars).multiplyScalar(0.5 + r() * 0.5));
  }
  while (!s.full) {
    const u = r(), sArc = r() * 2 - 1, prm = (sArc + 1) / 2;
    let y, c;
    if (u < 0.3) {          // perforations and edges
      y = (r() < 0.5 ? -1 : 1) * (0.56 + (r() < 0.5 ? 0 : 0.08));
      const holeOn = ((prm * frames * 4) % 1) < 0.45 && Math.abs(Math.abs(y) - 0.56) < 0.01;
      c = holeOn ? hole.clone().multiplyScalar(0.5 + r() * 0.3) : strip.clone().multiplyScalar(0.8 + r() * 0.5);
    } else {                // the frames, each a small shot
      y = (r() * 2 - 1) * 0.45;
      const f = Math.floor(prm * frames), fx = (prm * frames) % 1;
      if (fx < 0.05 || fx > 0.95) continue;
      const [top, bottom] = palettes[f % palettes.length];
      const sub = Math.exp(-(((fx - 0.5) * 2.2) ** 2 + ((y + 0.05) * 3.5) ** 2) * 1.5);
      c = lerpC(bottom, top, (y + 0.45) / 0.9).multiplyScalar(0.35 + r() * 0.25 + sub * 0.6);
    }
    const [x, yy, z] = place(sArc, y);
    s.push(x, yy, z, K.FILM, prm, c);
  }
  return s;
}

// Acolad: documents in several languages, linked by translation arcs.
function docs(n) {
  const s = new Shape(n), r = rng(10);
  const paper = C('#cfd6ff'), inks = [C('#6fd6ff'), C('#a78bff'), C('#4fe0c0')], arcA = C('#6fd6ff'), arcB = C('#a78bff');
  const W = 1.15, H = 1.55;
  const pages = [-1, 0, 1].map((k) => ({ x: k * 1.45, z: -Math.abs(k) * 0.35, ry: -k * 0.32, y: k === 0 ? 0.08 : -0.04 }));
  const put = (pg, u, v, kind, prm, c) => {
    const cx = Math.cos(pg.ry), sx = Math.sin(pg.ry);
    s.push(pg.x + u * cx, pg.y + v, pg.z - u * sx, kind, prm, c);
  };
  const nArc = Math.floor(n * 0.16), nEdge = Math.floor(n * 0.14);
  const lines = pages.map(() => Array.from({ length: 13 }, (_, i) => ({ v: H / 2 - 0.2 - i * 0.105, len: i === 0 ? 0.55 : 0.55 + r() * 0.4 })));
  for (let i = 0; i < nEdge; i++) {
    const pg = pages[i % 3], t = r() * 2 * (W + H), p = t < W ? [t - W / 2, H / 2] : t < W + H ? [W / 2, H / 2 - (t - W)] : t < 2 * W + H ? [W / 2 - (t - W - H), -H / 2] : [-W / 2, -H / 2 + (t - 2 * W - H)];
    put(pg, p[0], p[1], K.STILL, 0, paper.clone().multiplyScalar(0.25 + r() * 0.2));
  }
  for (let i = 0; i < nArc; i++) {
    const a = Math.floor(r() * 3), b = (a + 1 + Math.floor(r() * 2)) % 3, t = r();
    const pa = pages[Math.min(a, b)], pb = pages[Math.max(a, b)];
    const p0 = new THREE.Vector3(pa.x, pa.y + H / 2 + 0.05, pa.z), p1 = new THREE.Vector3(pb.x, pb.y + H / 2 + 0.05, pb.z);
    const mid = p0.clone().lerp(p1, 0.5).add(new THREE.Vector3(0, 0.55 + Math.abs(pb.x - pa.x) * 0.25, 0.2));
    const q = p0.clone().multiplyScalar((1 - t) ** 2).addScaledVector(mid, 2 * t * (1 - t)).addScaledVector(p1, t * t);
    s.push(q.x, q.y, q.z, K.EDGE, t, lerpC(arcA, arcB, t).multiplyScalar(0.3 + r() * 0.35));
  }
  while (!s.full) {
    const k = Math.floor(r() * 3), ln = lines[k][Math.floor(r() * 13)], u = -W / 2 + 0.12 + r() * (W - 0.24) * ln.len;
    const word = ((u + 2) * 9.3 + ln.v * 7) % 1 < 0.86;
    if (!word) continue;
    put(pages[k], u, ln.v + (r() - 0.5) * 0.025, K.STILL, 0, inks[k].clone().multiplyScalar(0.4 + r() * 0.45));
  }
  return s;
}

// Ocus: a photo cut into the patches a vision transformer reads.
function patches(n) {
  const s = new Shape(n), r = rng(11);
  const skyTop = C('#2a2f6e'), skyLow = C('#ffb37a'), sun = C('#fff1dc'), hill = C('#1f5f5a'), hillLit = C('#4fe0c0');
  const cols = 6, rows = 4, P = 0.5, gap = 0.07;
  while (!s.full) {
    const cx = Math.floor(r() * cols), cy = Math.floor(r() * rows);
    const u = (cx + r()) / cols, v = (cy + r()) / rows;
    const lx = (u * cols) % 1, ly = (v * rows) % 1;
    const x = (cx - cols / 2) * (P + gap) + lx * P + gap / 2, y = (cy - rows / 2) * (P + gap) + ly * P + gap / 2;
    const ground = 0.34 + 0.07 * Math.sin(u * 7.0) + 0.04 * Math.sin(u * 17 + 1);
    let c;
    if (v < ground) c = lerpC(hill, hillLit, Math.max(0, 1 - (ground - v) * 6) * (0.4 + u * 0.6));
    else {
      const d = Math.hypot((u - 0.66) * 1.5, v - 0.52);
      c = d < 0.08 ? sun.clone() : lerpC(skyLow, skyTop, Math.min(1, (v - ground) * 1.9)).multiplyScalar(1 + Math.max(0, 0.25 - d) * 3);
    }
    const id = (cy * cols + cx) / (cols * rows);
    s.push(x, y, 0, K.PATCH, id, c.multiplyScalar(0.7 + r() * 0.45));
  }
  return s;
}

// Guardia: a pool watched by a camera; the adult and the child it tells apart.
function pool(n) {
  const s = new Shape(n), r = rng(12);
  const water = C('#2f7fd0'), glint = C('#bff0ff'), coping = C('#e9ecff'), cone = C('#a78bff'), adult = C('#4fe0c0'), child = C('#ff9a5a');
  const L = 1.5, Wd = 0.8, deck = -0.42;
  const nEdge = Math.floor(n * 0.12), nCone = Math.floor(n * 0.12), nPeople = Math.floor(n * 0.14);
  for (let i = 0; i < nEdge; i++) {
    const t = r() * 4 * (L + Wd), p = t < 2 * L ? [t - L, -Wd] : t < 2 * L + 2 * Wd ? [L, t - 2 * L - Wd] : t < 4 * L + 2 * Wd ? [L - (t - 2 * L - 2 * Wd), Wd] : [-L, Wd - (t - 4 * L - 2 * Wd)];
    const down = r() < 0.35 ? r() * 0.45 : 0;
    s.push(p[0], deck - down, p[1], K.STILL, 0, coping.clone().multiplyScalar(down ? 0.12 : 0.35 + r() * 0.25));
  }
  const cam = new THREE.Vector3(1.95, 0.95, -1.2), aim = new THREE.Vector3(0, deck, 0);
  for (let i = 0; i < nCone; i++) {
    const t = Math.pow(r(), 0.7), spread = new THREE.Vector3((r() - 0.5) * 3.6, 0, (r() - 0.5) * 2.2).multiplyScalar(t);
    const p = cam.clone().lerp(aim, t).add(spread);
    s.push(p.x, p.y, p.z, K.STILL, 0, cone.clone().multiplyScalar(t < 0.05 ? 1 : 0.08 + r() * 0.1));
  }
  const figure = (x, z, h, c, count) => {
    const head = new THREE.Vector3(x, deck + h * 0.9, z), neck = new THREE.Vector3(x, deck + h * 0.8, z), hip = new THREE.Vector3(x, deck + h * 0.47, z);
    const bones = [[neck, hip], [hip, new THREE.Vector3(x - h * 0.1, deck, z)], [hip, new THREE.Vector3(x + h * 0.1, deck, z)],
      [neck, new THREE.Vector3(x - h * 0.2, deck + h * 0.5, z)], [neck, new THREE.Vector3(x + h * 0.2, deck + h * 0.5, z)]];
    for (let i = 0; i < count; i++) {
      if (r() < 0.25) {
        const a = r() * Math.PI * 2, b = r() * Math.PI, rr = h * 0.09;
        s.push(head.x + Math.sin(b) * Math.cos(a) * rr, head.y + Math.cos(b) * rr, head.z + Math.sin(b) * Math.sin(a) * rr, K.STILL, 0, c.clone().multiplyScalar(0.7 + r() * 0.3));
      } else {
        const [a, b] = bones[Math.floor(r() * bones.length)], t = r();
        s.push(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t, K.STILL, 0, c.clone().multiplyScalar(0.6 + r() * 0.4));
      }
    }
    for (let i = 0; i < count * 0.3; i++) {
      const a = r() * Math.PI * 2, rr = h * 0.45;
      s.push(x + Math.cos(a) * rr, deck, z + Math.sin(a) * rr, K.STILL, 0, c.clone().multiplyScalar(0.35));
    }
  };
  figure(-1.15, -1.25, 1.05, adult, Math.floor(nPeople * 0.5));
  figure(0.85, -1.08, 0.58, child, Math.floor(nPeople * 0.4));
  while (!s.full) {
    const x = (r() * 2 - 1) * (L - 0.03), z = (r() * 2 - 1) * (Wd - 0.03);
    s.push(x, deck - 0.06, z, K.WAVE, r(), lerpC(water, glint, Math.pow(r(), 6)).multiplyScalar(0.3 + r() * 0.35));
  }
  return s;
}


// Bivwak!: an agent at the core, its tools on a ring, documents orbiting, all inside a cage.
function agent(n) {
  const s = new Shape(n), r = rng(13);
  const core = C('#e9fbff'), spoke = C('#4fe0c0'), paper = C('#cfd6ff'), cage = C('#4fe0c0');
  const toolC = ['#6fd6ff', '#a78bff', '#ffb37a', '#4fe0c0', '#ff7a8a', '#ffd2a6'].map((h) => C(h));
  const tools = toolC.map((_, k) => { const a = (k / 6) * Math.PI * 2 + 0.3; return new THREE.Vector3(Math.cos(a) * 1.35, Math.sin(k * 1.7) * 0.18, Math.sin(a) * 1.35); });
  const nCore = Math.floor(n * 0.1), nTools = Math.floor(n * 0.15), nSpokes = Math.floor(n * 0.15), nDocs = Math.floor(n * 0.14);
  const ball = (c, rad) => { const u = r() * 2 - 1, th = r() * Math.PI * 2, q = Math.sqrt(1 - u * u), d = rad * Math.cbrt(r()); return [c.x + q * Math.cos(th) * d, c.y + u * d, c.z + q * Math.sin(th) * d]; };
  for (let i = 0; i < nCore; i++) { const [x, y, z] = ball(new THREE.Vector3(), 0.32); s.push(x, y, z, K.NODE, r(), core.clone().multiplyScalar(0.5 + r() * 0.5)); }
  for (let i = 0; i < nTools; i++) {
    const k = Math.floor(r() * 6), t = tools[k], h = 0.11;
    s.push(t.x + (r() * 2 - 1) * h, t.y + (r() * 2 - 1) * h, t.z + (r() * 2 - 1) * h, K.NODE, r(), toolC[k].clone().multiplyScalar(0.6 + r() * 0.4));
  }
  for (let i = 0; i < nSpokes; i++) {
    const t = tools[Math.floor(r() * 6)], u = 0.2 + r() * 0.8;
    s.push(t.x * u, t.y * u, t.z * u, K.EDGE, u, spoke.clone().multiplyScalar(0.25 + r() * 0.3));
  }
  for (let i = 0; i < nDocs; i++) {
    const k = Math.floor(r() * 9), a = (k / 9) * Math.PI * 2, R = 2.15, w = 0.16, hgt = 0.22;
    const u = (r() - 0.5) * w, v = (r() - 0.5) * hgt, onEdge = Math.abs(u) > w * 0.42 || Math.abs(v) > hgt * 0.44 || Math.abs((v / hgt * 8) % 1) < 0.15;
    if (!onEdge) { i--; continue; }
    s.push(Math.cos(a) * R - Math.sin(a) * u, v + Math.sin(k * 2.3) * 0.25, Math.sin(a) * R + Math.cos(a) * u, K.ORBIT, 0, paper.clone().multiplyScalar(0.35 + r() * 0.3));
  }
  while (!s.full) {
    // Cage: meridians and parallels of a sphere.
    const u = r() * 2 - 1, th = r() * Math.PI * 2, lat = Math.asin(u), R = 1.95;
    const onMer = Math.abs(((th / (Math.PI / 6)) % 1) - 0.5) > 0.47, onPar = Math.abs(((lat / (Math.PI / 8) + 8) % 1) - 0.5) > 0.47;
    if (!onMer && !onPar) continue;
    const q = Math.sqrt(1 - u * u);
    s.push(Math.cos(th) * q * R, u * R, Math.sin(th) * q * R, K.STILL, 0, cage.clone().multiplyScalar(0.12 + r() * 0.12));
  }
  return s;
}

// Siflo: a winding canyon, the group's phones along the river, the message hopping from one to the next.
function canyon(n) {
  const s = new Shape(n), r = rng(14);
  const rock = C('#ff6a00'), rockDark = C('#7a2a10'), water = C('#2f7fd0'), glint = C('#bff0ff'), phone = C('#fff1e0'), link = C('#ffb37a');
  const X = 2.3, floor = -0.55, bend = (x) => Math.sin(x * 1.3 + 0.4) * 0.38;
  const nWalls = Math.floor(n * 0.4), nPhones = Math.floor(n * 0.1), nLinks = Math.floor(n * 0.14);
  for (let i = 0; i < nWalls; i++) {
    // Rock strata: lines along each wall, stepping outwards as they rise.
    const x = (r() * 2 - 1) * X, side = r() < 0.5 ? -1 : 1, layer = r() < 0.8;
    const v = layer ? (Math.floor(r() * 6) + 0.5 + Math.sin(x * 2.3 + side) * 0.25) / 6 : r();
    const z = bend(x) + side * (0.42 + v * 0.4 + Math.sin(x * 5 + v * 9 + side) * 0.04);
    const c = lerpC(rockDark, rock, 0.3 + v * 0.7).multiplyScalar((layer ? 0.55 : 0.2) + r() * 0.3);
    s.push(x, floor + v * 1.2, z, K.STILL, 0, c);
  }
  const phones = [-1.9, -1.05, -0.2, 0.75, 1.75].map((x, k) => new THREE.Vector3(x, floor + 0.12 + (k % 2) * 0.05, bend(x) + (k % 2 ? 0.12 : -0.1)));
  for (let i = 0; i < nPhones; i++) {
    const p = phones[Math.floor(r() * phones.length)], w = 0.05, h = 0.09;
    s.push(p.x + (r() * 2 - 1) * w, p.y + (r() * 2 - 1) * h, p.z + (r() * 2 - 1) * 0.015, K.NODE, r(), phone.clone().multiplyScalar(0.55 + r() * 0.45));
  }
  for (let i = 0; i < nLinks; i++) {
    const k = Math.floor(r() * (phones.length - 1)), a = phones[k], b = phones[k + 1], t = r();
    const p = a.clone().lerp(b, t);
    s.push(p.x, p.y + Math.sin(t * Math.PI) * 0.32, p.z, K.EDGE, t, link.clone().multiplyScalar(0.3 + r() * 0.35));
  }
  while (!s.full) {
    const x = (r() * 2 - 1) * X, z = bend(x) + (r() * 2 - 1) * 0.3;
    s.push(x, floor, z, K.WAVE, r(), lerpC(water, glint, Math.pow(r(), 6)).multiplyScalar(0.25 + r() * 0.3));
  }
  return s;
}

const BUILDERS = { orb, galaxy, net, ion, wave, lung, lens, skin, film, docs, patches, pool, agent, canyon };

// How each shape is presented: tilt, and an optional slow sway.
const VIEW = {
  orb: { rx: 0.32, ry: 0, rz: -0.38, scale: 1 },
  galaxy: { rx: 1.05, ry: 0, rz: 0.22, scale: 1 },
  net: { rx: 0.05, ry: -0.42, rz: 0, scale: 0.8, sway: 0.18 },
  ion: { rx: 0.22, ry: 0.62, rz: 0.05, scale: 1.05, sway: 0.2 },
  wave: { rx: 0.36, ry: -0.1, rz: 0, scale: 0.82 },
  lung: { rx: 0.08, ry: 0, rz: 0, scale: 1, sway: 0.4 },
  lens: { rx: 0.2, ry: -0.45, rz: 0, scale: 1, sway: 0.25 },
  skin: { rx: -0.35, ry: 0.35, rz: 0, scale: 1 },
  film: { rx: 0.14, ry: 0, rz: 0, scale: 0.72 },
  docs: { rx: 0.08, ry: -0.2, rz: 0, scale: 0.85, sway: 0.15 },
  patches: { rx: -0.12, ry: 0.4, rz: 0.03, scale: 0.95, sway: 0.2 },
  pool: { rx: 0.5, ry: -0.35, rz: 0, scale: 0.95, sway: 0.2 },
  agent: { rx: 0.32, ry: 0, rz: 0.1, scale: 0.9, sway: 0.4 },
  canyon: { rx: 0.42, ry: -0.3, rz: 0, scale: 0.95, sway: 0.2 },
};

/* ---------------- shaders ---------------- */

const vert = /* glsl */ `
  #define FILM_R ${FILM_R.toFixed(2)}
  #define FILM_SPAN ${FILM_SPAN.toFixed(2)}
  attribute vec4 aFrom;
  attribute vec4 aTo;
  attribute vec3 cFrom;
  attribute vec3 cTo;
  attribute vec4 aRand;
  uniform float uTime, uMix, uSize, uPixel, uWave;
  uniform vec2 uPointer;
  uniform float uAspect;
  varying vec3 vColor;
  varying float vAlpha;

  vec3 animate(vec4 p, out float boost) {
    float kind = floor(p.w), prm = fract(p.w);
    vec3 q = p.xyz;
    boost = 1.0;
    if (kind == 1.0) {            // ion plume: stream away from the grid, widen, fade
      float t = fract(prm + uTime * 0.32);
      q.x -= t * 3.3;
      q.yz *= 1.0 + t * 0.7;
      q.yz += (aRand.yz - 0.5) * t * 0.3;
      boost = (1.0 - t) * (1.0 - t) * 1.6 + 0.05;
    } else if (kind == 2.0) {     // lake surface
      q.y += sin(q.x * 2.1 + uTime * 0.9) * 0.05 + sin(q.z * 3.3 - uTime * 1.3 + q.x) * 0.035;
      boost = 0.75 + 0.5 * sin(q.x * 6.0 + q.z * 4.0 - uTime * 2.0 + prm * 6.28) * 0.5;
    } else if (kind == 3.0 || kind == 4.0) { // network: a forward pass sweeps left to right
      float X = mod(uTime * 1.1, 6.5) - 3.0;
      float w = exp(-pow((q.x - X) * 3.2, 2.0));
      boost = (kind == 4.0 ? 1.0 : 0.85) + w * (kind == 4.0 ? 1.8 : 3.2);
    } else if (kind == 5.0) {     // breathing lungs
      float b = 0.5 + 0.5 * sin(uTime * 1.15);
      q.xz *= 1.0 + 0.055 * b;
      q.y = (q.y + 0.2) * (1.0 + 0.07 * b) - 0.2;
      boost = 0.85 + 0.35 * b;
    } else if (kind == 6.0) {     // orbit around y, inner faster
      float R = length(q.xz);
      float a = uTime * (0.32 / max(R, 0.5)) * 0.6;
      float c = cos(a), s = sin(a);
      q.xz = mat2(c, -s, s, c) * q.xz;
    } else if (kind == 7.0) {     // wing: gentle bob and roll
      float roll = sin(uTime * 0.7) * 0.06;
      q.y += sin(uTime * 0.9) * 0.05 + q.x * roll;
    } else if (kind == 8.0) {     // UV scan: a ring widening from the lesion
      float t = fract(uTime * 0.28);
      q.xy *= 0.25 + t * 1.25;
      boost = (1.0 - t) * 1.8;
    } else if (kind == 9.0) {     // film strip sliding along its curved screen
      float s = fract(prm + uTime * 0.025) * 2.0 - 1.0, phi = s * FILM_SPAN;
      q.x = sin(phi) * FILM_R;
      q.z = (cos(phi) - 1.0) * FILM_R + 0.6;
      boost = smoothstep(1.0, 0.8, abs(s));
    } else if (kind == 10.0) {    // soundtrack bars
      float amp = 0.3 + 0.7 * abs(sin(uTime * 2.6 + prm * 23.0) * sin(uTime * 1.3 + prm * 7.0));
      q.y = -1.15 + (q.y + 1.15) * amp;
    } else if (kind == 11.0) {    // patches float in and out of the image
      q.z += sin(uTime * 1.1 + prm * 6.2832 * 3.0) * 0.12;
    } else if (kind == 12.0) {    // iris: inner rings twist further
      float a = sin(uTime * 0.6) * 0.3 * (1.3 - length(q.xy));
      float c = cos(a), s = sin(a);
      q.xy = mat2(c, -s, s, c) * q.xy;
    }
    return q;
  }

  void main() {
    float m = clamp(uMix * 1.5 - aRand.x * 0.5, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);
    float bA, bB;
    vec3 a = animate(aFrom, bA);
    vec3 b = animate(aTo, bB);
    vec3 p = mix(a, b, m);
    float swirl = sin(3.14159 * m);
    p += (aRand.yzw - 0.5) * 1.6 * swirl;
    p += vec3(sin(uTime * 0.6 + aRand.y * 40.0), cos(uTime * 0.5 + aRand.z * 40.0), sin(uTime * 0.4 + aRand.w * 40.0)) * 0.012;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w;
    vec2 d = (ndc - uPointer) * vec2(uAspect, 1.0);
    float f = smoothstep(0.32, 0.0, length(d));
    mv.xy += normalize(d + 1e-5) * f * 0.35 * vec2(1.0, 1.0);

    gl_Position = projectionMatrix * mv;
    float size = uSize * (0.55 + aRand.y * 0.9) * (1.0 + swirl * 0.6);
    gl_PointSize = size * uPixel / -mv.z;
    vColor = mix(cFrom, cTo, m);
    vAlpha = mix(bA, bB, m) * (1.0 + f * 1.2);
  }
`;

const frag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a + smoothstep(0.12, 0.0, d) * 0.6;
    vec3 c = vColor * a * vAlpha;
    gl_FragColor = vec4(c, max(c.r, max(c.g, c.b))); // premultiplied: light added over the page
  }
`;

/* ---------------- field ---------------- */

export class Field {
  constructor(canvas, { count, reduced }) {
    this.reduced = reduced;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    this.dpr = Math.min(devicePixelRatio || 1, 1.75);
    this.renderer.setPixelRatio(this.dpr);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.camera.position.set(0, 0, 7.2);

    this.n = count;
    this.shapes = {};
    for (const [k, fn] of Object.entries(BUILDERS)) this.shapes[k] = fn(count);

    const g = new THREE.BufferGeometry();
    const rand = new Float32Array(count * 4), r = rng(99);
    for (let i = 0; i < rand.length; i++) rand[i] = r();
    const start = this.shapes.orb;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aFrom', new THREE.BufferAttribute(start.pos.slice(), 4));
    g.setAttribute('aTo', new THREE.BufferAttribute(start.pos.slice(), 4));
    g.setAttribute('cFrom', new THREE.BufferAttribute(start.col.slice(), 3));
    g.setAttribute('cTo', new THREE.BufferAttribute(start.col.slice(), 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    this.geo = g;
    this.rand = rand;

    this.uniforms = {
      uTime: { value: 0 }, uMix: { value: 1 }, uSize: { value: count > 12000 ? 20 : 24 },
      uPixel: { value: this.dpr }, uPointer: { value: new THREE.Vector2(9, 9) }, uAspect: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, uniforms: this.uniforms,
      transparent: true, depthWrite: false, blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
    });
    this.points = new THREE.Points(g, mat);
    this.pivot = new THREE.Group();
    this.holder = new THREE.Group();
    this.pivot.add(this.points);
    this.holder.add(this.pivot);
    this.scene.add(this.holder);

    this.current = 'orb';
    this.side = 0;
    this.pointer = new THREE.Vector2(9, 9);
    this.look = new THREE.Vector2();
    this.scrollSpin = 0;
    this.visible = true;
    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', (e) => {
      this.pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    }, { passive: true });
    document.addEventListener('pointerleave', () => this.pointer.set(9, 9));
    this.applyView(true);
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    if (this.lastW === w && Math.abs((this.lastH || 0) - h) < 150) return; // mobile URL bar
    this.lastW = w; this.lastH = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 52 : 40;
    this.camera.updateProjectionMatrix();
    this.uniforms.uAspect.value = w / h;
    this.applyView(true);
  }

  /** Visible half-size of the z = 0 plane. */
  frame() {
    const hh = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.position.z;
    return { hw: hh * this.camera.aspect, hh };
  }

  /** Placement for a side (-1 left, 0 centre, 1 right) — away from the text card. */
  placement(side) {
    const { hw, hh } = this.frame(), portrait = this.camera.aspect < 0.9;
    if (side === 0) return { x: 0, y: -hh * 0.62, s: portrait ? 0.75 : 1.25 }; // a horizon under centred text
    if (portrait) return { x: 0, y: hh * 0.4, s: Math.min(1, hw / 2.6) * 0.95 };
    return { x: side * hw * 0.48, y: 0, s: THREE.MathUtils.clamp(hw / 3.8, 0.6, 1.1) };
  }

  applyView(instant) {
    const v = VIEW[this.current], p = this.placement(this.side);
    const to = { x: p.x, y: p.y };
    const sc = v.scale * p.s;
    const rot = { x: v.rx, y: v.ry, z: v.rz };
    if (instant) {
      this.holder.position.set(to.x, to.y, 0);
      this.holder.scale.setScalar(sc);
      this.pivot.rotation.set(rot.x, rot.y, rot.z);
      return;
    }
    gsap.to(this.holder.position, { ...to, duration: 1.8, ease: 'power3.inOut', overwrite: true });
    gsap.to(this.holder.scale, { x: sc, y: sc, z: sc, duration: 1.8, ease: 'power3.inOut', overwrite: true });
    gsap.to(this.pivot.rotation, { ...rot, duration: 2.2, ease: 'power3.inOut', overwrite: true });
  }

  /** Fly to a shape, starting from wherever the particles are now. */
  morphTo(name, side) {
    if (!this.shapes[name]) return;
    if (name === this.current && side === this.side) return;
    this.side = side;
    if (name === this.current) { this.applyView(false); return; }
    const aF = this.geo.attributes.aFrom, aT = this.geo.attributes.aTo;
    const cF = this.geo.attributes.cFrom, cT = this.geo.attributes.cTo;
    const mix = this.uniforms.uMix.value;
    if (mix >= 1) {
      aF.array.set(aT.array);
      cF.array.set(cT.array);
    } else {
      for (let i = 0; i < this.n; i++) {
        let m = Math.min(1, Math.max(0, mix * 1.5 - this.rand[i * 4] * 0.5));
        m = m * m * (3 - 2 * m);
        for (let k = 0; k < 3; k++) {
          aF.array[i * 4 + k] += (aT.array[i * 4 + k] - aF.array[i * 4 + k]) * m;
          cF.array[i * 3 + k] += (cT.array[i * 3 + k] - cF.array[i * 3 + k]) * m;
        }
        if (m >= 0.5) aF.array[i * 4 + 3] = aT.array[i * 4 + 3];
      }
    }
    aT.array.set(this.shapes[name].pos);
    cT.array.set(this.shapes[name].col);
    aF.needsUpdate = aT.needsUpdate = cF.needsUpdate = cT.needsUpdate = true;
    this.current = name;
    this.uniforms.uMix.value = 0;
    gsap.to(this.uniforms.uMix, { value: 1, duration: this.reduced ? 0.01 : 2.4, ease: 'power2.inOut', overwrite: true });
    this.applyView(false);
  }

  update(t, scrollVel) {
    this.uniforms.uTime.value = this.reduced ? 0 : t;
    this.uniforms.uPointer.value.lerp(this.pointer, 0.12);
    this.look.lerp(this.pointer.x > 5 ? new THREE.Vector2() : this.pointer, 0.04);
    const v = VIEW[this.current];
    this.scrollSpin += (THREE.MathUtils.clamp(scrollVel * 0.0006, -0.06, 0.06) - this.scrollSpin) * 0.08;
    this.holder.rotation.y += this.scrollSpin;
    this.holder.rotation.y *= 0.985;
    if (v.sway && !this.reduced) this.pivot.rotation.y = v.ry + Math.sin(t * 0.25) * v.sway;
    this.camera.position.x = this.look.x * 0.35;
    this.camera.position.y = this.look.y * 0.22;
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
