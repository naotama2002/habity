# Supabase Cloud 移行ガイド

## 概要

ローカル開発環境では docker-compose で Supabase の全サービス（PostgreSQL, Auth, REST, Realtime, Storage, Studio, Kong）を動かしている。
本番環境や共有開発環境では、Supabase をクラウド（Supabase Cloud またはセルフホスト）に外だしする。
Web フロントエンドは Cloudflare Pages にデプロイする（詳細は [08-cloudflare-pages-deploy.md](./08-cloudflare-pages-deploy.md)）。

### 構成の変化

```
[ローカル開発 - 現在]
docker-compose: DB + Auth + REST + Realtime + Storage + Kong + Studio
Web App:        localhost を参照

[本番デプロイ]
Supabase Cloud:    DB + Auth + REST + Realtime + Storage (Supabase が管理)
Cloudflare Pages:  Web フロントエンド (SPA)
Web App:           Supabase Cloud URL を参照
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
# Pooler URI を使用（Settings → Database → Connection string → Transaction mode）
# 直接接続（port 5432）は IPv6 環境で失敗する場合があるため Pooler（port 6543）を使う
DB_URL="postgresql://postgres.your-project:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

# 既存マイグレーションを適用
supabase db push --db-url "$DB_URL"
```

### 2-2. マイグレーション状態の確認

```bash
supabase migration list --db-url "$DB_URL"
```

初回は `supabase_migrations` スキーマがないため、`supabase db push` が自動作成する。

### 2-3. 注意事項

- 直接接続（`db.xxx.supabase.co:5432`）は IPv6 環境で失敗する場合がある。**Pooler URI（port 6543）を使うこと**。
- ローカルの `supabase/post-init.sh` で行っているロールのパスワード設定・auth 関数の所有権修正は **不要**。Supabase Cloud が管理する。
- `docker-entrypoint-initdb.d` の仕組みも関係ない。マイグレーションは `supabase db push` のみで管理する。

---

## 3. 環境変数の設定

デプロイ用の環境変数は `.env.deploy` に設定する（`.env` はローカル開発専用）。

```bash
# .env.deploy.example をコピー
cp .env.deploy.example .env.deploy
```

※ 参考 (drop)
```bash
 supabase db reset --db-url "$DB_URL"
 ```

### 変数一覧

| 変数 | 取得元 | 説明 |
|------|--------|------|
| `SUPABASE_URL` | Settings → API → Project URL | Web フロントエンドが使用 |
| `SUPABASE_ANON_KEY` | Settings → API → anon public key | Web フロントエンドが使用 |
| `WEB_PORT` | — | Docker デプロイ時の公開ポート（デフォルト: 3000） |
| `ENABLE_SIGNUP` | — | 新規登録の有効/無効（デフォルト: false） |

### ローカル開発との違い

| 項目 | ローカル（`.env`） | デプロイ（`.env.deploy`） |
|------|-------------------|--------------------------|
| DB 接続 | docker-compose 内の PostgreSQL | Supabase Cloud Pooler（port 6543） |
| Supabase URL | `http://localhost:54321` | `https://<ref>.supabase.co` |
| フロントエンドの環境注入 | `EXPO_PUBLIC_*` で直接参照 | `web-entrypoint.sh` がランタイムで置換 |

---

## 4. デプロイ

Web フロントエンドのデプロイは **Cloudflare Pages** を推奨。
詳細は [08-cloudflare-pages-deploy.md](./08-cloudflare-pages-deploy.md) を参照。

Docker でデプロイする場合は `docker-compose.deploy.yml`（web のみ）を使用:

```bash
# Docker デプロイ用で起動（.env.deploy を読み込む）
docker compose -f docker-compose.deploy.yml --env-file .env.deploy up -d
```

---

## 5. 認証設定

### 5-1. Auth プロバイダー

Supabase Dashboard → Authentication → Providers で設定:

- **Email**: 有効化、確認メール設定
- **GitHub OAuth**: Client ID / Secret を設定

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

- [ ] `.env.deploy.example` をコピーして `.env.deploy` を作成
- [ ] Supabase Cloud の値を `.env.deploy` に設定
- [ ] `DATABASE_URL` は Pooler URI（port 6543）を指定

### 認証

- [ ] Email プロバイダーを有効化
- [ ] GitHub OAuth の設定（必要な場合）
- [ ] Site URL / Redirect URLs の設定

### 動作確認

- [ ] フロントエンドから Supabase Cloud に接続できる
- [ ] ユーザー登録・ログインが動作する
- [ ] 習慣の CRUD が動作する

---

## トラブルシューティング

### CORS エラー

Supabase Cloud はデフォルトで全オリジンを許可している。
Cloudflare Pages からのアクセスは問題なく動作する。

### マイグレーションエラー

```bash
# リモート DB のマイグレーション状態を確認
supabase migration list --db-url "$DB_URL"

# 手動適用済みのマイグレーションを記録
supabase migration repair --status applied <version> --db-url "$DB_URL"
```
