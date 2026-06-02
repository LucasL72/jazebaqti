# Déploiement sur VPS OVH

Guide complet pour déployer l'application Jaze Baqti sur un VPS OVH.

## 🖥️ Prérequis VPS

**Recommandations minimales :**
- **RAM** : 2 GB (4 GB recommandé)
- **CPU** : 2 vCores
- **Stockage** : 40 GB SSD
- **OS** : Ubuntu 22.04 LTS ou Debian 12
- **Bande passante** : Illimitée (standard OVH)

**Coût estimé OVH :**
- VPS Starter : ~6€/mois (2GB RAM)
- VPS Value : ~12€/mois (4GB RAM) ⭐ Recommandé
- VPS Essential : ~24€/mois (8GB RAM)

## 🚀 Installation initiale

### 1. Connexion SSH

```bash
ssh root@your-vps-ip
```

### 2. Mise à jour du système

```bash
apt-get update
apt-get upgrade -y
apt-get install -y curl git build-essential
```

### 3. Créer un utilisateur

```bash
# Créer utilisateur 'jaze'
adduser jaze
usermod -aG sudo jaze

# Se connecter avec le nouvel utilisateur
su - jaze
```

### 4. Installer Node.js (via nvm)

```bash
# Installer nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recharger le shell
source ~/.bashrc

# Installer Node.js LTS
nvm install --lts
nvm use --lts

# Vérifier
node -v  # v20.x.x
npm -v   # 10.x.x
```

### 5. Installer MySQL/MariaDB

```bash
# Installer MariaDB
sudo apt-get install -y mariadb-server

# Sécuriser l'installation
sudo mysql_secure_installation
# Répondre : Y (oui) à toutes les questions
# Définir un mot de passe root fort

# Se connecter à MySQL
sudo mysql -u root -p

# Créer la base de données
CREATE DATABASE jazebaqti_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Créer l'utilisateur
CREATE USER 'jazebaqti'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';

# Donner les droits
GRANT ALL PRIVILEGES ON jazebaqti_db.* TO 'jazebaqti'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 6. Installer FFmpeg (pour audio)

```bash
sudo apt-get install -y ffmpeg

# Vérifier
ffmpeg -version
ffmpeg -codecs | grep opus
```

### 7. Installer PM2 (Process Manager)

```bash
npm install -g pm2

# Configurer PM2 au démarrage
pm2 startup
# Copier/coller la commande affichée
```

## 📦 Déploiement de l'application

### 1. Cloner le dépôt

```bash
cd /home/jaze
git clone https://github.com/YOUR_USERNAME/jazebaqti.git
cd jazebaqti/jaze-app
```

### 2. Configurer l'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env.local

# Éditer les variables
nano .env.local
```

**Variables à configurer :**
```env
# Base de données
DATABASE_URL="mysql://jazebaqti:STRONG_PASSWORD_HERE@localhost:3306/jazebaqti_db"
DATABASE_TLS_REQUIRED=false

# Admin
ADMIN_EMAIL="admin@jazebaqti.com"
ADMIN_PASSWORD="VotreMotDePasseComplexe123!@#"
ADMIN_SESSION_MAX_AGE_SECONDS=3600
ADMIN_PASSWORD_MAX_AGE_DAYS=90

# Sécurité
MEDIA_SIGNING_SECRET="GENERATE_A_RANDOM_32_CHAR_STRING_HERE"
NODE_ENV=production
```

**Générer un secret aléatoire :**
```bash
openssl rand -base64 32
```

### 3. Installer les dépendances

```bash
npm install
```

### 4. Migrer la base de données

```bash
npx prisma migrate deploy
npx prisma db seed
```

### 5. Convertir les fichiers audio

```bash
# Convertir tous les MP3 en Opus
npm run convert:opus

# Vérifier les fichiers
ls -lh public/audio/**/*.opus
```

### 6. Build de production

```bash
npm run build
```

### 7. Démarrer avec PM2

```bash
# Créer le fichier de configuration PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'jazebaqti',
    script: 'npm',
    args: 'start',
    cwd: '/home/jaze/jazebaqti/jaze-app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/jaze/logs/jazebaqti-error.log',
    out_file: '/home/jaze/logs/jazebaqti-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Créer le dossier de logs
mkdir -p /home/jaze/logs

# Démarrer l'application
pm2 start ecosystem.config.js

# Sauvegarder la config PM2
pm2 save

# Vérifier le statut
pm2 status
pm2 logs jazebaqti
```

## 🌐 Configuration Nginx (Reverse Proxy)

### 1. Installer Nginx

```bash
sudo apt-get install -y nginx
```

### 2. Configurer le domaine

```bash
# Créer la configuration
sudo nano /etc/nginx/sites-available/jazebaqti
```

**Configuration Nginx :**
```nginx
# Cache des fichiers statiques
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=static_cache:10m max_size=1g inactive=60m use_temp_path=off;

server {
    listen 80;
    server_name jazebaqti.com www.jazebaqti.com;

    # Limite de taille upload (pour admin)
    client_max_body_size 100M;

    # Logs
    access_log /var/log/nginx/jazebaqti-access.log;
    error_log /var/log/nginx/jazebaqti-error.log;

    # Gestion des types MIME
    types {
        audio/ogg opus;
        audio/mp4 m4a;
        audio/mpeg mp3;
    }

    # Cache fichiers audio (1 an)
    location ~* \.(mp3|opus|m4a)$ {
        proxy_pass http://localhost:3000;
        proxy_cache static_cache;
        proxy_cache_valid 200 365d;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Accept-Ranges bytes;
    }

    # Cache images (30 jours)
    location ~* \.(jpg|jpeg|png|webp|gif|svg|ico)$ {
        proxy_pass http://localhost:3000;
        proxy_cache static_cache;
        proxy_cache_valid 200 30d;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # --- Médias privés signés (uploads admin) servis par Nginx ---
    # Next.js valide la signature HMAC sur /api/media puis renvoie un header
    # X-Accel-Redirect : Nginx prend alors le relais et sert le fichier depuis
    # le disque (sendfile + gestion native des requêtes Range/seek).
    # Le `internal` empêche tout accès direct sans passer par la signature.
    location /_protected_media/ {
        internal;
        alias /home/jaze/jazebaqti/jaze-app/private_media/;
        add_header Accept-Ranges bytes;
        add_header Cache-Control "private, max-age=0, must-revalidate";
    }

    # Proxy vers Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> **Délégation des médias à Nginx (recommandé en production).**
> Renseignez `MEDIA_INTERNAL_REDIRECT="/_protected_media"` dans `.env.local`.
> Sans cette variable, Next.js sert lui-même les fichiers (avec support Range
> intégré) — pratique en local, mais charge davantage le process Node.
> Le préfixe doit correspondre à la `location internal` ci-dessus, et l'`alias`
> doit pointer vers le dossier `private_media/` de l'application.

### 3. Activer la configuration

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/jazebaqti /etc/nginx/sites-enabled/

# Supprimer la config par défaut
sudo rm /etc/nginx/sites-enabled/default

# Créer le dossier de cache
sudo mkdir -p /var/cache/nginx
sudo chown -R www-data:www-data /var/cache/nginx

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

### 4. Configurer SSL avec Let's Encrypt

```bash
# Installer Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtenir le certificat SSL (remplacer par votre domaine)
sudo certbot --nginx -d jazebaqti.com -d www.jazebaqti.com

# Renouvellement automatique (déjà configuré par certbot)
sudo certbot renew --dry-run
```

## 🔒 Sécurité

### 1. Configurer le firewall

```bash
# Installer ufw
sudo apt-get install -y ufw

# Autoriser SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Activer le firewall
sudo ufw enable

# Vérifier
sudo ufw status
```

### 2. Fail2ban (protection brute-force)

```bash
# Installer
sudo apt-get install -y fail2ban

# Copier la config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Éditer
sudo nano /etc/fail2ban/jail.local

# Ajouter protection Nginx
[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/*error.log
maxretry = 5

# Redémarrer
sudo systemctl restart fail2ban
```

### 3. Désactiver login root SSH

```bash
sudo nano /etc/ssh/sshd_config

# Modifier
PermitRootLogin no
PasswordAuthentication no  # Si vous utilisez des clés SSH

# Redémarrer SSH
sudo systemctl restart sshd
```

## 🔄 Mises à jour

### Déploiement d'une nouvelle version

```bash
cd /home/jaze/jazebaqti/jaze-app

# Pull les dernières modifications
git pull

# Installer nouvelles dépendances
npm install

# Migrer la BDD si nécessaire
npx prisma migrate deploy

# Rebuild
npm run build

# Redémarrer PM2
pm2 restart jazebaqti

# Vérifier
pm2 logs jazebaqti
```

### Script de déploiement automatique

```bash
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Déploiement Jaze Baqti"

# Pull
echo "📥 Git pull..."
git pull

# Dépendances
echo "📦 Installation dépendances..."
npm ci

# Migration
echo "🗄️ Migration BDD..."
npx prisma migrate deploy

# Build
echo "🏗️ Build..."
npm run build

# Redémarrage
echo "♻️ Redémarrage..."
pm2 restart jazebaqti

echo "✅ Déploiement terminé !"
pm2 status jazebaqti
EOF

chmod +x deploy.sh

# Utilisation
./deploy.sh
```

## 📊 Monitoring

### Logs en temps réel

```bash
# Logs PM2
pm2 logs jazebaqti

# Logs Nginx
sudo tail -f /var/log/nginx/jazebaqti-access.log
sudo tail -f /var/log/nginx/jazebaqti-error.log

# Logs système
journalctl -u nginx -f
```

### Métriques PM2

```bash
# Dashboard interactif
pm2 monit

# Statistiques
pm2 show jazebaqti
```

### Utilisation ressources

```bash
# CPU / RAM
htop

# Disque
df -h

# Bande passante
vnstat -d
```

## 🐛 Dépannage

### L'app ne démarre pas

```bash
# Vérifier les logs
pm2 logs jazebaqti --lines 100

# Vérifier la BDD
mysql -u jazebaqti -p jazebaqti_db -e "SHOW TABLES;"

# Tester le build
npm run build
```

### Erreur 502 Bad Gateway

```bash
# Vérifier que l'app tourne
pm2 status

# Vérifier le port
sudo netstat -tulpn | grep 3000

# Redémarrer Nginx
sudo systemctl restart nginx
```

### Performance lente

```bash
# Vérifier la RAM
free -h

# Augmenter limite PM2
pm2 restart jazebaqti --max-memory-restart 2G

# Activer mode cluster (2+ instances)
pm2 scale jazebaqti 2
```

## ✅ Checklist finale

- [ ] VPS configuré et sécurisé
- [ ] Node.js + MariaDB installés
- [ ] Variables d'environnement configurées
- [ ] Base de données migrée
- [ ] Fichiers audio convertis en Opus
- [ ] Build production réussi
- [ ] PM2 configuré et démarré
- [ ] Nginx configuré avec SSL
- [ ] Firewall activé (ufw)
- [ ] Fail2ban actif
- [ ] Test depuis navigateur externe
- [ ] Monitoring actif

## 📚 Ressources

- [OVH VPS Guide](https://help.ovhcloud.com/csm/en-gb-vps-getting-started)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Let's Encrypt](https://letsencrypt.org/)
