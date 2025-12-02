# Optimisation des fichiers audio

Ce guide explique comment optimiser les fichiers audio de l'application pour réduire la bande passante et améliorer les performances.

## 📊 Gains attendus

- **Réduction de taille** : -50 à -60% par rapport au MP3
- **Qualité audio** : Équivalente ou supérieure au MP3 320kbps
- **Compatibilité** : Fallback automatique MP3 pour navigateurs non supportés

## 🔧 Prérequis

### Installation FFmpeg

**Ubuntu/Debian (VPS OVH) :**
```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
```

**Vérifier l'installation :**
```bash
ffmpeg -version
ffmpeg -codecs | grep opus
```

## 🚀 Conversion des fichiers

### Commande simple

```bash
npm run convert:opus
```

Cette commande :
- Parcourt tous les fichiers MP3 dans `public/audio/`
- Convertit chaque MP3 en Opus (128kbps)
- Conserve les métadonnées (artiste, titre, etc.)
- Saute les fichiers déjà convertis
- Affiche la progression et les statistiques

### Conversion manuelle

Pour un fichier spécifique :
```bash
ffmpeg -i input.mp3 \
  -c:a libopus \
  -b:a 128k \
  -vbr on \
  -compression_level 10 \
  -map_metadata 0 \
  output.opus
```

### Options de qualité

| Bitrate | Qualité | Taille | Cas d'usage |
|---------|---------|--------|-------------|
| 64 kbps | Correcte | 0.48 MB/min | Mobile 3G |
| 96 kbps | Bonne | 0.72 MB/min | Mobile 4G |
| 128 kbps | Excellente | 0.96 MB/min | **Recommandé** |
| 192 kbps | Audiophile | 1.44 MB/min | WiFi/Desktop |

## 🎯 Formats supportés

L'application détecte automatiquement le meilleur format :

1. **Opus** (.opus) - Priorité haute
   - Chrome, Firefox, Edge, Opera
   - Android, Linux, Windows
   - Meilleur ratio qualité/taille

2. **AAC** (.m4a) - Priorité moyenne
   - Safari, iOS
   - Bon compromis

3. **MP3** (.mp3) - Fallback
   - Tous les navigateurs
   - Compatibilité universelle

## 📁 Structure des fichiers

Après conversion, vous aurez :

```
public/audio/
├── album1/
│   ├── track1.mp3    (fichier original - 5 MB)
│   ├── track1.opus   (fichier optimisé - 2.5 MB)
│   ├── track2.mp3
│   └── track2.opus
└── album2/
    └── ...
```

**Important** : Gardez les fichiers MP3 comme fallback !

## 🔍 Vérification

### Tester le support Opus dans votre navigateur

Ouvrez la console (F12) et tapez :
```javascript
const audio = new Audio();
console.log(audio.canPlayType('audio/ogg; codecs="opus"'));
// "probably" = support complet
// "maybe" = support partiel
// "" = non supporté
```

### Comparer les tailles

```bash
# Avant conversion
du -sh public/audio/*.mp3

# Après conversion
du -sh public/audio/*.opus

# Comparaison
du -sh public/audio/*.mp3 public/audio/*.opus | awk '{sum+=$1} END {print sum " total"}'
```

## 🌐 Déploiement VPS OVH

### 1. Préparer les fichiers localement

```bash
# Convertir tous les MP3
npm run convert:opus

# Vérifier les résultats
ls -lh public/audio/**/*.opus
```

### 2. Transférer vers le VPS

**Option A : rsync (recommandé)**
```bash
rsync -avz --progress \
  public/audio/ \
  user@your-vps.ovh:/path/to/app/public/audio/
```

**Option B : scp**
```bash
scp -r public/audio/* \
  user@your-vps.ovh:/path/to/app/public/audio/
```

**Option C : Git (si les fichiers sont versionnés)**
```bash
git add public/audio
git commit -m "Add Opus audio files"
git push
# Sur le VPS
git pull
```

### 3. Configurer Nginx (optionnel mais recommandé)

Si vous utilisez Nginx devant Next.js :

```nginx
# /etc/nginx/sites-available/your-app

# Gestion des types MIME
types {
    audio/ogg opus;
    audio/mp4 m4a;
    audio/mpeg mp3;
}

# Cache des fichiers audio
location ~* \.(mp3|opus|m4a)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Accept-Ranges bytes;
}

# Cache des images
location ~* \.(jpg|jpeg|png|webp|gif|svg)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# Compression Gzip (ne pas compresser l'audio déjà compressé)
gzip on;
gzip_types text/css application/javascript application/json;
gzip_comp_level 6;
```

Redémarrer Nginx :
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## 🐛 Dépannage

### Le fichier Opus ne se lit pas

1. Vérifier les permissions :
```bash
chmod 644 public/audio/**/*.opus
```

2. Vérifier le Content-Type dans les headers HTTP :
```bash
curl -I https://your-domain.com/audio/track.opus
# Doit contenir: Content-Type: audio/ogg; codecs=opus
```

3. Tester en local :
```bash
ffplay public/audio/track.opus  # Si FFmpeg installé
```

### Le navigateur utilise toujours MP3

- Vider le cache du navigateur (Ctrl+Shift+Delete)
- Vérifier la console pour les erreurs
- Vérifier que les fichiers .opus existent bien

### Conversion échoue

```bash
# Vérifier la validité du MP3 source
ffmpeg -v error -i input.mp3 -f null -

# Ré-encoder le MP3 si corrompu
ffmpeg -i broken.mp3 -c:a libmp3lame -b:a 320k fixed.mp3
```

## 📈 Monitoring

### Vérifier l'utilisation de bande passante

Sur le VPS :
```bash
# Installer vnstat si pas déjà fait
sudo apt-get install vnstat

# Voir les stats
vnstat -d  # Par jour
vnstat -m  # Par mois
```

### Logs Nginx

```bash
# Top 10 fichiers les plus téléchargés
sudo cat /var/log/nginx/access.log | \
  grep -E '\.(mp3|opus)' | \
  awk '{print $7}' | \
  sort | uniq -c | sort -rn | head -10
```

## 🎓 Ressources

- [Opus Codec](https://opus-codec.org/) - Site officiel
- [FFmpeg Opus Encoding Guide](https://trac.ffmpeg.org/wiki/Encode/HighQualityAudio#Opus)
- [Can I Use: Opus](https://caniuse.com/opus) - Compatibilité navigateurs
- [OVH VPS Documentation](https://help.ovhcloud.com/csm/en-gb-vps-getting-started?id=kb_browse_cat)

## ✅ Checklist finale

Avant mise en production :

- [ ] Tous les MP3 convertis en Opus
- [ ] Fichiers MP3 conservés comme fallback
- [ ] Script testé en local
- [ ] Headers de cache configurés (next.config.ts)
- [ ] Fichiers uploadés sur VPS
- [ ] Permissions correctes (644)
- [ ] Test dans Chrome (Opus)
- [ ] Test dans Safari (MP3 fallback)
- [ ] Test dans Firefox (Opus)
- [ ] Monitoring bande passante actif
- [ ] Nginx configuré (si applicable)
