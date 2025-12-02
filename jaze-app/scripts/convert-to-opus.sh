#!/bin/bash
# Script de conversion MP3 vers Opus
# Usage: ./scripts/convert-to-opus.sh [input_dir] [output_dir]
#
# Prérequis: FFmpeg avec support Opus
# Installation: sudo apt-get install ffmpeg

set -e

INPUT_DIR="${1:-public/audio}"
OUTPUT_DIR="${2:-public/audio}"

# Couleurs pour output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Conversion audio MP3 → Opus ===${NC}"
echo "Dossier source : $INPUT_DIR"
echo "Dossier cible  : $OUTPUT_DIR"
echo ""

# Vérifier que FFmpeg est installé
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}Erreur: FFmpeg n'est pas installé${NC}"
    echo "Installation: sudo apt-get install ffmpeg"
    exit 1
fi

# Vérifier que FFmpeg supporte Opus
if ! ffmpeg -codecs 2>/dev/null | grep -q "opus"; then
    echo -e "${RED}Erreur: FFmpeg ne supporte pas Opus${NC}"
    exit 1
fi

# Compteurs
total=0
success=0
skipped=0
failed=0

# Trouver tous les fichiers MP3
while IFS= read -r -d '' mp3_file; do
    total=$((total + 1))

    # Générer le nom du fichier Opus
    relative_path="${mp3_file#$INPUT_DIR/}"
    opus_file="$OUTPUT_DIR/${relative_path%.mp3}.opus"
    opus_dir=$(dirname "$opus_file")

    # Créer le dossier de destination si nécessaire
    mkdir -p "$opus_dir"

    # Vérifier si le fichier Opus existe déjà
    if [ -f "$opus_file" ]; then
        echo -e "${BLUE}⏭  Déjà converti:${NC} $relative_path"
        skipped=$((skipped + 1))
        continue
    fi

    echo -e "${BLUE}🔄 Conversion:${NC} $relative_path"

    # Conversion avec FFmpeg
    # -b:a 128k : bitrate 128 kbps (équivalent ~256kbps MP3)
    # -vbr on : Variable Bitrate pour meilleure qualité
    # -compression_level 10 : Compression maximale (plus lent mais meilleur résultat)
    if ffmpeg -i "$mp3_file" \
        -c:a libopus \
        -b:a 128k \
        -vbr on \
        -compression_level 10 \
        -map_metadata 0 \
        "$opus_file" \
        -y \
        -loglevel error 2>&1; then

        # Calculer les tailles
        mp3_size=$(stat -f%z "$mp3_file" 2>/dev/null || stat -c%s "$mp3_file")
        opus_size=$(stat -f%z "$opus_file" 2>/dev/null || stat -c%s "$opus_file")
        reduction=$(( 100 - (opus_size * 100 / mp3_size) ))

        echo -e "${GREEN}✓  Succès${NC} (réduction: ${reduction}%)"
        success=$((success + 1))
    else
        echo -e "${RED}✗  Échec${NC}"
        failed=$((failed + 1))
    fi

    echo ""
done < <(find "$INPUT_DIR" -type f -name "*.mp3" -print0)

# Résumé
echo -e "${BLUE}=== Résumé ===${NC}"
echo "Total fichiers  : $total"
echo -e "${GREEN}Convertis       : $success${NC}"
echo -e "${BLUE}Déjà convertis  : $skipped${NC}"
echo -e "${RED}Échecs          : $failed${NC}"

if [ $success -gt 0 ]; then
    echo ""
    echo -e "${GREEN}Conversion terminée avec succès !${NC}"
fi

exit 0
