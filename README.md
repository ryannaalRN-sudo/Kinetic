# Kinetic

Appli web gratuite de sport (muscu + course) avec un avatar 3D réaliste qui évolue avec toi.

## Mettre en ligne sur GitHub Pages (gratuit)

1. Crée un dépôt public sur GitHub, par exemple `kinetic`.
2. Dépose **le contenu** de ce dossier à la racine du dépôt (`index.html` doit être à la racine) : bouton « Add file › Upload files », puis « Commit changes ».
3. Dans le dépôt : **Settings › Pages**, source « Deploy from a branch », branche `main`, dossier `/ (root)`, puis Save.
4. Après une à deux minutes, l'appli est en ligne à l'adresse `https://ton-pseudo.github.io/kinetic/`.
5. Sur ton téléphone, ouvre l'adresse puis « Ajouter à l'écran d'accueil » : Kinetic s'ouvre en plein écran comme une vraie appli et fonctionne hors ligne après la première visite.

## Tester sur ton ordinateur

Les modules JavaScript ne s'ouvrent pas en double-cliquant sur `index.html`. Lance un petit serveur dans ce dossier :

```
python3 -m http.server 8000
```

puis ouvre http://localhost:8000.

## Données personnelles

Tout est stocké dans le navigateur du téléphone (localStorage et IndexedDB) : profil, séances, courses, frise et photos. Rien n'est envoyé sur un serveur. Les réglages permettent d'exporter une sauvegarde JSON (sans les photos).

## Organisation

- `index.html`, `css/style.css` : interface
- `js/app.js` : écrans (accueil, avatar, muscu, course, progrès, réglages)
- `js/avatar.js` : moteur de l'avatar 3D (morphologie, vêtements, squelette, animations)
- `js/data.js` : exercices, programmes, badges
- `js/store.js` : sauvegarde locale, niveaux, records, badges
- `assets/` : corps 3D, morphologies, cheveux, yeux, chaussures et textures
- `vendor/` : Three.js

## Crédits et licences

- Corps, morphologies, squelette, cheveux, sourcils, yeux, chaussures et textures de peau : communauté MakeHuman, licence CC0 (domaine public).
- Three.js : licence MIT (voir `vendor/THREE-LICENSE.txt`).
- Les programmes d'entraînement sont des modèles généraux : adapter les charges à son niveau et demander conseil à un professionnel de santé en cas de douleur ou de problème médical.
