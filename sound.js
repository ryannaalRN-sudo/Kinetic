// Kinetic — bruitages synthétisés (Web Audio, aucun fichier à charger)
let ctx = null, master = null;
const state = { on: true, vol: 0.7 };

export function configureSound({ on = true, vol = 0.7 } = {}) {
  state.on = on; state.vol = vol;
  if (master) master.gain.value = state.on ? state.vol * 0.55 : 0;
}

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = state.on ? state.vol * 0.55 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
// iOS / Android : l'audio ne démarre qu'après un premier geste
['pointerdown', 'touchend', 'keydown'].forEach((ev) => window.addEventListener(ev, () => ensure(), { passive: true }));

function tone(freq, t0, dur, { type = 'sine', gain = 0.5, to = null, attack = 0.005 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(t0, dur, { gain = 0.35, from = 400, to = 2400, q = 1.2 } = {}) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
  f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master); src.start(t0); src.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  tap: (t) => tone(1500, t, 0.045, { type: 'sine', gain: 0.18 }),
  select: (t) => { tone(880, t, 0.06, { type: 'triangle', gain: 0.22 }); tone(1320, t + 0.035, 0.07, { type: 'triangle', gain: 0.16 }); },
  check: (t) => { tone(784, t, 0.08, { type: 'triangle', gain: 0.32 }); tone(1175, t + 0.06, 0.14, { type: 'triangle', gain: 0.3 }); },
  uncheck: (t) => tone(700, t, 0.1, { type: 'triangle', gain: 0.2, to: 420 }),
  tick: (t) => tone(1046, t, 0.07, { type: 'square', gain: 0.12 }),
  start: (t) => { tone(523, t, 0.12, { type: 'triangle', gain: 0.3 }); tone(659, t + 0.11, 0.12, { type: 'triangle', gain: 0.3 }); tone(988, t + 0.22, 0.22, { type: 'triangle', gain: 0.34 }); },
  end: (t) => { tone(1318, t, 0.16, { type: 'square', gain: 0.16 }); tone(1318, t + 0.22, 0.16, { type: 'square', gain: 0.16 }); tone(1760, t + 0.44, 0.32, { type: 'square', gain: 0.18 }); },
  pause: (t) => tone(660, t, 0.12, { type: 'triangle', gain: 0.22, to: 440 }),
  whoosh: (t) => noise(t, 0.32, { gain: 0.3, from: 300, to: 2600 }),
  jump: (t) => { tone(260, t, 0.22, { type: 'sine', gain: 0.4, to: 760 }); noise(t, 0.18, { gain: 0.12, from: 500, to: 3000 }); },
  flex: (t) => { tone(110, t, 0.28, { type: 'sawtooth', gain: 0.16, to: 150 }); tone(220, t, 0.25, { type: 'triangle', gain: 0.18, to: 300 }); noise(t, 0.2, { gain: 0.1, from: 200, to: 900 }); },
  pop: (t) => tone(520, t, 0.09, { type: 'sine', gain: 0.35, to: 1100 }),
  wave: (t) => { tone(660, t, 0.08, { type: 'sine', gain: 0.25 }); tone(880, t + 0.09, 0.1, { type: 'sine', gain: 0.25 }); },
  success: (t) => [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.085, 0.28, { type: 'triangle', gain: 0.3 })),
  levelup: (t) => { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.07, 0.3, { type: 'triangle', gain: 0.26 })); noise(t + 0.4, 0.4, { gain: 0.08, from: 2000, to: 6000 }); },
  error: (t) => { tone(300, t, 0.12, { type: 'square', gain: 0.12 }); tone(220, t + 0.13, 0.16, { type: 'square', gain: 0.12 }); }
};

export function sfx(name) {
  if (!state.on || state.vol <= 0) return;
  const c = ensure(); if (!c || !SOUNDS[name]) return;
  try { SOUNDS[name](c.currentTime + 0.01); } catch (e) { /* audio indisponible */ }
}
