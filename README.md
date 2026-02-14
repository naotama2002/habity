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
- Supabase CLI 2.75.0

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
| Go Backend | http://localhost:8088 | カスタム API |
| Inbucket | http://localhost:54324 | メールテスト |

### 4. フロントエンド起動

```bash
# 依存パッケージインストール
pnpm install

# Web 版
pnpm web
```

### 5. Web フロントエンド (Docker)

開発環境では Web フロントエンドも Docker で配信できます。`docker compose up` に含まれる `web` サービスが nginx 経由で Expo Web ビルドを配信し、Supabase API と Go Backend へのリバースプロキシも行います。

| サービス | URL | 説明 |
|---------|-----|------|
| Web フロントエンド | http://localhost:3000 | nginx + Expo Web ビルド |

## デプロイ (EC2 等)

デプロイ環境では Supabase Cloud を利用するため、Docker には Web フロントエンドと Go Backend のみを含めます。

### アーキテクチャ

```
Browser -> nginx (port 3000)
  ├── /          -> 静的ファイル (Expo Web ビルド)
  ├── /api/v1/*  -> Go Backend (Docker 内)
  └── /health    -> Go Backend (Docker 内)

Supabase API -> 直接 Supabase Cloud (https://xxx.supabase.co)
```

### セットアップ

```bash
# 1. 環境変数ファイルを作成
cp .env.deploy.example .env.deploy

# 2. .env.deploy を編集して Supabase Cloud の情報を設定
#    - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
#    - DATABASE_URL (Supabase Cloud の PostgreSQL 接続文字列)
#    - JWT_SECRET

# 3. ビルド & 起動
docker compose -f docker-compose.deploy.yml --env-file .env.deploy up -d --build

# 4. 停止
docker compose -f docker-compose.deploy.yml --env-file .env.deploy down
```

### Docker Compose ファイル構成

| ファイル | 用途 | 含まれるサービス |
|---------|------|----------------|
| `docker-compose.yml` | ローカル開発 | Supabase 全スタック + Go Backend (+ Web は `--profile web` で起動) |
| `docker-compose.deploy.yml` | デプロイ | Go Backend + Web のみ |

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
├── nginx/                  # nginx 設定
│   ├── default.conf        # 開発用 (Supabase プロキシあり)
│   └── deploy.conf         # デプロイ用 (Backend プロキシのみ)
├── docker/                 # Docker 関連スクリプト
├── docs/                   # 仕様ドキュメント
├── Dockerfile.web          # Web フロントエンド用 Dockerfile
├── docker-compose.yml      # 開発環境 (全スタック)
└── docker-compose.deploy.yml # デプロイ環境 (Web + Backend)
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

# Docker (開発: Supabase + Backend)
docker compose up -d      # 起動
docker compose down       # 停止
docker compose logs -f    # ログ確認

# Docker (開発: Web フロントエンドも含める場合)
docker compose --profile web up -d
docker compose --profile web down

# Docker (デプロイ)
docker compose -f docker-compose.deploy.yml --env-file .env.deploy up -d --build
docker compose -f docker-compose.deploy.yml --env-file .env.deploy down

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
