#!/bin/bash
# Fix @ scoped package names in asset paths for Cloudflare Pages.
# Cloudflare Pages cannot serve files with @ in their path.
#
# Example: dist/assets/node_modules/@expo/... → dist/assets/node_modules/expo/...

set -euo pipefail

ASSETS_DIR="dist/assets/node_modules"

if [ ! -d "$ASSETS_DIR" ]; then
  echo "No assets to fix."
  exit 0
fi

# Rename @scope directories (e.g., @expo → expo, @react-navigation → react-navigation)
cd "$ASSETS_DIR"
for dir in @*/; do
  [ -d "$dir" ] || continue
  newname="${dir#@}"
  echo "Renaming $dir → $newname"
  mv "$dir" "$newname"
done
cd ../../..

# Update references in JS bundle
sed -i 's|node_modules/@|node_modules/|g' dist/_expo/static/js/web/*.js

echo "Done: fixed asset paths for Cloudflare Pages."
