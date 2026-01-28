# Claude Code 開発ガイド

このファイルは Claude Code がプロジェクトの開発方針を理解するためのガイドです。

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
