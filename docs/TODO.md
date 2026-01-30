# Habity 実装 TODO

実装状況と今後のタスクを管理するファイル。

---

## 開発方針

### 参考実装（必須）

**React Native の設計・実装は必ず Bluesky social-app を参考にすること。**

```
参考リポジトリ: /Users/naotama/ghq/github.com/bluesky-social/social-app
```

実装前に以下を確認:
1. Bluesky で同様の機能がどう実装されているか
2. コンポーネント構成・命名規則
3. プラットフォーム固有コードの分離方法（`.native.tsx`, `.web.tsx`）
4. React Query の使用パターン

### テスト実装（必須）

**各機能の実装時に必ずテストを作成すること。**

```
テスト設定: jest.config.js, jest/jestSetup.js
テストパターン: **/__tests__/**/*.test.{ts,tsx}
```

テスト実装ルール:
1. **新規ロジック追加時**: 対応するユニットテストを必ず作成
2. **バリデーション**: `src/lib/validation/` に抽出し、テーブル駆動テスト（it.each）で網羅
3. **状態管理**: reducer や state transitions のテストを作成
4. **モック方針**: 外部 API（Supabase等）以外は極力モックしない
5. **テスト先行**: リファクタリング前に既存動作を確認するテストを書く
6. **CI 確認**: `pnpm test:ci` が通ることを確認してからコミット

テストファイル配置:
- ユーティリティ関数: `src/lib/**/__tests__/*.test.ts`
- 状態管理: `src/state/**/__tests__/*.test.ts`
- コンポーネント: 各コンポーネント配下の `__tests__/` ディレクトリ

---

## 凡例

- [ ] 未着手
- [x] 完了
- [~] 進行中

---

## Phase 0: プロジェクト基盤（完了）

### 環境設定
- [x] package.json 作成
- [x] tsconfig.json 設定
- [x] babel.config.js 設定
- [x] app.config.js (Expo設定)
- [x] .tool-versions (mise)
- [x] .env.example

### Docker / インフラ
- [x] docker-compose.yml (Supabase フルスタック)
- [x] backend/Dockerfile
- [x] supabase/kong.yml (API Gateway設定)

### データベース
- [x] supabase/migrations/20240101000000_init.sql
  - [x] Enum 型定義
  - [x] categories テーブル
  - [x] habits テーブル
  - [x] habit_logs テーブル
  - [x] user_settings テーブル
  - [x] RLS ポリシー
  - [x] トリガー (updated_at)
  - [x] ビュー (habits_with_today_log)
  - [x] 関数 (calculate_streak)

### フロントエンド基盤
- [x] src/lib/supabase.ts - Supabase クライアント
- [x] src/lib/react-query.ts - React Query 設定
- [x] src/types/database.ts - 型定義
- [x] src/state/queries/habits.ts - 習慣クエリ
- [x] src/state/queries/habit-logs.ts - ログクエリ

### バックエンド基盤
- [x] backend/cmd/server/main.go - サーバーエントリー
- [x] backend/internal/config/config.go - 設定読み込み
- [x] backend/internal/handler/auth.go - JWT 認証ミドルウェア
- [~] backend/internal/handler/import.go - Habitify インポート（スタブのみ）

---

## Phase 1: MVP 実装

### 1.1 認証フロー
- [x] app/(auth)/_layout.tsx - 認証レイアウト
- [x] app/(auth)/welcome.tsx - ウェルカム画面
- [x] app/(auth)/login.tsx - ログイン画面
- [x] app/(auth)/signup.tsx - サインアップ画面
- [x] src/state/session/index.tsx - セッション管理 Context
- [x] src/state/session/types.ts - セッション型定義
- [ ] Google OAuth 連携テスト

### 1.2 共通コンポーネント
参照: docs/04-ui-design.md「コンポーネント設計」

#### 基本 UI
- [ ] src/components/ui/Button.tsx
- [ ] src/components/ui/Card.tsx
- [ ] src/components/ui/Checkbox.tsx
- [ ] src/components/ui/Header.tsx
- [ ] src/components/ui/Icon.tsx
- [x] src/components/ui/Input.tsx（SearchInput 含む）
- [ ] src/components/ui/Modal.tsx
- [ ] src/components/ui/ProgressBar.tsx
- [ ] src/components/ui/ProgressRing.tsx
- [x] src/components/ui/SegmentedControl.tsx
- [ ] src/components/ui/Select.tsx
- [ ] src/components/ui/Spinner.tsx
- [ ] src/components/ui/Switch.tsx
- [ ] src/components/ui/Toast.tsx

#### デザインシステム
- [x] src/lib/colors.ts - カラーパレット
- [x] src/lib/typography.ts - タイポグラフィ
- [x] src/lib/spacing.ts - スペーシング

### 1.3 Today 画面（ホーム）
参照: docs/04-ui-design.md「1. Today 画面」

- [x] app/(tabs)/index.tsx - Today 画面本体
- [x] src/components/habits/HabitCard.tsx - 習慣カード
- [x] src/components/habits/TimeOfDaySection.tsx - 時間帯セクション
- [x] src/components/habits/StreakBadge.tsx - ストリークバッジ
- [ ] src/components/habits/GoalProgress.tsx - 目標進捗
- [x] チェックイン機能（タップでトグル）
- [ ] 日付選択機能
- [x] Haptics フィードバック

### 1.4 Habits 画面（習慣一覧）
参照: docs/04-ui-design.md「2. Habits 画面」

- [x] app/(tabs)/habits.tsx - 習慣一覧画面
- [x] src/components/habits/HabitListItem.tsx - 習慣リストアイテム
- [ ] src/components/habits/CategorySection.tsx - カテゴリセクション
- [x] 検索機能
- [x] フィルター（すべて/アクティブ/アーカイブ）
- [ ] 並び替え機能

### 1.5 習慣詳細画面
参照: docs/04-ui-design.md「3. 習慣詳細画面」

- [ ] app/habit/[id].tsx - 習慣詳細画面
- [ ] src/components/habits/HabitCalendar.tsx - カレンダー表示
- [ ] 進捗入力（数値/時間型）
- [ ] 履歴表示

### 1.6 習慣作成/編集画面
参照: docs/04-ui-design.md「4. 習慣作成/編集画面」

- [ ] app/habit/new.tsx - 新規作成画面
- [ ] app/habit/[id]/edit.tsx - 編集画面
- [ ] src/components/forms/HabitForm.tsx - 習慣フォーム
- [ ] トラッキング方法選択
- [ ] スケジュール設定
- [ ] 時間帯設定
- [ ] カテゴリ選択
- [ ] バリデーション (Zod)

### 1.7 Statistics 画面
参照: docs/04-ui-design.md「5. Statistics 画面」

- [ ] app/(tabs)/stats.tsx - 統計画面
- [ ] src/components/stats/StatCard.tsx - 統計カード
- [ ] src/components/stats/BarChart.tsx - 棒グラフ
- [ ] src/components/stats/HabitProgressBar.tsx - 習慣進捗バー
- [ ] src/components/stats/StreakRanking.tsx - ストリークランキング
- [ ] 期間選択（今週/今月/カスタム）
- [ ] src/state/queries/statistics.ts - 統計クエリ

### 1.8 Settings 画面
参照: docs/04-ui-design.md「6. Settings 画面」

- [ ] app/(tabs)/settings.tsx - 設定トップ画面
- [ ] app/settings/account.tsx - アカウント設定
- [ ] app/settings/appearance.tsx - 外観設定
- [ ] app/settings/notifications.tsx - 通知設定
- [ ] app/settings/categories.tsx - カテゴリ管理
- [ ] src/state/queries/user-settings.ts - 設定クエリ
- [ ] ログアウト機能

---

## Phase 2: 拡張機能

### 2.1 Habitify インポート
参照: docs/02-habitify-import.md

- [ ] app/settings/import.tsx - インポート画面 UI
- [ ] backend/internal/habitify/client.go - Habitify API クライアント
- [ ] backend/internal/habitify/types.go - 型定義
- [ ] backend/internal/service/import.go - インポートサービス
- [ ] backend/internal/repository/import.go - データ保存
- [ ] インポートジョブ管理
- [ ] 進捗表示

### 2.2 リマインダー通知
- [ ] src/platform/notifications.ts - 共通インターフェース
- [ ] src/platform/notifications.native.ts - ネイティブ実装
- [ ] src/platform/notifications.web.ts - Web 実装
- [ ] リマインダー時刻設定 UI
- [ ] バックグラウンド通知テスト

### 2.3 カテゴリ管理
- [ ] src/state/queries/categories.ts - カテゴリクエリ
- [ ] カテゴリ作成/編集/削除
- [ ] カテゴリ並び替え
- [ ] アイコン選択
- [ ] カラー選択

### 2.4 多言語対応
参照: docs/01-tech-stack.md「多言語」

- [ ] Lingui 設定
- [ ] src/locale/i18n.ts - i18n 設定
- [ ] src/locale/locales/ja/ - 日本語
- [ ] src/locale/locales/en/ - 英語
- [ ] 言語切り替え UI

---

## Phase 3: 高度な機能

### 3.1 データエクスポート
- [ ] CSV エクスポート
- [ ] JSON エクスポート

### 3.2 ノート機能
- [ ] 習慣ごとのメモ入力 UI
- [ ] メモ履歴表示

### 3.3 タイマー機能
- [ ] ポモドーロタイマー UI
- [ ] 時間計測

### 3.4 ヘルスケア連携
- [ ] Apple Health 連携
- [ ] Google Fit 連携

---

## 技術的負債 / 改善

- [x] metro.config.js 作成（Web カスタム設定）
- [x] Jest テスト環境セットアップ
- [x] GitHub Actions CI 設定
- [x] ESLint 設定
- [ ] エラーハンドリング統一
- [ ] オフライン対応
- [ ] E2E テスト (Detox)
- [ ] パフォーマンス最適化
- [ ] アクセシビリティ対応

---

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [00-overview.md](./00-overview.md) | プロジェクト概要 |
| [01-tech-stack.md](./01-tech-stack.md) | 技術スタック |
| [02-habitify-import.md](./02-habitify-import.md) | Habitify インポート仕様 |
| [03-data-model.md](./03-data-model.md) | データモデル |
| [04-ui-design.md](./04-ui-design.md) | UI/UX 設計 |
| [05-development-environment.md](./05-development-environment.md) | 開発環境 |
