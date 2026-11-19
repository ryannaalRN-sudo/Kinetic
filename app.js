// Kinetic — application
import { Avatar, SKIN_TONES, EYE_COLORS, DEFAULT_LOOK } from './avatar.js';
import { EXERCISES, PROGRAMS, BADGES } from './data.js';
import { store, levelInfo, epley, stats, nextSession, advanceProgram, checkBadges, idb, uid, weekKey } from './store.js';

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 0) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });
const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const hms = (t) => (t >= 3600 ? `${Math.floor(t / 3600)} h ${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}` : `${Math.floor(t / 60)} min`);
const pace = (km, s) => (km > 0 && s > 0 ? `${Math.floor(s / km / 60)}'${String(Math.round((s / km) % 60)).padStart(2, '0')}"/km` : '—');
const dateFr = (t, opt = { day: 'numeric', month: 'short' }) => new Date(t).toLocaleDateString('fr-FR', opt);
const hidden = () => store.s.profile.hideNumbers;
const app = document.getElementById('app');

// ---------------------------------------------------------------- icônes
const I = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  lift: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
  run: '<circle cx="14" cy="4.5" r="2"/><path d="M9 21l2.5-5 3 2.5V22M7 12l3-3.5 4 1 2 3.5h3M11.5 16l-1-5.5"/>',
  chart: '<path d="M3 20h18M6 16l4-5 3 3 5-7"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
  flame: '<path d="M12 2c1 4 5 5.5 5 10.5A5 5 0 0 1 7 12.5c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  stack: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  road: '<path d="M8 3L4 21M16 3l4 18M12 5v2M12 11v2M12 17v2"/>',
  weight: '<path d="M6 8h12l2 12H4zM9 8a3 3 0 0 1 6 0"/>',
  infinity: '<path d="M7 9a3 3 0 1 0 0 6c3 0 7-6 10-6a3 3 0 1 1 0 6c-3 0-7-6-10-6z"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  skip: '<path d="M6 5l9 7-9 7zM18 5v14"/>'
};
const icon = (n, size = 22, extra = '') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${I[n] || ''}</svg>`;

// ---------------------------------------------------------------- avatar partagé
let avatar = null, avatarReady = null;
const avatarCanvas = document.createElement('canvas');
avatarCanvas.className = 'avatar-canvas';
function ensureAvatar() {
  if (!avatarReady) {
    avatar = new Avatar(avatarCanvas, { onTap: () => onAvatarTap() });
    avatarReady = avatar.init().then(() => avatar.setLook(store.s.look)).then(() => avatar).catch((e) => { console.error(e); toast('Impossible de charger l’avatar 3D sur cet appareil'); });
  }
  return avatarReady;
}
function mountAvatar(slot, opts = {}) {
  if (!slot) return;
  slot.appendChild(avatarCanvas);
  ensureAvatar().then((a) => {
    if (!a) return;
    Object.assign(a.opts, { framing: 'full' }, opts);
    a.visible = true;
    a._resize();
  });
}
let tapStep = 0, bubbleTimer = null;
function onAvatarTap() {
  if (!avatar || !avatarCanvas.isConnected) return;
  const route = location.hash;
  if (!(route === '' || route === '#home' || route.startsWith('#home'))) return;
  const name = store.s.profile.name;
  const lines = [
    ['flex', 'Regarde-moi ces bras !'], ['jump', 'Allez, on bouge !'], ['wave', name ? `Salut ${name} !` : 'Salut !'],
    ['cheer', 'On lâche rien !'], ['squat', 'Une petite série ?']
  ];
  const [pose, text] = lines[tapStep++ % lines.length];
  avatar.play(pose, 1900);
  if (navigator.vibrate) navigator.vibrate(15);
  const b = $('#bubble');
  if (b) { b.textContent = text; b.classList.add('show'); clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => b.classList.remove('show'), 1900); }
}

// ---------------------------------------------------------------- UI utilitaires
function toast(msg, ms = 2400) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms);
}
function celebrate(title, lines = []) {
  const o = document.createElement('div');
  o.className = 'celebrate';
  o.innerHTML = `<div class="celebrate-card"><div class="kicker">BRAVO</div><h2>${esc(title)}</h2>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}<button class="btn primary" data-close>Continuer</button></div>`;
  for (let i = 0; i < 26; i++) { const c = document.createElement('i'); c.style.left = Math.random() * 100 + '%'; c.style.animationDelay = Math.random() * 0.6 + 's'; c.style.background = ['#c8ff2e', '#f4f5f6', '#9aa1ab'][i % 3]; o.appendChild(c); }
  o.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) o.remove(); });
  document.body.appendChild(o);
}
function ask({ title, text = '', input = null, ok = 'Valider', cancel = 'Annuler', danger = false }) {
  return new Promise((res) => {
    const o = document.createElement('div');
    o.className = 'celebrate dialog';
    o.innerHTML = `<div class="celebrate-card" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2 class="dlg-t">${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}${input ? `<label class="field"><span>${esc(input.label)}</span><input id="dlg-in" type="${input.type || 'text'}" inputmode="${input.mode || 'text'}" step="any" placeholder="${esc(input.placeholder || '')}"></label>` : ''}<div class="grid2 mt12"><button class="btn ghost" data-a="0">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-a="1">${esc(ok)}</button></div></div>`;
    document.body.appendChild(o);
    const inp = o.querySelector('#dlg-in'); if (inp) setTimeout(() => inp.focus(), 50);
    o.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      o.remove();
      res(b.dataset.a === '1' ? (inp ? inp.value : true) : null);
    });
  });
}
const nav = (active) => `
<nav class="tabbar" aria-label="Navigation principale">
  ${[['home', '#home', 'Accueil', 'home'], ['train', '#train', 'Muscu', 'lift'], ['run', '#run', 'Course', 'run'], ['progress', '#progress', 'Progrès', 'chart'], ['avatar', '#avatar', 'Avatar', 'user']]
    .map(([k, h, l, ic]) => `<a href="${h}" class="${active === k ? 'on' : ''}" ${active === k ? 'aria-current="page"' : ''}>${icon(ic)}<span>${l}</span></a>`).join('')}
</nav>`;
const topbar = (title, back = '#home', right = '') => `
<header class="topbar"><a class="icon-btn" href="${back}" aria-label="Retour">${icon('back')}</a><h1 class="title">${title}</h1><div class="topbar-right">${right}</div></header>`;

// ---------------------------------------------------------------- routeur
const routes = {};
let cleanup = null;
function render() {
  if (cleanup) { try { cleanup(); } catch (e) { /* rien */ } cleanup = null; }
  if (avatar) avatar.visible = false;
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const cut = h.indexOf('-');
  const name = cut < 0 ? h : h.slice(0, cut), arg = cut < 0 ? undefined : h.slice(cut + 1);
  if (!store.s.onboarded && name !== 'welcome' && name !== 'avatar') { location.hash = '#welcome'; return; }
  if (store.s.onboarded && name === 'welcome') { location.hash = '#home'; return; }
  const view = routes[name] || routes.home;
  window.scrollTo(0, 0);
  cleanup = view(arg) || null;
}
window.addEventListener('hashchange', render);

// ---------------------------------------------------------------- accueil
routes.home = () => {
  const s = store.s, st = stats(), L = levelInfo(s.xp), next = nextSession();
  const isRun = next.session.type === 'run';
  app.innerHTML = `
  <div class="view home">
    <header class="brandbar">
      <div class="brand"><span class="slash"></span>KINETIC</div>
      <div class="row gap8">
        <span class="chip">${icon('flame', 16, 'class="volt"')}<b>${st.streak}</b> sem.</span>
        <a class="icon-btn" href="#reglages" aria-label="Réglages">${icon('gear', 20)}</a>
      </div>
    </header>
    <section class="hello">
      <div class="row between end">
        <div><div class="muted">${s.profile.name ? 'Salut ' + esc(s.profile.name) : 'Salut'}</div>
        <div class="h-display">NIVEAU ${L.level} · ${L.title.toUpperCase()}</div></div>
        <div class="muted small">${hidden() ? '' : `${fmt(L.into)} / ${fmt(L.need)} XP`}</div>
      </div>
      <div class="bar"><i style="width:${Math.round((L.into / L.need) * 100)}%"></i></div>
    </section>
    <section class="stage">
      <div class="avatar-slot" id="slot"></div>
      <div class="float left">
        <div class="stat"><span>SEMAINE</span><b>${st.sessionsWeek}<em>/${s.profile.goal}</em></b></div>
        <div class="stat"><span>VOLUME</span><b>${hidden() ? '•••' : fmt(st.volumeWeek / 1000, 1) + ' t'}</b></div>
      </div>
      <div class="float right"><div class="stat"><span>COURSE</span><b>${hidden() ? '•••' : fmt(st.kmWeek, 1) + ' km'}</b></div></div>
      <div id="bubble" class="bubble" role="status" aria-live="polite"></div>
      <div class="hint">Touche ton avatar · glisse pour le tourner</div>
    </section>
    <section class="pad">
      <div class="card">
        <div class="row between"><span class="kicker">${isRun ? 'SORTIE DU JOUR' : 'SÉANCE DU JOUR'}</span><span class="muted small">${esc(next.program.name)}</span></div>
        <div class="h-card">${esc(next.session.title).toUpperCase()}</div>
        <div class="muted small">${isRun ? `${hms(next.session.segments.reduce((a, x) => a + x[1], 0))} · séance guidée` : `${next.session.items.length} exercices · ${next.session.items.map((i) => EXERCISES[i.id].name).slice(0, 3).join(', ')}…`}</div>
        <a class="btn primary big" href="${isRun ? '#runlive-' + next.index : '#session-' + next.index}">${icon('play', 18)} DÉMARRER</a>
      </div>
      <div class="grid2 mt12">
        <a class="tile" href="#run">${icon('run')}<span>Ajouter une course</span></a>
        <a class="tile" href="#step">${icon('camera')}<span>Nouvelle étape</span></a>
      </div>
    </section>
  </div>${nav('home')}`;
  mountAvatar($('#slot'));
};

// ---------------------------------------------------------------- accueil / bienvenue
routes.welcome = () => {
  app.innerHTML = `
  <div class="view welcome">
    <div class="brand big"><span class="slash"></span>KINETIC</div>
    <div class="avatar-slot welcome-slot" id="slot"></div>
    <div class="pad">
      <h1 class="h-display">TON DOUBLE SPORTIF</h1>
      <p class="muted">Crée un avatar 3D qui te ressemble, suis tes séances de muscu et de course, et regarde-le évoluer avec toi.</p>
      <label class="field"><span>Ton prénom</span><input id="w-name" autocomplete="given-name" placeholder="Prénom" value="${esc(store.s.profile.name)}"></label>
      <div class="field"><span>Silhouette de départ</span>
        <div class="seg" id="w-sex"><button data-v="1" class="on">Masculine</button><button data-v="0">Féminine</button></div></div>
      <div class="grid2">
        <label class="field"><span>Taille (cm)</span><input id="w-h" type="number" inputmode="numeric" value="${store.s.look.height}"></label>
        <label class="field"><span>Poids (kg)</span><input id="w-w" type="number" inputmode="decimal" value="${store.s.look.weight}"></label>
      </div>
      <button class="btn primary big" id="w-go">CRÉER MON AVATAR</button>
      <p class="muted tiny center">${icon('lock', 12)} Tes données et tes photos restent sur ton téléphone.</p>
    </div>
  </div>`;
  mountAvatar($('#slot'));
  let sex = 1;
  $('#w-sex').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    sex = +b.dataset.v; [...$('#w-sex').children].forEach((x) => x.classList.toggle('on', x === b));
    const look = Object.assign({}, store.s.look, sex ? { sex: 1, hair: 'h-short02', top: 'g-tee', bottom: 'c-shorts', brows: 'brow02' } : { sex: 0, hair: 'h-ponytail', top: 'g-crop', bottom: 'g-leggings', brows: 'brow06', height: 166, weight: 60 });
    if (!sex) { $('#w-h').value = 166; $('#w-w').value = 60; } else { $('#w-h').value = 180; $('#w-w').value = 78; }
    store.s.look = look; avatar?.setLook(look);
  });
  $('#w-go').addEventListener('click', () => {
    store.s.profile.name = $('#w-name').value.trim().slice(0, 24);
    store.s.look.height = Math.min(220, Math.max(130, +$('#w-h').value || 175));
    store.s.look.weight = Math.min(200, Math.max(35, +$('#w-w').value || 70));
    store.save();
    location.hash = '#avatar-first';
  });
};

// ---------------------------------------------------------------- éditeur d'avatar
const ZONES = [
  ['shoulders', 'Épaules'], ['chest', 'Pectoraux'], ['back', 'Dos (en V)'], ['arms', 'Bras'], ['forearms', 'Avant-bras'],
  ['bust', 'Poitrine'], ['belly', 'Ventre'], ['waist', 'Tour de taille'], ['hips', 'Hanches'], ['glutes', 'Fessiers'],
  ['thighs', 'Cuisses'], ['calves', 'Mollets'], ['neck', 'Cou'], ['legs', 'Longueur des jambes']
];
const HAIRS = [[null, 'Rasé'], ['h-short02', 'Court texturé'], ['h-short04', 'Court sur le côté'], ['h-short01', 'Court classique'], ['h-messy', 'Décoiffé'], ['h-hair05', 'Mèche'], ['h-afro', 'Afro'], ['h-short03', 'Carré court'], ['h-bob01', 'Carré'], ['h-bobbangs', 'Carré frange'], ['h-ponytail', 'Queue de cheval'], ['h-bun', 'Chignon'], ['h-braid', 'Tresse'], ['h-long', 'Long']];
const HAIR_COLORS = [['#0f0d0c', 'Noir'], ['#24180f', 'Brun foncé'], ['#4a2e1e', 'Brun'], ['#7a4f2c', 'Châtain'], ['#a8774a', 'Châtain clair'], ['#d2ab6c', 'Blond'], ['#e8cf98', 'Blond clair'], ['#9c4a24', 'Roux'], ['#8d8d8d', 'Gris'], ['#e9e9e9', 'Blanc']];
const CLOTH_COLORS = [['#c8ff2e', 'Vert volt'], ['#f4f5f6', 'Blanc'], ['#1b1d22', 'Noir'], ['#3a3f47', 'Anthracite'], ['#ff6b2c', 'Orange'], ['#e8304a', 'Rouge'], ['#3d7bff', 'Bleu'], ['#2b3a55', 'Marine'], ['#7a5cff', 'Violet'], ['#2fbf8f', 'Émeraude'], ['#f2c14e', 'Jaune'], ['#ff8fb1', 'Rose']];
const TOPS = [['g-tee', 'T-shirt ajusté'], ['c-tee', 'T-shirt ample'], ['g-tank', 'Débardeur'], ['g-long', 'Manches longues'], ['g-crop', 'Brassière'], [null, 'Torse nu']];
const BOTTOMS = [['c-shorts', 'Short'], ['g-cycling', 'Cuissard'], ['g-leggings', 'Legging'], ['c-pants', 'Jogging']];
const SHOES = [['s-shoes05', 'Baskets blanches'], ['s-shoes06', 'Running'], ['s-shoes02', 'Trail'], [null, 'Pieds nus']];
const BROWS = ['brow01', 'brow02', 'brow03', 'brow04', 'brow06', 'brow08', 'brow10', 'brow12'];
const EYE_NAMES = { brown: 'Marron', brownlight: 'Noisette', green: 'Vert', bluegreen: 'Bleu-vert', blue: 'Bleu', lightblue: 'Bleu clair', deepblue: 'Bleu profond', grey: 'Gris', ice: 'Gris clair' };

routes.avatar = (arg) => {
  const first = arg === 'first';
  const look = JSON.parse(JSON.stringify(store.s.look));
  let tab = 'corps', mode = 'split', photoURL = null, hideBmi = hidden();
  app.innerHTML = `
  <div class="view editor">
    ${topbar('TON AVATAR', first ? '#welcome' : '#home', `<button class="btn primary sm" id="save">Enregistrer</button>`)}
    <div class="pad-x"><div class="seg" id="mode"><button data-m="split" class="on">Avec ma photo</button><button data-m="overlay">Superposé</button><button data-m="solo">Avatar seul</button></div></div>
    <section class="editor-stage mode-split" id="stage">
      <div class="photo-panel" id="photo">
        <div class="photo-empty">${icon('camera', 30)}<b>Ta photo de face</b><span>Règle les curseurs pour que l’avatar te ressemble</span>
          <label class="btn ghost sm">Importer<input type="file" accept="image/*" id="photo-in" hidden></label>
          <span class="tiny muted">${icon('lock', 11)} Reste sur ton téléphone</span></div>
      </div>
      <div class="avatar-slot" id="slot"></div>
    </section>
    <nav class="chips-row" id="tabs" aria-label="Catégories">${[['corps', 'Corps'], ['visage', 'Visage'], ['cheveux', 'Cheveux'], ['peau', 'Peau'], ['tenue', 'Tenue']].map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</nav>
    <div class="panel" id="panel"></div>
  </div>`;
  mountAvatar($('#slot'));
  // photo existante : la dernière étape avec photo
  const lastPhoto = [...store.s.steps].reverse().find((x) => x.hasPhoto);
  const setPhoto = (url) => { photoURL = url; $('#photo').innerHTML = `<img src="${url}" alt="Ta photo"><label class="btn ghost sm change">Changer<input type="file" accept="image/*" id="photo-in2" hidden></label>`; $('#stage').style.setProperty('--photo', `url("${url}")`); bindPhoto(); };
  const bindPhoto = () => { for (const id of ['photo-in', 'photo-in2']) { const el = document.getElementById(id); if (el) el.onchange = (e) => { const f = e.target.files[0]; if (f) setPhoto(URL.createObjectURL(f)); }; } };
  bindPhoto();
  if (lastPhoto) idb.get('photo-' + lastPhoto.id).then((b) => b && setPhoto(URL.createObjectURL(b)));

  let pending = false;
  const apply = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; avatar?.setLook(look); }); };
  const sw = (key, list, cls = '') => `<div class="swatches ${cls}">${list.map(([c, n]) => `<button class="sw ${look[key] === c ? 'on' : ''}" style="--c:${c}" data-k="${key}" data-v="${c}" aria-label="${esc(n)}" title="${esc(n)}"></button>`).join('')}<label class="sw custom" title="Autre couleur" aria-label="Autre couleur"><input type="color" data-k="${key}" value="${/^#/.test(look[key]) ? look[key] : '#ffffff'}"></label></div>`;
  const chips = (key, list) => `<div class="chips">${list.map(([v, n]) => `<button class="chip-btn ${look[key] === v ? 'on' : ''}" data-k="${key}" data-v="${v === null ? '' : v}">${esc(n)}</button>`).join('')}</div>`;
  const slider = (key, label, min, max, step, val, unit = '', sub = false) => `
    <label class="slider"><span class="row between"><span>${label}</span><output>${unit === 'z' ? (val > 0 ? '+' : '') + Math.round(val * 100) : unit === 'p' ? Math.round(val * 100) + ' %' : fmt(val, step < 1 ? 1 : 0) + unit}</output></span>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-s="${key}" ${sub ? 'data-sub="1"' : ''}></label>`;
  const bmi = () => look.weight / Math.pow(look.height / 100, 2);
  const panels = {
    corps: () => `
      <div class="grid3">
        <div class="stat"><span>TAILLE</span><b id="o-h">${look.height} cm</b></div>
        <div class="stat"><span>POIDS</span><b id="o-w">${hideBmi ? '•••' : look.weight + ' kg'}</b></div>
        <button class="stat" id="bmi" aria-label="Afficher ou masquer l’IMC"><span>IMC ${icon('eye', 12)}</span><b id="o-b">${hideBmi ? 'masqué' : fmt(bmi(), 1)}</b></button>
      </div>
      <p class="tiny muted">L’IMC sert seulement de point de départ à la silhouette : il ne distingue pas le muscle de la graisse.</p>
      <div class="kicker mt12">BASE</div>
      ${slider('sex', 'Silhouette · féminine ↔ masculine', 0, 1, 0.01, look.sex, 'p')}
      ${slider('height', 'Taille', 140, 210, 1, look.height, ' cm')}
      ${slider('weight', 'Poids', 40, 160, 0.5, look.weight, ' kg')}
      ${slider('muscle', 'Musculature', 0, 1, 0.01, look.muscle, 'p')}
      <div class="kicker mt12">AJUSTEMENTS PAR ZONE</div>
      ${ZONES.map(([k, l]) => slider(k, l, -1, 1, 0.01, look.d[k] || 0, 'z', true)).join('')}
      <button class="btn ghost sm mt12" id="reset-zones">Remettre les zones à zéro</button>`,
    visage: () => `
      <div class="kicker">YEUX</div>
      <div class="swatches eyes">${EYE_COLORS.map((c) => `<button class="sw eye ${look.eyes === c ? 'on' : ''}" style="background-image:url(eye-${c}.webp)" data-k="eyes" data-v="${c}" aria-label="${EYE_NAMES[c]}" title="${EYE_NAMES[c]}"></button>`).join('')}</div>
      <div class="kicker mt12">SOURCILS</div>
      ${chips('brows', BROWS.map((b, i) => [b, `Style ${i + 1}`]))}
      <p class="tiny muted mt12">Les sourcils prennent la couleur des cheveux (onglet Cheveux).</p>`,
    cheveux: () => `<div class="kicker">COUPE</div>${chips('hair', HAIRS)}<div class="kicker mt12">COULEUR (CHEVEUX ET SOURCILS)</div>${sw('hairColor', HAIR_COLORS)}`,
    peau: () => `<div class="kicker">TEINTE DE PEAU</div><div class="swatches big">${SKIN_TONES.map((t, i) => `<button class="sw skin ${look.skin === i ? 'on' : ''}" style="--c:${t.sw}" data-k="skin" data-v="${i}" aria-label="${t.name}" title="${t.name}"></button>`).join('')}</div>`,
    tenue: () => `
      <div class="kicker">HAUT</div>${chips('top', look.sex < 0.5 ? TOPS.filter((t) => t[0]) : TOPS)}
      <div class="kicker mt12">COULEUR DU HAUT</div>${sw('topColor', CLOTH_COLORS)}
      <div class="kicker mt12">BAS</div>${chips('bottom', BOTTOMS)}
      <div class="kicker mt12">COULEUR DU BAS</div>${sw('bottomColor', CLOTH_COLORS)}
      <div class="kicker mt12">CHAUSSURES</div>${chips('shoes', SHOES)}
      <div class="kicker mt12">ACCESSOIRE</div><div class="chips"><button class="chip-btn ${look.watch ? 'on' : ''}" id="watch">Montre</button></div>`
  };
  const panel = $('#panel');
  const draw = () => { panel.innerHTML = panels[tab](); };
  draw();
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; [...$('#tabs').children].forEach((x) => x.classList.toggle('on', x === b)); draw(); panel.scrollTop = 0; });
  $('#mode').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; [...$('#mode').children].forEach((x) => x.classList.toggle('on', x === b)); $('#stage').className = 'editor-stage mode-' + mode; avatar?._resize(); });
  panel.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.s) {
      const v = +t.value, k = t.dataset.s;
      if (t.dataset.sub) look.d[k] = v; else look[k] = v;
      const out = t.parentElement.querySelector('output');
      if (out) out.textContent = t.dataset.sub ? (v > 0 ? '+' : '') + Math.round(v * 100) : k === 'height' ? v + ' cm' : k === 'weight' ? fmt(v, 1) + ' kg' : Math.round(v * 100) + ' %';
      if (k === 'height' || k === 'weight') { $('#o-h').textContent = look.height + ' cm'; $('#o-w').textContent = hideBmi ? '•••' : fmt(look.weight, 1) + ' kg'; $('#o-b').textContent = hideBmi ? 'masqué' : fmt(bmi(), 1); }
      apply();
    } else if (t.type === 'color') { look[t.dataset.k] = t.value; apply(); }
  });
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'bmi') { hideBmi = !hideBmi; draw(); return; }
    if (b.id === 'reset-zones') { for (const k of Object.keys(look.d)) look.d[k] = 0; draw(); apply(); return; }
    if (b.id === 'watch') { look.watch = !look.watch; b.classList.toggle('on', look.watch); apply(); return; }
    const k = b.dataset.k; if (!k) return;
    let v = b.dataset.v;
    if (k === 'skin') v = +v; else if (v === '') v = null;
    look[k] = v;
    if (k === 'top' && !v && look.sex < 0.5) look.top = 'g-crop';
    b.parentElement.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); b.classList.add('on');
    apply();
  });
  $('#save').addEventListener('click', () => {
    store.s.look = JSON.parse(JSON.stringify(look));
    if (first) { store.s.onboarded = true; }
    store.save();
    toast('Avatar enregistré');
    location.hash = first ? '#train' : '#home';
    if (first) setTimeout(() => toast('Choisis ton programme pour commencer'), 300);
  });
  return () => { if (photoURL) URL.revokeObjectURL(photoURL); if (avatar && JSON.stringify(avatar.look) !== JSON.stringify(store.s.look)) avatar.setLook(store.s.look); };
};

// ---------------------------------------------------------------- programmes et historique muscu
routes.train = () => {
  const s = store.s, cur = PROGRAMS[s.program.id], next = nextSession();
  const hist = [...s.workouts].sort((a, b) => b.date - a.date).slice(0, 8);
  app.innerHTML = `
  <div class="view">
    <header class="brandbar"><h1 class="h-display">ENTRAÎNEMENT</h1></header>
    <section class="pad">
      <div class="card hero">
        <span class="kicker">PROGRAMME ACTIF</span>
        <div class="h-card">${esc(cur.name).toUpperCase()}</div>
        <div class="muted small">${esc(cur.tag)} · ${esc(cur.level)}</div>
        <p class="small">${esc(cur.desc)}</p>
        <div class="list">${cur.sessions.slice(0, cur.weekly ? 8 : 10).map((x, i) => `
          <a class="list-item ${i === next.index ? 'next' : ''}" href="${x.type === 'run' ? '#runlive-' + i : '#session-' + i}">
            <span class="dot">${icon(x.type === 'run' ? 'run' : 'lift', 16)}</span>
            <span class="grow"><b>${esc(x.title)}</b><small>${x.type === 'run' ? hms(x.segments.reduce((a, y) => a + y[1], 0)) + ' guidée' : x.items.length + ' exercices'}</small></span>
            ${i === next.index ? '<span class="tag">À FAIRE</span>' : icon('play', 14)}
          </a>`).join('')}</div>
      </div>
      <div class="kicker mt20">CHANGER DE PROGRAMME</div>
      <div class="list">${Object.entries(PROGRAMS).map(([id, p]) => `
        <button class="list-item ${id === s.program.id ? 'active' : ''}" data-prog="${id}">
          <span class="grow"><b>${esc(p.name)}</b><small>${esc(p.tag)} · ${esc(p.level)}</small></span>
          ${id === s.program.id ? '<span class="tag">ACTIF</span>' : '<span class="muted small">Choisir</span>'}
        </button>`).join('')}</div>
      <div class="kicker mt20">HISTORIQUE</div>
      ${hist.length ? `<div class="list">${hist.map((w) => `<div class="list-item"><span class="dot">${icon('lift', 16)}</span><span class="grow"><b>${esc(w.title)}</b><small>${dateFr(w.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${hms(w.durationS)} · ${w.doneSets} séries${hidden() ? '' : ' · ' + fmt(w.volume / 1000, 1) + ' t'}</small></span>${w.prs && w.prs.length ? `<span class="tag">${w.prs.length} PR</span>` : ''}</div>`).join('')}</div>` : '<p class="muted small">Tes séances terminées apparaîtront ici.</p>'}
    </section>
  </div>${nav('train')}`;
  app.querySelectorAll('[data-prog]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.prog === s.program.id) return;
    s.program = { id: b.dataset.prog, index: 0, started: Date.now() }; store.save(); toast('Programme activé : ' + PROGRAMS[b.dataset.prog].name); render();
  }));
};

// ---------------------------------------------------------------- séance muscu en direct
function lastSetsFor(exId) {
  const w = [...store.s.workouts].sort((a, b) => b.date - a.date).find((x) => x.sets.some((y) => y.ex === exId && y.done));
  return w ? w.sets.filter((y) => y.ex === exId && y.done) : [];
}
routes.session = (arg) => {
  const p = PROGRAMS[store.s.program.id];
  const idx = Math.min(+arg || 0, p.sessions.length - 1);
  const sess = p.sessions[idx];
  if (!sess || sess.type !== 'lift') { location.hash = '#train'; return; }
  const draftKey = 'kinetic.draft';
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(draftKey) || 'null'); } catch (e) { draft = null; }
  if (!draft || draft.prog !== store.s.program.id || draft.idx !== idx) {
    draft = { prog: store.s.program.id, idx, start: Date.now(), ex: sess.items.map((it) => {
      const prev = lastSetsFor(it.id);
      return { id: it.id, rest: it.rest, sets: Array.from({ length: it.s }, (_, k) => ({ kg: prev[k]?.kg ?? prev[prev.length - 1]?.kg ?? (EXERCISES[it.id].kind === 'charge' ? 20 : 0), reps: it.r, prev: prev[k] ? `${prev[k].kg ? fmt(prev[k].kg, 1) + ' × ' : ''}${prev[k].reps}` : '—', done: false })) };
    }) };
  }
  const save = () => localStorage.setItem(draftKey, JSON.stringify(draft));
  save();
  let rest = 0, restMax = 90, timer = null;
  const doneCount = () => draft.ex.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
  const totalSets = () => draft.ex.reduce((a, e) => a + e.sets.length, 0);
  app.innerHTML = `
  <div class="view live">
    <header class="topbar"><a class="icon-btn" href="#train" aria-label="Quitter (la séance reste en brouillon)">${icon('close')}</a>
      <div class="center"><div class="kicker muted">${esc(sess.title).toUpperCase()}</div><div class="h-num" id="elapsed">00:00</div></div>
      <span class="chip volt-text" id="xp">+0 XP</span></header>
    <div class="pad-x"><div class="progress"><i id="prog"></i></div></div>
    <div class="pad" id="exlist"></div>
    <div class="restbar" id="restbar" hidden>
      <div class="ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" class="track"/><circle cx="50" cy="50" r="44" class="val" id="ringv" stroke-dasharray="276.5"/></svg><div><span>REPOS</span><b id="restt">01:30</b></div></div>
      <div class="rest-btns"><button class="btn ghost sm" data-rest="-15">−15 s</button><button class="btn ghost sm" data-rest="15">+15 s</button><button class="btn outline sm" data-rest="0">Passer</button></div>
    </div>
    <div class="pad bottom-cta"><button class="btn primary big" id="finish">TERMINER LA SÉANCE</button></div>
  </div>`;
  const list = $('#exlist');
  const drawEx = () => {
    list.innerHTML = draft.ex.map((e, ei) => {
      const E = EXERCISES[e.id], time = E.kind === 'time', charge = E.kind === 'charge';
      const cur = e.sets.findIndex((x) => !x.done);
      return `<article class="excard">
        <h2 class="h-ex">${esc(E.name).toUpperCase()}</h2>
        <div class="chips small">${E.muscles.map((m) => `<span class="chip">${esc(m)}</span>`).join('')}</div>
        <p class="muted small">${esc(E.cue)}</p>
        <div class="sets">
          <div class="sets-h"><span>SÉRIE</span><span>PRÉCÉDENT</span><span>${charge ? 'KG' : ''}</span><span>${time ? 'SEC' : 'REPS'}</span><span></span></div>
          ${e.sets.map((x, si) => `<div class="set ${si === cur ? 'cur' : ''} ${x.done ? 'done' : ''}">
            <b>${si + 1}</b><span class="muted">${esc(x.prev)}</span>
            ${charge ? `<input type="number" inputmode="decimal" step="0.5" value="${x.kg}" data-e="${ei}" data-s="${si}" data-f="kg" aria-label="Charge série ${si + 1}">` : '<span></span>'}
            <input type="number" inputmode="numeric" value="${x.reps}" data-e="${ei}" data-s="${si}" data-f="reps" aria-label="${time ? 'Secondes' : 'Répétitions'} série ${si + 1}">
            <button class="check" data-e="${ei}" data-s="${si}" aria-label="${x.done ? 'Annuler' : 'Valider'} la série ${si + 1}">${icon('check', 20)}</button>
          </div>`).join('')}
        </div>
        <button class="btn text sm" data-add="${ei}">+ Ajouter une série</button>
      </article>`;
    }).join('');
    const d = doneCount();
    $('#prog').style.width = Math.round((d / totalSets()) * 100) + '%';
    $('#xp').textContent = `+${50 + d * 10} XP`;
  };
  drawEx();
  list.addEventListener('input', (ev) => { const t = ev.target; if (!t.dataset.f) return; draft.ex[+t.dataset.e].sets[+t.dataset.s][t.dataset.f] = +t.value; save(); });
  list.addEventListener('click', (ev) => {
    const add = ev.target.closest('[data-add]');
    if (add) { const e = draft.ex[+add.dataset.add]; const l = e.sets[e.sets.length - 1]; e.sets.push({ kg: l.kg, reps: l.reps, prev: '—', done: false }); save(); drawEx(); return; }
    const b = ev.target.closest('.check'); if (!b) return;
    const e = draft.ex[+b.dataset.e], x = e.sets[+b.dataset.s];
    x.done = !x.done; save(); drawEx();
    if (x.done) { restMax = e.rest; rest = e.rest; $('#restbar').hidden = false; if (navigator.vibrate) navigator.vibrate(20); }
  });
  $('#restbar').addEventListener('click', (ev) => { const b = ev.target.closest('[data-rest]'); if (!b) return; const v = +b.dataset.rest; rest = v === 0 ? 0 : Math.max(0, rest + v); if (v > 0) restMax = Math.max(restMax, rest); });
  timer = setInterval(() => {
    $('#elapsed').textContent = mmss((Date.now() - draft.start) / 1000);
    if (rest > 0) {
      rest -= 1;
      $('#restt').textContent = mmss(rest);
      $('#ringv').style.strokeDashoffset = String(276.5 * (1 - rest / restMax));
      if (rest === 0) { $('#restbar').hidden = true; if (navigator.vibrate) navigator.vibrate([120, 80, 120]); toast('Repos terminé : série suivante !'); }
    }
  }, 1000);
  $('#finish').addEventListener('click', () => {
    const d = doneCount();
    if (!d) { toast('Valide au moins une série'); return; }
    const sets = [], prs = [];
    let volume = 0;
    for (const e of draft.ex) for (const x of e.sets) {
      sets.push({ ex: e.id, kg: x.kg, reps: x.reps, done: x.done });
      if (!x.done) continue;
      if (EXERCISES[e.id].kind === 'charge') {
        volume += x.kg * x.reps;
        const est = epley(x.kg, x.reps), rec = store.s.records[e.id];
        if (x.kg > 0 && (!rec || est > rec.e1rm + 0.01)) {
          if (rec && !prs.includes(e.id)) prs.push(e.id);
          store.s.records[e.id] = { e1rm: est, kg: x.kg, reps: x.reps, date: Date.now() };
        }
      }
    }
    const durationS = Math.round((Date.now() - draft.start) / 1000);
    const xp = 50 + d * 10 + prs.length * 30;
    store.s.workouts.push({ id: uid(), date: Date.now(), type: 'lift', title: sess.title, sets, doneSets: d, durationS, volume, xp, prs });
    store.s.xp += xp;
    advanceProgram();
    const badges = checkBadges();
    store.save();
    localStorage.removeItem(draftKey);
    location.hash = '#home';
    setTimeout(() => {
      avatar?.play('cheer', 2600);
      celebrate('SÉANCE TERMINÉE', [`${d} séries · ${hms(durationS)}${hidden() ? '' : ' · ' + fmt(volume / 1000, 2) + ' t soulevées'}`, `+${xp} XP`, ...prs.map((id) => `Nouveau record : ${EXERCISES[id].name} (${fmt(store.s.records[id].e1rm, 0)} kg estimés)`), ...badges.map((b) => `Badge débloqué : ${b.name}`)]);
    }, 350);
  });
  return () => clearInterval(timer);
};

// ---------------------------------------------------------------- course
function parseGPX(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const pts = [...doc.getElementsByTagName('trkpt')].map((p) => ({ lat: +p.getAttribute('lat'), lon: +p.getAttribute('lon'), t: p.getElementsByTagName('time')[0] ? Date.parse(p.getElementsByTagName('time')[0].textContent) : null }));
  if (pts.length < 2) throw new Error('Aucun tracé trouvé dans ce fichier');
  const R = 6371, rad = Math.PI / 180;
  let km = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    km += 2 * R * Math.asin(Math.sqrt(h));
  }
  const t0 = pts.find((p) => p.t)?.t, t1 = [...pts].reverse().find((p) => p.t)?.t;
  return { km, durationS: t0 && t1 ? Math.round((t1 - t0) / 1000) : 0, date: t0 || Date.now() };
}
function saveRun(r) {
  const xp = 20 + Math.round(r.km * 10);
  store.s.runs.push(Object.assign({ id: uid(), xp }, r));
  store.s.xp += xp;
  const badges = checkBadges();
  store.save();
  return { xp, badges };
}
routes.run = () => {
  const s = store.s, runs = [...s.runs].sort((a, b) => b.date - a.date);
  const p = PROGRAMS[s.program.id], runSessions = p.sessions.map((x, i) => [x, i]).filter(([x]) => x.type === 'run');
  const weeks = Array.from({ length: 8 }, (_, i) => weekKey(Date.now()) - (7 - i) * 7 * 864e5);
  const kmW = weeks.map((w) => s.runs.filter((r) => weekKey(r.date) === w).reduce((a, r) => a + r.km, 0));
  const best5 = s.runs.filter((r) => r.km >= 5 && r.durationS).sort((a, b) => a.durationS / a.km - b.durationS / b.km)[0];
  app.innerHTML = `
  <div class="view">
    <header class="brandbar"><h1 class="h-display">COURSE</h1></header>
    <section class="pad">
      ${runSessions.length ? `<div class="card hero"><span class="kicker">SÉANCES GUIDÉES · ${esc(p.name).toUpperCase()}</span><div class="list">${runSessions.map(([x, i]) => `<a class="list-item" href="#runlive-${i}"><span class="dot">${icon('run', 16)}</span><span class="grow"><b>${esc(x.title)}</b><small>${hms(x.segments.reduce((a, y) => a + y[1], 0))}</small></span>${icon('play', 14)}</a>`).join('')}</div></div>` : `<div class="card"><span class="kicker">SÉANCE GUIDÉE</span><p class="small muted">Ton programme actuel ne contient pas de course. Choisis « De 0 à 5 km », « Objectif 10 km » ou un programme hybride dans l’onglet Muscu, ou lance une sortie libre.</p><a class="btn outline" href="#runlive-free">${icon('play', 16)} Sortie libre chronométrée</a></div>`}
      <div class="card mt12">
        <span class="kicker">ENREGISTRER UNE COURSE</span>
        <div class="grid3 mt8">
          <label class="field"><span>Distance (km)</span><input id="r-km" type="number" inputmode="decimal" step="0.01" placeholder="5,0"></label>
          <label class="field"><span>Durée (min)</span><input id="r-min" type="number" inputmode="numeric" placeholder="28"></label>
          <label class="field"><span>Secondes</span><input id="r-sec" type="number" inputmode="numeric" placeholder="30"></label>
        </div>
        <div class="row between mt8"><span class="muted small">Allure : <b id="r-pace">—</b></span>
          <label class="btn ghost sm">${icon('upload', 16)} Importer un GPX<input type="file" accept=".gpx,application/gpx+xml" id="gpx" hidden></label></div>
        <button class="btn primary mt12" id="r-save">Enregistrer</button>
        <p class="tiny muted mt8">Le suivi GPS en direct est peu fiable dans une appli web quand l’écran est verrouillé : exporte plutôt ta course en GPX depuis ta montre ou Strava.</p>
      </div>
      <div class="grid3 mt12">
        <div class="stat"><span>CETTE SEMAINE</span><b>${hidden() ? '•••' : fmt(kmW[7], 1) + ' km'}</b></div>
        <div class="stat"><span>TOTAL</span><b>${hidden() ? '•••' : fmt(s.runs.reduce((a, r) => a + r.km, 0), 0) + ' km'}</b></div>
        <div class="stat"><span>MEILLEUR 5 KM+</span><b class="small-b">${best5 ? pace(best5.km, best5.durationS) : '—'}</b></div>
      </div>
      <div class="card mt12"><span class="kicker">KILOMÈTRES PAR SEMAINE</span>${bars(kmW, weeks.map((w) => dateFr(w, { day: 'numeric', month: 'numeric' })), (v) => fmt(v, 1))}</div>
      <div class="kicker mt20">DERNIÈRES COURSES</div>
      ${runs.length ? `<div class="list">${runs.slice(0, 12).map((r) => `<div class="list-item"><span class="dot">${icon('run', 16)}</span><span class="grow"><b>${hidden() ? esc(r.title || 'Course') : fmt(r.km, 2) + ' km'} · ${r.durationS ? pace(r.km, r.durationS) : ''}</b><small>${dateFr(r.date, { weekday: 'short', day: 'numeric', month: 'short' })}${r.durationS ? ' · ' + hms(r.durationS) : ''}${r.title ? ' · ' + esc(r.title) : ''}</small></span></div>`).join('')}</div>` : '<p class="muted small">Aucune course pour l’instant.</p>'}
    </section>
  </div>${nav('run')}`;
  const upd = () => { const km = +$('#r-km').value, t = (+$('#r-min').value || 0) * 60 + (+$('#r-sec').value || 0); $('#r-pace').textContent = km && t ? pace(km, t) : '—'; };
  ['r-km', 'r-min', 'r-sec'].forEach((id) => $('#' + id).addEventListener('input', upd));
  $('#r-save').addEventListener('click', () => {
    const km = +$('#r-km').value, t = (+$('#r-min').value || 0) * 60 + (+$('#r-sec').value || 0);
    if (!(km > 0)) { toast('Indique la distance'); return; }
    const { xp, badges } = saveRun({ date: Date.now(), km, durationS: t, title: 'Course', source: 'manuel' });
    celebrate('COURSE ENREGISTRÉE', [`${fmt(km, 2)} km${t ? ' · ' + pace(km, t) : ''}`, `+${xp} XP`, ...badges.map((b) => 'Badge débloqué : ' + b.name)]);
    render();
  });
  $('#gpx').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const r = parseGPX(await f.text());
      const { xp, badges } = saveRun({ date: r.date, km: Math.round(r.km * 100) / 100, durationS: r.durationS, title: f.name.replace(/\.gpx$/i, ''), source: 'gpx' });
      celebrate('COURSE IMPORTÉE', [`${fmt(r.km, 2)} km${r.durationS ? ' · ' + pace(r.km, r.durationS) : ''}`, `+${xp} XP`, ...badges.map((b) => 'Badge débloqué : ' + b.name)]);
      render();
    } catch (err) { toast(err.message || 'Fichier GPX illisible'); }
  });
};

routes.runlive = (arg) => {
  const p = PROGRAMS[store.s.program.id];
  const free = arg === 'free';
  const sess = free ? { title: 'Sortie libre', segments: [['course', 0]], note: 'Lance le chrono et cours à ton rythme.' } : p.sessions[+arg];
  if (!sess || (!free && sess.type !== 'run')) { location.hash = '#run'; return; }
  const segs = sess.segments;
  const total = segs.reduce((a, x) => a + x[1], 0);
  let i = 0, left = segs[0][1], elapsed = 0, running = false, timer = null;
  const LABEL = { marche: 'MARCHE', course: 'COURSE', facile: 'FOOTING FACILE', rapide: 'RAPIDE', 'récup': 'RÉCUPÉRATION' };
  app.innerHTML = `
  <div class="view live run-live">
    ${topbar(esc(sess.title).toUpperCase(), '#run')}
    <section class="pad center">
      <div class="seg-label" id="lab">${LABEL[segs[0][0]] || 'COURSE'}</div>
      <div class="big-time" id="time">${free ? '00:00' : mmss(left)}</div>
      <div class="muted" id="nextl">${free ? 'Chrono libre' : segs[1] ? 'Ensuite : ' + (LABEL[segs[1][0]] || '') + ' · ' + mmss(segs[1][1]) : 'Dernier bloc'}</div>
      ${free ? '' : `<div class="progress mt20"><i id="tp"></i></div><div class="row between tiny muted mt8"><span id="el">00:00</span><span>${mmss(total)}</span></div>`}
      <p class="small muted mt20">${esc(sess.note || '')}</p>
      <div class="row center gap12 mt20">
        <button class="btn primary round" id="pp" aria-label="Démarrer">${icon('play', 28)}</button>
        ${free ? '' : `<button class="btn ghost round" id="skip" aria-label="Bloc suivant">${icon('skip', 24)}</button>`}
      </div>
      <button class="btn outline mt20" id="end">Terminer et enregistrer</button>
    </section>
  </div>`;
  const tick = () => {
    elapsed++;
    if (free) { $('#time').textContent = mmss(elapsed); return; }
    left--;
    if (left <= 0) next();
    $('#time').textContent = mmss(Math.max(0, left));
    $('#el').textContent = mmss(elapsed);
    $('#tp').style.width = Math.min(100, (elapsed / total) * 100) + '%';
  };
  const next = () => {
    i++;
    if (i >= segs.length) { stop(); finish(); return; }
    left = segs[i][1];
    $('#lab').textContent = LABEL[segs[i][0]] || '';
    $('#lab').className = 'seg-label ' + (['course', 'rapide'].includes(segs[i][0]) ? 'hot' : '');
    $('#nextl').textContent = segs[i + 1] ? 'Ensuite : ' + (LABEL[segs[i + 1][0]] || '') + ' · ' + mmss(segs[i + 1][1]) : 'Dernier bloc';
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };
  const start = () => { running = true; timer = setInterval(tick, 1000); $('#pp').innerHTML = icon('pause', 28); $('#pp').setAttribute('aria-label', 'Pause'); };
  const stop = () => { running = false; clearInterval(timer); $('#pp').innerHTML = icon('play', 28); $('#pp').setAttribute('aria-label', 'Reprendre'); };
  const finish = async () => {
    const km = await ask({ title: 'Distance parcourue', text: `Durée : ${hms(elapsed)}`, input: { label: 'Distance (km)', type: 'text', mode: 'decimal', placeholder: '5,0' }, ok: 'Enregistrer' });
    const v = parseFloat(String(km || '').replace(',', '.'));
    if (!(v > 0)) { toast('Course non enregistrée'); return; }
    const { xp, badges } = saveRun({ date: Date.now(), km: v, durationS: elapsed, title: sess.title, source: 'guidée' });
    if (!free) advanceProgram();
    store.save();
    location.hash = '#home';
    setTimeout(() => { avatar?.play('cheer', 2600); celebrate('SORTIE TERMINÉE', [`${fmt(v, 2)} km · ${pace(v, elapsed)}`, `+${xp} XP`, ...badges.map((b) => 'Badge débloqué : ' + b.name)]); }, 350);
  };
  $('#lab').className = 'seg-label ' + (['course', 'rapide'].includes(segs[0][0]) ? 'hot' : '');
  $('#pp').addEventListener('click', () => (running ? stop() : start()));
  $('#skip')?.addEventListener('click', () => { next(); });
  $('#end').addEventListener('click', () => { stop(); finish(); });
  let wake = null;
  if (navigator.wakeLock) navigator.wakeLock.request('screen').then((w) => { wake = w; }).catch(() => {});
  return () => { clearInterval(timer); wake?.release?.(); };
};

// ---------------------------------------------------------------- graphiques
function bars(vals, labels, f = (v) => v) {
  const max = Math.max(1, ...vals);
  return `<div class="bars" role="img" aria-label="Graphique en barres">${vals.map((v, i) => `<div class="b"><span class="v">${v ? (hidden() ? '' : f(v)) : ''}</span><i style="height:${Math.round((v / max) * 100)}%" class="${i === vals.length - 1 ? 'now' : ''}"></i><small>${labels[i]}</small></div>`).join('')}</div>`;
}
function line(points, f = (v) => v) {
  if (points.length < 2) return '<p class="muted small">Ajoute au moins deux étapes pour voir la courbe.</p>';
  const W = 320, H = 120, ys = points.map((p) => p.v), min = Math.min(...ys), max = Math.max(...ys), r = max - min || 1;
  const xy = points.map((p, i) => [16 + (i * (W - 32)) / (points.length - 1), 12 + (1 - (p.v - min) / r) * (H - 34)]);
  return `<svg viewBox="0 0 ${W} ${H}" class="line" role="img" aria-label="Évolution"><polyline points="${xy.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#c8ff2e" stroke-width="2.5" stroke-linejoin="round"/>${xy.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4" fill="#0a0b0d" stroke="#c8ff2e" stroke-width="2"/>${i === 0 || i === xy.length - 1 ? `<text x="${x}" y="${y - 9}" text-anchor="middle">${hidden() ? '' : f(points[i].v)}</text>` : ''}<text x="${x}" y="${H - 4}" text-anchor="middle" class="lab">${points[i].l}</text>`).join('')}</svg>`;
}

// ---------------------------------------------------------------- progrès : frise, stats, records
routes.progress = (arg) => {
  const s = store.s;
  let tab = arg || 'frise';
  app.innerHTML = `
  <div class="view">
    <header class="brandbar"><h1 class="h-display">PROGRÈS</h1><button class="icon-btn" id="hide" aria-label="${hidden() ? 'Afficher' : 'Masquer'} les chiffres">${icon('eye', 20)}</button></header>
    <div class="pad-x"><div class="seg" id="ptabs"><button data-t="frise">Frise</button><button data-t="stats">Stats</button><button data-t="records">Records</button></div></div>
    <section class="pad" id="pbody"></section>
  </div>${nav('progress')}`;
  $('#hide').addEventListener('click', () => { s.profile.hideNumbers = !s.profile.hideNumbers; store.save(); routes.progress(tab); });
  const body = $('#pbody');
  const drawTab = async () => {
    [...$('#ptabs').children].forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
    if (tab === 'frise') {
      const steps = [...s.steps].sort((a, b) => a.date - b.date);
      if (!steps.length) {
        body.innerHTML = `<div class="card center"><div class="avatar-slot small-slot" id="slot"></div><b>Ta frise est vide</b><p class="muted small">Ajoute une étape (poids, mensurations, photo) : ton avatar actuel y est photographié pour comparer plus tard.</p><a class="btn primary" href="#step">${icon('plus', 16)} Ajouter une étape</a></div>`;
        mountAvatar($('#slot'));
        return;
      }
      let sel = 0, view = 'avatar';
      const drawF = async () => {
        const a = steps[sel], last = steps[steps.length - 1];
        const d = (k, u) => (a[k] && last[k] && a !== last ? (hidden() ? '•••' : `${last[k] - a[k] > 0 ? '+' : last[k] - a[k] < 0 ? '−' : ''}${fmt(Math.abs(last[k] - a[k]), 1)} ${u}`) : '—');
        body.innerHTML = `
          <div class="seg sm"><button data-v="avatar" class="${view === 'avatar' ? 'on' : ''}">Avatar</button><button data-v="photo" class="${view === 'photo' ? 'on' : ''}">Photos</button></div>
          <div class="compare mt12">
            <figure><figcaption>AVANT · ${dateFr(a.date).toUpperCase()}</figcaption><div class="cmp-img" id="cmpA"></div></figure>
            <figure class="now"><figcaption>MAINTENANT</figcaption><div class="cmp-img" id="cmpB">${view === 'avatar' ? '<div class="avatar-slot" id="slot"></div>' : ''}</div></figure>
          </div>
          <div class="grid3 mt12"><div class="stat"><span>POIDS</span><b class="volt">${d('weight', 'kg')}</b></div><div class="stat"><span>TOUR DE TAILLE</span><b class="volt">${d('waist', 'cm')}</b></div><div class="stat"><span>BRAS</span><b class="volt">${d('arm', 'cm')}</b></div></div>
          <div class="row between mt20"><span class="kicker">TA FRISE</span><span class="muted tiny">Touche une étape pour comparer</span></div>
          <div class="timeline" id="tl">${steps.map((x, i) => `<button class="tl-item ${i === sel ? 'on' : ''}" data-i="${i}" aria-label="Comparer avec le ${dateFr(x.date)}"><i></i><b>${dateFr(x.date)}</b><small>${i === 0 ? 'Départ' : hidden() || !x.weight ? '' : fmt(x.weight, 1) + ' kg'}</small></button>`).join('')}<a class="tl-item add" href="#step"><i>+</i><b>Ajouter</b><small>étape</small></a></div>
          ${a.note ? `<p class="small muted mt12">« ${esc(a.note)} »</p>` : ''}
          <button class="btn text sm mt12" id="del-step">${icon('trash', 14)} Supprimer cette étape</button>`;
        body.querySelector('.seg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { view = b.dataset.v; drawF(); } });
        $('#tl').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { sel = +b.dataset.i; drawF(); } });
        $('#del-step').addEventListener('click', async () => { if (!(await ask({ title: 'Supprimer cette étape ?', text: 'Sa photo sera aussi effacée de ton téléphone.', ok: 'Supprimer', danger: true }))) return; s.steps = s.steps.filter((x) => x.id !== a.id); await idb.del('photo-' + a.id); await idb.del('snap-' + a.id); store.save(); routes.progress('frise'); });
        const A = $('#cmpA');
        if (view === 'avatar') {
          const snap = await idb.get('snap-' + a.id);
          A.innerHTML = snap ? `<img src="${snap}" alt="Avatar au ${dateFr(a.date)}">` : '<span class="muted small">Aperçu indisponible</span>';
          mountAvatar($('#slot'));
        } else {
          const ph = await idb.get('photo-' + a.id), lp = [...steps].reverse().find((x) => x.hasPhoto);
          A.innerHTML = ph ? `<img src="${URL.createObjectURL(ph)}" alt="Photo au ${dateFr(a.date)}">` : `<span class="muted small center">${icon('camera', 26)}<br>Pas de photo</span>`;
          const pb = lp ? await idb.get('photo-' + lp.id) : null;
          $('#cmpB').innerHTML = pb ? `<img src="${URL.createObjectURL(pb)}" alt="Photo la plus récente">` : `<span class="muted small center">${icon('camera', 26)}<br>Pas de photo</span>`;
        }
      };
      drawF();
    } else if (tab === 'stats') {
      const weeks = Array.from({ length: 8 }, (_, i) => weekKey(Date.now()) - (7 - i) * 7 * 864e5);
      const lab = weeks.map((w) => dateFr(w, { day: 'numeric', month: 'numeric' }));
      const sess = weeks.map((w) => s.workouts.filter((x) => weekKey(x.date) === w).length + s.runs.filter((x) => weekKey(x.date) === w).length);
      const vol = weeks.map((w) => s.workouts.filter((x) => weekKey(x.date) === w).reduce((a, x) => a + x.volume, 0) / 1000);
      const km = weeks.map((w) => s.runs.filter((x) => weekKey(x.date) === w).reduce((a, x) => a + x.km, 0));
      const wpts = [...s.steps].sort((a, b) => a.date - b.date).filter((x) => x.weight).map((x) => ({ v: x.weight, l: dateFr(x.date, { day: 'numeric', month: 'numeric' }) }));
      body.innerHTML = `
        <div class="card"><span class="kicker">SÉANCES PAR SEMAINE</span>${bars(sess, lab)}</div>
        <div class="card mt12"><span class="kicker">VOLUME SOULEVÉ (TONNES)</span>${bars(vol, lab, (v) => fmt(v, 1))}</div>
        <div class="card mt12"><span class="kicker">KILOMÈTRES COURUS</span>${bars(km, lab, (v) => fmt(v, 1))}</div>
        <div class="card mt12"><span class="kicker">POIDS (ÉTAPES DE LA FRISE)</span>${hidden() ? '<p class="muted small">Chiffres masqués.</p>' : line(wpts, (v) => fmt(v, 1))}</div>`;
    } else {
      const recs = Object.entries(s.records).sort((a, b) => b[1].e1rm - a[1].e1rm);
      const runsBest = [...s.runs].sort((a, b) => b.km - a.km)[0];
      body.innerHTML = `
        <div class="kicker">RECORDS DE FORCE (1RM ESTIMÉ)</div>
        ${recs.length ? `<div class="list">${recs.map(([id, r]) => `<div class="list-item"><span class="dot">${icon('trophy', 16)}</span><span class="grow"><b>${esc(EXERCISES[id]?.name || id)}</b><small>${hidden() ? '' : fmt(r.kg, 1) + ' kg × ' + r.reps + ' · '}${dateFr(r.date)}</small></span><b class="volt">${hidden() ? '•••' : fmt(r.e1rm, 0) + ' kg'}</b></div>`).join('')}</div>` : '<p class="muted small">Valide des séries avec charge pour établir tes records.</p>'}
        <p class="tiny muted">1RM estimé avec la formule d’Epley : une estimation, pas un test maximal.</p>
        <div class="kicker mt20">COURSE</div>
        <div class="list"><div class="list-item"><span class="dot">${icon('road', 16)}</span><span class="grow"><b>Plus longue course</b><small>${runsBest ? dateFr(runsBest.date) : 'Aucune course'}</small></span><b class="volt">${runsBest ? (hidden() ? '•••' : fmt(runsBest.km, 2) + ' km') : '—'}</b></div></div>
        <div class="kicker mt20">BADGES · ${Object.keys(s.badges).length}/${BADGES.length}</div>
        <div class="badges">${BADGES.map((b) => `<div class="badge ${s.badges[b.id] ? 'on' : ''}"><span>${icon(b.icon, 22)}</span><b>${esc(b.name)}</b><small>${s.badges[b.id] ? dateFr(s.badges[b.id]) : esc(b.desc)}</small></div>`).join('')}</div>`;
    }
  };
  $('#ptabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; drawTab(); } });
  drawTab();
};

// ---------------------------------------------------------------- nouvelle étape
routes.step = () => {
  const s = store.s, last = [...s.steps].sort((a, b) => b.date - a.date)[0];
  let photo = null;
  app.innerHTML = `
  <div class="view">
    ${topbar('NOUVELLE ÉTAPE', '#progress')}
    <section class="pad">
      <div class="step-top"><div class="avatar-slot" id="slot"></div>
        <label class="photo-pick" id="pick">${icon('camera', 28)}<b>Photo de face</b><span>Facultatif</span><input type="file" accept="image/*" capture="user" id="ph" hidden></label></div>
      <p class="tiny muted">${icon('lock', 11)} La photo reste sur ton téléphone. Ton avatar actuel est enregistré avec l’étape.</p>
      <div class="grid3 mt12">
        <label class="field"><span>Poids (kg)</span><input id="s-w" type="number" inputmode="decimal" step="0.1" value="${s.look.weight}"></label>
        <label class="field"><span>Tour de taille</span><input id="s-t" type="number" inputmode="decimal" step="0.5" placeholder="cm" value="${last?.waist ?? ''}"></label>
        <label class="field"><span>Tour de bras</span><input id="s-a" type="number" inputmode="decimal" step="0.5" placeholder="cm" value="${last?.arm ?? ''}"></label>
      </div>
      <label class="field"><span>Note</span><input id="s-n" maxlength="120" placeholder="Ressenti, objectif…"></label>
      <label class="check-row"><input type="checkbox" id="s-upd" checked> Mettre à jour le poids de mon avatar</label>
      <a class="btn ghost mt8" href="#avatar">Ajuster d’abord mon avatar</a>
      <button class="btn primary big mt12" id="s-save">AJOUTER À MA FRISE</button>
    </section>
  </div>`;
  mountAvatar($('#slot'));
  $('#ph').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return; photo = f;
    $('#pick').innerHTML = `<img src="${URL.createObjectURL(f)}" alt="Photo choisie">`;
  });
  $('#s-save').addEventListener('click', async () => {
    const w = +$('#s-w').value;
    if ($('#s-upd').checked && w > 30 && w < 250) { s.look.weight = w; await avatar?.setLook(s.look); }
    const id = uid();
    const step = { id, date: Date.now(), weight: w || null, waist: +$('#s-t').value || null, arm: +$('#s-a').value || null, note: $('#s-n').value.trim(), look: JSON.parse(JSON.stringify(s.look)), hasPhoto: !!photo };
    try {
      if (photo) await idb.put('photo-' + id, await shrink(photo, 1100));
      if (avatar) { avatar.yaw = -0.18; await new Promise((r) => setTimeout(r, 60)); await idb.put('snap-' + id, avatar.snapshot(360, 640)); }
    } catch (e) { console.warn(e); }
    s.steps.push(step);
    s.xp += 50;
    const badges = checkBadges();
    store.save();
    location.hash = '#progress-frise';
    setTimeout(() => celebrate('ÉTAPE AJOUTÉE', ['+50 XP', ...badges.map((b) => 'Badge débloqué : ' + b.name)]), 300);
  });
};
async function shrink(file, max) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
}

// ---------------------------------------------------------------- réglages
routes.reglages = () => {
  const s = store.s;
  app.innerHTML = `
  <div class="view">
    ${topbar('RÉGLAGES', '#home')}
    <section class="pad">
      <label class="field"><span>Prénom</span><input id="st-name" value="${esc(s.profile.name)}" maxlength="24"></label>
      <label class="field"><span>Objectif de séances par semaine</span><input id="st-goal" type="number" min="1" max="14" value="${s.profile.goal}"></label>
      <label class="check-row"><input type="checkbox" id="st-hide" ${s.profile.hideNumbers ? 'checked' : ''}> Masquer les chiffres (poids, IMC, volumes)</label>
      <button class="btn primary mt12" id="st-save">Enregistrer</button>
      <div class="kicker mt20">MES DONNÉES</div>
      <p class="small muted">Tout est stocké sur ce téléphone, sans compte ni serveur. Pense à exporter une sauvegarde de temps en temps (les photos ne sont pas incluses).</p>
      <div class="grid2"><button class="btn ghost" id="st-exp">${icon('download', 16)} Exporter</button><label class="btn ghost">${icon('upload', 16)} Importer<input type="file" accept="application/json" id="st-imp" hidden></label></div>
      <button class="btn danger mt12" id="st-reset">${icon('trash', 16)} Tout effacer</button>
      <div class="kicker mt20">À PROPOS</div>
      <p class="small muted">Kinetic · application gratuite. Avatar 3D construit avec les ressources CC0 de la communauté MakeHuman et Three.js (licence MIT).</p>
      <p class="small muted">Les programmes sont des modèles généraux : adapte les charges à ton niveau et demande conseil à un professionnel de santé en cas de douleur ou de problème médical.</p>
    </section>
  </div>`;
  $('#st-save').addEventListener('click', () => {
    s.profile.name = $('#st-name').value.trim().slice(0, 24);
    s.profile.goal = Math.max(1, Math.min(14, +$('#st-goal').value || 3));
    s.profile.hideNumbers = $('#st-hide').checked;
    store.save(); toast('Réglages enregistrés');
  });
  $('#st-exp').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([store.export()], { type: 'application/json' }));
    a.download = `kinetic-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  });
  $('#st-imp').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { store.import(await f.text()); avatar?.setLook(store.s.look); toast('Sauvegarde importée'); location.hash = '#home'; } catch (err) { toast('Fichier invalide'); }
  });
  $('#st-reset').addEventListener('click', async () => {
    if (!(await ask({ title: 'Tout effacer ?', text: 'Séances, courses, frise et photos seront supprimées de ce téléphone.', ok: 'Tout effacer', danger: true }))) return;
    store.reset(); avatar?.setLook(store.s.look); location.hash = '#welcome';
  });
};

// ---------------------------------------------------------------- démarrage
store.load();
render();
ensureAvatar();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
document.addEventListener('visibilitychange', () => { if (avatar) avatar.paused = document.hidden; });
