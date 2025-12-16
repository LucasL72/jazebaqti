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
ADMIN_SESSION_MAX_AGE_SECONDS=3600
ADMIN_PASSWORD_MAX_AGE_DAYS=90
```

Pour plus de détails (monitoring, dépannage, scripts de déploiement automatique), consultez le [guide complet](docs/DEPLOYMENT_VPS.md).
