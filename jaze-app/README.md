# Jaze Baqti – plateforme de streaming dédiée

Application Next.js (App Router + TypeScript) pour explorer les albums de Jaze Baqti, gérer les médias depuis un espace admin et offrir une expérience de lecture continue avec favoris utilisateurs.

## Fonctionnalités clés
- **Catalogue albums + player global** : grille et pages détaillées avec lecture continue, tri par numéro de piste et vinyle animé.
- **Comptes utilisateurs** : inscription/connexion par email + mot de passe (cookies httpOnly) pour sauvegarder ses albums favoris.
- **Favoris** : ajout/suppression depuis la grille, la page album ou l’espace "Mes favoris" ; synchronisation serveur via Prisma.
- **Espace admin** : sessions en base, politique de mot de passe renforcée, upload média signé, audit des actions sensibles.
- **Responsive** : navigation latérale/tiroir mobile, cartes flexibles et CTA regroupés pour les petits écrans.

## Démarrage rapide
```bash
npm install
npm run dev
# http://localhost:3000
```

## Configuration requise
Copiez `.env.example` en `.env.local` et renseignez au minimum :

- `DATABASE_URL`: connexion MySQL/MariaDB (TLS activé par défaut, désactivez avec `DATABASE_TLS_REQUIRED=false` si besoin en local).
- `ADMIN_EMAIL` et `ADMIN_PASSWORD`: crédentials de l’administrateur initial (password conforme à la politique de complexité).
- `MEDIA_SIGNING_SECRET`: secret HMAC (32+ caractères) pour signer l’accès aux médias privés.
- `ADMIN_SESSION_MAX_AGE_SECONDS` (optionnel) et `ADMIN_PASSWORD_MAX_AGE_DAYS` (optionnel) pour contrôler durée de session et rotation du mot de passe.

La variable `ADMIN_TOTP_SECRET` est désormais **facultative** : la connexion admin ne force plus la 2FA, mais vous pouvez toujours fournir un secret pour réactiver le TOTP plus tard.

## Commandes utiles
- `npm run dev` : serveur de dev.
- `npm run build` / `npm start` : build et run production.
- `npm run lint` : linting.
- `npm run seed` : provisionne l’admin et insère les données de démo (albums/pistes).

## Flux utilisateurs
1. **Inscription/connexion** sur `/login` (CSRF protégé).
2. **Ajout de favoris** depuis la grille ou une page album ; page dédiée `/favorites` pour retrouver et retirer les albums sauvegardés.
3. **Déconnexion** via la navigation (desktop + mobile).

## Sécurité & bonnes pratiques
- Sessions (admin + user) stockées en base, cookies `httpOnly`, `secure`, `sameSite=lax`.
- Politique de mot de passe : 12+ caractères avec majuscules/minuscules/chiffres/spéciaux.
- Uploads média : validation MIME côté serveur, chemins normalisés et URLs signées via `/api/media`.
- Journalisation d’audit pour les actions sensibles (CRUD albums, connexions admin, uploads, rôles).

## Structure des répertoires
- `app/` : pages (public, admin, API) et composants UI.
- `lib/` : utilitaires (auth, sécurité, stockage média, Prisma, rate limiting, hooks client).
- `prisma/` : schéma, migrations et seed.
- `public/` : assets statiques (covers, audio de démo, logo).

## Notes de responsive
- La grille d’albums adapte la largeur des cartes (`xs: 100%`, `sm: 48%`, `md: 220`, `lg: 260px`).
- Actions (lecture + favoris) sont regroupées sur chaque carte et dans le header d’album pour limiter les déplacements sur mobile.
- Navigation latérale convertie en drawer mobile avec accès rapide au mode clair/sombre et à la session utilisateur.
