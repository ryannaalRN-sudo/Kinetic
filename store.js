// Kinetic — données locales (tout reste sur l'appareil)
import { DEFAULT_LOOK } from './avatar.js';
import { PROGRAMS, BADGES, LEVEL_TITLES } from './data.js';

const KEY = 'kinetic.v1';

const fresh = () => ({
  created: Date.now(),
  onboarded: false,
  profile: { name: '', goal: 3, hideNumbers: false },
  look: JSON.parse(JSON.stringify(DEFAULT_LOOK)),
  program: { id: 'ppl', index: 0, started: Date.now() },
  workouts: [],   // {id, date, type:'lift'|'run', title, sets:[{ex, kg, reps, done}], durationS, volume, xp, prs:[]}
  runs: [],       // {id, date, km, durationS, title, source}
  steps: [],      // étapes de la frise {id, date, look, weight, waist, arm, note, hasPhoto, snap}
  xp: 0,
  badges: {},
  records: {}     // exId -> {e1rm, kg, reps, date}
});

export const store = {
  s: null,
  load() {
    try { this.s = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}); } catch (e) { this.s = fresh(); }
    this.s.look = Object.assign({}, DEFAULT_LOOK, this.s.look || {}, { d: Object.assign({}, DEFAULT_LOOK.d, (this.s.look || {}).d || {}) });
    return this.s;
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch (e) { console.warn(e); } },
  reset() { localStorage.removeItem(KEY); this.s = fresh(); idb.clear(); },
  export() { return JSON.stringify(this.s); },
  import(json) { const d = JSON.parse(json); if (!d || !d.look) throw new Error('Fichier invalide'); this.s = Object.assign(fresh(), d); this.save(); }
};

// ----- niveaux et XP
export function levelInfo(xp) {
  let lvl = 1, need = 300, acc = 0;
  while (xp >= acc + need) { acc += need; lvl++; need = Math.round(300 + (lvl - 1) * 150); }
  return { level: lvl, into: xp - acc, need, title: LEVEL_TITLES[Math.min(lvl - 1, LEVEL_TITLES.length - 1)] };
}

export const epley = (kg, reps) => (reps <= 1 ? kg : kg * (1 + reps / 30));

// ----- semaines
export function weekKey(t) {
  const d = new Date(t); d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day);
  return d.getTime();
}

export function stats() {
  const s = store.s, now = Date.now(), wk = weekKey(now);
  const sessionsWeek = s.workouts.filter((w) => weekKey(w.date) === wk).length + s.runs.filter((r) => weekKey(r.date) === wk).length;
  const volumeWeek = s.workouts.filter((w) => weekKey(w.date) === wk).reduce((a, w) => a + (w.volume || 0), 0);
  const kmWeek = s.runs.filter((r) => weekKey(r.date) === wk).reduce((a, r) => a + r.km, 0);
  // série de semaines où l'objectif est atteint
  let streak = 0, k = wk;
  const count = (key) => s.workouts.filter((w) => weekKey(w.date) === key).length + s.runs.filter((r) => weekKey(r.date) === key).length;
  if (count(k) < s.profile.goal) k -= 7 * 864e5;
  while (count(k) >= s.profile.goal && streak < 520) { streak++; k -= 7 * 864e5; }
  const totalKm = s.runs.reduce((a, r) => a + r.km, 0);
  const totalVolume = s.workouts.reduce((a, w) => a + (w.volume || 0), 0);
  return { sessionsWeek, volumeWeek, kmWeek, streak, totalKm, totalVolume };
}

export function nextSession() {
  const p = PROGRAMS[store.s.program.id] || PROGRAMS.ppl;
  const i = store.s.program.index % p.sessions.length;
  return { program: p, session: p.sessions[i], index: i };
}

export function advanceProgram() { store.s.program.index = (store.s.program.index + 1) % 10000; }

// ----- badges
export function checkBadges() {
  const s = store.s, st = stats(), got = [];
  const give = (id) => { if (!s.badges[id]) { s.badges[id] = Date.now(); got.push(BADGES.find((b) => b.id === id)); } };
  const n = s.workouts.length + s.runs.length;
  if (n >= 1) give('first_session');
  if (n >= 5) give('five_sessions');
  if (n >= 20) give('twenty_sessions');
  if (s.runs.length) give('first_run');
  if (s.runs.some((r) => r.km >= 5)) give('five_k');
  if (s.runs.some((r) => r.km >= 10)) give('ten_k');
  if (st.totalKm >= 50) give('fifty_km');
  if (Object.keys(s.records).length && s.workouts.some((w) => (w.prs || []).length)) give('first_pr');
  if (st.totalVolume >= 10000) give('ten_tons');
  if (st.streak >= 3) give('streak3');
  if (s.steps.length) give('first_step');
  const wk = weekKey(Date.now());
  if (s.workouts.some((w) => weekKey(w.date) === wk && w.type === 'lift') && s.runs.some((r) => weekKey(r.date) === wk)) give('hybrid');
  return got;
}

// ----- IndexedDB pour les photos et aperçus (jamais envoyés en ligne)
const DB = 'kinetic-media';
function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('media');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
export const idb = {
  async put(key, val) { try { const db = await open(); return await new Promise((res, rej) => { const tx = db.transaction('media', 'readwrite'); tx.objectStore('media').put(val, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); } catch (e) { console.warn(e); } },
  async get(key) { try { const db = await open(); return await new Promise((res, rej) => { const tx = db.transaction('media', 'readonly'); const q = tx.objectStore('media').get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); } catch (e) { return undefined; } },
  async del(key) { try { const db = await open(); return await new Promise((res) => { const tx = db.transaction('media', 'readwrite'); tx.objectStore('media').delete(key); tx.oncomplete = res; }); } catch (e) { /* rien */ } },
  async clear() { try { const db = await open(); const tx = db.transaction('media', 'readwrite'); tx.objectStore('media').clear(); } catch (e) { /* rien */ } }
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
