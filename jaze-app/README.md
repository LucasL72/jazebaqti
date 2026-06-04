# Jaze Baqti – plateforme de streaming dédiée

Application Next.js (App Router + TypeScript) pour explorer les albums de Jaze Baqti, gérer les médias depuis un espace admin et offrir une expérience de lecture continue avec favoris utilisateurs.

## Fonctionnalités clés
- **Catalogue albums + player global** : grille et pages détaillées avec lecture continue, tri par numéro de piste et vinyle animé.
- **Lecteur avancé** : shuffle, répétition (none/one/all), **file d'attente visible et réordonnable**, **préchargement de la piste suivante** (lecture sans latence), contrôles à icônes accessibles.
- **Comptes utilisateurs** : inscription/connexion par email + mot de passe (cookies httpOnly).
- **Favoris** : au niveau **album** (grille, page album, « Mes favoris ») **et au niveau piste** (« J'aime » sur un morceau), synchronisés via Prisma.
- **Playlists personnalisées** : création, ajout de pistes depuis une page album, lecture, réordonnancement et suppression (`/playlists`).
- **Historique & reprise** : section « Écouté récemment » et bandeau « Reprendre où vous vous êtes arrêté » sur l'accueil.
- **Statistiques d'écoute** : compteur de lectures par piste (`Track.playCount`) — utile pour l'artiste.
- **Streaming audio robuste** : `/api/media` gère les **requêtes HTTP Range (206)** pour le seek, avec délégation optionnelle à Nginx (`X-Accel-Redirect`) et transcodage Opus optionnel à l'upload.
- **Espace admin** : sessions en base, politique de mot de passe renforcée, upload média signé, audit des actions sensibles.
- **Responsive** : navigation latérale/tiroir mobile, cartes flexibles et CTA regroupés pour les petits écrans.
- **Qualité** : lint + typecheck (0 erreur) + tests Vitest + build de production vérifiés en CI.

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
- `MEDIA_INTERNAL_REDIRECT` (optionnel) : préfixe de `location internal` Nginx pour déléguer l'envoi des médias (`X-Accel-Redirect`). Vide en local.
- `AUDIO_TRANSCODE_ENABLED` (optionnel) : `true` pour générer un `.opus` via ffmpeg à l'upload.
- `ERROR_REPORTING_WEBHOOK_URL` (optionnel) : endpoint de report d'erreurs (Sentry/Datadog/webhook).
- `ADMIN_SESSION_MAX_AGE_SECONDS` (optionnel) et `ADMIN_PASSWORD_MAX_AGE_DAYS` (optionnel) pour contrôler durée de session et rotation du mot de passe.

La variable `ADMIN_TOTP_SECRET` est désormais **facultative** : la connexion admin ne force plus la 2FA, mais vous pouvez toujours fournir un secret pour réactiver le TOTP plus tard.

## Commandes utiles
- `npm run dev` : serveur de dev.
- `npm run build` / `npm start` : build et run production.
- `npm run lint` : linting.
- `npm run typecheck` : vérification TypeScript (`tsc --noEmit`).
- `npm test` / `npm run test:watch` : tests unitaires Vitest.
- `npm run seed` : provisionne l’admin et insère les données de démo (albums/pistes).
- `npm run convert:opus` : convertit les MP3 de `public/audio` en Opus (voir `docs/AUDIO_OPTIMIZATION.md`).

## Flux utilisateurs
1. **Inscription/connexion** sur `/login` (CSRF protégé).
2. **Favoris album** depuis la grille ou une page album ; page dédiée `/favorites`.
3. **Favoris piste** (« J'aime ») et **ajout à une playlist** depuis la page album.
4. **Playlists** : gérées sur `/playlists` (créer, lire, réordonner, retirer, supprimer).
5. **Reprise** : depuis l'accueil, « écouté récemment » et reprise à la position sauvegardée.
6. **Déconnexion** via la navigation (desktop + mobile).

## Lecteur & audio
- **File d'attente** : bouton dans la barre du player (tiroir), réordonnancement (monter/descendre) et retrait, lecture directe au clic.
- **Préchargement** : un élément `<audio>` caché précharge la piste suivante.
- **Enregistrement des écoutes** : à la lecture, un appel best-effort à `/api/plays` met à jour le compteur, l'historique et la position de reprise (throttle ~15 s).
- **Servir les fichiers** : `/api/media` valide la signature HMAC puis répond en `200`/`206` (Range). En production, définir `MEDIA_INTERNAL_REDIRECT` pour déléguer l'envoi à Nginx (`X-Accel-Redirect`).
- **Transcodage** : `AUDIO_TRANSCODE_ENABLED=true` génère un `.opus` (ffmpeg) à côté de chaque audio uploadé.

## Tests & intégration continue
- Tests unitaires **Vitest** dans `lib/*.test.ts` (auth/CSRF, hachage de mot de passe, clés média, schémas de validation).
- Workflow **GitHub Actions** à la racine du dépôt (`.github/workflows/ci.yml`) : `lint` + `typecheck` + `test` puis `build` de production. Le build n'exige pas de base de données (pages de données live en `force-dynamic`).

## Sécurité & bonnes pratiques
- Sessions (admin + user) stockées en base, cookies `httpOnly`, `secure`, `sameSite=lax`.
- Politique de mot de passe : 12+ caractères avec majuscules/minuscules/chiffres/spéciaux.
- Uploads média : validation MIME côté serveur, chemins normalisés et URLs signées via `/api/media`.
- Journalisation d’audit pour les actions sensibles (CRUD albums, connexions admin, uploads, rôles).

## Structure des répertoires
- `app/` : pages (public, admin, API) et composants UI (player, file d'attente, playlists…).
- `lib/` : utilitaires (auth, sécurité, stockage média, transcodage, Prisma, rate limiting, hooks client) et tests `*.test.ts`.
- `prisma/` : schéma, migrations et seed.
- `public/` : assets statiques (covers, audio de démo, logo).
- `.github/workflows/ci.yml` (racine du dépôt) : intégration continue.

> Note : le dépôt place l'application dans `jaze-app/`. Les workflows GitHub Actions doivent être à la **racine du dépôt** (`.github/workflows/`), c'est pourquoi `ci.yml` y est défini avec `working-directory: jaze-app`.

## Notes de responsive
- La grille d'albums adapte la largeur des cartes (`xs: 100%`, `sm: 48%`, `md: 220`, `lg: 260px`).
- Actions (lecture + favoris) sont regroupées sur chaque carte et dans le header d'album pour limiter les déplacements sur mobile.
- Navigation latérale convertie en drawer mobile avec accès rapide au mode clair/sombre et à la session utilisateur.

## Déploiement en production (VPS / Nginx / Ubuntu)

Guide complet disponible dans [`docs/DEPLOYMENT_VPS.md`](docs/DEPLOYMENT_VPS.md).

### Prérequis serveur
- **VPS** : 2-4 GB RAM, 2 vCores, 40 GB SSD
- **OS** : Ubuntu 22.04 LTS ou Debian 12
- **Services** : Node.js 20+, MariaDB/MySQL, Nginx, PM2

### Installation rapide

```bash
# 1. Installer les dépendances système
sudo apt-get update && sudo apt-get install -y curl git build-essential mariadb-server nginx ffmpeg

# 2. Installer Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc && nvm install --lts

# 3. Installer PM2
npm install -g pm2

# 4. Cloner et configurer
git clone https://github.com/VOTRE_REPO/jazebaqti.git
cd jazebaqti/jaze-app
cp .env.example .env.local
# Éditer .env.local avec vos valeurs

# 5. Installer, migrer et builder
npm install
npx prisma migrate deploy
npx prisma db seed
npm run build

# 6. Lancer avec PM2
pm2 start npm --name "jazebaqti" -- start
pm2 save && pm2 startup
```

### Configuration Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    client_max_body_size 100M;

    # Cache audio (1 an)
    location ~* \.(mp3|opus|m4a)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cache images (30 jours)
    location ~* \.(jpg|jpeg|png|webp|gif|svg)$ {
        proxy_pass http://localhost:3000;
        expires 30d;
    }

    # Médias privés signés servis par Nginx (X-Accel-Redirect).
    # Requiert MEDIA_INTERNAL_REDIRECT="/_protected_media" côté app.
    location /_protected_media/ {
        internal;
        alias /chemin/vers/jazebaqti/jaze-app/private_media/;
        add_header Accept-Ranges bytes;
    }

    # Proxy Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL avec Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

### Sécurisation

```bash
# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Protection brute-force
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban
```

### Mise à jour de l'application

```bash
cd /chemin/vers/jazebaqti/jaze-app
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart jazebaqti
```

### Variables d'environnement production

```env
DATABASE_URL="mysql://user:password@localhost:3306/jazebaqti_db"
DATABASE_TLS_REQUIRED=false
NODE_ENV=production
ADMIN_EMAIL="admin@votre-domaine.com"
ADMIN_PASSWORD="MotDePasseComplexe123!@#"
MEDIA_SIGNING_SECRET="votre_secret_32_caracteres_min"
MEDIA_INTERNAL_REDIRECT="/_protected_media"
AUDIO_TRANSCODE_ENABLED=true
ADMIN_SESSION_MAX_AGE_SECONDS=3600
ADMIN_PASSWORD_MAX_AGE_DAYS=90
```

Pour plus de détails (monitoring, dépannage, scripts de déploiement automatique), consultez le [guide complet](docs/DEPLOYMENT_VPS.md).
