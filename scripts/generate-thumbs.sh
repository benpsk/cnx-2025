#!/usr/bin/env bash
set -euo pipefail

# Generate lightweight thumbnails for all images under images/ into images/_thumbs/
# - Keeps directory structure mirrored
# - Outputs WebP thumbnails (~640px longest edge, quality 70)
# - Requires ImageMagick (convert) installed locally

shopt -s globstar nullglob

count=0
for f in images/**/*.{jpg,jpeg,JPG,JPEG}; do
  # Skip anything already in _thumbs
  if [[ "$f" == images/_thumbs/* ]]; then
    continue
  fi
  rel="${f#images/}"
  out="images/_thumbs/${rel%.*}.webp"
  mkdir -p "$(dirname "$out")"
  # Only regenerate if missing or source is newer
  if [[ ! -f "$out" || "$f" -nt "$out" ]]; then
    echo "[thumb] $f -> $out"
    convert "$f" -auto-orient -strip -resize '640x640>' -quality 70 \
      -define webp:method=6 -define webp:near-lossless=0 "$out"
    ((count++)) || true
  fi
done

echo "Generated/updated $count thumbnails in images/_thumbs/"

