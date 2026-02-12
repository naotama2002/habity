# Cloudflare Pages デプロイガイド

## 概要

Habity の Web フロントエンドを **Cloudflare Pages** にデプロイする手順。
Supabase Cloud と組み合わせることで、**$0/月**（無料枠内）で運用できる。

### 構成

```
[本番構成]
Supabase Cloud:    DB + Auth + REST + Realtime + Storage
Cloudflare Pages:  Web フロントエンド (SPA)
```

### 前提

- Supabase Cloud プロジェクトが作成済み（[07-supabase-cloud-setup.md](./07-supabase-cloud-setup.md) 参照）
- Cloudflare アカウントを持っている
- GitHub リポジトリに push 済み

---

## 1. Cloudflare Pages プロジェクト作成

### 1-1. ダッシュボードから作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. 左メニューの **Workers & Pages** を選択
3. **Create** → **Pages** → **Connect to Git** を選択
4. GitHub アカウントを連携し、`naotama2002/habity` リポジトリを選択
5. プロジェクト名を設定（例: `habity`）

### 1-2. ビルド設定

Cloudflare Pages ダッシュボードの **Build settings** に以下を入力:

| 項目 | 値 | 備考 |
|------|-----|------|
| Production branch | `main` | |
| Build command | `pnpm install && pnpm intl:compile && pnpm exec expo export --platform web && bash scripts/fix-cloudflare-assets.sh` | |
| Build output directory | `dist` | `expo export` のデフォルト出力先 |
| Root directory | `/` | デフォルト |

### 1-3. 環境変数

**Settings → Environment variables** 

| 変数 | 値 | 説明 |
|------|-----|------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Supabase Cloud の Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase Cloud の anon public key |
| `EXPO_PUBLIC_ENABLE_SIGNUP` | `false` | 新規登録の有効/無効 |
| `NODE_VERSION` | `24` | Node.js バージョン |
| `PNPM_VERSION` | `10.28.0` | pnpm バージョン |

> `EXPO_PUBLIC_*` 環境変数は `expo export` のビルド時に JS バンドルへ静的に埋め込まれる。変更した場合は再デプロイが必要。

---

## 2. カスタムドメイン設定（任意）

### 3-1. ドメイン追加

1. **Pages プロジェクト** → **Custom domains** → **Set up a custom domain**
2. ドメインを入力（例: `habity.example.com`）
3. Cloudflare が DNS レコードを自動設定

### 3-2. SSL/TLS

Cloudflare Pages は自動で SSL 証明書を発行。追加設定不要。

---

## 3. GitHub 連携（自動デプロイ）

Cloudflare Pages は GitHub と連携すると、以下が自動で行われる:

| イベント | 動作 |
|---------|------|
| `main` への push | Production デプロイ |
| PR 作成/更新 | Preview デプロイ（PR ごとに固有 URL） |

### Preview デプロイ

PR に対して自動で Preview URL が生成される:
- `https://<commit-hash>.habity.pages.dev`

PR レビュー時に実際の動作を確認できる。

---

## 4. 手動デプロイ（CLI）

GitHub 連携を使わず、手動でデプロイする場合:

```bash
# ビルド
pnpm install
pnpm intl:compile
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
EXPO_PUBLIC_ENABLE_SIGNUP=false \
pnpm exec expo export --platform web
bash scripts/fix-cloudflare-assets.sh

# デプロイ（Wrangler CLI）
pnpm exec wrangler pages deploy dist --project-name habity
```

> Wrangler CLI は `pnpm add -D wrangler` でインストールできる。

---

## 5. チェックリスト

### デプロイ前

- [ ] Supabase Cloud の設定が完了している
- [ ] 環境変数が正しく設定されている

### デプロイ後

- [ ] サイトにアクセスできる
- [ ] ログイン/ログアウトが動作する
- [ ] Supabase Cloud との通信が正常
- [ ] SPA ルーティングが動作する（直接 URL アクセスで 404 にならない）

---

## トラブルシューティング

### ビルドエラー: Node.js バージョン

Cloudflare Pages のデフォルト Node.js バージョンが古い場合:
- 環境変数 `NODE_VERSION=24` を設定

### 直接 URL アクセスで 404

SPA ルーティングは `functions/[[path]].ts`（Cloudflare Pages Functions）で対応している。
静的ファイルがあればそれを返し、なければ `index.html` にフォールバックする。

> **注意:** `_redirects` の `/* /index.html 200` は使用しない。
> 静的アセットのリクエストも横取りして `index.html` を返す問題がある。

### アイコン・フォントが表示されない

**Cloudflare Pages 固有の制約:** `node_modules/` を含むパスの静的ファイルは配信されない。
`expo export` はフォントを `dist/assets/node_modules/@expo/...` に出力するため、
そのままでは Cloudflare Pages でアイコンフォントが読み込めない。

対策として `scripts/fix-cloudflare-assets.sh` をビルドコマンドに追加している。
このスクリプトは `node_modules/` → `vendor/` へリネームし、JS バンドル内の参照も書き換える。
ローカル開発や他のホスティングサービスでは不要。

### 環境変数が反映されない

`EXPO_PUBLIC_*` 環境変数はビルド時に埋め込まれる。
環境変数を変更した場合は**再デプロイ**が必要。

---

## 参考

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Expo Web - Static Rendering](https://docs.expo.dev/guides/customizing-metro/#web-support)
- [07-supabase-cloud-setup.md](./07-supabase-cloud-setup.md) - Supabase Cloud 移行ガイド
