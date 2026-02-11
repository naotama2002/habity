# マイグレーション運用ガイド

## 概要

Habity では Supabase CLI (`supabase migration`) を使ってデータベースマイグレーションを管理する。
マイグレーションファイルは `supabase/migrations/` に配置し、タイムスタンプ付きの SQL ファイルとして管理する。

### 方針

- マイグレーションは **前方向のみ**（UP のみ）。ロールバックが必要な場合は新しいマイグレーションで対応する。
- すべての DDL 変更はマイグレーションファイルとして記録する。手動での DB 変更は禁止。
- マイグレーションファイルは一度マージしたら変更しない（イミュータブル）。

---

## 前提

| 環境 | マイグレーション適用方法 |
|------|----------------------|
| ローカル（初回） | `docker-entrypoint-initdb.d` で自動適用 |
| ローカル（追加分） | `supabase db push --db-url` で適用 |
| リモート / Supabase Cloud | `supabase db push --db-url` で適用 |

---

## セットアップ

### Supabase CLI のインストール

Supabase CLI は mise 経由でインストールされる。

```bash
mise install
supabase --version
# 2.75.0 が表示されること
```

### ディレクトリ構成

```
supabase/
├── config.toml                        # Supabase CLI 設定
├── kong.yml                           # API Gateway 設定
└── migrations/
    ├── 20240101000000_init.sql         # 初期スキーマ
    └── 20240201000000_drop_view.sql    # ビュー削除
```

---

## マイグレーションワークフロー

### 1. 新規マイグレーション作成

```bash
supabase migration new <名前>
# 例: supabase migration new add_tags_table
# → supabase/migrations/20260211120000_add_tags_table.sql が生成される
```

生成されたファイルに SQL を記述する。

### 2. ローカル DB への適用

```bash
# docker compose で起動中のローカル DB に適用
supabase db push --db-url "postgresql://postgres:postgres@localhost:5432/postgres"
```

### 3. リモート DB への適用

```bash
# リモート DB に適用（接続文字列は環境に合わせて変更）
supabase db push --db-url "postgresql://user:password@host:5432/database"
```

### 4. マイグレーション状態の確認

```bash
# 適用済みマイグレーションの一覧
supabase migration list --db-url "postgresql://postgres:postgres@localhost:5432/postgres"
```

### 5. ドライラン

SQL の内容を確認してから適用したい場合は、マイグレーションファイルの内容を直接確認する。

```bash
# マイグレーションファイルの内容確認
cat supabase/migrations/<timestamp>_<name>.sql
```

---

## マイグレーション作成ルール

### 命名規則

```
<timestamp>_<説明>.sql
```

- タイムスタンプは `supabase migration new` が自動生成
- 説明は **スネークケース** で簡潔に記述
- 動詞から始める: `add_`, `drop_`, `alter_`, `create_`, `update_`

例:
- `20240101000000_init.sql`
- `20240201000000_drop_view.sql`
- `20260211120000_add_tags_table.sql`
- `20260211130000_alter_habits_add_color.sql`

### SQL の書き方

```sql
-- マイグレーション: テーブルの追加
-- 説明: タグ機能のためのテーブルを追加

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS を有効化
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
CREATE POLICY "Users can manage own tags"
  ON public.tags FOR ALL
  USING (auth.uid() = user_id);
```

- `IF NOT EXISTS` / `IF EXISTS` を使い、冪等性を意識する
- RLS ポリシーも同じマイグレーションに含める
- コメントで変更の意図を記述する

### ロールバック方針

ロールバック SQL は作成しない。問題が発生した場合は、新しいマイグレーションで修正する。

```bash
# ❌ ロールバック（行わない）
# ✅ 新しいマイグレーションで修正
supabase migration new fix_tags_table
```

---

## 既存環境への初回セットアップ

### 新規環境（ボリュームなし）

`docker compose up -d` で初回起動すると、`docker-entrypoint-initdb.d` 経由で全マイグレーションが自動適用される。

### 既存環境（ボリュームあり）

既存の DB ボリュームがある環境で新しいマイグレーションを適用する場合:

```bash
# 方法 1: supabase db push で差分を適用
supabase db push --db-url "postgresql://postgres:postgres@localhost:5432/postgres"

# 方法 2: ボリュームをリセットして再作成
docker compose down -v
docker compose up -d
```

### マイグレーション履歴テーブルの修復

`supabase db push` は `supabase_migrations.schema_migrations` テーブルで適用状態を管理する。
手動で適用済みのマイグレーションを記録する場合:

```bash
supabase migration repair --status applied <version> \
  --db-url "postgresql://postgres:postgres@localhost:5432/postgres"
```

---

## docker-compose との共存

### 現在の運用

- **初回起動**: `docker-entrypoint-initdb.d` でマイグレーションファイルが自動実行される
- **追加マイグレーション**: `supabase db push` で手動適用

### 仕組み

`docker-compose.yml` の db サービスで `supabase/migrations` を `docker-entrypoint-initdb.d/migrations` にマウントしている:

```yaml
volumes:
  - ./supabase/migrations:/docker-entrypoint-initdb.d/migrations
```

これにより、初回ボリューム作成時にすべてのマイグレーションが順番に実行される。

### 注意点

- `docker-entrypoint-initdb.d` は **ボリュームが空のとき（初回のみ）** 実行される
- 既存のボリュームがある場合は `supabase db push` で追加マイグレーションを適用する
- ボリュームを削除して再作成すれば、全マイグレーションが再適用される

---

## トラブルシューティング

### `supabase db push` でエラーが出る

```bash
# DB に接続できるか確認
docker compose exec db psql -U postgres -c "SELECT 1"

# マイグレーション履歴テーブルの状態確認
docker compose exec db psql -U postgres -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version"
```

### マイグレーションが重複適用された

```bash
# ボリュームをリセットして最初からやり直す
docker compose down -v
docker compose up -d
```

### `supabase_migrations` スキーマがない

初めて `supabase db push` を実行するとき、Supabase CLI が自動的にスキーマとテーブルを作成する。
手動で適用済みのマイグレーションがある場合は `migration repair` で履歴を合わせる。

```bash
# 既存マイグレーションを「適用済み」としてマーク
supabase migration repair --status applied 20240101000000 \
  --db-url "postgresql://postgres:postgres@localhost:5432/postgres"
supabase migration repair --status applied 20240201000000 \
  --db-url "postgresql://postgres:postgres@localhost:5432/postgres"
```

### Supabase CLI のバージョンが合わない

```bash
# mise でバージョンを確認・再インストール
mise ls
mise install aqua:supabase/cli@2.75.0
```
