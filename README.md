# Habity

習慣トラッキングアプリケーション。Habitify に似た機能を持つマルチプラットフォーム対応アプリ。

## 技術スタック

- **フロントエンド**: React Native + Expo (iOS, Android, Web, macOS)
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

これにより以下がインストールされます（`.tool-versions` で管理）:
- Node.js 24.13.0 (Active LTS)
- pnpm 10.28.0
- Go 1.25.6

### 2. 環境変数設定

```bash
cp .env.example .env
```

### 3. Docker 起動

```bash
docker compose up -d
```

起動後のサービス:

| サービス | URL | 説明 |
|---------|-----|------|
| Supabase API | http://localhost:54321 | REST/Auth/Realtime |
| Supabase Studio | http://localhost:54323 | 管理 UI |
| Go Backend | http://localhost:8080 | カスタム API |
| Inbucket | http://localhost:54324 | メールテスト |

### 4. フロントエンド起動

```bash
# 依存パッケージインストール
pnpm install

# Web 版
pnpm web

# iOS (要 Xcode)
pnpm ios

# Android (要 Android Studio)
pnpm android
```

## プロジェクト構成

```
habity/
├── .tool-versions          # mise ツールバージョン定義
├── app/                    # Expo Router 画面定義
├── src/                    # React Native ソースコード
│   ├── components/         # 共通コンポーネント
│   ├── lib/                # ユーティリティ
│   ├── state/              # 状態管理 (React Query)
│   └── types/              # 型定義
├── backend/                # Go バックエンド
├── supabase/               # Supabase 設定・マイグレーション
├── docs/                   # 仕様ドキュメント
└── docker-compose.yml      # 開発環境
```

## ドキュメント

- [概要](docs/00-overview.md)
- [技術スタック](docs/01-tech-stack.md)
- [Habitify インポート](docs/02-habitify-import.md)
- [データモデル](docs/03-data-model.md)
- [UI/UX 設計](docs/04-ui-design.md)
- [開発環境](docs/05-development-environment.md)
- [実装 TODO](docs/TODO.md)

開発ガイド: [CLAUDE.md](CLAUDE.md)

## コマンド

```bash
# ツール管理
mise install              # ツールインストール

# Docker
docker compose up -d      # 起動
docker compose down       # 停止
docker compose logs -f    # ログ確認

# フロントエンド
pnpm install              # 依存パッケージインストール
pnpm web                  # Web 版起動
pnpm ios                  # iOS 起動
pnpm android              # Android 起動
pnpm lint                 # Lint
pnpm typecheck            # 型チェック

# Go バックエンド
cd backend && go run cmd/server/main.go
```

## ライセンス

MIT
