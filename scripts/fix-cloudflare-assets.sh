#!/bin/bash
# Fix asset paths for Cloudflare Pages.
# Cloudflare Pages cannot serve files under "node_modules/" paths.
#
# Example: dist/assets/node_modules/@expo/... → dist/assets/vendor/expo/...

set -euo pipefail

ASSETS_DIR="dist/assets/node_modules"

if [ ! -d "$ASSETS_DIR" ]; then
  echo "No assets to fix."
  exit 0
fi

# Move node_modules → vendor, stripping @ from scoped package names
mkdir -p dist/assets/vendor
cd "$ASSETS_DIR"
for dir in */; do
  newname="${dir#@}"
  echo "Moving $dir → vendor/$newname"
  mv "$dir" "../vendor/$newname"
done
cd ../../..
rmdir "$ASSETS_DIR"

# Update references in JS bundle
sed -i 's|assets/node_modules/@\?|assets/vendor/|g' dist/_expo/static/js/web/*.js

echo "Done: fixed asset paths for Cloudflare Pages."
