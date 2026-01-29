# 開発環境設計

## 概要

ローカル開発環境は `docker compose up` で全サービスが起動する構成。
デプロイ先は未定のため、コンテナベースで動作する設計とする。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Local Development                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    docker compose                             │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │  PostgreSQL │  │   Supabase  │  │    Go Backend       │  │   │
│  │  │   :5432     │  │   Studio    │  │      :8088          │  │   │
│  │  │             │  │   :54323    │  │                     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  │         │                                    │               │   │
│  │         │         ┌─────────────┐           │               │   │
│  │         └────────▶│  Supabase   │◀──────────┘               │   │
│  │                   │    API      │                           │   │
│  │                   │   :54321    │                           │   │
│  │                   └─────────────┘                           │   │
│  │                          ▲                                  │   │
│  └──────────────────────────┼──────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────┼──────────────────────────────────┐   │
│  │         React Native (Host Machine)                          │   │
│  │                          │                                   │   │
│  │  ┌───────────┐  ┌───────┴───────┐  ┌───────────────────┐   │   │
│  │  │    Web    │  │  iOS Simulator │  │ Android Emulator  │   │   │
│  │  │  :8081    │  │                │  │                   │   │   │
│  │  └───────────┘  └───────────────┘  └───────────────────┘   │   │
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
| Supabase Inbucket | 54324 | メールテスト用 |
| Go Backend | 8088 | カスタム API（Habitify インポート等）|
| React Native Web | 8081 | フロントエンド開発サーバー |

---

## ディレクトリ構成

```
habity/
├── docker-compose.yml          # 開発環境定義
├── .env.example                 # 環境変数テンプレート
├── .env                         # ローカル環境変数（.gitignore）
│
├── supabase/                    # Supabase 設定
│   ├── kong.yml                 # API Gateway 設定
│   └── migrations/              # DB マイグレーション
│       └── 20240101000000_init.sql  # 全テーブル・RLS・関数定義
│
├── backend/                     # Go バックエンド
│   ├── Dockerfile
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── config/
│   │   ├── handler/
│   │   ├── service/
│   │   ├── repository/
│   │   └── habitify/
│   ├── go.mod
│   └── go.sum
│
├── src/                         # React Native
├── metro.config.js              # Metro bundler 設定（pnpm 対応）
├── babel.config.js              # Babel 設定
├── package.json
└── ...
```

---

## docker-compose.yml

```yaml
version: "3.8"

services:
  # ===========================================
  # PostgreSQL Database
  # ===========================================
  db:
    image: supabase/postgres:15.6.1.143
    container_name: habity-db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: postgres
      JWT_SECRET: ${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters}
      JWT_EXP: 3600
    volumes:
      - habity-db-data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d/migrations
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  # ===========================================
  # Supabase Auth (GoTrue)
  # ===========================================
  auth:
    image: supabase/gotrue:v2.164.0
    container_name: habity-auth
    depends_on:
      db:
        condition: service_healthy
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: ${API_EXTERNAL_URL:-http://localhost:54321}

      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD:-postgres}@db:5432/postgres

      GOTRUE_SITE_URL: ${SITE_URL:-http://localhost:8081}
      GOTRUE_URI_ALLOW_LIST: ${ADDITIONAL_REDIRECT_URLS:-}
      GOTRUE_DISABLE_SIGNUP: ${DISABLE_SIGNUP:-false}

      GOTRUE_JWT_ADMIN_ROLES: service_role
      GOTRUE_JWT_AUD: authenticated
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_JWT_EXP: ${JWT_EXPIRY:-3600}
      GOTRUE_JWT_SECRET: ${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters}

      GOTRUE_EXTERNAL_EMAIL_ENABLED: ${ENABLE_EMAIL_SIGNUP:-true}
      GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED: ${ENABLE_ANONYMOUS_USERS:-false}
      GOTRUE_MAILER_AUTOCONFIRM: ${ENABLE_EMAIL_AUTOCONFIRM:-true}

      # Google OAuth
      GOTRUE_EXTERNAL_GOOGLE_ENABLED: ${ENABLE_GOOGLE_SIGNUP:-true}
      GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOTRUE_EXTERNAL_GOOGLE_SECRET: ${GOOGLE_CLIENT_SECRET:-}
      GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: ${API_EXTERNAL_URL:-http://localhost:54321}/auth/v1/callback

      GOTRUE_SMTP_HOST: inbucket
      GOTRUE_SMTP_PORT: 2500
      GOTRUE_SMTP_ADMIN_EMAIL: admin@habity.local
      GOTRUE_SMTP_MAX_FREQUENCY: 1s
      GOTRUE_MAILER_URLPATHS_INVITE: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_CONFIRMATION: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_RECOVERY: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: /auth/v1/verify
    restart: unless-stopped

  # ===========================================
  # Supabase REST API (PostgREST)
  # ===========================================
  rest:
    image: postgrest/postgrest:v12.2.3
    container_name: habity-rest
    depends_on:
      db:
        condition: service_healthy
    environment:
      PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD:-postgres}@db:5432/postgres
      PGRST_DB_SCHEMAS: public,storage,graphql_public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters}
      PGRST_DB_USE_LEGACY_GUCS: "false"
      PGRST_APP_SETTINGS_JWT_SECRET: ${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters}
      PGRST_APP_SETTINGS_JWT_EXP: ${JWT_EXPIRY:-3600}
    restart: unless-stopped

  # ===========================================
  # Supabase Realtime
  # ===========================================
  realtime:
    image: supabase/realtime:v2.30.34
    container_name: habity-realtime
    depends_on:
      db:
        condition: service_healthy
    environment:
      PORT: 4000
      APP_NAME: realtime
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: supabase_admin
      DB_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      DB_NAME: postgres
      DB_AFTER_CONNECT_QUERY: 'SET search_path TO _realtime'
      DB_ENC_KEY: supabaserealtime
      API_JWT_SECRET: ${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters}
      SECRET_KEY_BASE: ${SECRET_KEY_BASE:-UpNVntn3cDxHJpq99YMc1T1AQgQpc8kfYTuRgBiYa15BLrx8etQoXz3gZv1/u2oq}
      ERL_AFLAGS: -proto_dist inet_tcp
      DNS_NODES: "''"
      RLIMIT_NOFILE: "10000"
      ENABLE_TAILSCALE: "false"
      FLY_APP_NAME: ""
      FLY_ALLOC_ID: ""
    restart: unless-stopped

  # ===========================================
  # Supabase Storage
  # ===========================================
  storage:
    image: supabase/storage-api:v1.10.1
    container_name: habity-storage
    depends_on:
      db:
        condition: service_healthy
      rest:
        condition: service_started
    environment:
      ANON_KEY: ${ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}
      SERVICE_KEY: ${SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}
      DATABASE_URL: postgres://supabase_storage_admin:${POSTGRES_PASSWORD:-postgres}@db:5432/postgres
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: stub
      GLOBAL_S3_BUCKET: stub
      PGRST_JWT_SECRET: ${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters}
    volumes:
      - habity-storage-data:/var/lib/storage
    restart: unless-stopped

  # ===========================================
  # Supabase API Gateway (Kong)
  # ===========================================
  kong:
    image: kong:2.8.1
    container_name: habity-kong
    depends_on:
      auth:
        condition: service_started
      rest:
        condition: service_started
      realtime:
        condition: service_started
      storage:
        condition: service_started
    ports:
      - "54321:8000"
      - "54322:8443"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /home/kong/kong.yml
      KONG_DNS_ORDER: LAST,A,CNAME
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth
      KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 160k
      KONG_NGINX_PROXY_PROXY_BUFFERS: 64 160k
      SUPABASE_ANON_KEY: ${ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}
      SUPABASE_SERVICE_KEY: ${SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}
    volumes:
      - ./supabase/kong.yml:/home/kong/kong.yml:ro
    restart: unless-stopped

  # ===========================================
  # Supabase Studio (Admin UI)
  # ===========================================
  studio:
    image: supabase/studio:20240729-ce42139
    container_name: habity-studio
    depends_on:
      kong:
        condition: service_started
      meta:
        condition: service_started
    ports:
      - "54323:3000"
    environment:
      STUDIO_PG_META_URL: http://meta:8080
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}

      DEFAULT_ORGANIZATION_NAME: Habity
      DEFAULT_PROJECT_NAME: Habity

      SUPABASE_URL: http://kong:8000
      SUPABASE_PUBLIC_URL: ${API_EXTERNAL_URL:-http://localhost:54321}
      SUPABASE_ANON_KEY: ${ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}
      SUPABASE_SERVICE_KEY: ${SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}

      LOGFLARE_API_KEY: ${LOGFLARE_API_KEY:-}
      LOGFLARE_URL: http://localhost:4000
      NEXT_PUBLIC_ENABLE_LOGS: false
      NEXT_ANALYTICS_BACKEND_PROVIDER: postgres
    restart: unless-stopped

  # ===========================================
  # Supabase Meta (for Studio)
  # ===========================================
  meta:
    image: supabase/postgres-meta:v0.83.2
    container_name: habity-meta
    depends_on:
      db:
        condition: service_healthy
    environment:
      PG_META_PORT: 8080
      PG_META_DB_HOST: db
      PG_META_DB_PORT: 5432
      PG_META_DB_NAME: postgres
      PG_META_DB_USER: supabase_admin
      PG_META_DB_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    restart: unless-stopped

  # ===========================================
  # Inbucket (Email Testing)
  # ===========================================
  inbucket:
    image: inbucket/inbucket:3.0.3
    container_name: habity-inbucket
    ports:
      - "54324:9000"  # Web UI
      - "2500:2500"   # SMTP
    restart: unless-stopped

  # ===========================================
  # Go Backend
  # ===========================================
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: habity-backend
    depends_on:
      db:
        condition: service_healthy
      kong:
        condition: service_started
    ports:
      - "8088:8088"
    environment:
      PORT: 8088
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD:-postgres}@db:5432/postgres?sslmode=disable
      SUPABASE_URL: http://kong:8000
      SUPABASE_SERVICE_KEY: ${SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}
      JWT_SECRET: ${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters}
    # volumes:
    #   - ./backend:/app  # 開発時のホットリロード用（現在は無効）
    restart: unless-stopped

volumes:
  habity-db-data:
  habity-storage-data:
```

---

## 環境変数 (.env.example)

```bash
# ===========================================
# Supabase
# ===========================================
POSTGRES_PASSWORD=postgres
JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
JWT_EXPIRY=3600
SECRET_KEY_BASE=UpNVntn3cDxHJpq99YMc1T1AQgQpc8kfYTuRgBiYa15BLrx8etQoXz3gZv1/u2oq

# Supabase Keys (for local development)
# These are example keys for local development only - DO NOT use in production
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# URLs
API_EXTERNAL_URL=http://localhost:54321
SITE_URL=http://localhost:8081

# ===========================================
# Google OAuth (Optional for local)
# Get credentials from: https://console.cloud.google.com/apis/credentials
# ===========================================
ENABLE_GOOGLE_SIGNUP=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ===========================================
# Email
# ===========================================
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true

# ===========================================
# React Native / Expo
# ===========================================
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
EXPO_PUBLIC_BACKEND_URL=http://localhost:8088
```

---

## 開発環境セットアップ手順

### 前提条件

- Docker Desktop
- [mise](https://mise.jdx.dev/) (ツールバージョン管理)
- Xcode (iOS 開発時)
- Android Studio (Android 開発時)

### 1. リポジトリクローン

```bash
git clone https://github.com/naotama2002/habity.git
cd habity
```

### 2. 開発ツールのインストール

```bash
# mise で Node.js, pnpm, Go をインストール
mise install
```

`.tool-versions` で以下が管理されています:
- Node.js 24.13.0 (Active LTS)
- pnpm 10.28.0
- Go 1.25.6

### 3. 環境変数設定

```bash
cp .env.example .env
```

### 4. Docker 起動

```bash
# 全サービス起動
docker compose up -d

# ログ確認
docker compose logs -f

# 特定サービスのログ
docker compose logs -f backend
```

### 5. 起動確認

| サービス | URL | 説明 |
|---------|-----|------|
| Supabase API | http://localhost:54321 | REST API |
| Supabase Studio | http://localhost:54323 | 管理 UI |
| Inbucket | http://localhost:54324 | メールテスト |
| Go Backend | http://localhost:8088 | カスタム API |

### 6. React Native セットアップ

```bash
# 依存パッケージインストール
pnpm install

# Web 開発サーバー起動
pnpm web

# iOS シミュレータ
pnpm ios

# Android エミュレータ
pnpm android
```

### 7. DB マイグレーション

```bash
# マイグレーションは初回起動時に自動実行されます
# 手動実行する場合:
docker compose exec db psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/migrations/20240101000000_init.sql
```

---

## 開発コマンド

```bash
# 起動
docker compose up -d

# 停止
docker compose down

# 停止（ボリューム削除）
docker compose down -v

# 再ビルド
docker compose build --no-cache

# 特定サービスの再起動
docker compose restart backend

# DB シェル
docker compose exec db psql -U postgres

# Go バックエンドのログ
docker compose logs -f backend
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
# DB コンテナの状態確認
docker compose ps db
docker compose logs db

# DB の再起動
docker compose restart db
```

### マイグレーションエラー

```bash
# ボリュームを削除して再作成
docker compose down -v
docker compose up -d
```

### Supabase Auth が起動しない

`supabase_auth_admin` の認証エラーが出る場合:

```bash
# DB ユーザーのパスワード設定
docker exec habity-db psql -U postgres -c "ALTER USER supabase_auth_admin WITH PASSWORD 'postgres';"
docker exec habity-db psql -U postgres -c "ALTER USER authenticator WITH PASSWORD 'postgres';"
docker exec habity-db psql -U postgres -c "ALTER USER supabase_storage_admin WITH PASSWORD 'postgres';"

# auth スキーマの所有権を修正
docker exec habity-db psql -U postgres -c "ALTER SCHEMA auth OWNER TO supabase_auth_admin;"

# サービス再起動
docker compose restart auth rest storage
```

### Realtime が起動しない

`_realtime` スキーマがない場合:

```bash
docker exec habity-db psql -U postgres -c "CREATE SCHEMA IF NOT EXISTS _realtime; GRANT ALL ON SCHEMA _realtime TO supabase_admin;"
docker compose restart realtime
```

### Metro bundler エラー (Web)

pnpm 環境で依存関係エラーが出る場合:

```bash
# キャッシュクリアして再起動
pnpm expo start --web --clear
```

---

## 本番環境への移行

デプロイ先が決まったら、以下を検討:

1. **コンテナレジストリ**: GitHub Container Registry, AWS ECR など
2. **オーケストレーション**: Kubernetes, AWS ECS, Cloud Run など
3. **Supabase**: Supabase Cloud または Self-hosted
4. **シークレット管理**: AWS Secrets Manager, HashiCorp Vault など
5. **CI/CD**: GitHub Actions, CircleCI など

```yaml
# 本番用 docker-compose.prod.yml の例
version: "3.8"
services:
  backend:
    image: ghcr.io/naotama2002/habity-backend:latest
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
    # ... production settings
```
