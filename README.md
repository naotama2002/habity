# Habity

習慣トラッキング Web アプリケーション。Habitify に似た機能を持つ。

## 技術スタック

- **フロントエンド**: React Native Web + Expo Web
- **バックエンド**: Supabase (PostgreSQL, Auth, Realtime) + Go
- **参考実装**: [Bluesky social-app](https://github.com/bluesky-social/social-app)

## 開発環境セットアップ

### 前提条件

- Docker Desktop
- [mise](https://mise.jdx.dev/) (ツールバージョン管理)

### 1. ツールのインストール

```bash
# mise で必要なツールをインストール
mise install
```

これにより以下がインストールされます（`.mise.toml` で管理）:
- Node.js 24.13.0 (Active LTS)
- pnpm 10.28.0
- Go 1.25.6
- Supabase CLI

### 2. 環境変数設定

```bash
cp .env.example .env
```

### 3. Supabase 起動

```bash
supabase start
```

起動後のサービス:

| サービス | URL | 説明 |
|---------|-----|------|
| Supabase API | http://localhost:54321 | REST/Auth/Realtime |
| Supabase Studio | http://localhost:54323 | 管理 UI |
| Mailpit | http://localhost:54324 | メールテスト |

### 4. フロントエンド起動

```bash
# 依存パッケージインストール
pnpm install

# Web 版
pnpm web
```

## プロジェクト構成

```
habity/
├── .mise.toml              # mise ツールバージョン定義
├── app/                    # Expo Router 画面定義
├── src/                    # React Native ソースコード
│   ├── components/         # 共通コンポーネント
│   ├── lib/                # ユーティリティ
│   ├── state/              # 状態管理 (React Query)
│   └── types/              # 型定義
├── backend/                # Go バックエンド
├── supabase/               # Supabase 設定・マイグレーション
│   ├── config.toml         # Supabase CLI 設定
│   └── migrations/         # DB マイグレーション
└── docs/                   # 仕様ドキュメント
```

## ドキュメント

- [概要](docs/00-overview.md)
- [技術スタック](docs/01-tech-stack.md)
- [Habitify インポート](docs/02-habitify-import.md)
- [データモデル](docs/03-data-model.md)
- [UI/UX 設計](docs/04-ui-design.md)
- [開発環境](docs/05-development-environment.md)
- [マイグレーション運用](docs/06-migration.md)
- [Supabase Cloud 移行](docs/07-supabase-cloud-setup.md)
- [実装 TODO](docs/TODO.md)

開発ガイド: [CLAUDE.md](CLAUDE.md)

## コマンド

```bash
# ツール管理
mise install              # ツールインストール

# Supabase (ローカル開発)
supabase start            # 起動
supabase stop             # 停止
supabase db reset         # DB リセット（全マイグレーション再適用）

# マイグレーション
supabase migration new <name>   # 新規作成
supabase db push --local        # ローカル適用
supabase migration list --local # 状態確認

# フロントエンド
pnpm install              # 依存パッケージインストール
pnpm web                  # Web 版起動
pnpm lint                 # Lint
pnpm typecheck            # 型チェック

# Go バックエンド
cd backend && go run cmd/server/main.go
```

## ライセンス

MIT
