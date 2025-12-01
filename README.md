# Jaze Baqti – plateforme de streaming

Application Next.js/App Router (dossier `jaze-app/`) dédiée à l'univers musical de Jaze Baqti. Elle propose une grille d'albums avec lecture continue, gestion des favoris et un espace admin sécurisé pour la gestion des contenus.

## Structure du dépôt
- `jaze-app/` : code de l'application (Next.js + TypeScript + MUI) et styles globaux.
- `public/`, `styles/`, `app/`… : contenus statiques, layout principal, composants UI et API routes (voir sous-dossier `jaze-app/`).
- `package.json`, `eslint.config.mjs`, `tsconfig.json`… : configuration de build/linting.

## Démarrage rapide
```bash
cd jaze-app
npm install
npm run dev
# http://localhost:3000
```

Pour la configuration des variables d'environnement (BDD, admin, media signing), copiez `.env.example` en `.env.local` depuis `jaze-app/` puis ajustez les secrets décrits dans le README du sous-projet.

## Points de responsive global
- **Layout principal** : grille fixe sur desktop (sidebar + contenu + player) qui passe en pile verticale sous 900px, avec marges réduites sous 600px pour maximiser l'espace utile. `body` reste `overflow: hidden` et la zone contenu gère le scroll interne.
- **Navigation** : barre latérale visible dès `md`, transformée en drawer mobile avec toggle burger et switch de thème. Les actions de session (connexion, déconnexion, admin) sont regroupées en pied de drawer pour éviter le scroll inutile.
- **Grille d'albums** : cartes flexibles sur deux colonnes en petit écran (`48%` en `sm`) puis largeur fixe dès `md` et `lg`, avec CTA (favori + lecture) alignés sur une seule ligne pour limiter les déplacements sur mobile.
- **Lecteur global** : barre collée au bas de l'écran ; la première ligne se réorganise en colonne sur `xs`/`sm` pour conserver des zones tactiles confortables, les sliders de volume/progression se dimensionnent en conséquence.

## À savoir
- Thème clair/sombre via MUI (context `AppThemeProvider`), toggle disponible en desktop + mobile.
- Player audio partagé dans tout le layout grâce à `PlayerProvider`, déclenché depuis les cartes albums.
- L'espace admin et les routes publiques partagent le même shell responsive (navigation + player), sauf sur la page de login admin.
