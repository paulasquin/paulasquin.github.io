// One particle field shared by the whole page. Every section names a shape
// (data-shape); the particles fly from the current shape to the next one.
// Each particle carries a "kind" (integer part of w) and a parameter (fraction
// of w) that the vertex shader animates: plume streaming, waves, network
// forward pass, breathing, orbits.
import * as THREE from 'three';

const K = { STILL: 0, PLUME: 1, WAVE: 2, EDGE: 3, NODE: 4, BREATH: 5, ORBIT: 6, WING: 7 };

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

const BUILDERS = { orb, galaxy, net, ion, wave, lung };

// How each shape is presented: tilt, and an optional slow sway.
const VIEW = {
  orb: { rx: 0.32, ry: 0, rz: -0.38, scale: 1 },
  galaxy: { rx: 1.05, ry: 0, rz: 0.22, scale: 1 },
  net: { rx: 0.05, ry: -0.42, rz: 0, scale: 0.8, sway: 0.18 },
  ion: { rx: 0.22, ry: 0.62, rz: 0.05, scale: 1.05, sway: 0.2 },
  wave: { rx: 0.36, ry: -0.1, rz: 0, scale: 0.82 },
  lung: { rx: 0.08, ry: 0, rz: 0, scale: 1, sway: 0.4 },
};

/* ---------------- shaders ---------------- */

const vert = /* glsl */ `
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
