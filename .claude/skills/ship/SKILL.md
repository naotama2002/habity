---
name: ship
description: Create a branch, check for doc updates, commit, push, and open a PR. Use when the user says "ship it", "PR作成", "ブランチ作成してPR", or similar.
disable-model-invocation: true
argument-hint: [branch-name]
allowed-tools: Bash, Read, Grep, Glob, Edit
---

# Ship: ブランチ作成 → ドキュメント確認 → commit → push → PR 作成

以下の手順を順番に実行する。

## 1. 変更内容の把握

- `git status` で変更ファイルを確認
- `git diff --stat` で変更の概要を確認
- `git log --oneline -5` で直近のコミットスタイルを確認

## 2. ブランチ作成

- 引数 `$ARGUMENTS` があればそれをブランチ名に使う
- なければ変更内容から適切なブランチ名を自動生成（`feat/xxx`, `fix/xxx`, `docs/xxx` など）
- `git checkout -b <branch-name>` で作成

## 3. ドキュメント更新チェック

`docs/**/*.md` および `CLAUDE.md` を対象に、今回の変更で古くなった記述がないか検索する。

**チェック方法:**
1. 今回の差分から、変更・削除・リネームされた関数名・型名・コンポーネント名・ファイルパスを抽出する
2. `docs/` 配下の全 `.md` ファイルと `CLAUDE.md` に対して、旧名称や古い記述を Grep で検索する
3. `docs/TODO.md` に該当タスクがあれば完了状態を更新する
4. 該当があれば修正を提案し、ユーザーに確認してから更新する

更新が必要な場合はここで修正してステージングに含める。

## 4. コミット

- 変更ファイルを `git add` でステージング（機密ファイルは除外）
- 変更内容に基づいてコミットメッセージを作成（Conventional Commits 形式）
- コミットメッセージの末尾に `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` を付与
- HEREDOC 形式でコミット

## 5. プッシュ & PR 作成

- `git push -u origin <branch-name>`
- `gh pr create` で PR 作成
  - タイトル: 70文字以内
  - 本文: Summary（箇条書き）+ Test plan
  - 末尾に `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- PR URL をユーザーに返す
