# Supabase Cloud 移行ガイド

## 概要

ローカル開発環境では docker-compose で Supabase の全サービス（PostgreSQL, Auth, REST, Realtime, Storage, Studio, Kong）を動かしている。
本番環境や共有開発環境では、Supabase をクラウド（Supabase Cloud またはセルフホスト）に外だしし、docker-compose は Go バックエンドのみにする。

### 構成の変化

```
[ローカル開発 - 現在]
docker-compose: DB + Auth + REST + Realtime + Storage + Kong + Studio + Go Backend
React Native:   localhost を参照

[Supabase 外だし後]
Supabase Cloud:  DB + Auth + REST + Realtime + Storage (Supabase が管理)
docker-compose:  Go Backend のみ (or コンテナサービスにデプロイ)
React Native:    Supabase Cloud URL を参照
```

---

## 1. Supabase Cloud プロジェクト作成

### 1-1. プロジェクト作成

1. https://supabase.com/dashboard にログイン
2. "New Project" でプロジェクトを作成
3. リージョンは `Northeast Asia (Tokyo)` を選択
4. データベースパスワードを設定（控えておく）

### 1-2. 必要な情報の取得

プロジェクトの Settings → API から以下を取得:

| 項目 | 場所 | 用途 |
|------|------|------|
| Project URL | Settings → API | `SUPABASE_URL` |
| anon public key | Settings → API → Project API keys | `SUPABASE_ANON_KEY` |
| service_role key | Settings → API → Project API keys | `SUPABASE_SERVICE_KEY` |
| JWT Secret | Settings → API → JWT Settings | `JWT_SECRET` |

データベース接続情報は Settings → Database から取得:

| 項目 | 用途 |
|------|------|
| Host | DB 接続 |
| Database name | 通常 `postgres` |
| Port | 通常 `5432`（直接接続）/ `6543`（Pooler） |
| User | 通常 `postgres` |
| Password | プロジェクト作成時に設定したもの |

---

## 2. データベースマイグレーション

### 2-1. Supabase CLI でリモート DB にマイグレーション適用

```bash
# 接続文字列を組み立て（Settings → Database → Connection string → URI から取得可能）
DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# 既存マイグレーションを適用
supabase db push --db-url "$DB_URL"
```

### 2-2. マイグレーション状態の確認

```bash
supabase migration list --db-url "$DB_URL"
```

初回は `supabase_migrations` スキーマがないため、`supabase db push` が自動作成する。

### 2-3. 注意事項

- ローカルの `supabase/post-init.sh` で行っているロールのパスワード設定・auth 関数の所有権修正は **不要**。Supabase Cloud が管理する。
- `docker-entrypoint-initdb.d` の仕組みも関係ない。マイグレーションは `supabase db push` のみで管理する。

---

## 3. 環境変数の設定

### 3-1. React Native（フロントエンド）

`.env` を Supabase Cloud の値に更新:

```bash
# Supabase Cloud
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...（anon key）

# Go Backend（デプロイ先に合わせる）
EXPO_PUBLIC_BACKEND_URL=https://api.example.com
```

### 3-2. Go バックエンド

```bash
# Supabase Cloud 接続
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?sslmode=require
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=eyJ...（service_role key）
JWT_SECRET=（JWT Secret）
```

| 項目 | ローカルとの違い |
|------|----------------|
| `DATABASE_URL` | Pooler ポート `6543` + `sslmode=require` を使用 |
| `SUPABASE_URL` | `http://localhost:54321` → `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase Cloud の service_role key |

---

## 4. docker-compose の変更

Supabase 外だし後は Go バックエンドのみ残す。本番用の compose ファイルを作成:

```yaml
# docker-compose.prod.yml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8088:8088"
    environment:
      PORT: 8088
      DATABASE_URL: ${DATABASE_URL}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
      JWT_SECRET: ${JWT_SECRET}
    restart: unless-stopped
```

```bash
# 本番用で起動
docker compose -f docker-compose.prod.yml up -d
```

ローカル開発は引き続き既存の `docker-compose.yml` を使用可能。

---

## 5. 認証設定

### 5-1. Auth プロバイダー

Supabase Dashboard → Authentication → Providers で設定:

- **Email**: 有効化、確認メール設定
- **Google OAuth**: Client ID / Secret を設定

### 5-2. リダイレクト URL

Authentication → URL Configuration:

| 項目 | 値 |
|------|------|
| Site URL | アプリの本番 URL（例: `https://habity.example.com`） |
| Redirect URLs | OAuth コールバック URL を追加 |

### 5-3. メール設定

ローカルでは Inbucket を使っていたが、Supabase Cloud は自前の SMTP を持つ。
カスタム SMTP を使う場合は Settings → Auth → SMTP Settings で設定。

---

## 6. RLS（Row Level Security）の確認

マイグレーションで定義した RLS ポリシーは `supabase db push` で自動適用される。
Supabase Dashboard → Table Editor で各テーブルの RLS が有効になっていることを確認する。

| テーブル | 確認内容 |
|---------|---------|
| `categories` | RLS 有効 + 4 ポリシー（SELECT/INSERT/UPDATE/DELETE） |
| `habits` | RLS 有効 + 4 ポリシー |
| `habit_logs` | RLS 有効 + 4 ポリシー |
| `user_settings` | RLS 有効 + 3 ポリシー（SELECT/INSERT/UPDATE） |

---

## 7. チェックリスト

### 移行前

- [ ] Supabase Cloud プロジェクト作成
- [ ] 接続情報（URL, keys, DB 接続文字列）を取得
- [ ] マイグレーション適用（`supabase db push`）
- [ ] RLS ポリシーの有効化を確認

### 環境変数

- [ ] React Native の `.env` を更新
- [ ] Go バックエンドの環境変数を設定
- [ ] `DATABASE_URL` で `sslmode=require` を指定

### 認証

- [ ] Email プロバイダーを有効化
- [ ] Google OAuth の設定（必要な場合）
- [ ] Site URL / Redirect URLs の設定

### 動作確認

- [ ] フロントエンドから Supabase Cloud に接続できる
- [ ] ユーザー登録・ログインが動作する
- [ ] 習慣の CRUD が動作する
- [ ] Go バックエンドから DB に接続できる

---

## トラブルシューティング

### CORS エラー

Supabase Cloud はデフォルトで全オリジンを許可している。
Go バックエンドに CORS 設定が必要な場合は、バックエンド側で対応する。

### DB 接続タイムアウト

- Supabase Cloud は接続プーラー（Supavisor）を提供している
- 長時間接続が必要な場合はポート `5432`（直接接続）、短いクエリはポート `6543`（Pooler）を使い分ける
- Go バックエンドからは Pooler（`6543`）を推奨

### マイグレーションエラー

```bash
# リモート DB のマイグレーション状態を確認
supabase migration list --db-url "$DB_URL"

# 手動適用済みのマイグレーションを記録
supabase migration repair --status applied <version> --db-url "$DB_URL"
```
