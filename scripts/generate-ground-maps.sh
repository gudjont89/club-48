#!/usr/bin/env bash
# Generate static map images for grounds with coordinates
# Downloads OSM tiles and composites a red marker pin
# Output: public/grounds/{ground_id}.png

set -euo pipefail

OUT_DIR="public/maps"
mkdir -p "$OUT_DIR"

ZOOM=11
TILE_SIZE=256

# Generate a clean red marker pin as PNG
MARKER_PNG=$(mktemp /tmp/marker-XXXX.png)
magick -size 24x36 xc:none \
  -fill '#e74c3c' -draw "path 'M 12,0 C 5.4,0 0,5.4 0,12 0,21 12,36 12,36 12,36 24,21 24,12 24,5.4 18.6,0 12,0 Z'" \
  -fill white -draw "circle 12,11 12,6" \
  "$MARKER_PNG"

# Convert lat/lng to tile x,y and pixel offset within the tile
calc_tile() {
  python3 -c "
import math, sys
lat, lon, zoom = float(sys.argv[1]), float(sys.argv[2]), int(sys.argv[3])
n = 2**zoom
tx = (lon + 180) / 360 * n
ty = (1 - math.log(math.tan(math.radians(lat)) + 1/math.cos(math.radians(lat))) / math.pi) / 2 * n
tile_x = int(tx)
tile_y = int(ty)
# Pixel offset within the tile
px = int((tx - tile_x) * $TILE_SIZE)
py = int((ty - tile_y) * $TILE_SIZE)
print(f'{tile_x} {tile_y} {px} {py}')
" "$1" "$2" "$3"
}

# Read grounds.csv, skip header
tail -n +2 data/ksi/grounds.csv | while IFS=',' read -r id name city lat lng capacity surface; do
  # Skip if no coordinates
  [ -z "$lat" ] || [ -z "$lng" ] && continue

  # Skip if already generated
  [ -f "$OUT_DIR/$id.png" ] && echo "  $id ($name): exists, skipping" && continue

  echo "  $id ($name): generating..."

  # Get tile coordinates and pixel offset
  read tile_x tile_y px py <<< $(calc_tile "$lat" "$lng" "$ZOOM")

  # Download a 3x3 grid of tiles centered on the target tile
  TMPDIR=$(mktemp -d)
  for dy in -1 0 1; do
    for dx in -1 0 1; do
      tx=$((tile_x + dx))
      ty=$((tile_y + dy))
      curl -sL -H "User-Agent: club-48/1.0" \
        -o "$TMPDIR/tile_${dx}_${dy}.png" \
        "https://basemaps.cartocdn.com/rastertiles/voyager/$ZOOM/$tx/$ty.png"
      sleep 0.2
    done
  done

  # Stitch the 3x3 grid into one 768x768 image
  magick "$TMPDIR/tile_-1_-1.png" "$TMPDIR/tile_0_-1.png" "$TMPDIR/tile_1_-1.png" +append "$TMPDIR/row0.png"
  magick "$TMPDIR/tile_-1_0.png" "$TMPDIR/tile_0_0.png" "$TMPDIR/tile_1_0.png" +append "$TMPDIR/row1.png"
  magick "$TMPDIR/tile_-1_1.png" "$TMPDIR/tile_0_1.png" "$TMPDIR/tile_1_1.png" +append "$TMPDIR/row2.png"
  magick "$TMPDIR/row0.png" "$TMPDIR/row1.png" "$TMPDIR/row2.png" -append "$TMPDIR/grid.png"

  # The marker position in the full 768x768 grid
  # Center tile starts at pixel (256, 256), marker is at (256+px, 256+py)
  marker_x=$((TILE_SIZE + px - 12))  # center the 24px marker
  marker_y=$((TILE_SIZE + py - 36))  # pin bottom at the point

  # Composite marker onto the grid
  magick "$TMPDIR/grid.png" \
    "$MARKER_PNG" \
    -geometry "+${marker_x}+${marker_y}" -composite \
    "$TMPDIR/marked.png"

  # Crop to a 400x200 region centered on the marker point
  crop_x=$((TILE_SIZE + px - 200))
  crop_y=$((TILE_SIZE + py - 100))
  # Clamp to bounds
  [ "$crop_x" -lt 0 ] && crop_x=0
  [ "$crop_y" -lt 0 ] && crop_y=0

  magick "$TMPDIR/marked.png" -crop "400x200+${crop_x}+${crop_y}" +repage "$OUT_DIR/$id.png"

  rm -rf "$TMPDIR"
  echo "    -> $OUT_DIR/$id.png"
done

rm -f "$MARKER_PNG"
echo "Done."
