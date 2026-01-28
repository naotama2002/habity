# データモデル設計

## 概要

Supabase PostgreSQL をデータベースとして使用。Row Level Security (RLS) でマルチテナント対応。

## ER 図

```
┌─────────────────┐       ┌─────────────────┐
│     users       │       │   categories    │
│  (auth.users)   │       │                 │
├─────────────────┤       ├─────────────────┤
│ id (UUID) PK    │◀──┐   │ id (UUID) PK    │
│ email           │   │   │ user_id FK      │──┐
│ created_at      │   │   │ name            │  │
│ ...             │   │   │ color           │  │
└─────────────────┘   │   │ icon            │  │
                      │   │ sort_order      │  │
                      │   │ created_at      │  │
                      │   └─────────────────┘  │
                      │                        │
                      │   ┌─────────────────┐  │
                      │   │     habits      │  │
                      │   ├─────────────────┤  │
                      ├───│ user_id FK      │  │
                      │   │ id (UUID) PK    │◀─┼──────────────┐
                      │   │ name            │  │              │
                      │   │ description     │  │              │
                      │   │ category_id FK  │──┘              │
                      │   │ tracking_type   │                 │
                      │   │ goal_value      │                 │
                      │   │ goal_unit       │                 │
                      │   │ goal_period     │                 │
                      │   │ recurrence_rule │                 │
                      │   │ time_of_day     │                 │
                      │   │ reminder_times  │                 │
                      │   │ start_date      │                 │
                      │   │ status          │                 │
                      │   │ sort_order      │                 │
                      │   │ external_id     │                 │
                      │   │ created_at      │                 │
                      │   │ updated_at      │                 │
                      │   └─────────────────┘                 │
                      │                                       │
                      │   ┌─────────────────┐                 │
                      │   │   habit_logs    │                 │
                      │   ├─────────────────┤                 │
                      ├───│ user_id FK      │                 │
                          │ id (UUID) PK    │                 │
                          │ habit_id FK     │─────────────────┘
                          │ value           │
                          │ note            │
                          │ completed_at    │
                          │ external_id     │
                          │ created_at      │
                          └─────────────────┘
```

---

## テーブル定義

### 1. categories（カテゴリ）

習慣をグループ化するためのカテゴリ。

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',  -- Hex カラーコード
  icon TEXT,                      -- アイコン名（例: 'heart', 'star'）
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, name)
);

-- インデックス
CREATE INDEX idx_categories_user_id ON categories(user_id);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);
```

### 2. habits（習慣）

習慣の定義。

```sql
-- 列挙型
CREATE TYPE tracking_type AS ENUM ('boolean', 'numeric', 'duration');
CREATE TYPE habit_status AS ENUM ('active', 'paused', 'archived');
CREATE TYPE goal_period AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE time_of_day AS ENUM ('anytime', 'morning', 'afternoon', 'evening', 'night');

CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本情報
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- トラッキング設定
  tracking_type tracking_type DEFAULT 'boolean',
  goal_value NUMERIC DEFAULT 1,         -- 目標値（boolean の場合は 1）
  goal_unit TEXT DEFAULT 'times',       -- 単位（例: 'times', 'minutes', 'ml'）
  goal_period goal_period DEFAULT 'daily',

  -- スケジュール
  recurrence_rule TEXT,                 -- RRule 形式（例: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR'）
  time_of_day time_of_day[] DEFAULT '{anytime}',
  reminder_times TIME[],                -- リマインダー時刻（例: {'08:00', '20:00'}）
  reminder_enabled BOOLEAN DEFAULT false,

  -- 状態
  start_date DATE DEFAULT CURRENT_DATE,
  status habit_status DEFAULT 'active',
  sort_order INTEGER DEFAULT 0,

  -- インポート用
  external_id TEXT,                     -- Habitify の元ID
  external_source TEXT,                 -- 'habitify' など

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_user_status ON habits(user_id, status);
CREATE INDEX idx_habits_category_id ON habits(category_id);
CREATE INDEX idx_habits_external ON habits(external_source, external_id);

-- RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits"
  ON habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE
  USING (auth.uid() = user_id);
```

### 3. habit_logs（習慣ログ）

日々の習慣実行記録。

```sql
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,

  -- 記録内容
  value NUMERIC NOT NULL DEFAULT 1,     -- 達成値（boolean なら 1/0, numeric なら実際の値）
  note TEXT,                            -- メモ

  -- 日時
  completed_at TIMESTAMPTZ NOT NULL,    -- 完了日時（日付の判定に使用）
  target_date DATE NOT NULL,            -- 対象日（同じ日に複数回記録する場合も同じ日付）

  -- インポート用
  external_id TEXT,

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 同じ習慣の同じ日には1レコード（追加型の場合は value を加算）
  UNIQUE(habit_id, target_date)
);

-- インデックス
CREATE INDEX idx_habit_logs_user_id ON habit_logs(user_id);
CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_target_date ON habit_logs(target_date);
CREATE INDEX idx_habit_logs_habit_date ON habit_logs(habit_id, target_date);
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, target_date);

-- RLS
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON habit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON habit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs"
  ON habit_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs"
  ON habit_logs FOR DELETE
  USING (auth.uid() = user_id);
```

### 4. user_settings（ユーザー設定）

アプリ全体の設定。

```sql
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 表示設定
  theme TEXT DEFAULT 'system',          -- 'light', 'dark', 'system'
  locale TEXT DEFAULT 'ja',             -- 言語コード
  timezone TEXT DEFAULT 'Asia/Tokyo',
  week_start INTEGER DEFAULT 1,         -- 0=日曜, 1=月曜

  -- 通知設定
  notifications_enabled BOOLEAN DEFAULT true,
  daily_reminder_time TIME DEFAULT '08:00',

  -- 同期設定
  last_sync_at TIMESTAMPTZ,

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## トリガー・関数

### updated_at 自動更新

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 新規ユーザー初期設定

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## ビュー

### 習慣と今日のログ

```sql
CREATE VIEW habits_with_today_log AS
SELECT
  h.*,
  l.id AS log_id,
  l.value AS log_value,
  l.completed_at AS log_completed_at,
  CASE
    WHEN l.id IS NOT NULL AND l.value >= h.goal_value THEN true
    ELSE false
  END AS is_completed_today
FROM habits h
LEFT JOIN habit_logs l ON h.id = l.habit_id AND l.target_date = CURRENT_DATE
WHERE h.status = 'active';
```

### ストリーク計算

```sql
CREATE OR REPLACE FUNCTION calculate_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_date DATE := CURRENT_DATE;
  v_has_log BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM habit_logs
      WHERE habit_id = p_habit_id AND target_date = v_date
    ) INTO v_has_log;

    IF v_has_log THEN
      v_streak := v_streak + 1;
      v_date := v_date - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN v_streak;
END;
$$ LANGUAGE plpgsql;
```

---

## TypeScript 型定義

```typescript
// types/database.ts

export type TrackingType = 'boolean' | 'numeric' | 'duration';
export type HabitStatus = 'active' | 'paused' | 'archived';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly';
export type TimeOfDay = 'anytime' | 'morning' | 'afternoon' | 'evening' | 'night';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  tracking_type: TrackingType;
  goal_value: number;
  goal_unit: string;
  goal_period: GoalPeriod;
  recurrence_rule: string | null;
  time_of_day: TimeOfDay[];
  reminder_times: string[] | null;
  reminder_enabled: boolean;
  start_date: string;
  status: HabitStatus;
  sort_order: number;
  external_id: string | null;
  external_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  value: number;
  note: string | null;
  completed_at: string;
  target_date: string;
  external_id: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  locale: string;
  timezone: string;
  week_start: number;
  notifications_enabled: boolean;
  daily_reminder_time: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

// 拡張型（ビュー用）
export interface HabitWithTodayLog extends Habit {
  log_id: string | null;
  log_value: number | null;
  log_completed_at: string | null;
  is_completed_today: boolean;
}
```

---

## Supabase マイグレーションファイル

```
supabase/migrations/
├── 20240101000000_create_categories.sql
├── 20240101000001_create_habits.sql
├── 20240101000002_create_habit_logs.sql
├── 20240101000003_create_user_settings.sql
├── 20240101000004_create_triggers.sql
└── 20240101000005_create_views.sql
```

---

## 参考: Habitify データマッピング

| Habitify | Habity | 備考 |
|----------|--------|------|
| `id` | `external_id` | 参照用 |
| `name` | `name` | |
| `is_archived` | `status` | `archived` / `active` |
| `start_date` | `start_date` | |
| `time_of_day` | `time_of_day` | 配列 |
| `recurrence` | `recurrence_rule` | RRule 形式 |
| `goal.unit_type` | `goal_unit` | |
| `goal.value` | `goal_value` | |
| `goal.periodicity` | `goal_period` | |
| `log_method` | `tracking_type` | `check`→`boolean` |
| `priority` | `sort_order` | |
| `area_id` | `category_id` | カテゴリ作成後にマッピング |
