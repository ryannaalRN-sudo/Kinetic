// Kinetic — moteur d'avatar 3D (Three.js + données MakeHuman CC0)
import * as THREE from 'three';
import { RoomEnvironment } from './RoomEnvironment.js';

const ASSETS = new URL('./', import.meta.url).href;
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
export const EYE_COLORS = [
  { id: 'darkbrown', tex: 'brown', tint: '#6f625b', sw: '#3b2a20', name: 'Marron foncé' },
  { id: 'brown', tex: 'brown', tint: '#b4a79f', sw: '#6a4630', name: 'Marron' },
  { id: 'hazel', tex: 'brownlight', tint: '#c9bda9', sw: '#8a6a3c', name: 'Noisette' },
  { id: 'green', tex: 'green', tint: '#bfc5b2', sw: '#5f7a4a', name: 'Vert' },
  { id: 'greygreen', tex: 'bluegreen', tint: '#babfba', sw: '#6f8580', name: 'Gris-vert' },
  { id: 'blue', tex: 'blue', tint: '#bcc3cc', sw: '#4f6f92', name: 'Bleu' },
  { id: 'grey', tex: 'grey', tint: '#c4c4c4', sw: '#7c8288', name: 'Gris' }
];
export const BEARDS = [
  { id: 'none', name: 'Rasé' }, { id: 'stubble', name: 'Barbe de 3 jours', mask: 'full', density: 0.42, mix: 0.6 },
  { id: 'short', name: 'Barbe courte', mask: 'full', density: 0.78, mix: 0.78 }, { id: 'full', name: 'Barbe fournie', mask: 'full', density: 0.97, mix: 0.9 },
  { id: 'moustache', name: 'Moustache', mask: 'moustache', density: 0.9, mix: 0.85 }, { id: 'goatee', name: 'Bouc', mask: 'goatee', density: 0.88, mix: 0.85 }
];
const eyeOf = (id) => EYE_COLORS.find((e) => e.id === id) || EYE_COLORS.find((e) => e.tex === id) || EYE_COLORS[1];

export const DEFAULT_LOOK = {
  sex: 1, height: 180, weight: 78, muscle: 0.62,
  d: { shoulders: 0.15, chest: 0.1, back: 0.1, arms: 0.1, forearms: 0, belly: 0, waist: 0, hips: 0, glutes: 0, thighs: 0, calves: 0, neck: 0, bust: 0, legs: 0, nosew: 0, nosel: 0, nosehump: 0, nosetip: 0, mouthw: 0, lips: 0, jaw: 0, chin: 0, chinw: 0, cheeks: 0, facefat: 0, faceshape: 0 },
  skin: 3, eyes: 'brown', brows: 'brow02', hair: 'h-short02', hairColor: '#24180f', beard: 'none',
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
let MAX_ANISO = 4;
function tex(core, path, srgb = true) {
  if (!core.tex[path]) {
    const t = texLoader.load(ASSETS + path.replace(/^tex\//, ''));
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = MAX_ANISO;
    core.tex[path] = t;
  }
  return core.tex[path];
}

const imgCache = {};
const loadImg = (src) => (imgCache[src] = imgCache[src] || new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
const beardCache = {};
// barbe peinte sur la texture de peau : poils fins et irréguliers, couleur des cheveux
async function buildBeardSkin(core, skinPath, beard, color) {
  const key = `${skinPath}|${beard.id}|${color}`;
  if (beardCache[key]) return beardCache[key];
  const [skin, mask] = await Promise.all([loadImg(ASSETS + skinPath.replace(/^tex\//, '')), loadImg(ASSETS + `beard-${beard.mask}.png`)]);
  const W = skin.width, H = skin.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.drawImage(skin, 0, 0);
  const m = document.createElement('canvas'); m.width = W; m.height = H;
  const mx = m.getContext('2d'); mx.drawImage(mask, 0, 0, W, H);
  const md = mx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let j = 0; j < H; j += 4) for (let i = 0; i < W; i += 4) if (md[(j * W + i) * 4 + 3] > 0) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  if (x1 > x0) {
    x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(W - 1, x1 + 4); y1 = Math.min(H - 1, y1 + 4);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, img = x.getImageData(x0, y0, w, h), d = img.data;
    const hc = new THREE.Color(color), hr = hc.r * 255 * 0.85, hg = hc.g * 255 * 0.85, hb = hc.b * 255 * 0.85;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const a = md[((j + y0) * W + (i + x0)) * 4 + 3] / 255; if (a <= 0) continue;
      const o = (j * w + i) * 4;
      const r = Math.random();
      const grain = beard.id === 'stubble' ? (r < 0.5 ? 1 : 0.3) : 0.72 + 0.28 * r;
      const k = Math.min(1, a * 1.3) * beard.density * beard.mix * grain;
      d[o] += (hr - d[o]) * k; d[o + 1] += (hg - d[o + 1]) * k; d[o + 2] += (hb - d[o + 2]) * k;
    }
    x.putImageData(img, x0, y0);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  beardCache[key] = t;
  return t;
}

let FABRIC = null;
function fabricNormal() {
  if (FABRIC) return FABRIC;
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), img = x.createImageData(S, S), h = new Float32Array(S * S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    // mailles jersey : petites côtes verticales + grain
    const rib = Math.sin((i / S) * Math.PI * 2 * 16) * 0.5 + 0.5;
    const knit = Math.sin((j / S) * Math.PI * 2 * 32 + Math.sin((i / S) * Math.PI * 2 * 16) * 1.2) * 0.25;
    h[j * S + i] = rib * 0.6 + knit + Math.random() * 0.25;
  }
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const hx = h[j * S + ((i + 1) % S)] - h[j * S + ((i - 1 + S) % S)];
    const hy = h[((j + 1) % S) * S + i] - h[((j - 1 + S) % S) * S + i];
    const o = (j * S + i) * 4, len = Math.hypot(hx, hy, 1);
    img.data[o] = (-hx / len * 0.5 + 0.5) * 255; img.data[o + 1] = (-hy / len * 0.5 + 0.5) * 255; img.data[o + 2] = (1 / len * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  FABRIC = new THREE.CanvasTexture(c);
  FABRIC.wrapS = FABRIC.wrapT = THREE.RepeatWrapping; FABRIC.repeat.set(36, 36); FABRIC.anisotropy = 4;
  return FABRIC;
}

// --------------------------------------------------------------- morphing
// aisance des vêtements : itérations de « drapé » et épaisseur d'air (dm)
const GARMENT_FIT = { 'g-tee': { it: 30, ease: 0.11 }, 'g-tank': { it: 30, ease: 0.1 }, 'g-long': { it: 24, ease: 0.08 }, 'g-crop': { it: 8, ease: 0.015 } };
const FACE_KEYS = new Set(['nosew', 'nosel', 'nosehump', 'nosetip', 'mouthw', 'lips', 'jaw', 'chin', 'chinw', 'cheeks', 'facefat', 'faceshape']);
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
    out[`p-${gn}`] = g[gn] * 0.6; // proportions harmonieuses (jambes, tête, épaules)
  }
  for (const [k, v] of Object.entries(look.d || {})) {
    // amplitude limitée : les extrêmes restent crédibles
    const s = FACE_KEYS.has(k) ? 0.8 : 0.6;
    if (v > 0) out[`d-${k}-incr`] = v * s; else if (v < 0) out[`d-${k}-decr`] = -v * s;
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

function skinVerts(sk, P, N, si, sw, outP, outN, used) {
  const n = used ? used.length : P.length / 3;
  for (let k = 0; k < n; k++) {
    const v = used ? used[k] : k, o = v * 3, q = v * 4;
    const x = P[o], y = P[o + 1], z = P[o + 2], nx = N[o], ny = N[o + 1], nz = N[o + 2];
    let px = 0, py = 0, pz = 0, qx = 0, qy = 0, qz = 0;
    for (let j = 0; j < 4; j++) {
      const w = sw[q + j]; if (w === 0) continue;
      const m = si[q + j] * 12;
      px += w * (sk[m] * x + sk[m + 1] * y + sk[m + 2] * z + sk[m + 3]);
      py += w * (sk[m + 4] * x + sk[m + 5] * y + sk[m + 6] * z + sk[m + 7]);
      pz += w * (sk[m + 8] * x + sk[m + 9] * y + sk[m + 10] * z + sk[m + 11]);
      qx += w * (sk[m] * nx + sk[m + 1] * ny + sk[m + 2] * nz);
      qy += w * (sk[m + 4] * nx + sk[m + 5] * ny + sk[m + 6] * nz);
      qz += w * (sk[m + 8] * nx + sk[m + 9] * ny + sk[m + 10] * nz);
    }
    outP[o] = px; outP[o + 1] = py; outP[o + 2] = pz; outN[o] = qx; outN[o + 1] = qy; outN[o + 2] = qz;
  }
}

// --------------------------------------------------------------- poses
// Rotations en degrés (x, y, z) appliquées aux os (repères alignés sur le monde au repos, pose en A).
const P = (o) => o;
// Poses définies par la direction des membres (repère du buste : x = gauche de l'avatar, y = haut, z = avant).
// Le moteur calcule les rotations : les gestes restent naturels quelle que soit la morphologie.
const V3 = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const arm = (up, fore, twist = 8, fist = 0.12) => ({ up, fore, twist, fist });
const POSES = {
  idle: {
    L: arm(V3(0.17, -1, 0.03), V3(0.1, -1, 0.2), 6, 0.15), R: arm(V3(-0.17, -1, 0.03), V3(-0.1, -1, 0.2), 6, 0.15),
    legs: { thigh: V3(0.05, -1, 0.01), shin: V3(0.03, -1, -0.02), toe: 7 }
  },
  flex: {
    L: arm(V3(1, 0.16, 0.1), V3(-0.38, 1, 0.12), -75, 1), R: arm(V3(-1, 0.16, 0.1), V3(0.38, 1, 0.12), -75, 1),
    legs: { thigh: V3(0.09, -1, 0), shin: V3(0.08, -1, 0), toe: 12 },
    spine: [-5, 0, 0], neck: [4, 0, 0], drop: 0.01
  },
  wave: {
    L: arm(V3(0.17, -1, 0.03), V3(0.1, -1, 0.2), 6, 0.15), R: arm(V3(-0.9, 0.22, 0.28), V3(-0.12, 1, 0.1), 80, 0), wave: true,
    legs: { thigh: V3(0.05, -1, 0.01), shin: V3(0.03, -1, -0.02), toe: 7 },
    spine: [0, 0, -3], neck: [-3, -10, 4]
  },
  cheer: {
    L: arm(V3(0.5, 0.86, 0.12), V3(0.3, 1, 0.05), -10, 1), R: arm(V3(-0.5, 0.86, 0.12), V3(-0.3, 1, 0.05), -10, 1),
    legs: { thigh: V3(0.07, -1, 0), shin: V3(0.05, -1, 0), toe: 9 },
    spine: [-7, 0, 0], neck: [-14, 0, 0]
  },
  squat: {
    L: arm(V3(0.16, 0.02, 1), V3(0.12, 0.05, 1), 40, 0.6), R: arm(V3(-0.16, 0.02, 1), V3(-0.12, 0.05, 1), 40, 0.6),
    legs: { thigh: V3(0.3, -0.12, 1), shin: V3(0.12, -1, -0.32), toe: 14 },
    spine: [16, 0, 0], neck: [-12, 0, 0], drop: 0.24
  },
  crouch: {
    L: arm(V3(0.25, -0.9, -0.3), V3(0.2, -0.9, -0.1), 6, 0.4), R: arm(V3(-0.25, -0.9, -0.3), V3(-0.2, -0.9, -0.1), 6, 0.4),
    legs: { thigh: V3(0.1, -0.7, 0.7), shin: V3(0.05, -1, -0.45), toe: 8 },
    spine: [14, 0, 0], neck: [-8, 0, 0], drop: 0.11
  },
  air: {
    L: arm(V3(0.45, 0.88, 0.05), V3(0.3, 1, 0), -5, 0.9), R: arm(V3(-0.45, 0.88, 0.05), V3(-0.3, 1, 0), -5, 0.9),
    legs: { thigh: V3(0.06, -1, 0.15), shin: V3(0.04, -1, -0.3), toe: 7 },
    spine: [-6, 0, 0], neck: [-10, 0, 0]
  }
};
const mixPose = (a, b, w) => {
  const lerp = (u, v) => u.clone().lerp(v, w).normalize();
  const side = (p, q) => ({ up: lerp(p.up, q.up), fore: lerp(p.fore, q.fore), twist: p.twist + (q.twist - p.twist) * w, fist: p.fist + (q.fist - p.fist) * w });
  const e = (p = [0, 0, 0], q = [0, 0, 0]) => p.map((v, i) => v + (q[i] - v) * w);
  return { L: side(a.L, b.L), R: side(a.R, b.R), legs: { thigh: lerp(a.legs.thigh, b.legs.thigh), shin: lerp(a.legs.shin, b.legs.shin), toe: a.legs.toe + (b.legs.toe - a.legs.toe) * w }, spine: e(a.spine, b.spine), neck: e(a.neck, b.neck), drop: (a.drop || 0) + ((b.drop || 0) - (a.drop || 0)) * w, wave: w > 0.5 ? b.wave : a.wave };
};

const FINGERS = ['finger1', 'finger2', 'finger3', 'finger4', 'finger5'];

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
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    MAX_ANISO = Math.min(8, r.capabilities.getMaxAnisotropy ? r.capabilities.getMaxAnisotropy() : 4);
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
    this.parentIdx = core.meta.bones.map((b) => b.parent);
    this.boneM = this.bones.map(() => new THREE.Matrix4());
    this.restHead = this.bones.map(() => new THREE.Vector3());
    this.sk = new Float32Array(this.bones.length * 12);
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
    this.bodySI = si; this.bodySW = sw;
    bg.setIndex(new THREE.BufferAttribute(new Uint16Array(core.bodyIndex), 1));
    this.skinMat = new THREE.MeshPhysicalMaterial({ roughness: 0.56, metalness: 0, sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x9a4434), specularIntensity: 0.5, clearcoat: 0.08, clearcoatRoughness: 0.6 });
    const body = this.body = new THREE.Mesh(bg, this.skinMat);
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
    if (L.shoes && L.socks !== false) want.socks = 'g-socks';
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

    g.setIndex(new THREE.BufferAttribute(px.index, 1));
    const mat = new THREE.MeshStandardMaterial({ roughness: px.meta.mat.rough ?? 0.8 });
    const mesh = new THREE.Mesh(g, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = { eyes: 1, brows: 3, lashes: 4, hair: 6, top: 2, bottom: 2, socks: 1, shoes: 2, watch: 3 }[slot] || 2;
    this.root.add(mesh);
    return mesh;
  }

  _makeGarmentMesh(key, slot) {
    const core = this.core, bg = this.body.geometry, g = new THREE.BufferGeometry();
    const n = core.meta.body.nVerts;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('normal', bg.attributes.normal);
    g.setAttribute('uv', bg.attributes.uv);

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
    const mesh = new THREE.Mesh(g, mat);
    mesh.frustumCulled = false; mesh.renderOrder = slot === 'top' ? 3 : slot === 'socks' ? 1 : 2;
    mesh.userData.used = Uint32Array.from(new Set(idx));
    this.root.add(mesh);
    return mesh;
  }

  _applyMaterials() {
    const L = this.look, core = this.core;
    const tone = SKIN_TONES[clamp(L.skin | 0, 0, SKIN_TONES.length - 1)];
    const sexKey = L.sex >= 0.5 ? 'm' : 'f';
    const skinPath = core.meta.skins[`${tone.tex}-${sexKey}`];
    const beard = BEARDS.find((b) => b.id === L.beard && b.mask);
    if (beard) {
      const key = `${skinPath}|${beard.id}|${L.hairColor}`;
      if (this._skinKey !== key) {
        this._skinKey = key;
        buildBeardSkin(core, skinPath, beard, L.hairColor).then((t) => { if (this._skinKey === key) { this.skinMat.map = t; this.skinMat.needsUpdate = true; } });
      }
    } else { this._skinKey = null; this.skinMat.map = tex(core, skinPath); }
    this.skinMat.color.set(tone.tint);
    this.skinMat.needsUpdate = true;
    for (const [slot, m] of Object.entries(this.meshes)) {
      if (m.garment) {
        const mat = m.mesh.material;
        mat.color.set(slot === 'top' ? L.topColor : slot === 'socks' ? '#eceef1' : L.bottomColor);
        mat.normalMap = fabricNormal(); mat.normalScale.set(0.45, 0.45);
        mat.roughness = 0.86;
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
        const ec = eyeOf(L.eyes);
        mat.map = tex(core, `eye-${ec.tex}.webp`); mat.roughness = 0.12; mat.color.set(ec.tint);
      } else if (slot === 'top') {
        mat.color.set(L.topColor); mat.roughness = 0.88; mat.side = THREE.DoubleSide;
        mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -6;
      } else if (slot === 'bottom') {
        mat.color.set(L.bottomColor); mat.roughness = 0.9; mat.side = THREE.DoubleSide;
        mat.normalMap = fabricNormal(); mat.normalScale.set(0.35, 0.35);
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
      // hauts amples : le tissu tombe en pont par-dessus les creux (taille, entre les pectoraux, aisselles)
      const cfg = GARMENT_FIT[m.key] || { it: 0, ease: 0 };
      const clampOut = (all) => {
        for (let v = 0; v < 13380; v++) {
          if (!all && f[v] > 0.15) continue;
          if (f[v] < -0.35) continue;
          const o = v * 3, dx = G[o] - V[o], dy = G[o + 1] - V[o + 1], dz = G[o + 2] - V[o + 2];
          const dn = dx * Nb[o] + dy * Nb[o + 1] + dz * Nb[o + 2];
          if (dn < 0) { G[o] -= dn * Nb[o]; G[o + 1] -= dn * Nb[o + 1]; G[o + 2] -= dn * Nb[o + 2]; }
        }
      };
      for (let it = 0; it < cfg.it; it++) {
        H.set(G);
        for (let v = 0; v < 13380; v++) {
          if (f[v] < -0.2) continue;
          const a = core.adjStart[v], b = core.adjStart[v + 1]; if (b === a) continue;
          let x = 0, y2 = 0, z = 0;
          for (let j = a; j < b; j++) { const u = core.adj[j] * 3; x += G[u]; y2 += G[u + 1]; z += G[u + 2]; }
          const c = 1 / (b - a);
          H[v * 3] = G[v * 3] * 0.4 + x * c * 0.6; H[v * 3 + 1] = G[v * 3 + 1] * 0.4 + y2 * c * 0.6; H[v * 3 + 2] = G[v * 3 + 2] * 0.4 + z * c * 0.6;
        }
        [G, H] = [H, G];
        if (it % 2 === 1) clampOut(true);
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
      const ease = (cfg.ease || 0) * s;
      for (let v = 0; v < nBase; v++) for (let k = 0; k < 3; k++) G[v * 3 + k] += NG[v * 3 + k] * (th * 1.25 + ease * Math.min(1, Math.max(0, f[v] + 0.1) * 4));
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
    const hd = (n) => heads[core.meta.bones.findIndex((b) => b.name === n)];
    this.restDir = {};
    for (const side of ['L', 'R']) {
      this.restDir['upperarm01.' + side] = new THREE.Vector3().subVectors(hd('lowerarm01.' + side), hd('upperarm01.' + side)).normalize();
      this.restDir['lowerarm01.' + side] = new THREE.Vector3().subVectors(hd('wrist.' + side), hd('lowerarm01.' + side)).normalize();
      this.restDir['upperleg01.' + side] = new THREE.Vector3().subVectors(hd('lowerleg01.' + side), hd('upperleg01.' + side)).normalize();
      this.restDir['lowerleg01.' + side] = new THREE.Vector3().subVectors(hd('foot.' + side), hd('lowerleg01.' + side)).normalize();
    }
    const bi = (n) => core.meta.bones.findIndex((b) => b.name === n);
    for (const side of ['L', 'R']) {
      const w = heads[bi('wrist.' + side)], a = heads[bi('finger2-1.' + side)], c = heads[bi('finger5-1.' + side)];
      const palm = new THREE.Vector3().subVectors(a, w).cross(new THREE.Vector3().subVectors(c, w)).normalize();
      if (side === 'R') palm.negate();
      this.palm = this.palm || {}; this.palm[side] = palm;
      core.meta.bones.forEach((b, i) => {
        if (!b.name.startsWith('finger') || !b.name.endsWith(side)) return;
        const dir = new THREE.Vector3().subVectors(tails[i], heads[i]).normalize();
        const ax = new THREE.Vector3().crossVectors(dir, palm);
        this.boneAxis[b.name] = ax.lengthSq() > 1e-8 ? ax.normalize() : new THREE.Vector3(1, 0, 0);
        // le pouce se replie devant les doigts (poing fermé), pas sur le côté
        if (b.name.startsWith('finger1')) this.boneAxis[b.name].multiplyScalar(-0.7).addScaledVector(palm, 0.7).normalize();
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
    heads.forEach((h, i) => this.restHead[i].copy(h));
    // pose de repos mémorisée : la déformation est calculée en JavaScript (identique sur tous les appareils)
    this.bodyRestP = bg.attributes.position.array.slice();
    this.bodyRestN = bg.attributes.normal.array.slice();
    for (const m of Object.values(this.meshes)) {
      const g = m.mesh.geometry;
      m.restP = g.attributes.position.array.slice();
      m.restN = g.attributes.normal.array.slice();
    }
    this.headY = heads[core.meta.bones.findIndex((b) => b.name === 'head')].y;
    this._frame();
  }

  play(name, ms = 2200) {
    if (name === 'jump') { this.jumpStart = performance.now(); this.pose = 'idle'; return; }
    if (!POSES[name]) return;
    this.pose = name; this.poseUntil = performance.now() + ms;
  }

  _currentPose(t, now) {
    let P = POSES[this.pose] || POSES.idle;
    if (this.jumpStart) {
      const u = (now - this.jumpStart) / 1100;
      if (u >= 1) this.jumpStart = 0;
      else if (u < 0.28) P = mixPose(POSES.idle, POSES.crouch, Math.sin((u / 0.28) * Math.PI * 0.5));
      else if (u < 0.8) P = mixPose(POSES.crouch, POSES.air, Math.min(1, (u - 0.28) / 0.12));
      else P = mixPose(POSES.air, POSES.crouch, Math.sin(((u - 0.8) / 0.2) * Math.PI) * 0.7);
      this.jumpY = u >= 0.28 && u < 0.8 ? Math.sin(((u - 0.28) / 0.52) * Math.PI) * 0.22 : 0;
    } else this.jumpY = 0;
    return P;
  }

  _frame() {
    const now = performance.now();
    const t = now / 1000;
    if (this.pose !== 'idle' && now > this.poseUntil) this.pose = 'idle';
    const dt = Math.min(0.12, this.clock.getDelta() || 0.016);
    const k = 1 - Math.exp(-dt * (this.jumpStart ? 14 : 6));
    const P = this._currentPose(t, now);
    const B = this.bones, nb = B.length, names = this.boneNames || (this.boneNames = B.map((b) => b.name));
    const breathe = Math.sin(t * 1.5), sway = Math.sin(t * 0.5);
    const lx = this.lookTarget.x, ly = this.lookTarget.y;
    // rotations simples (buste, cou, tête), en degrés
    const eul = {
      root: [0, 0, 1.0 * sway],
      spine04: [(P.spine?.[0] || 0) * 0.4, 0, -1.1 * sway],
      spine03: [(P.spine?.[0] || 0) * 0.3 - 0.7 * breathe, 0.6 * Math.sin(t * 0.37), (P.spine?.[2] || 0) * 0.5],
      spine02: [(P.spine?.[0] || 0) * 0.3 - 0.5 * breathe, 0, (P.spine?.[2] || 0) * 0.5],
      neck02: [(P.neck?.[0] || 0) - ly * 8 + 1.2 * Math.sin(t * 0.31), (P.neck?.[1] || 0) + lx * 16 + 5 * Math.sin(t * 0.23), P.neck?.[2] || 0],
      head: [-ly * 6, lx * 10, 1.0 * Math.sin(t * 0.4)],
      'clavicle.L': [0, 0, 0.7 * breathe + (P.L.up.y > 0.3 ? 9 : 0)], 'clavicle.R': [0, 0, -0.7 * breathe - (P.R.up.y > 0.3 ? 9 : 0)]
    };
    // directions des membres (repère du buste), avec petits mouvements de vie
    const armDirs = {};
    for (const side of ['L', 'R']) {
      const a = P[side], sg = side === 'L' ? 1 : -1;
      const up = a.up.clone(), fore = a.fore.clone();
      if (a.up.y < -0.5) { up.x += sg * 0.02 * Math.sin(t * 0.9 + (sg > 0 ? 0 : 1.3)); up.z += 0.03 * Math.sin(t * 0.7 + sg); }
      if (P.wave && side === 'R') fore.x += 0.38 * Math.sin(t * 8);
      armDirs[side] = { up: up.normalize(), fore: fore.normalize(), twist: a.twist, fist: a.fist };
    }
    const W = this.tgtW || (this.tgtW = B.map(() => new THREE.Quaternion()));
    const L = this.tgtL || (this.tgtL = B.map(() => new THREE.Quaternion()));
    const q1 = this.tmpQ, q2 = this.tmpQ2 || (this.tmpQ2 = new THREE.Quaternion()), inv = this.tmpQ3 || (this.tmpQ3 = new THREE.Quaternion());
    const fistAmt = { L: armDirs.L.fist, R: armDirs.R.fist };
    const chestIdx = names.indexOf('spine01'), hipIdx = names.indexOf('root');
    const aimLocal = (i, refIdx, restDir, dir, twistDeg) => {
      // rotation monde voulue = repère de référence * (repos -> direction), puis torsion autour du membre
      q1.setFromUnitVectors(restDir, dir);
      if (twistDeg) { q2.setFromAxisAngle(dir, twistDeg * DEG); q1.premultiply(q2); }
      q1.premultiply(W[refIdx]);
      const p = this.parentIdx[i];
      inv.copy(W[p]).invert();
      L[i].copy(inv).multiply(q1);
    };
    for (let i = 0; i < nb; i++) {
      const n = names[i], p = this.parentIdx[i];
      const side = n.endsWith('.L') ? 'L' : n.endsWith('.R') ? 'R' : null;
      const pw = p >= 0 ? W[p] : null;
      const e = eul[n];
      if (side && (n.startsWith('upperarm01') || n.startsWith('lowerarm01'))) {
        const d = armDirs[side];
        if (n.startsWith('upperarm01')) aimLocal(i, chestIdx, this.restDir[n], d.up, 0);
        else aimLocal(i, chestIdx, this.restDir[n], d.fore, 0);
      } else if (side && (n.startsWith('upperleg01') || n.startsWith('lowerleg01'))) {
        const sg = side === 'L' ? 1 : -1, lg = P.legs;
        const dir = n.startsWith('upperleg01') ? new THREE.Vector3(lg.thigh.x * sg, lg.thigh.y, lg.thigh.z) : new THREE.Vector3(lg.shin.x * sg, lg.shin.y, lg.shin.z);
        aimLocal(i, hipIdx, this.restDir[n], dir.normalize(), 0);
      } else if (side && n.startsWith('foot')) {
        // pied à plat, légèrement tourné vers l'extérieur
        const sg = side === 'L' ? 1 : -1;
        q1.setFromAxisAngle(new THREE.Vector3(0, 1, 0), sg * P.legs.toe * DEG).premultiply(W[hipIdx]);
        inv.copy(W[p]).invert(); L[i].copy(inv).multiply(q1);
      } else if (side && n.startsWith('lowerarm02')) {
        L[i].setFromAxisAngle(this.boneAxis[n], (side === 'L' ? 1 : -1) * armDirs[side].twist * DEG);
      } else if (side && n.startsWith('finger') && this.boneAxis[n]) {
        const curl = 8 + fistAmt[side] * 74, thumb = n.startsWith('finger1'), seg = n[n.indexOf('-') + 1];
        L[i].setFromAxisAngle(this.boneAxis[n], -(thumb ? curl * 0.45 : curl * (seg === '1' ? 0.78 : 1.05)) * DEG);
      } else if (e) {
        this.tmpE.set(e[0] * DEG, e[1] * DEG, e[2] * DEG, 'XYZ'); L[i].setFromEuler(this.tmpE);
      } else L[i].identity();
      W[i].copy(pw || this.identQ || (this.identQ = new THREE.Quaternion())).multiply(L[i]);
    }
    for (let i = 0; i < nb; i++) {
      this.curQ[i].slerp(L[i], k).normalize();
      B[i].quaternion.copy(this.curQ[i]);
      B[i].position.copy(this.restPos[i]);
    }
    this.drop += ((P.drop || 0) - this.drop) * k;
    const jy = (this.jumpY || 0) * this.modelHeight;
    const rootBone = this.bones[0];
    rootBone.position.y += jy - this.drop * this.modelHeight + Math.sin(t * 1.5) * 0.002 * this.modelHeight;
    rootBone.position.x += Math.sin(t * 0.55) * 0.006 * this.modelHeight;
    this._skin();
    // rotation (glisser)
    if (!this.dragging) { this.yaw += this.yawVel; this.yawVel *= 0.92; if (this.opts.autoRotate) this.yaw += dt * 0.25; }
    this.root.rotation.y = this.yaw;
    if (this.camPos) {
      const g = this._cameraGoal(), kc = 1 - Math.exp(-dt * 5);
      this.camPos.lerp(g.pos, kc); this.camLook.lerp(g.look, kc);
      this.camera.position.copy(this.camPos); this.camera.lookAt(this.camLook);
    }
    this.renderer.render(this.scene, this.camera);
  }

  _skin() {
    if (!this.bodyRestP) return;
    const B = this.bones, sk = this.sk, h = this.restHead;
    for (let i = 0; i < B.length; i++) {
      const b = B[i]; b.updateMatrix();
      const p = this.parentIdx[i];
      if (p < 0) this.boneM[i].copy(b.matrix); else this.boneM[i].multiplyMatrices(this.boneM[p], b.matrix);
      const e = this.boneM[i].elements, hx = h[i].x, hy = h[i].y, hz = h[i].z, o = i * 12;
      sk[o] = e[0]; sk[o + 1] = e[4]; sk[o + 2] = e[8]; sk[o + 3] = e[12] - (e[0] * hx + e[4] * hy + e[8] * hz);
      sk[o + 4] = e[1]; sk[o + 5] = e[5]; sk[o + 6] = e[9]; sk[o + 7] = e[13] - (e[1] * hx + e[5] * hy + e[9] * hz);
      sk[o + 8] = e[2]; sk[o + 9] = e[6]; sk[o + 10] = e[10]; sk[o + 11] = e[14] - (e[2] * hx + e[6] * hy + e[10] * hz);
    }
    const g = this.body.geometry;
    skinVerts(sk, this.bodyRestP, this.bodyRestN, this.bodySI, this.bodySW, g.attributes.position.array, g.attributes.normal.array, null);
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
    for (const m of Object.values(this.meshes)) {
      if (!m.restP) continue;
      const mg = m.mesh.geometry;
      if (m.garment) skinVerts(sk, m.restP, m.restN, this.bodySI, this.bodySW, mg.attributes.position.array, mg.attributes.normal.array, m.mesh.userData.used);
      else skinVerts(sk, m.restP, m.restN, m.px.skinIndex, m.px.skinWeight, mg.attributes.position.array, mg.attributes.normal.array, null);
      mg.attributes.position.needsUpdate = true; mg.attributes.normal.needsUpdate = true;
    }
  }

  _loop() {
    if (this.disposed) return;
    this._raf = requestAnimationFrame(() => this._loop());
    if (this.paused || this.visible === false || !this.canvas.isConnected) return;
    this._frame();
  }

  _resize() {
    const c = this.canvas, w = c.clientWidth || 300, h = c.clientHeight || 500;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this._frameCamera();
  }

  _cameraGoal() {
    const H = this.modelHeight || 18, cam = this.camera, vf = 2 * Math.tan((cam.fov * DEG) / 2);
    if (this.opts.framing === 'face') {
      const hy = H * 0.915;
      const fitH = H * 0.25, fitW = H * 0.19;
      const dist = Math.max(fitH / vf, fitW / (vf * cam.aspect));
      return { pos: new THREE.Vector3(0, hy, dist + H * 0.06), look: new THREE.Vector3(0, hy, 0) };
    }
    const fitH = H * 1.12, fitW = H * 0.62;
    const dist = Math.max(fitH / vf, fitW / (vf * cam.aspect));
    return { pos: new THREE.Vector3(0, H * 0.56, dist), look: new THREE.Vector3(0, H * 0.5, 0) };
  }

  setFraming(mode) { this.opts.framing = mode; }

  _frameCamera(instant = true) {
    const g = this._cameraGoal();
    if (instant || !this.camPos) { this.camPos = g.pos.clone(); this.camLook = g.look.clone(); }
    this.camera.position.copy(this.camPos); this.camera.lookAt(this.camLook);
    this.camera.updateProjectionMatrix();
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
