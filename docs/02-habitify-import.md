# Habitify データインポート仕様

## 概要

既存の Habitify ユーザーが Habity に移行する際、Habitify API を利用してデータをインポートする機能。

## Habitify API 仕様

### ベース URL
```
https://api.habitify.me
```

### 認証

すべてのリクエストに Authorization ヘッダーが必要:

```
Authorization: {API_KEY}
```

**API キーの取得方法:**
- モバイルアプリ: 設定 → API Credential → コピー
- Web アプリ: プロフィール & 設定 → API Credential

### エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/habits` | 全習慣の一覧取得 |
| GET | `/habits/:habit_id` | 特定習慣の詳細取得 |
| GET | `/logs/:habit_id` | 特定習慣のログ一覧取得 |
| GET | `/areas` | エリア（カテゴリ）一覧取得 |
| GET | `/journal` | ジャーナル取得 |
| GET | `/habits/:habit_id/status` | 習慣のステータス取得 |

### Habit オブジェクト

```json
{
  "id": "string",
  "name": "string",
  "is_archived": false,
  "start_date": "2024-01-01T00:00:00Z",
  "time_of_day": ["morning", "evening"],
  "recurrence": "RRULE:FREQ=DAILY",
  "goal": {
    "unit_type": "count",
    "value": 1,
    "periodicity": "daily"
  },
  "log_method": "check",
  "priority": 1,
  "remind": {
    "enabled": true,
    "times": ["08:00"]
  },
  "area_id": "string"
}
```

### Log オブジェクト

```json
{
  "id": "string",
  "habit_id": "string",
  "value": 1.0,
  "created_date": "2024-01-15T10:30:00Z",
  "unit_type": "count"
}
```

---

## インポートフロー

```
┌─────────────────────────────────────────────────────────┐
│                    ユーザーフロー                        │
└─────────────────────────────────────────────────────────┘

1. ユーザーが「Habitify からインポート」を選択
                    │
                    ▼
2. API キーの入力を求める画面を表示
   - Habitify アプリでの取得手順を案内
                    │
                    ▼
3. API キーを検証（/habits エンドポイントでテスト）
                    │
                    ▼
4. インポート対象の選択
   - 全習慣 or 選択した習慣のみ
   - ログデータ含む/含まない
   - 日付範囲の指定
                    │
                    ▼
5. インポート実行
   - バックグラウンドで処理
   - 進捗表示
                    │
                    ▼
6. 完了通知
   - インポート結果サマリー
   - エラーがあれば詳細表示
```

---

## データマッピング

### Habitify → Habity 習慣データ

| Habitify フィールド | Habity フィールド | 変換ルール |
|-------------------|-----------------|-----------|
| `id` | `external_id` | 参照用に保持 |
| `name` | `name` | そのまま |
| `is_archived` | `status` | `archived` / `active` |
| `start_date` | `start_date` | ISO 8601 |
| `time_of_day` | `time_slots` | 配列マッピング |
| `recurrence` | `recurrence_rule` | RRule 形式維持 |
| `goal.unit_type` | `goal_unit` | マッピング |
| `goal.value` | `goal_value` | そのまま |
| `goal.periodicity` | `goal_period` | マッピング |
| `log_method` | `tracking_type` | `check`/`measure` |
| `priority` | `sort_order` | 数値 |
| `area_id` | `category_id` | 新規カテゴリ作成 |

### Habitify → Habity ログデータ

| Habitify フィールド | Habity フィールド | 変換ルール |
|-------------------|-----------------|-----------|
| `id` | `external_id` | 参照用に保持 |
| `habit_id` | `habit_id` | インポート後の ID に変換 |
| `value` | `value` | そのまま |
| `created_date` | `completed_at` | ISO 8601 |
| `unit_type` | `unit_type` | マッピング |

---

## Go バックエンド実装

### API クライアント

```go
package habitify

type Client struct {
    baseURL    string
    apiKey     string
    httpClient *http.Client
}

func NewClient(apiKey string) *Client {
    return &Client{
        baseURL:    "https://api.habitify.me",
        apiKey:     apiKey,
        httpClient: &http.Client{Timeout: 30 * time.Second},
    }
}

func (c *Client) GetHabits(ctx context.Context) ([]Habit, error) {
    // GET /habits
}

func (c *Client) GetLogs(ctx context.Context, habitID string, from, to time.Time) ([]Log, error) {
    // GET /logs/:habit_id?from=...&to=...
}

func (c *Client) GetAreas(ctx context.Context) ([]Area, error) {
    // GET /areas
}
```

### インポートサービス

```go
package service

type ImportService struct {
    habitifyClient *habitify.Client
    habitRepo      repository.HabitRepository
    logRepo        repository.LogRepository
}

func (s *ImportService) Import(ctx context.Context, userID string, options ImportOptions) (*ImportResult, error) {
    // 1. Habitify から習慣取得
    habits, err := s.habitifyClient.GetHabits(ctx)

    // 2. エリア（カテゴリ）取得・変換
    areas, err := s.habitifyClient.GetAreas(ctx)

    // 3. 習慣データを変換・保存
    for _, h := range habits {
        habityHabit := convertHabit(h)
        // 保存
    }

    // 4. ログデータ取得・変換・保存
    for _, h := range habits {
        logs, err := s.habitifyClient.GetLogs(ctx, h.ID, options.From, options.To)
        // 変換・保存
    }

    return &ImportResult{...}, nil
}
```

---

## エラーハンドリング

| エラー種別 | 対処 |
|-----------|------|
| 無効な API キー | ユーザーに再入力を促す |
| レート制限 | リトライ（指数バックオフ） |
| ネットワークエラー | リトライ、オフライン時は後で再試行 |
| データ変換エラー | スキップしてログに記録、サマリーで報告 |
| 重複インポート | 既存データとマージまたはスキップ（選択可能）|

---

## セキュリティ考慮

1. **API キーの取り扱い**
   - API キーはサーバーサイドで処理
   - クライアントには保存しない
   - インポート完了後は即座に破棄

2. **データ転送**
   - すべて HTTPS
   - JWT トークンで認証

3. **監査ログ**
   - インポート操作を記録
   - 誰がいつインポートしたか追跡可能

---

## 参考

- [Habitify API Documentation](https://docs.habitify.me)
- [Habitify Authentication](https://docs.habitify.me/authentication)
- [Habitify Habits API](https://docs.habitify.me/core-resources/habits)
- [Habitify Logs API](https://docs.habitify.me/core-resources/habits/logs)
