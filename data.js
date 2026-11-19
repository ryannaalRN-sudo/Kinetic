// Kinetic — bibliothèque d'exercices et programmes
// Contenu générique d'entraînement : à adapter à son niveau, ne remplace pas l'avis d'un professionnel.

export const EXERCISES = {
  bench: { name: 'Développé couché', muscles: ['Pectoraux', 'Triceps', 'Épaules avant'], kind: 'charge', cue: 'Omoplates serrées, pieds ancrés. Descends la barre au bas des pectoraux, pousse en expirant.' },
  incline_db: { name: 'Développé incliné haltères', muscles: ['Haut des pectoraux', 'Épaules'], kind: 'charge', cue: 'Banc à 30°. Coudes à 45° du buste, contrôle la descente.' },
  ohp: { name: 'Développé militaire', muscles: ['Épaules', 'Triceps'], kind: 'charge', cue: 'Gainage fort, fessiers serrés. La barre passe près du visage puis termine au-dessus de la tête.' },
  lateral: { name: 'Élévations latérales', muscles: ['Épaules'], kind: 'charge', cue: 'Bras légèrement fléchis, monte jusqu’à l’horizontale sans hausser les épaules.' },
  dips: { name: 'Dips', muscles: ['Pectoraux', 'Triceps'], kind: 'reps', cue: 'Buste légèrement penché, descends jusqu’à 90° aux coudes.' },
  triceps_rope: { name: 'Extension triceps à la corde', muscles: ['Triceps'], kind: 'charge', cue: 'Coudes collés au corps, écarte la corde en bas du mouvement.' },
  pushup: { name: 'Pompes', muscles: ['Pectoraux', 'Triceps', 'Gainage'], kind: 'reps', cue: 'Corps aligné de la tête aux talons, poitrine proche du sol.' },
  pullup: { name: 'Tractions', muscles: ['Dos', 'Biceps'], kind: 'reps', cue: 'Pars bras tendus, tire les coudes vers les hanches, menton au-dessus de la barre.' },
  row: { name: 'Rowing barre', muscles: ['Dos', 'Biceps'], kind: 'charge', cue: 'Dos plat, buste incliné. Tire la barre vers le nombril.' },
  lat_pull: { name: 'Tirage vertical', muscles: ['Dos', 'Biceps'], kind: 'charge', cue: 'Poitrine sortie, tire la barre vers le haut des pectoraux.' },
  seated_row: { name: 'Tirage horizontal', muscles: ['Dos'], kind: 'charge', cue: 'Serre les omoplates en fin de mouvement, dos droit.' },
  face_pull: { name: 'Face pull', muscles: ['Arrière d’épaules', 'Haut du dos'], kind: 'charge', cue: 'Tire la corde vers le front, coudes hauts.' },
  curl: { name: 'Curl biceps', muscles: ['Biceps'], kind: 'charge', cue: 'Coudes fixes, pas d’élan. Descente contrôlée.' },
  hammer: { name: 'Curl marteau', muscles: ['Biceps', 'Avant-bras'], kind: 'charge', cue: 'Prise neutre, poignets verrouillés.' },
  squat: { name: 'Squat', muscles: ['Quadriceps', 'Fessiers'], kind: 'charge', cue: 'Pieds largeur d’épaules, descends hanches en arrière, genoux dans l’axe des pieds.' },
  deadlift: { name: 'Soulevé de terre', muscles: ['Ischios', 'Fessiers', 'Dos'], kind: 'charge', cue: 'Barre contre les tibias, dos neutre, pousse le sol avec les jambes.' },
  rdl: { name: 'Soulevé de terre roumain', muscles: ['Ischios', 'Fessiers'], kind: 'charge', cue: 'Genoux légèrement fléchis, hanches en arrière, la barre glisse le long des cuisses.' },
  leg_press: { name: 'Presse à cuisses', muscles: ['Quadriceps', 'Fessiers'], kind: 'charge', cue: 'Bas du dos collé au dossier, ne verrouille pas les genoux.' },
  lunge: { name: 'Fentes marchées', muscles: ['Quadriceps', 'Fessiers'], kind: 'reps', cue: 'Grand pas, genou arrière proche du sol, buste droit.' },
  leg_curl: { name: 'Leg curl', muscles: ['Ischios'], kind: 'charge', cue: 'Contrôle la phase retour, hanches plaquées.' },
  calf: { name: 'Mollets debout', muscles: ['Mollets'], kind: 'charge', cue: 'Amplitude complète, pause d’une seconde en haut.' },
  hip_thrust: { name: 'Hip thrust', muscles: ['Fessiers'], kind: 'charge', cue: 'Menton rentré, serre les fessiers en haut, bassin en rétroversion.' },
  goblet: { name: 'Goblet squat', muscles: ['Quadriceps', 'Fessiers'], kind: 'charge', cue: 'Haltère contre la poitrine, coudes entre les genoux en bas.' },
  plank: { name: 'Gainage', muscles: ['Abdos', 'Gainage'], kind: 'time', cue: 'Coudes sous les épaules, bassin aligné, respire calmement.' },
  side_plank: { name: 'Gainage latéral', muscles: ['Obliques'], kind: 'time', cue: 'Hanches hautes, corps en ligne.' },
  crunch: { name: 'Crunch', muscles: ['Abdos'], kind: 'reps', cue: 'Enroule le buste, bas du dos au sol.' },
  leg_raise: { name: 'Relevés de jambes', muscles: ['Abdos'], kind: 'reps', cue: 'Bas du dos plaqué, descends lentement.' },
  burpee: { name: 'Burpees', muscles: ['Cardio', 'Corps entier'], kind: 'reps', cue: 'Rythme régulier, atterris en souplesse.' },
  jump_squat: { name: 'Squats sautés', muscles: ['Quadriceps', 'Explosivité'], kind: 'reps', cue: 'Réception genoux souples, enchaîne sans pause.' },
  mountain: { name: 'Mountain climbers', muscles: ['Gainage', 'Cardio'], kind: 'time', cue: 'Épaules au-dessus des mains, genoux vers la poitrine.' },
  bw_squat: { name: 'Squat poids du corps', muscles: ['Quadriceps', 'Fessiers'], kind: 'reps', cue: 'Talons au sol, poitrine haute.' },
  glute_bridge: { name: 'Pont fessier', muscles: ['Fessiers', 'Ischios'], kind: 'reps', cue: 'Pousse dans les talons, serre en haut 2 secondes.' },
  pike_pushup: { name: 'Pompes piquées', muscles: ['Épaules', 'Triceps'], kind: 'reps', cue: 'Hanches hautes, la tête descend entre les mains.' },
  inv_row: { name: 'Rowing inversé', muscles: ['Dos', 'Biceps'], kind: 'reps', cue: 'Sous une table solide ou une barre basse, corps gainé.' },
  superman: { name: 'Superman', muscles: ['Lombaires', 'Dos'], kind: 'reps', cue: 'Décolle bras et jambes, tiens 2 secondes.' }
};

// s = séries, r = répétitions (ou secondes si kind = time), rest = repos (s)
const ex = (id, s, r, rest = 90) => ({ id, s, r, rest });

// Séances de course : segments [type, durée en secondes] — type : 'marche' | 'course' | 'facile' | 'rapide' | 'récup'
const run = (title, segments, note) => ({ type: 'run', title, segments, note });

const C25K = [];
for (let w = 1; w <= 8; w++) {
  const runS = [60, 90, 120, 180, 300, 480, 900, 1500][w - 1];
  const walkS = [90, 120, 120, 90, 120, 120, 90, 0][w - 1];
  const reps = [8, 6, 5, 5, 4, 3, 2, 1][w - 1];
  const segs = [['marche', 300]];
  for (let i = 0; i < reps; i++) { segs.push(['course', runS]); if (walkS && i < reps - 1) segs.push(['marche', walkS]); }
  segs.push(['marche', 300]);
  C25K.push(run(`Semaine ${w} · ${reps} × ${Math.round(runS / 60 * 10) / 10} min de course`, segs, w === 8 ? 'Objectif : courir 25 à 30 minutes sans pause, à allure de conversation.' : 'Allure de conversation : tu dois pouvoir parler en courant.'));
}

export const PROGRAMS = {
  fullbody: {
    name: 'Full body débutant', tag: 'Muscu · 3 séances / sem.', level: 'Débutant', perWeek: 3,
    desc: 'Les mouvements de base pour construire force et technique, en alternant deux séances.',
    sessions: [
      { type: 'lift', title: 'Full body A', items: [ex('squat', 3, 8, 120), ex('bench', 3, 8, 120), ex('row', 3, 10), ex('plank', 3, 40, 60)] },
      { type: 'lift', title: 'Full body B', items: [ex('deadlift', 3, 6, 150), ex('ohp', 3, 8, 120), ex('lat_pull', 3, 10), ex('lunge', 3, 10, 90)] }
    ]
  },
  ppl: {
    name: 'PPL hybride', tag: 'Muscu + course · 4 séances / sem.', level: 'Intermédiaire', perWeek: 4,
    desc: 'Pousser, tirer, jambes, et une sortie course pour entretenir le cardio sans perdre en force.',
    sessions: [
      { type: 'lift', title: 'Push · Pecs, épaules, triceps', items: [ex('bench', 4, 8, 120), ex('ohp', 4, 8, 120), ex('incline_db', 3, 10), ex('lateral', 3, 15, 60), ex('dips', 3, 10), ex('triceps_rope', 3, 12, 60)] },
      { type: 'lift', title: 'Pull · Dos, biceps', items: [ex('pullup', 4, 8, 120), ex('row', 4, 8, 120), ex('seated_row', 3, 12), ex('face_pull', 3, 15, 60), ex('curl', 3, 12, 60), ex('hammer', 3, 12, 60)] },
      { type: 'lift', title: 'Legs · Jambes, fessiers', items: [ex('squat', 4, 6, 150), ex('rdl', 3, 8, 120), ex('leg_press', 3, 12), ex('leg_curl', 3, 12, 60), ex('calf', 4, 15, 60), ex('plank', 3, 45, 60)] },
      run('Footing facile · 30 min', [['marche', 180], ['facile', 1800], ['marche', 180]], 'Allure confortable : récupération active entre les séances de muscu.')
    ]
  },
  bodyweight: {
    name: 'Renfo sans matériel', tag: 'Poids du corps · 3 séances / sem.', level: 'Tous niveaux', perWeek: 3,
    desc: 'À la maison ou en voyage : un circuit complet pour le gainage, la force et le cardio.',
    sessions: [
      { type: 'lift', title: 'Circuit haut du corps', items: [ex('pushup', 4, 12, 60), ex('pike_pushup', 3, 8, 60), ex('inv_row', 4, 10, 60), ex('dips', 3, 10, 60), ex('plank', 3, 45, 45)] },
      { type: 'lift', title: 'Circuit bas du corps', items: [ex('bw_squat', 4, 20, 60), ex('lunge', 3, 12, 60), ex('glute_bridge', 4, 15, 45), ex('jump_squat', 3, 12, 60), ex('side_plank', 3, 30, 30)] },
      { type: 'lift', title: 'Cardio-gainage', items: [ex('burpee', 4, 10, 60), ex('mountain', 4, 40, 40), ex('leg_raise', 3, 12, 45), ex('superman', 3, 12, 45), ex('crunch', 3, 20, 45)] }
    ]
  },
  c25k: {
    name: 'De 0 à 5 km', tag: 'Course · 3 sorties / sem. · 8 semaines', level: 'Débutant', perWeek: 3,
    desc: 'Alterner marche et course pour arriver à courir 5 km d’une traite. Répète chaque semaine 3 fois.',
    sessions: C25K, weekly: true
  },
  tenk: {
    name: 'Objectif 10 km', tag: 'Course · 3 sorties / sem.', level: 'Intermédiaire', perWeek: 3,
    desc: 'Pour qui court déjà 30 minutes : endurance, fractionné et sortie longue.',
    sessions: [
      run('Endurance · 40 min', [['marche', 120], ['facile', 2400], ['marche', 120]], 'Allure facile, respiration contrôlée.'),
      run('Fractionné · 6 × 3 min', [['facile', 600], ...Array.from({ length: 6 }, (_, i) => (i < 5 ? [['rapide', 180], ['récup', 120]] : [['rapide', 180]])).flat(), ['facile', 600]], 'Rapide = allure 10 km visée ou un peu plus vite.'),
      run('Sortie longue · 60 min', [['facile', 3600]], 'Tranquille : l’objectif est la durée, pas la vitesse.')
    ]
  },
  hybrid: {
    name: 'Hybride force + endurance', tag: 'Muscu + course · 5 séances / sem.', level: 'Confirmé', perWeek: 5,
    desc: 'Le meilleur des deux mondes : force en salle et moteur cardio sur la route.',
    sessions: [
      { type: 'lift', title: 'Haut du corps · Force', items: [ex('bench', 5, 5, 150), ex('pullup', 4, 6, 120), ex('ohp', 3, 8, 120), ex('row', 3, 8), ex('curl', 3, 10, 60)] },
      run('Fractionné court · 10 × 1 min', [['facile', 600], ...Array.from({ length: 10 }, (_, i) => (i < 9 ? [['rapide', 60], ['récup', 60]] : [['rapide', 60]])).flat(), ['facile', 600]], 'Vite mais en gardant une foulée propre.'),
      { type: 'lift', title: 'Bas du corps · Force', items: [ex('squat', 5, 5, 180), ex('deadlift', 3, 5, 180), ex('hip_thrust', 3, 10, 90), ex('calf', 3, 15, 60), ex('plank', 3, 60, 60)] },
      run('Endurance · 45 min', [['facile', 2700]], 'Zone 2 : tu peux parler en phrases complètes.'),
      { type: 'lift', title: 'Full body · Volume', items: [ex('goblet', 4, 12), ex('incline_db', 4, 10), ex('lat_pull', 4, 12), ex('rdl', 3, 10), ex('lateral', 3, 15, 60)] }
    ]
  }
};

export const BADGES = [
  { id: 'first_session', name: 'Première séance', desc: 'Termine ta première séance', icon: 'spark' },
  { id: 'five_sessions', name: 'Régulier', desc: '5 séances terminées', icon: 'stack' },
  { id: 'twenty_sessions', name: 'Machine', desc: '20 séances terminées', icon: 'bolt' },
  { id: 'first_run', name: 'Premiers kilomètres', desc: 'Enregistre ta première course', icon: 'run' },
  { id: 'five_k', name: '5 km', desc: 'Une course de 5 km ou plus', icon: 'flag' },
  { id: 'ten_k', name: '10 km', desc: 'Une course de 10 km ou plus', icon: 'flag' },
  { id: 'fifty_km', name: '50 km au total', desc: 'Cumule 50 km de course', icon: 'road' },
  { id: 'first_pr', name: 'Record perso', desc: 'Bats un de tes records', icon: 'trophy' },
  { id: 'ten_tons', name: '10 tonnes', desc: 'Soulève 10 t de volume au total', icon: 'weight' },
  { id: 'streak3', name: '3 semaines', desc: 'Objectif hebdo atteint 3 semaines de suite', icon: 'flame' },
  { id: 'first_step', name: 'Première étape', desc: 'Ajoute une étape à ta frise', icon: 'camera' },
  { id: 'hybrid', name: 'Hybride', desc: 'Muscu et course la même semaine', icon: 'infinity' }
];

export const LEVEL_TITLES = ['Débutant', 'Débutant', 'Régulier', 'Régulier', 'Motivé', 'Motivé', 'Athlète', 'Athlète', 'Confirmé', 'Confirmé', 'Élite', 'Élite', 'Légende'];
