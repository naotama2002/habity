# 開発環境設計

## 概要

ローカル開発環境は `supabase start` で Supabase の全サービスが起動する構成。
Supabase CLI がデータベース、Auth、REST API、Realtime、Storage、Studio を管理する。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Local Development                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    supabase start                             │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌─────────────┐                           │   │
│  │  │  PostgreSQL │  │   Supabase  │                           │   │
│  │  │   :5432     │  │   Studio    │                           │   │
│  │  │             │  │   :54323    │                           │   │
│  │  └─────────────┘  └─────────────┘                           │   │
│  │         │                                                    │   │
│  │         │         ┌─────────────┐                           │   │
│  │         └────────▶│  Supabase   │                           │   │
│  │                   │    API      │                           │   │
│  │                   │   :54321    │                           │   │
│  │                   └─────────────┘                           │   │
│  │                          ▲                                  │   │
│  └──────────────────────────┼──────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────┼──────────────────────────────────┐   │
│  │         React Native Web (Host Machine)                      │   │
│  │                          │                                   │   │
│  │  ┌───────────┐                                              │   │
│  │  │    Web    │                                              │   │
│  │  │  :8081    │                                              │   │
│  │  └───────────┘                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## サービス構成

| サービス | ポート | 説明 |
|---------|-------|------|
| PostgreSQL | 5432 | データベース |
| Supabase API (Kong) | 54321 | REST/GraphQL API ゲートウェイ |
| Supabase Auth (GoTrue) | 54321 | 認証サービス |
| Supabase Realtime | 54321 | リアルタイム購読 |
| Supabase Studio | 54323 | 管理 UI |
| Mailpit | 54324 | メールテスト用 |
| React Native Web | 8081 | フロントエンド開発サーバー |

---

## ディレクトリ構成

```
habity/
├── .env.example                 # 環境変数テンプレート
├── .env                         # ローカル環境変数（.gitignore）
│
├── supabase/                    # Supabase 設定
│   ├── config.toml              # Supabase CLI 設定
│   └── migrations/              # DB マイグレーション
│       └── 20240101000000_init.sql  # 全テーブル・RLS・関数定義
│
├── src/                         # React Native
├── metro.config.js              # Metro bundler 設定（pnpm 対応）
├── babel.config.js              # Babel 設定
├── package.json
└── ...
```

---

## 環境変数 (.env.example)

```bash
# ===========================================
# React Native / Expo
# ===========================================
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase start で表示される Publishable key>
```

`supabase start` 実行時に表示される Publishable key を `.env` に設定する。
その他の環境変数（JWT_SECRET, DB パスワード等）は Supabase CLI が自動管理するため設定不要。

---

## 開発環境セットアップ手順

### 前提条件

- Docker Desktop
- [mise](https://mise.jdx.dev/) (ツールバージョン管理)

### 1. リポジトリクローン

```bash
git clone https://github.com/naotama2002/habity.git
cd habity
```

### 2. 開発ツールのインストール

```bash
# mise で Node.js, pnpm, Supabase CLI をインストール
mise install
```

`.mise.toml` で以下が管理されています:
- Node.js 24.13.0 (Active LTS)
- pnpm 10.28.0
- Supabase CLI

### 3. 環境変数設定

```bash
cp .env.example .env
```

### 4. Supabase 起動

```bash
supabase start
```

初回はイメージのダウンロードに数分かかる。
起動後に表示される Publishable key を `.env` の `EXPO_PUBLIC_SUPABASE_ANON_KEY` に設定する。

### 5. 起動確認

| サービス | URL | 説明 |
|---------|-----|------|
| Supabase API | http://localhost:54321 | REST API |
| Supabase Studio | http://localhost:54323 | 管理 UI |
| Mailpit | http://localhost:54324 | メールテスト |

### 6. フロントエンドセットアップ

```bash
# 依存パッケージインストール
pnpm install

# Web 開発サーバー起動
pnpm web
```

### 7. DB マイグレーション

`supabase start` 時にマイグレーションは自動適用される。
追加マイグレーションの適用:

```bash
# ローカル DB にマイグレーション適用
supabase db push --local

# マイグレーション状態の確認
supabase migration list --local
```

詳細は [06-migration.md](./06-migration.md) を参照してください。

---

## 開発コマンド

```bash
# 起動
supabase start

# 停止
supabase stop

# DB リセット（全マイグレーション再適用）
supabase db reset

# DB シェル
supabase db shell
```

---

## トラブルシューティング

### ポートが使用中

```bash
# 使用中のポートを確認
lsof -i :5432
lsof -i :54321

# プロセスを終了
kill -9 <PID>
```

### DB 接続エラー

```bash
# Supabase の状態確認
supabase status

# 再起動
supabase stop && supabase start
```

### マイグレーションエラー

```bash
# DB リセット（全マイグレーション再適用）
supabase db reset
```

### Metro bundler エラー (Web)

pnpm 環境で依存関係エラーが出る場合:

```bash
# キャッシュクリアして再起動
pnpm expo start --web --clear
```

---

## 本番環境への移行

Web デプロイには **Cloudflare Pages**（無料）、バックエンドには **Supabase Cloud**（無料枠）を使用。

詳細は以下を参照:
- [07-supabase-cloud-setup.md](./07-supabase-cloud-setup.md) - Supabase Cloud 移行ガイド
- [08-cloudflare-pages-deploy.md](./08-cloudflare-pages-deploy.md) - Cloudflare Pages デプロイガイド
