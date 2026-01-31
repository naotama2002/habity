# Claude Code 開発ガイド

このファイルは Claude Code がプロジェクトの開発方針を理解するためのガイドです。

## 対応プラットフォーム

Bluesky と同じアプローチ。1つのコードベースで全プラットフォームをカバー。

| プラットフォーム | 対応方法 |
|-----------------|---------|
| iOS | React Native + Expo |
| Android | React Native + Expo |
| Web | React Native Web (Expo Web) |
| macOS | Web版をブラウザで使用 |
| Windows | Web版をブラウザで使用 |

- プラットフォーム分離は `.native.tsx` / `.web.tsx` で実装
- デスクトップ専用アプリは作らない（Web版で対応）

---

## 最重要: 参考実装

**React Native の設計・実装は必ず Bluesky social-app を参考にすること。**

```
参考リポジトリ: /Users/naotama/ghq/github.com/bluesky-social/social-app
```

### 参考にすべき点

| 項目 | 参照先 |
|------|--------|
| プロジェクト構成 | `social-app/src/` |
| ナビゲーション | `social-app/src/Navigation.tsx` |
| 状態管理 | `social-app/src/state/` |
| コンポーネント設計 | `social-app/src/components/` |
| プラットフォーム分離 | `.native.tsx`, `.web.tsx` ファイル |
| React Query 使用法 | `social-app/src/state/queries/` |
| Jest 設定 | `social-app/jest/`, `social-app/package.json` の jest セクション |
| テストパターン | `social-app/src/state/session/__tests__/`, `social-app/__tests__/` |
| GitHub Actions CI | `social-app/.github/workflows/lint.yml` |

### 実装前のチェックリスト

1. [ ] Bluesky social-app で同様の機能がどう実装されているか確認
2. [ ] コンポーネント構成を参考に設計
3. [ ] 命名規則を統一
4. [ ] プラットフォーム固有コードの分離方法を確認

---

## プロジェクト概要

- **アプリ名**: Habity（習慣トラッキングアプリ）
- **対応プラットフォーム**: iOS, Android, Web, macOS
- **技術スタック**: React Native + Expo, Supabase, Go

## ドキュメント

詳細な仕様は `docs/` ディレクトリを参照:

- `docs/00-overview.md` - プロジェクト概要
- `docs/01-tech-stack.md` - 技術スタック
- `docs/02-habitify-import.md` - Habitify インポート仕様
- `docs/03-data-model.md` - データモデル
- `docs/04-ui-design.md` - UI/UX 設計
- `docs/05-development-environment.md` - 開発環境
- `docs/TODO.md` - 実装タスクリスト

## Git 操作ルール

**commit / push はユーザーの明示的な指示があるまで実行しないこと。**

- ブランチ作成: 指示があれば実行可
- ステージング (`git add`): 指示があれば実行可
- **コミット (`git commit`)**: 必ずユーザーの指示を待つ
- **プッシュ (`git push`)**: 必ずユーザーの指示を待つ
- PR作成: 必ずユーザーの指示を待つ

## 開発コマンド

```bash
# 環境セットアップ
mise install
pnpm install
docker compose up -d

# 開発サーバー
pnpm web       # Web
pnpm ios       # iOS
pnpm android   # Android

# 品質チェック
pnpm lint
pnpm typecheck
pnpm test
```

## コーディング規約

- TypeScript strict モード
- ESLint + Prettier
- React Query でサーバー状態管理
- Zod でスキーマ検証
- プラットフォーム固有コードは `.native.ts` / `.web.ts` で分離

## 国際化（i18n）ルール

**すべての UI テキストは多言語対応必須。**

### 使用ライブラリ

- **Lingui.js** - Bluesky と同じパターン
- `@lingui/core`, `@lingui/react`, `@lingui/macro`

### 実装パターン

```typescript
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';

function MyComponent() {
  const { _ } = useLingui();

  return (
    <Text>{_(msg`Hello World`)}</Text>
  );
}
```

### 翻訳ワークフロー

```bash
# メッセージ抽出 → 翻訳ファイル更新
pnpm intl:extract

# コンパイル（ビルド時）
pnpm intl:compile

# 抽出 + コンパイル
pnpm intl:build
```

### 翻訳ファイル配置

```
src/locale/
├── locales/
│   ├── en/messages.po    # 英語（ソース言語）
│   └── ja/messages.po    # 日本語
├── i18n.ts               # i18n 初期化
├── i18nProvider.tsx      # プロバイダー
└── languages.ts          # 言語定義
```

### 必須ルール

1. **ハードコードされた日本語/英語テキスト禁止**
2. すべての UI 文字列は `_(msg\`...\`)` でラップ
3. 新しいテキスト追加後は `pnpm intl:extract` を実行
4. `ja/messages.po` に日本語翻訳を追加
5. `pnpm intl:compile` でコンパイル

### テストでの注意

- Jest モックは英語メッセージ ID を返す
- テストでは英語文字列を期待値として使用

## テスト実装ルール

**各機能の実装時に必ずテストを作成すること。**

### ⚠️ CRITICAL: ステップごとのテスト作成ルール

**実装の各ステップで、必ず対応するテストを作成すること。**

これは絶対に省略してはならない。テストなしで次のステップに進むことは禁止。

| 実装内容 | 必須テスト |
|---------|-----------|
| バリデーション関数 | `__tests__/*.test.ts` |
| UIコンポーネント | `__tests__/*.test.tsx` |
| フォームコンポーネント | `__tests__/*.test.tsx` |
| 画面コンポーネント | `__tests__/*.test.tsx` |
| カスタムフック | `__tests__/*.test.ts` |
| ユーティリティ関数 | `__tests__/*.test.ts` |

```
❌ NG: Step1(実装+テスト) → Step2(実装のみ) → Step3(実装のみ)
✅ OK: Step1(実装+テスト) → Step2(実装+テスト) → Step3(実装+テスト)
```

### 実装時の必須ワークフロー

各ステップで以下を順番に実行する（省略禁止）：

1. 実装コードを書く
2. **対応するテストを書く**（これを省略しない）
3. `pnpm test` を実行して全テストが通ることを確認
4. `pnpm lint` を実行してエラーがないことを確認
5. **test と lint の両方が通ってから**次のステップへ進む
6. TaskUpdate でステップを完了にする

```bash
# 各ステップ完了時に必ず実行
pnpm test && pnpm lint
```

### 基本方針

1. **新規ロジック追加時**: 対応するユニットテストを必ず作成
2. **リファクタリング前**: 既存動作を確認するテストを先に書く
3. **CI 確認**: `pnpm test:ci` が通ることを確認してからコミット

### テストパターン

- **テーブル駆動テスト**: `it.each()` で複数ケースを効率的にテスト
- **状態管理テスト**: reducer や state transitions をテスト
- **バリデーション**: `src/lib/validation/` に抽出してテスト

### モック方針

- **外部 API（Supabase等）**: 必要に応じてモック
- **それ以外**: 極力モックしない（実際の動作をテスト）

### テストファイル配置

```
src/lib/**/__tests__/*.test.ts       # ユーティリティ関数
src/state/**/__tests__/*.test.ts     # 状態管理
src/components/**/__tests__/*.test.tsx  # コンポーネント
```

### Jest 設定ファイル

- `jest.config.js` - Jest 設定
- `jest/jestSetup.js` - React Native モック設定
