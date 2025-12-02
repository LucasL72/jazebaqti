# Documentation Jaze Baqti

Documentation technique complète pour l'application de streaming Jaze Baqti.

## 📚 Guides disponibles

### [Optimisation Audio](./AUDIO_OPTIMIZATION.md)
Guide complet pour optimiser les fichiers audio et réduire la bande passante :
- Conversion MP3 → Opus (réduction -50%)
- Configuration des headers de cache
- Détection automatique du format supporté
- Scripts de conversion automatisés
- Dépannage et monitoring

**À lire si :**
- Vous voulez réduire votre facture de bande passante
- Vous avez des problèmes de chargement audio
- Vous déployez de nouveaux albums

### [Déploiement VPS OVH](./DEPLOYMENT_VPS.md)
Instructions complètes pour déployer l'application sur un VPS OVH :
- Configuration initiale du serveur
- Installation Node.js + MariaDB
- Configuration Nginx + SSL (Let's Encrypt)
- Sécurisation (firewall, fail2ban)
- Scripts de déploiement automatique
- Monitoring et maintenance

**À lire si :**
- C'est votre premier déploiement
- Vous avez des problèmes de performance
- Vous voulez sécuriser votre VPS

## 🚀 Quick Start

### Développement local

```bash
# Installation
cd jaze-app
npm install

# Configuration
cp .env.example .env.local
# Éditer .env.local avec vos variables

# Base de données
npx prisma migrate dev
npx prisma db seed

# Lancer le serveur
npm run dev
```

### Optimisation audio

```bash
# Convertir tous les MP3 en Opus
npm run convert:opus

# Vérifier les fichiers
ls -lh public/audio/**/*.opus
```

### Déploiement production

```bash
# Build
npm run build

# Démarrer
npm start

# Avec PM2
pm2 start ecosystem.config.js
```

## 🏗️ Architecture

```
jaze-app/
├── app/                    # Pages et composants Next.js
│   ├── api/               # API routes
│   ├── admin/             # Interface admin
│   └── ...
├── lib/                   # Utilitaires et hooks
│   ├── useAudioFormat.ts  # Détection format audio
│   ├── prisma.ts          # Client BDD
│   └── ...
├── prisma/                # Schéma et migrations
├── public/                # Assets statiques
│   └── audio/            # Fichiers audio
├── scripts/               # Scripts utilitaires
│   └── convert-to-opus.sh
└── docs/                  # Documentation (vous êtes ici)
```

## 🎵 Formats audio

L'application supporte 3 formats avec fallback automatique :

| Format | Extension | Qualité | Taille | Navigateurs |
|--------|-----------|---------|--------|-------------|
| **Opus** | .opus | Excellente | 0.96 MB/min | Chrome, Firefox, Edge |
| **AAC** | .m4a | Bonne | 1.4 MB/min | Safari, iOS |
| **MP3** | .mp3 | Bonne | 2.4 MB/min | Tous (fallback) |

## 🔐 Sécurité

### Variables sensibles

Ne **jamais** commiter :
- `.env.local` (variables de développement)
- `.env.production` (variables de production)

### Secrets à générer

```bash
# Secret HMAC pour signatures média
openssl rand -base64 32

# Mot de passe admin
# Minimum 12 caractères avec :
# - Majuscules
# - Minuscules
# - Chiffres
# - Caractères spéciaux
```

### Headers de sécurité

Configurés dans `next.config.ts` :
- Content-Security-Policy
- X-Frame-Options: DENY
- Strict-Transport-Security (HSTS)

## 📊 Performance

### Métriques cibles

- **Time to First Byte** : < 200ms
- **First Contentful Paint** : < 1.5s
- **Largest Contentful Paint** : < 2.5s
- **Cumulative Layout Shift** : < 0.1

### Optimisations implémentées

- ✅ Cache audio longue durée (1 an)
- ✅ Compression Opus (-50% taille)
- ✅ Accept-Ranges pour streaming
- ✅ Images optimisées Next.js
- ✅ React Server Components
- ✅ Lazy loading

## 🐛 Problèmes courants

### Audio ne se charge pas

1. Vérifier les permissions fichiers : `chmod 644 public/audio/**/*`
2. Vérifier les headers HTTP dans DevTools (Network)
3. Consulter [AUDIO_OPTIMIZATION.md](./AUDIO_OPTIMIZATION.md#dépannage)

### Erreur de connexion BDD

1. Vérifier `DATABASE_URL` dans `.env.local`
2. Tester la connexion : `mysql -u user -p database`
3. Vérifier les migrations : `npx prisma migrate status`

### Build échoue

1. Supprimer cache : `rm -rf .next node_modules`
2. Réinstaller : `npm install`
3. Rebuild : `npm run build`

## 🔄 Workflow de développement

### Ajouter un nouvel album

1. Uploader les fichiers MP3 dans `public/audio/nom-album/`
2. Convertir en Opus : `npm run convert:opus`
3. Utiliser l'interface admin pour créer l'album en BDD
4. Ajouter les pistes via l'interface admin

### Modifier le schéma BDD

1. Éditer `prisma/schema.prisma`
2. Créer migration : `npx prisma migrate dev --name description`
3. Tester en dev
4. Déployer : `npx prisma migrate deploy`

### Déployer une mise à jour

1. Tester en local : `npm run build && npm start`
2. Commit et push : `git push`
3. Sur le VPS : `./deploy.sh`
4. Vérifier : `pm2 logs jazebaqti`

## 📞 Support

### Logs

```bash
# Application
pm2 logs jazebaqti

# Nginx
sudo tail -f /var/log/nginx/jazebaqti-error.log

# Système
journalctl -u nginx -f
```

### Commandes utiles

```bash
# Statut des services
pm2 status
sudo systemctl status nginx
sudo systemctl status mysql

# Redémarrage
pm2 restart jazebaqti
sudo systemctl restart nginx

# Monitoring
pm2 monit
htop
```

## 🎯 Roadmap

### Optimisations futures

- [ ] Streaming adaptatif (HLS/DASH)
- [ ] CDN externe (Cloudflare R2)
- [ ] Compression Brotli
- [ ] Service Worker / PWA
- [ ] Preload des pistes suivantes

### Nouvelles fonctionnalités

- [ ] Playlists personnalisées
- [ ] Statistiques d'écoute
- [ ] Visualiseur audio
- [ ] Mode offline
- [ ] Export playlists

## 📝 Contribuer

Consultez le [README principal](../README.md) pour les guidelines de contribution.

## 📄 Licence

Voir [LICENSE](../LICENSE)
