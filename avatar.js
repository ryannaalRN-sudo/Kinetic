// Kinetic — moteur d'avatar 3D (Three.js + données MakeHuman CC0)
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

const ASSETS = new URL('../assets/', import.meta.url).href;
const TYPES = { f32: Float32Array, u16: Uint16Array, u32: Uint32Array, i16: Int16Array, u8: Uint8Array };
const view = (buf, d) => new TYPES[d.t](buf, d.o, d.n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DEG = Math.PI / 180;

export const SKIN_TONES = [
  { name: 'Très claire', tex: 'light', tint: '#ffffff', sw: '#f0cfb4' },
  { name: 'Claire', tex: 'light', tint: '#f1ddcc', sw: '#e3b994' },
  { name: 'Clair doré', tex: 'mid', tint: '#ffffff', sw: '#d9a77c' },
  { name: 'Mate', tex: 'mid', tint: '#e2c2a4', sw: '#c18d63' },
  { name: 'Olive', tex: 'mid', tint: '#c9a17e', sw: '#a3744d' },
  { name: 'Brune', tex: 'dark', tint: '#ffffff', sw: '#8a5a3b' },
  { name: 'Foncée', tex: 'dark', tint: '#cfb5a2', sw: '#6a432c' },
  { name: 'Très foncée', tex: 'dark', tint: '#a88d7c', sw: '#4b2f20' }
];
export const EYE_COLORS = ['brown', 'brownlight', 'green', 'bluegreen', 'blue', 'lightblue', 'deepblue', 'grey', 'ice'];

export const DEFAULT_LOOK = {
  sex: 1, height: 180, weight: 78, muscle: 0.62,
  d: { shoulders: 0.15, chest: 0.1, back: 0.1, arms: 0.1, forearms: 0, belly: 0, waist: 0, hips: 0, glutes: 0, thighs: 0, calves: 0, neck: 0, bust: 0, legs: 0 },
  skin: 3, eyes: 'brown', brows: 'brow02', hair: 'h-short02', hairColor: '#24180f', beard: 0,
  top: 'g-tee', topColor: '#c8ff2e', bottom: 'c-shorts', bottomColor: '#1b1d22',
  shoes: 's-shoes05', socks: true, watch: false
};

let cache = null;
const b64buf = (b64) => { const b = atob(b64), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; };
let bundleP = null;
const proxyBundle = () => (bundleP = bundleP || fetchJSON(ASSETS + 'proxies.json'));
async function fetchBin(url) {
  // données binaires livrées en base64 dans un JSON (format servi partout)
  const r = await fetch(url.replace(/\.bin$/, '.data.json')); if (!r.ok) throw new Error(url);
  const b = atob((await r.json()).b64), u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u.buffer;
}
async function fetchJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(url); return r.json(); }

export async function loadCore() {
  if (cache) return cache;
  const [meta, buf, catalog] = await Promise.all([fetchJSON(ASSETS + 'body.json'), fetchBin(ASSETS + 'body.bin'), fetchJSON(ASSETS + 'catalog.json')]);
  const core = { meta, catalog, proxies: {}, tex: {} };
  core.base = view(buf, meta.base);
  core.bodyMap = view(buf, meta.body.map);
  core.bodyUV = view(buf, meta.body.uv);
  core.bodyIndex = view(buf, meta.body.index);
  core.targets = {};
  for (const t of meta.targets) core.targets[t.name] = { scale: t.scale, idx: view(buf, t.idx), d: view(buf, t.d) };
  const si = view(buf, meta.skinIndex), sw = view(buf, meta.skinWeight);
  core.skinIndex = si;
  core.skinWeight = new Float32Array(sw.length);
  for (let i = 0; i < meta.nBase; i++) {
    let s = 0; for (let j = 0; j < 4; j++) s += sw[i * 4 + j];
    for (let j = 0; j < 4; j++) core.skinWeight[i * 4 + j] = s ? sw[i * 4 + j] / s : (j === 0 ? 1 : 0);
  }
  core.garments = {};
  for (const [k, g] of Object.entries(meta.garments || {})) {
    const f8 = new Int8Array(buf, g.field.o, g.field.n), field = new Float32Array(f8.length);
    for (let i = 0; i < f8.length; i++) field[i] = f8[i] / 100;
    core.garments[k] = { tris: view(buf, g.tris), hide: view(buf, g.hide), field, t: g.t };
  }
  // triangles of the body expressed with base vertex ids (for hiding under clothes)
  const bi = core.bodyIndex, bm = core.bodyMap;
  core.bodyTriBase = new Uint16Array(bi.length);
  for (let i = 0; i < bi.length; i++) core.bodyTriBase[i] = bm[bi[i]];
  // voisinage des sommets (lissage du tissu)
  const nb = Array.from({ length: meta.nBase }, () => new Set());
  const tb = core.bodyTriBase;
  for (let t = 0; t < tb.length; t += 3) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== b) nb[tb[t + a]].add(tb[t + b]);
  core.adjStart = new Uint32Array(meta.nBase + 1);
  let tot = 0; for (let i = 0; i < meta.nBase; i++) { core.adjStart[i] = tot; tot += nb[i].size; } core.adjStart[meta.nBase] = tot;
  core.adj = new Uint16Array(tot); let p = 0; for (let i = 0; i < meta.nBase; i++) for (const j of nb[i]) core.adj[p++] = j;
  // zone des tétons : lissée sous les hauts (pas de relief à travers le tissu)
  core.chest = [];
  const B0 = core.base;
  for (const side of [1, -1]) {
    let best = -1, bz = -1e9;
    for (let v = 0; v < 13380; v++) {
      const x = B0[v * 3] * side, y = B0[v * 3 + 1], z = B0[v * 3 + 2];
      if (x < 0.4 || x > 1.4 || y < 3.2 || y > 5 || z <= bz) continue;
      bz = z; best = v;
    }
    for (let v = 0; v < 13380; v++) {
      const d = Math.hypot(B0[v * 3] - B0[best * 3], B0[v * 3 + 1] - B0[best * 3 + 1], B0[v * 3 + 2] - B0[best * 3 + 2]);
      if (d < 0.42) core.chest.push(v);
    }
  }
  cache = core;
  return core;
}

async function loadProxy(core, key) {
  if (core.proxies[key]) return core.proxies[key];
  const p = (async () => {
    const entry = (await proxyBundle())[key];
    if (!entry) throw new Error('Élément introuvable : ' + key);
    const m = entry.meta, buf = b64buf(entry.b64);
    const px = { meta: m, refs: view(buf, m.refs), w: view(buf, m.w), off: view(buf, m.off), map: view(buf, m.map), uv: view(buf, m.uv), index: view(buf, m.index) };
    // skin weights from reference vertices
    const n = m.n, si = new Uint16Array(m.nVerts * 4), swt = new Float32Array(m.nVerts * 4);
    const pi = new Uint16Array(n * 4), pw = new Float32Array(n * 4);
    for (let v = 0; v < n; v++) {
      const acc = new Map();
      for (let k = 0; k < 3; k++) {
        const wk = px.w[v * 3 + k]; if (wk <= 0) continue;
        const r = px.refs[v * 3 + k];
        for (let j = 0; j < 4; j++) {
          const b = core.skinIndex[r * 4 + j], ww = core.skinWeight[r * 4 + j] * wk;
          if (ww > 0) acc.set(b, (acc.get(b) || 0) + ww);
        }
      }
      const top = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const s = top.reduce((a, e) => a + e[1], 0) || 1;
      top.forEach((e, j) => { pi[v * 4 + j] = e[0]; pw[v * 4 + j] = e[1] / s; });
      if (!top.length) pw[v * 4] = 1;
    }
    for (let r = 0; r < m.nVerts; r++) { const v = px.map[r]; for (let j = 0; j < 4; j++) { si[r * 4 + j] = pi[v * 4 + j]; swt[r * 4 + j] = pw[v * 4 + j]; } }
    px.skinIndex = si; px.skinWeight = swt;
    if (m.delete && m.delete.length) {
      const del = new Uint8Array(core.meta.nBase);
      for (const [a, b] of m.delete) for (let i = a; i <= b && i < del.length; i++) del[i] = 1;
      px.del = del;
    }
    return px;
  })();
  core.proxies[key] = p;
  return p;
}

const texLoader = new THREE.TextureLoader();
function tex(core, path, srgb = true) {
  if (!core.tex[path]) {
    const t = texLoader.load(ASSETS + path);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4;
    core.tex[path] = t;
  }
  return core.tex[path];
}

// --------------------------------------------------------------- morphing
function macroWeights(look) {
  const sex = clamp(look.sex, 0, 1);
  const g = { female: 1 - sex, male: sex };
  const tri = (v) => ({ min: Math.max(0, (0.5 - v) * 2), average: 1 - Math.min(1, Math.abs(v - 0.5) * 2), max: Math.max(0, (v - 0.5) * 2) });
  const muscle = clamp(look.muscle, 0, 1);
  const bmi = look.weight / Math.pow(look.height / 100, 2);
  // BMI → masse grasse (0 mince, 0.5 moyen, 1 fort) ; un corps musclé encaisse plus de poids
  let wv = bmi < 22 ? 0.5 - (22 - bmi) / 10 : 0.5 + (bmi - 22) / 18;
  wv -= (muscle - 0.5) * 0.45;
  wv = clamp(wv, 0, 1);
  const mu = tri(muscle), we = tri(wv);
  const hn = clamp((look.height - (sex > 0.5 ? 160 : 150)) / 45, 0, 1);
  const out = {};
  for (const gn of ['female', 'male']) {
    if (g[gn] <= 0) continue;
    for (const m of ['min', 'average', 'max']) for (const w of ['min', 'average', 'max']) {
      const x = g[gn] * mu[m] * we[w];
      if (x > 1e-4) out[`u-${gn}-${m}muscle-${w}weight`] = x;
    }
    if (hn < 0.5) out[`h-${gn}-minheight`] = g[gn] * (0.5 - hn) * 2;
    else out[`h-${gn}-maxheight`] = g[gn] * (hn - 0.5) * 2;
    out[`e-${gn}`] = g[gn];
  }
  for (const [k, v] of Object.entries(look.d || {})) {
    if (v > 0) out[`d-${k}-incr`] = v; else if (v < 0) out[`d-${k}-decr`] = -v;
  }
  return out;
}

export function morph(core, look, out) {
  const V = out || new Float32Array(core.base.length);
  V.set(core.base);
  const w = macroWeights(look);
  for (const [name, x] of Object.entries(w)) {
    const t = core.targets[name]; if (!t) continue;
    const s = t.scale * x, idx = t.idx, d = t.d;
    for (let i = 0; i < idx.length; i++) {
      const o = idx[i] * 3, q = i * 3;
      V[o] += d[q] * s; V[o + 1] += d[q + 1] * s; V[o + 2] += d[q + 2] * s;
    }
  }
  return V;
}

function sharedNormals(srcPos, nSrc, tris, map) {
  // normals accumulated on source vertices so UV seams stay smooth
  const N = new Float32Array(nSrc * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < tris.length; i += 3) {
    const i0 = map[tris[i]], i1 = map[tris[i + 1]], i2 = map[tris[i + 2]];
    a.fromArray(srcPos, i0 * 3); b.fromArray(srcPos, i1 * 3); c.fromArray(srcPos, i2 * 3);
    b.sub(a); c.sub(a); b.cross(c);
    for (const k of [i0, i1, i2]) { N[k * 3] += b.x; N[k * 3 + 1] += b.y; N[k * 3 + 2] += b.z; }
  }
  return N;
}

function gather(src, map, dst) {
  for (let r = 0; r < map.length; r++) { const s = map[r] * 3, d = r * 3; dst[d] = src[s]; dst[d + 1] = src[s + 1]; dst[d + 2] = src[s + 2]; }
}

function normalizeInPlace(N) {
  for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
}

function fitProxy(px, V, tuckAbove = null) {
  const m = px.meta, n = m.n, out = new Float32Array(n * 3);
  const sc = [1, 1, 1];
  for (let k = 0; k < 3; k++) { const s = m.scale[k]; if (s) sc[k] = Math.abs(V[s[0] * 3 + k] - V[s[1] * 3 + k]) / s[2]; }
  for (let v = 0; v < n; v++) {
    for (let k = 0; k < 3; k++) {
      out[v * 3 + k] = V[px.refs[v * 3] * 3 + k] * px.w[v * 3] + V[px.refs[v * 3 + 1] * 3 + k] * px.w[v * 3 + 1] + V[px.refs[v * 3 + 2] * 3 + k] * px.w[v * 3 + 2] + px.off[v * 3 + k] * sc[k];
    }
    if (tuckAbove !== null && out[v * 3 + 1] > tuckAbove + 0.15) {
      for (let k = 0; k < 3; k++) out[v * 3 + k] -= px.off[v * 3 + k] * sc[k] * 0.9;
    }
  }
  return out;
}

// --------------------------------------------------------------- poses
// Rotations en degrés (x, y, z) appliquées aux os (repères alignés sur le monde au repos, pose en A).
const P = (o) => o;
const POSES = {
  idle: P({
    'upperarm01.L': [4, 0, -34], 'upperarm01.R': [4, 0, 34],
    'lowerarm01.L': [-10, 0, -4], 'lowerarm01.R': [-10, 0, 4],
    'upperleg01.L': [0, 0, -5], 'upperleg01.R': [0, 0, 5],
    'lowerleg01.L': [0, 0, 1.5], 'lowerleg01.R': [0, 0, -1.5],
    'foot.L': [0, -6, 2], 'foot.R': [0, 6, -2]
  }),
  flex: P({
    'clavicle.L': [0, 0, 8], 'clavicle.R': [0, 0, -8],
    'upperarm01.L': [0, -8, 52], 'upperarm01.R': [0, 8, -52],
    'lowerarm01.L': [0, -10, 118], 'lowerarm01.R': [0, 10, -118],
    'wrist.L': [0, 0, 18], 'wrist.R': [0, 0, -18],
    'spine02': [-4, 0, 0], 'neck02': [6, 0, 0],
    'upperleg01.L': [0, 0, 1], 'upperleg01.R': [0, 0, -1],
    'foot.L': [0, -10, 0], 'foot.R': [0, 10, 0],
    fist: 1
  }),
  wave: P({
    'upperarm01.L': [4, 0, -34], 'upperarm01.R': [0, 15, -40],
    'lowerarm01.L': [-10, 0, -4], 'lowerarm01.R': [0, 0, -95],
    'upperleg01.L': [0, 0, -3.5], 'upperleg01.R': [0, 0, 3.5],
    'neck02': [0, -8, 4], 'spine03': [0, 0, -3],
    'foot.L': [0, -6, 2], 'foot.R': [0, 6, -2]
  }),
  cheer: P({
    'upperarm01.L': [0, 0, 78], 'upperarm01.R': [0, 0, -78],
    'lowerarm01.L': [0, 0, 18], 'lowerarm01.R': [0, 0, -18],
    'spine02': [-8, 0, 0], 'neck02': [-14, 0, 0],
    'upperleg01.L': [0, 0, -2], 'upperleg01.R': [0, 0, 2],
    fist: 1
  }),
  squat: P({
    'upperarm01.L': [-60, 0, -12], 'upperarm01.R': [-60, 0, 12],
    'lowerarm01.L': [-20, 0, 0], 'lowerarm01.R': [-20, 0, 0],
    'upperleg01.L': [-75, 0, -2], 'upperleg01.R': [-75, 0, 2],
    'lowerleg01.L': [95, 0, 0], 'lowerleg01.R': [95, 0, 0],
    'foot.L': [-20, -6, 0], 'foot.R': [-20, 6, 0],
    'spine04': [-14, 0, 0], 'spine02': [-6, 0, 0], 'neck02': [14, 0, 0],
    fist: 0.6, drop: 1
  })
};

const FINGERS = ['finger1', 'finger2', 'finger3', 'finger4', 'finger5'];
let FINGER_SIGN = -1, TWIST = 8;
export function _tune(fs, tw) { FINGER_SIGN = fs; TWIST = tw; }

export class Avatar {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = Object.assign({ interactive: true, autoRotate: false, background: null, onTap: null, framing: 'full' }, opts);
    this.look = JSON.parse(JSON.stringify(DEFAULT_LOOK));
    this.pose = 'idle';
    this.poseUntil = 0;
    this.yaw = opts.yaw ?? -0.18;
    this.yawVel = 0;
    this.lookTarget = new THREE.Vector2(0, 0);
    this.meshes = {};
    this.ready = false;
    this.clock = new THREE.Clock();
    this.disposed = false;
  }

  async init() {
    const core = this.core = await loadCore();
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    const scene = this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;
    this.camera = new THREE.PerspectiveCamera(24, 1, 0.5, 200);

    const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x15171b, 0.55); scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff1e2, 2.4); key.position.set(-6, 12, 14); scene.add(key);
    const fill = new THREE.DirectionalLight(0xc9d8ff, 0.55); fill.position.set(10, 4, 8); scene.add(fill);
    const rimV = new THREE.DirectionalLight(0xc8ff2e, 1.4); rimV.position.set(-12, 8, -10); scene.add(rimV);
    const rimW = new THREE.DirectionalLight(0xffffff, 1.3); rimW.position.set(12, 10, -8); scene.add(rimW);

    // sol : halo + anneau vert
    const g = new THREE.CanvasTexture(this._haloCanvas());
    g.colorSpace = THREE.SRGBColorSpace;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ map: g, transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; floor.renderOrder = -1; scene.add(floor);
    this.floor = floor;

    this.root = new THREE.Group(); scene.add(this.root);
    this.V = new Float32Array(core.base.length);

    // squelette
    this.bones = core.meta.bones.map((b) => { const bone = new THREE.Bone(); bone.name = b.name; return bone; });
    core.meta.bones.forEach((b, i) => { if (b.parent >= 0) this.bones[b.parent].add(this.bones[i]); else this.root.add(this.bones[i]); });
    this.boneByName = Object.fromEntries(this.bones.map((b) => [b.name, b]));
    this.skeleton = new THREE.Skeleton(this.bones);
    this.restPos = this.bones.map(() => new THREE.Vector3());
    this.curQ = this.bones.map(() => new THREE.Quaternion());
    this.tmpQ = new THREE.Quaternion(); this.tmpE = new THREE.Euler();
    this.fist = 0; this.drop = 0; this.jump = 0;

    // corps
    const bg = new THREE.BufferGeometry();
    const nB = core.meta.body.nVerts;
    bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nB * 3), 3));
    bg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nB * 3), 3));
    bg.setAttribute('uv', new THREE.BufferAttribute(core.bodyUV, 2));
    const si = new Uint16Array(nB * 4), sw = new Float32Array(nB * 4);
    for (let r2 = 0; r2 < nB; r2++) { const v = core.bodyMap[r2]; for (let j = 0; j < 4; j++) { si[r2 * 4 + j] = core.skinIndex[v * 4 + j]; sw[r2 * 4 + j] = core.skinWeight[v * 4 + j]; } }
    bg.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    bg.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    bg.setIndex(new THREE.BufferAttribute(new Uint16Array(core.bodyIndex), 1));
    this.skinMat = new THREE.MeshPhysicalMaterial({ roughness: 0.62, metalness: 0, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x8a3a2a), specularIntensity: 0.45 });
    const body = this.body = new THREE.SkinnedMesh(bg, this.skinMat);
    body.frustumCulled = false;
    this.root.add(body);

    if (this.opts.interactive) this._bindInput();
    this._resize();
    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this.canvas);
    await this.setLook(this.look);
    this.ready = true;
    this._loop();
    return this;
  }

  _haloCanvas() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    let gr = x.createRadialGradient(256, 256, 0, 256, 256, 256);
    gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.32, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
    gr = x.createRadialGradient(256, 256, 120, 256, 256, 256);
    gr.addColorStop(0, 'rgba(200,255,46,0)'); gr.addColorStop(0.55, 'rgba(200,255,46,0.10)'); gr.addColorStop(1, 'rgba(200,255,46,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = 'rgba(200,255,46,0.55)'; x.lineWidth = 3; x.beginPath(); x.arc(256, 256, 168, 0, Math.PI * 2); x.stroke();
    return c;
  }

  async setLook(look) {
    this.look = JSON.parse(JSON.stringify(Object.assign({}, DEFAULT_LOOK, look, { d: Object.assign({}, DEFAULT_LOOK.d, look.d || {}) })));
    const L = this.look, core = this.core;
    // tenues : les vêtements ajustés au corps
    const want = {};
    if (L.hair) want.hair = L.hair;
    want.eyes = 'eyes'; want.lashes = 'lashes';
    if (L.brows) want.brows = L.brows;
    if (L.top) want.top = L.top;
    if (L.bottom) want.bottom = L.bottom;
    if (L.socks && !L.shoes) want.socks = 'c-socks';
    if (L.shoes) want.shoes = L.shoes;
    if (L.watch) want.watch = 'c-watch';
    // jamais d'avatar dénudé : un bas est toujours porté, et un haut pour les silhouettes féminines
    if (!want.bottom) want.bottom = 'g-briefs';
    if (L.sex < 0.5 && !want.top) want.top = 'g-crop';
    const keys = Object.entries(want);
    const loaded = await Promise.all(keys.map(([, k]) => (k.startsWith('g-') ? null : loadProxy(core, k))));
    if (this.disposed) return;
    const next = {};
    keys.forEach(([slot, k], i) => { next[slot] = { key: k, px: loaded[i] }; });
    for (const [slot, m] of Object.entries(this.meshes)) {
      if (!next[slot] || next[slot].key !== m.key) { this.root.remove(m.mesh); if (!m.garment) m.mesh.geometry.dispose(); delete this.meshes[slot]; }
    }
    for (const [slot, { key, px }] of Object.entries(next)) {
      if (this.meshes[slot]) continue;
      if (key.startsWith('g-')) this.meshes[slot] = { key, garment: core.garments[key], mesh: this._makeGarmentMesh(key, slot) };
      else this.meshes[slot] = { key, px, mesh: this._makeProxyMesh(px, slot) };
    }
    this._applyMaterials();
    this._rebuildShape();
  }

  _makeProxyMesh(px, slot) {
    const g = new THREE.BufferGeometry(), n = px.meta.nVerts;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(px.uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(px.skinIndex, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(px.skinWeight, 4));
    g.setIndex(new THREE.BufferAttribute(px.index, 1));
    const mat = new THREE.MeshStandardMaterial({ roughness: px.meta.mat.rough ?? 0.8 });
    const mesh = new THREE.SkinnedMesh(g, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = { eyes: 1, brows: 3, lashes: 4, hair: 6, top: 2, bottom: 2, socks: 1, shoes: 2, watch: 3 }[slot] || 2;
    mesh.bind(this.skeleton);
    this.root.add(mesh);
    return mesh;
  }

  _makeGarmentMesh(key, slot) {
    const core = this.core, bg = this.body.geometry, g = new THREE.BufferGeometry();
    const n = core.meta.body.nVerts;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('normal', bg.attributes.normal);
    g.setAttribute('uv', bg.attributes.uv);
    g.setAttribute('skinIndex', bg.attributes.skinIndex);
    g.setAttribute('skinWeight', bg.attributes.skinWeight);
    const tri = core.garments[key].tris, idx = new Uint16Array(tri.length * 3);
    for (let i = 0; i < tri.length; i++) { const t = tri[i] * 3; idx[i * 3] = core.bodyIndex[t]; idx[i * 3 + 1] = core.bodyIndex[t + 1]; idx[i * 3 + 2] = core.bodyIndex[t + 2]; }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    const cov = new Float32Array(n), field = core.garments[key].field;
    for (let r = 0; r < n; r++) cov[r] = field[core.bodyMap[r]];
    g.setAttribute('cov', new THREE.BufferAttribute(cov, 1));
    const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.78, sheen: 0.6, sheenRoughness: 0.5, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute float cov;\nvarying float vCov;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCov = cov;');
      sh.fragmentShader = 'varying float vCov;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vCov < 0.0) discard;');
    };
    mat.customProgramCacheKey = () => 'garment';
    const mesh = new THREE.SkinnedMesh(g, mat);
    mesh.frustumCulled = false; mesh.renderOrder = slot === 'top' ? 3 : 2;
    mesh.bind(this.skeleton);
    this.root.add(mesh);
    return mesh;
  }

  _applyMaterials() {
    const L = this.look, core = this.core;
    const tone = SKIN_TONES[clamp(L.skin | 0, 0, SKIN_TONES.length - 1)];
    const sexKey = L.sex >= 0.5 ? 'm' : 'f';
    this.skinMat.map = tex(core, core.meta.skins[`${tone.tex}-${sexKey}`]);
    this.skinMat.color.set(tone.tint);
    this.skinMat.needsUpdate = true;
    for (const [slot, m] of Object.entries(this.meshes)) {
      if (m.garment) {
        const mat = m.mesh.material;
        mat.color.set(slot === 'top' ? L.topColor : L.bottomColor);
        mat.sheenColor.set(mat.color).multiplyScalar(0.6);
        mat.needsUpdate = true;
        continue;
      }
      const mm = m.px.meta.mat, mat = m.mesh.material;
      const solid = m.key.startsWith('c-') && m.key !== 'c-watch';
      mat.map = mm.map && !solid ? tex(core, mm.map) : null;
      mat.normalMap = mm.normal ? tex(core, mm.normal, false) : null;
      mat.side = mm.cull ? THREE.FrontSide : THREE.DoubleSide;
      mat.transparent = false; mat.alphaTest = 0; mat.depthWrite = true; mat.alphaToCoverage = false;
      mat.color.set('#ffffff'); mat.roughness = mm.rough ?? 0.8; mat.metalness = 0;
      if (slot === 'hair') {
        mat.color.set(L.hairColor); mat.alphaTest = 0.4; mat.alphaToCoverage = true; mat.side = THREE.DoubleSide; mat.roughness = 0.55;
      } else if (slot === 'brows') {
        mat.color.set(L.hairColor); mat.transparent = true; mat.depthWrite = false; mat.polygonOffset = true; mat.polygonOffsetFactor = -2;
      } else if (slot === 'lashes') {
        mat.color.set('#202020'); mat.transparent = true; mat.depthWrite = false; mat.side = THREE.DoubleSide;
      } else if (slot === 'eyes') {
        mat.map = tex(core, `tex/eye-${L.eyes}.webp`); mat.roughness = 0.12; mat.color.set('#d9d2cd');
      } else if (slot === 'top') {
        mat.color.set(L.topColor); mat.roughness = 0.88; mat.side = THREE.DoubleSide;
        mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -6;
      } else if (slot === 'bottom') {
        mat.color.set(L.bottomColor); mat.roughness = 0.9; mat.side = THREE.DoubleSide;
      } else if (slot === 'socks') {
        mat.color.set('#f2f3f5'); mat.roughness = 0.95;
      }
      if (!['top', 'brows'].includes(slot)) { mat.polygonOffset = false; }
      if (mm.alpha && mat.map && !['hair', 'brows', 'lashes'].includes(slot)) mat.alphaTest = 0.5;
      mat.needsUpdate = true;
    }
  }

  _rebuildShape() {
    const core = this.core, L = this.look;
    const V = morph(core, L, this.V);
    // hauteur réelle : on mesure puis on met à l'échelle en décimètres
    let minY = Infinity, maxY = -Infinity;
    const nBody = 13380;
    for (let i = 0; i < nBody; i++) { const y = V[i * 3 + 1]; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    const s = (L.height / 10) / (maxY - minY);
    for (let i = 0; i < V.length; i += 3) { V[i] *= s; V[i + 1] = (V[i + 1] - minY) * s; V[i + 2] *= s; }
    this.modelHeight = L.height / 10;

    // corps
    const bg = this.body.geometry;
    gather(V, core.bodyMap, bg.attributes.position.array);
    const Nb = sharedNormals(V, core.meta.nBase, core.bodyIndex, core.bodyMap); normalizeInPlace(Nb);
    gather(Nb, core.bodyMap, bg.attributes.normal.array);
    bg.attributes.position.needsUpdate = true; bg.attributes.normal.needsUpdate = true;
    bg.computeBoundingSphere();

    // vêtements près du corps : surface du corps décalée selon la normale
    const bp = bg.attributes.position.array, bn = bg.attributes.normal.array;
    const triHide = new Uint8Array(core.bodyIndex.length / 3);
    for (const m of Object.values(this.meshes)) {
      if (!m.garment) continue;
      const gp = m.mesh.geometry.attributes.position.array, th = m.garment.t * s, f = m.garment.field;
      const nBase = core.meta.nBase;
      let G = new Float32Array(V.subarray(0, nBase * 3)), H = new Float32Array(nBase * 3);
      // 1) lisser la surface (le tissu ne suit pas tétons, nombril, petits creux)
      for (let it = 0; it < 10; it++) {
        H.set(G);
        for (let v = 0; v < 13380; v++) {
          if (f[v] < -0.35) continue;
          const a = core.adjStart[v], b = core.adjStart[v + 1]; if (b === a) continue;
          let x = 0, y2 = 0, z = 0;
          for (let j = a; j < b; j++) { const u = core.adj[j] * 3; x += G[u]; y2 += G[u + 1]; z += G[u + 2]; }
          const c = 1 / (b - a), l = it % 2 ? -0.53 : 0.5;
          H[v * 3] = G[v * 3] + (x * c - G[v * 3]) * l; H[v * 3 + 1] = G[v * 3 + 1] + (y2 * c - G[v * 3 + 1]) * l; H[v * 3 + 2] = G[v * 3 + 2] + (z * c - G[v * 3 + 2]) * l;
        }
        [G, H] = [H, G];
      }
      // tétons : lissage local renforcé
      for (let it = 0; it < 40; it++) {
        H.set(G);
        for (const v of core.chest) {
          if (f[v] < 0.05) continue;
          const a = core.adjStart[v], b = core.adjStart[v + 1];
          let x = 0, y2 = 0, z = 0;
          for (let j = a; j < b; j++) { const u = core.adj[j] * 3; x += G[u]; y2 += G[u + 1]; z += G[u + 2]; }
          const c = 1 / (b - a);
          H[v * 3] = G[v * 3] * 0.3 + x * c * 0.7; H[v * 3 + 1] = G[v * 3 + 1] * 0.3 + y2 * c * 0.7; H[v * 3 + 2] = G[v * 3 + 2] * 0.3 + z * c * 0.7;
        }
        [G, H] = [H, G];
      }
      // jamais sous la peau : on retire la composante rentrante
      for (let v = 0; v < 13380; v++) {
        if (f[v] > 0.15) continue; // la peau couverte est masquée : seule la bordure compte
        const o = v * 3;
        const dx = G[o] - V[o], dy = G[o + 1] - V[o + 1], dz = G[o + 2] - V[o + 2];
        const dn = dx * Nb[o] + dy * Nb[o + 1] + dz * Nb[o + 2];
        if (dn < 0) { G[o] -= dn * Nb[o]; G[o + 1] -= dn * Nb[o + 1]; G[o + 2] -= dn * Nb[o + 2]; }
      }
      // 2) épaisseur le long des normales de la surface lissée
      const NG = sharedNormals(G, nBase, core.bodyIndex, core.bodyMap); normalizeInPlace(NG);
      for (let v = 0; v < nBase; v++) for (let k = 0; k < 3; k++) G[v * 3 + k] += NG[v * 3 + k] * th * 1.25;
      if (!m.normals) { m.normals = new THREE.BufferAttribute(new Float32Array(core.meta.body.nVerts * 3), 3); m.mesh.geometry.setAttribute('normal', m.normals); }
      gather(NG, core.bodyMap, m.normals.array); m.normals.needsUpdate = true;
      gather(G, core.bodyMap, gp);
      m.mesh.geometry.attributes.position.needsUpdate = true;
      m.mesh.geometry.computeBoundingSphere();
      for (const t of m.garment.hide) triHide[t] = 1;
    }
    // masquer la peau sous les vêtements
    const masks = Object.values(this.meshes).map((m) => m.px && m.px.del).filter(Boolean);
    let idx = core.bodyIndex;
    if (masks.length || triHide.some((x) => x)) {
      const tb = core.bodyTriBase, keep = [];
      for (let t = 0; t < tb.length; t += 3) {
        let hidden = triHide[t / 3] === 1;
        if (!hidden) for (const d of masks) { if (d[tb[t]] && d[tb[t + 1]] && d[tb[t + 2]]) { hidden = true; break; } }
        if (!hidden) keep.push(idx[t], idx[t + 1], idx[t + 2]);
      }
      idx = new Uint16Array(keep);
    }
    bg.setIndex(new THREE.BufferAttribute(idx, 1));

    // proxies (le haut d'abord : le bas est rentré dessous)
    let hemY = null;
    const order = Object.entries(this.meshes).filter(([, m]) => !m.garment).sort((a, b) => (a[0] === 'top' ? -1 : b[0] === 'top' ? 1 : 0));
    const topM = this.meshes.top;
    if (topM && topM.garment) { hemY = Infinity; const ga = topM.mesh.geometry.attributes.position.array, gi = topM.mesh.geometry.index.array; for (let i = 0; i < gi.length; i++) hemY = Math.min(hemY, ga[gi[i] * 3 + 1]); }
    for (const [slot, m] of order) {
      const px = m.px, g = m.mesh.geometry;
      let P = fitProxy(px, V, slot === 'bottom' && hemY !== null ? hemY : null);
      if (slot === 'top') { hemY = Infinity; for (let i = 1; i < P.length; i += 3) hemY = Math.min(hemY, P[i]); }
      gather(P, px.map, g.attributes.position.array);
      const N = sharedNormals(P, px.meta.n, px.index, px.map); normalizeInPlace(N);
      gather(N, px.map, g.attributes.normal.array);
      g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
      g.computeBoundingSphere();
    }

    // squelette au repos
    const mean = (ids, out) => { out.set(0, 0, 0); for (const i of ids) { out.x += V[i * 3]; out.y += V[i * 3 + 1]; out.z += V[i * 3 + 2]; } return out.multiplyScalar(1 / ids.length); };
    const heads = core.meta.bones.map((b) => mean(b.head, new THREE.Vector3()));
    const tails = core.meta.bones.map((b) => mean(b.tail, new THREE.Vector3()));
    this.boneAxis = {};
    const bi = (n) => core.meta.bones.findIndex((b) => b.name === n);
    for (const side of ['L', 'R']) {
      const w = heads[bi('wrist.' + side)], a = heads[bi('finger2-1.' + side)], c = heads[bi('finger5-1.' + side)];
      const palm = new THREE.Vector3().subVectors(a, w).cross(new THREE.Vector3().subVectors(c, w)).normalize();
      if (side === 'R') palm.negate();
      this.palm = this.palm || {}; this.palm[side] = palm;
      core.meta.bones.forEach((b, i) => {
        if (!b.name.startsWith('finger') || !b.name.endsWith(side)) return;
        const dir = new THREE.Vector3().subVectors(tails[i], heads[i]).normalize();
        this.boneAxis[b.name] = new THREE.Vector3().crossVectors(dir, palm).normalize();
      });
      for (const n of ['lowerarm02.', 'upperarm02.']) {
        const i = bi(n + side); this.boneAxis[n + side] = new THREE.Vector3().subVectors(tails[i], heads[i]).normalize();
      }
    }
    this.bones.forEach((bone, i) => {
      const p = core.meta.bones[i].parent;
      bone.position.copy(heads[i]); if (p >= 0) bone.position.sub(heads[p]);
      this.restPos[i].copy(bone.position);
      bone.quaternion.identity();
    });
    this.root.updateMatrixWorld(true);
    this.skeleton.calculateInverses();
    this.skeleton.pose();
    this.body.bind(this.skeleton, new THREE.Matrix4());
    for (const m of Object.values(this.meshes)) m.mesh.bind(this.skeleton, new THREE.Matrix4());
    this.headY = heads[core.meta.bones.findIndex((b) => b.name === 'head')].y;
    this._frame();
  }

  play(name, ms = 2200) {
    if (!POSES[name] && name !== 'jump') return;
    this.pose = name; this.poseUntil = performance.now() + ms;
    if (name === 'jump') { this.jumpStart = performance.now(); this.pose = 'idle'; }
  }

  _poseTargets(t) {
    const base = POSES[this.pose] || POSES.idle;
    const breathe = Math.sin(t * 1.6);
    const sway = Math.sin(t * 0.55);
    const tg = {};
    for (const [k, v] of Object.entries(base)) if (Array.isArray(v)) tg[k] = v.slice();
    const add = (k, x, y, z) => { tg[k] = tg[k] || [0, 0, 0]; tg[k][0] += x; tg[k][1] += y; tg[k][2] += z; };
    // respiration, transfert du poids, regard
    add('spine03', -0.8 * breathe, 0, 0); add('spine01', -0.8 * breathe, 0, 0);
    add('clavicle.L', 0, 0, 0.8 * breathe); add('clavicle.R', 0, 0, -0.8 * breathe);
    add('root', 0, 0, 1.2 * sway); add('spine04', 0, 0, -1.3 * sway); add('spine02', 0, 0.8 * Math.sin(t * 0.37), 0);
    if (this.pose === 'idle' || this.pose === 'squat') {
      add('upperarm01.L', 0, 0, 1.2 * Math.sin(t * 0.9 + 0.3)); add('upperarm01.R', 0, 0, -1.2 * Math.sin(t * 0.9));
    }
    if (this.pose === 'wave') add('lowerarm01.R', 0, 0, 22 * Math.sin(t * 9));
    const lx = this.lookTarget.x, ly = this.lookTarget.y;
    add('neck02', -ly * 8 + 1.5 * Math.sin(t * 0.31), lx * 18 + 6 * Math.sin(t * 0.23), 0);
    add('head', -ly * 6, lx * 12, 1.2 * Math.sin(t * 0.4));
    return { tg, fist: base.fist || 0, drop: base.drop || 0 };
  }

  _frame() {
    const now = performance.now();
    const t = now / 1000;
    if (this.pose !== 'idle' && now > this.poseUntil) this.pose = 'idle';
    const dt = Math.min(0.05, this.clock.getDelta() || 0.016);
    const k = 1 - Math.exp(-dt * 7);
    const { tg, fist, drop } = this._poseTargets(t);
    this.fist += (fist - this.fist) * k;
    this.drop += (drop - this.drop) * k;
    const curl = 9 + this.fist * 71;
    const axisAng = {};
    for (const f of FINGERS) for (const sg of ['1', '2', '3']) for (const side of ['L', 'R']) {
      const thumb = f === 'finger1';
      axisAng[`${f}-${sg}.${side}`] = (thumb ? curl * 0.45 : curl * (sg === '1' ? 0.75 : 1.05)) * FINGER_SIGN;
    }
    const twist = (tg.twist || [0, 0]);
    axisAng['lowerarm02.L'] = (POSES[this.pose]?.twist?.[0] ?? TWIST) ; axisAng['lowerarm02.R'] = -(POSES[this.pose]?.twist?.[1] ?? TWIST);
    this.bones.forEach((bone, i) => {
      const r = tg[bone.name];
      const ax = axisAng[bone.name];
      if (ax !== undefined && this.boneAxis && this.boneAxis[bone.name]) this.tmpQ.setFromAxisAngle(this.boneAxis[bone.name], ax * DEG);
      else if (r) { this.tmpE.set(r[0] * DEG, r[1] * DEG, r[2] * DEG, 'XYZ'); this.tmpQ.setFromEuler(this.tmpE); }
      else this.tmpQ.identity();
      this.curQ[i].slerp(this.tmpQ, k);
      bone.quaternion.copy(this.curQ[i]);
      bone.position.copy(this.restPos[i]);
    });
    // saut
    let jy = 0;
    if (this.jumpStart) {
      const u = (now - this.jumpStart) / 900;
      if (u >= 1) this.jumpStart = 0;
      else {
        const crouch = u < 0.25 ? Math.sin(u / 0.25 * Math.PI) : 0;
        const air = u >= 0.25 && u < 0.85 ? Math.sin((u - 0.25) / 0.6 * Math.PI) : 0;
        const land = u >= 0.85 ? Math.sin((u - 0.85) / 0.15 * Math.PI) * 0.6 : 0;
        jy = air * 0.35 * this.modelHeight - (crouch + land) * 0.04 * this.modelHeight;
        const bend = (crouch + land) * 35;
        for (const side of ['L', 'R']) {
          const s = side === 'L' ? 1 : -1;
          this.boneByName[`upperleg01.${side}`].quaternion.multiply(this.tmpQ.setFromEuler(this.tmpE.set(-bend * DEG, 0, 0)));
          this.boneByName[`lowerleg01.${side}`].quaternion.multiply(this.tmpQ.setFromEuler(this.tmpE.set(bend * 2 * DEG, 0, 0)));
          this.boneByName[`upperarm01.${side}`].quaternion.multiply(this.tmpQ.setFromEuler(this.tmpE.set(0, 0, s * air * 40 * DEG)));
        }
      }
    }
    const rootBone = this.bones[0];
    rootBone.position.y += jy - this.drop * 0.22 * this.modelHeight + Math.sin(t * 1.6) * 0.002 * this.modelHeight;
    rootBone.position.x += Math.sin(t * 0.55) * 0.006 * this.modelHeight;
    // rotation (glisser)
    if (!this.dragging) { this.yaw += this.yawVel; this.yawVel *= 0.92; if (this.opts.autoRotate) this.yaw += dt * 0.25; }
    this.root.rotation.y = this.yaw;
    this.renderer.render(this.scene, this.camera);
  }

  _loop() {
    if (this.disposed) return;
    this._raf = requestAnimationFrame(() => this._loop());
    if (this.paused || this.visible === false) return;
    this._frame();
  }

  _resize() {
    const c = this.canvas, w = c.clientWidth || 300, h = c.clientHeight || 500;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this._frameCamera();
  }

  _frameCamera() {
    const H = this.modelHeight || 18;
    const cam = this.camera;
    if (this.opts.framing === 'bust') {
      cam.fov = 18; cam.position.set(0, H * 0.82, H * 2.4); cam.lookAt(0, H * 0.8, 0);
    } else {
      const fitH = H * 1.12, fitW = H * 0.62;
      const vf = 2 * Math.tan((cam.fov * DEG) / 2);
      const dist = Math.max(fitH / vf, fitW / (vf * cam.aspect));
      cam.position.set(0, H * 0.56, dist); cam.lookAt(0, H * 0.5, 0);
    }
    cam.updateProjectionMatrix();
  }

  _bindInput() {
    const c = this.canvas;
    let sx = 0, sy = 0, lastX = 0, moved = false, id = null;
    c.style.touchAction = 'pan-y';
    c.addEventListener('pointerdown', (e) => { id = e.pointerId; sx = lastX = e.clientX; sy = e.clientY; moved = false; this.dragging = true; c.setPointerCapture(id); });
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      this.lookTarget.set(clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1), clamp(((e.clientY - r.top) / r.height - 0.3) * 2, -1, 1));
      if (e.pointerId !== id) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 6) moved = true;
      if (moved) { this.yaw += dx * 0.012; this.yawVel = dx * 0.012; }
    });
    const end = (e) => {
      if (e.pointerId !== id) return; id = null; this.dragging = false;
      if (!moved && this.opts.onTap) this.opts.onTap(this);
    };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => this.lookTarget.set(0, 0));
  }

  snapshot(w = 360, h = 640) {
    const old = this.renderer.getSize(new THREE.Vector2());
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this._frameCamera(); this._frame();
    const url = this.canvas.toDataURL('image/webp', 0.85);
    this.renderer.setSize(old.x, old.y, false); this._resize();
    return url;
  }

  dispose() {
    this.disposed = true; cancelAnimationFrame(this._raf); this._ro?.disconnect();
    this.renderer.dispose();
  }
}
