#!/bin/bash
# ============================================================
# PWA メタタグを dist/index.html に注入
# ============================================================
#
# Expo export 後に実行し、manifest.json リンクと
# apple-mobile-web-app 関連のメタタグを </head> 前に挿入する。
#
# ビルドコマンド:
#   pnpm exec expo export --platform web && bash scripts/inject-pwa-meta.sh
# ============================================================

set -euo pipefail

INDEX="dist/index.html"

if [ ! -f "$INDEX" ]; then
  echo "Error: $INDEX not found"
  exit 1
fi

# PWA メタタグ（ヒアドキュメントで可読性を確保）
PWA_META='    <link rel="manifest" href="/manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="theme-color" content="#6366f1">
    <link rel="apple-touch-icon" href="/assets/icon-192.png">'

# sed -i のプラットフォーム差異を吸収（macOS vs Linux）
# 一時ファイルを使って移植性を担保
TMPFILE=$(mktemp)
awk -v meta="$PWA_META" '{
  if (index($0, "</head>") > 0) {
    print meta
  }
  print
}' "$INDEX" > "$TMPFILE"
mv "$TMPFILE" "$INDEX"

echo "Done: PWA meta tags injected into $INDEX"
