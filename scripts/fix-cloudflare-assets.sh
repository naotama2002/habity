#!/bin/bash
# ============================================================
# Cloudflare Pages 専用ワークアラウンド
# ============================================================
#
# Cloudflare Pages は dist/ 内の "node_modules/" パスに含まれる
# 静的ファイルを配信できない（アップロードされるが取得時に無視される）。
#
# expo export が生成するアセットパス:
#   dist/assets/node_modules/@expo/vector-icons/.../Ionicons.xxx.ttf
#   dist/assets/node_modules/@react-navigation/elements/.../back-icon.png
#
# このスクリプトで以下に変換:
#   dist/assets/vendor/expo/vector-icons/.../Ionicons.xxx.ttf
#   dist/assets/vendor/react-navigation/elements/.../back-icon.png
#
# 同時に JS バンドル内のパス参照も書き換える。
#
# ※ ローカル開発（expo start）や他のホスティングでは不要。
# ※ Cloudflare Pages でのデプロイ時のみビルドコマンドに追加する。
# ============================================================

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
