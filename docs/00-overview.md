# Habity - 習慣トラッキングアプリケーション

## プロジェクト概要

Habity は、Habitify に似た機能を持つマルチプラットフォーム対応の習慣トラッキングアプリケーションです。

**参考実装**: [Bluesky social-app](https://github.com/bluesky-social/social-app)

## 対応プラットフォーム

| プラットフォーム | 技術 |
|-----------------|------|
| iOS | React Native + Expo |
| Android | React Native + Expo |
| macOS | react-native-macos |
| Web | React Native Web |

## 技術スタック

### フロントエンド

- **React Native 0.81** + **Expo 54**
- **TypeScript 5.x**
- **React Navigation 7** - ナビゲーション
- **React Query 5** - サーバー状態管理
- **Zod** - スキーマ検証
- **Lingui** - 多言語対応

### バックエンド

- **Supabase** - BaaS（Auth, Database, Realtime）
- **PostgreSQL** - データベース
- **Go** - カスタムバックエンドロジック（Habitify インポート等）

---

## 機能ロードマップ

### Phase 1: MVP

| 機能 | 説明 | 状態 |
|------|------|------|
| Google 認証 | Supabase Auth でログイン | 未着手 |
| 習慣 CRUD | 習慣の作成・編集・削除・一覧 | 未着手 |
| 習慣スケジュール | 曜日・時間帯での繰り返し設定 | 未着手 |
| チェックイン | 日々の習慣完了を記録 | 未着手 |
| ストリーク表示 | 連続達成日数 | 未着手 |
| データ同期 | デバイス間リアルタイム同期 | 未着手 |

### Phase 2: 拡張機能

| 機能 | 説明 | 状態 |
|------|------|------|
| カレンダービュー | カレンダー形式での進捗確認 | 未着手 |
| 統計ダッシュボード | 達成率グラフ、傾向分析 | 未着手 |
| リマインダー | プッシュ通知 | 未着手 |
| カテゴリ管理 | 習慣のグループ化 | 未着手 |
| Habitify インポート | 既存データの移行 | 未着手 |

### Phase 3: 高度な機能

| 機能 | 説明 | 状態 |
|------|------|------|
| ノート機能 | 習慣ごとのメモ | 未着手 |
| タイマー機能 | ポモドーロ等 | 未着手 |
| Apple Health 連携 | | 未着手 |
| Google Fit 連携 | | 未着手 |
| エクスポート | CSV/JSON 出力 | 未着手 |

---

## ドキュメント一覧

| ファイル | 内容 |
|---------|------|
| [00-overview.md](./00-overview.md) | 本ドキュメント（概要）|
| [01-tech-stack.md](./01-tech-stack.md) | 技術スタック・プロジェクト構成 |
| [02-habitify-import.md](./02-habitify-import.md) | Habitify インポート仕様 |
| [03-data-model.md](./03-data-model.md) | データモデル設計（PostgreSQL）|
| [04-ui-design.md](./04-ui-design.md) | UI/UX 設計・ワイヤーフレーム |
| [05-development-environment.md](./05-development-environment.md) | 開発環境・Docker 構成 |
| [TODO.md](./TODO.md) | **実装タスクリスト** |

---

## プロジェクト構成

```
habity/
├── src/                    # React Native ソースコード
│   ├── App.native.tsx      # ネイティブエントリー
│   ├── App.web.tsx         # Web エントリー
│   ├── components/         # 共通コンポーネント
│   ├── screens/            # 画面
│   ├── state/              # 状態管理（React Query）
│   ├── lib/                # ユーティリティ
│   ├── platform/           # プラットフォーム固有コード
│   ├── locale/             # 多言語
│   └── types/              # 型定義
├── backend/                # Go バックエンド
├── supabase/               # Supabase 設定・マイグレーション
├── docs/                   # ドキュメント
├── package.json
└── app.config.js           # Expo 設定
```

---

## 開発環境セットアップ

```bash
# mise で開発ツールをインストール（Node.js, pnpm, Go）
mise install

# 環境変数設定
cp .env.example .env

# Docker で全サービス起動
docker compose up -d

# 依存パッケージインストール
pnpm install

# 開発サーバー
pnpm web      # Web (http://localhost:8081)
pnpm ios      # iOS
pnpm android  # Android
```

### サービス URL

| サービス | URL |
|---------|-----|
| Supabase API | http://localhost:54321 |
| Supabase Studio | http://localhost:54323 |
| Go Backend | http://localhost:8080 |
| Email (Inbucket) | http://localhost:54324 |

---

## 次のステップ

詳細なタスクリストは **[TODO.md](./TODO.md)** を参照してください。

### 完了
1. [x] 技術スタック決定
2. [x] データモデル設計
3. [x] UI/UX 設計
4. [x] 開発環境設計（Docker Compose）
5. [x] プロジェクト基盤セットアップ（DB スキーマ、型定義、React Query フック）

### 次のタスク（Phase 1: MVP）
6. [ ] 認証フローの実装（Google OAuth）
7. [ ] 共通 UI コンポーネント作成
8. [ ] Today 画面の実装
9. [ ] 習慣 CRUD 画面の実装
10. [ ] Statistics 画面の実装
11. [ ] Settings 画面の実装
