# 技術スタック仕様

## 参考実装（必須）

> **重要**: React Native の設計・実装は必ず Bluesky social-app を参考にすること。
>
> ```
> 参考リポジトリ: /Users/naotama/ghq/github.com/bluesky-social/social-app
> GitHub: https://github.com/bluesky-social/social-app
> ```

---

## 決定事項

**フロントエンド**: React Native Web + Expo Web（Web 専用）

| プラットフォーム | 技術 | 備考 |
|-----------------|------|------|
| Web | React Native Web | Expo でサポート |
| macOS / Windows | Web 版をブラウザで使用 | |

**バックエンド**: Supabase + Go

---

## プロジェクト構成

Bluesky social-app の構成を参考に設計。

```
habity/
├── src/                          # メインソースコード
│   ├── Navigation.tsx            # ナビゲーション定義
│   │
│   ├── components/               # 再利用可能なコンポーネント
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── HabitItem.tsx
│   │   ├── HabitList.tsx
│   │   ├── ProgressRing.tsx
│   │   └── ...
│   │
│   ├── screens/                  # 画面コンポーネント
│   │   ├── Home/
│   │   │   ├── HomeScreen.tsx
│   │   │   └── TodayTab.tsx
│   │   ├── Habits/
│   │   │   ├── HabitListScreen.tsx
│   │   │   ├── HabitDetailScreen.tsx
│   │   │   └── HabitEditScreen.tsx
│   │   ├── Statistics/
│   │   │   └── StatisticsScreen.tsx
│   │   ├── Settings/
│   │   │   ├── SettingsScreen.tsx
│   │   │   └── ImportScreen.tsx
│   │   └── Auth/
│   │       ├── LoginScreen.tsx
│   │       └── WelcomeScreen.tsx
│   │
│   ├── state/                    # 状態管理
│   │   ├── session/              # 認証・セッション
│   │   │   ├── index.tsx
│   │   │   └── agent.ts
│   │   ├── queries/              # React Query 定義
│   │   │   ├── habits.ts
│   │   │   ├── habit-logs.ts
│   │   │   ├── categories.ts
│   │   │   └── settings.ts
│   │   └── persisted/            # 永続化状態
│   │       ├── index.ts
│   │       └── schema.ts
│   │
│   ├── lib/                      # ユーティリティ
│   │   ├── api/                  # API クライアント
│   │   │   └── supabase.ts
│   │   ├── hooks/                # カスタムフック
│   │   │   ├── useHabits.ts
│   │   │   ├── useStreak.ts
│   │   │   └── ...
│   │   ├── constants.ts
│   │   ├── dates.ts              # 日付ユーティリティ
│   │   └── rrule.ts              # RRule パーサー
│   │
│   │
│   ├── locale/                   # 多言語対応
│   │   ├── locales/
│   │   │   ├── en/
│   │   │   └── ja/
│   │   └── i18n.ts
│   │
│   └── types/                    # 型定義
│       ├── database.ts
│       └── navigation.ts
│
├── backend/                      # Go バックエンド
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── handler/
│   │   ├── service/
│   │   ├── repository/
│   │   └── habitify/             # Habitify API クライアント
│   ├── go.mod
│   └── go.sum
│
├── supabase/                     # Supabase 設定
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20240101000000_create_categories.sql
│   │   ├── 20240101000001_create_habits.sql
│   │   └── ...
│   └── seed.sql
│
├── web/                          # Web 固有ファイル
│   └── index.html
│
├── __tests__/                    # テスト
├── docs/                         # ドキュメント
│
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── app.config.js                 # Expo 設定
└── .env.example
```

---

## 主要依存パッケージ

Bluesky の package.json を参考に選定。

### React Native / Expo

```json
{
  "react": "19.x",
  "react-native": "0.81.x",
  "expo": "~54.0.x",
  "react-dom": "19.x",
  "react-native-web": "^0.21.x"
}
```

### ナビゲーション

```json
{
  "@react-navigation/native": "^7.x",
  "@react-navigation/bottom-tabs": "^7.x",
  "@react-navigation/native-stack": "^7.x"
}
```

### 状態管理・データ

```json
{
  "@tanstack/react-query": "^5.x",
  "@supabase/supabase-js": "^2.x",
  "zod": "^3.x"
}
```

### UI / アニメーション

```json
{
  "react-native-reanimated": "^3.x",
  "react-native-gesture-handler": "^2.x",
  "react-native-safe-area-context": "^5.x",
  "expo-image": "~3.x"
}
```

### 多言語

```json
{
  "@lingui/react": "^4.x",
  "@lingui/macro": "^4.x",
  "@lingui/cli": "^4.x"
}
```

### ユーティリティ

```json
{
  "date-fns": "^2.x",
  "nanoid": "^5.x"
}
```

### 開発

```json
{
  "typescript": "^5.x",
  "eslint": "^9.x",
  "prettier": "^3.x",
  "jest": "^29.x",
  "@testing-library/react-native": "^13.x"
}
```

---

## コード構成

Web 専用プロジェクトのため、プラットフォーム分離（`.native.tsx` / `.web.tsx`）は使用しない。すべてのコードは Web 向けに統一。

---

## 状態管理アーキテクチャ

Bluesky の状態管理パターンを参考に、3層構造を採用。

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                             │
│                  (React Components)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │ useQuery / useMutation
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    React Query                               │
│              (サーバー状態キャッシュ)                          │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ habits   │ │  logs    │ │categories│ │ settings │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Client                          │
│                  (API + Realtime)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                         │
│            (PostgreSQL + Auth + Realtime)                   │
└─────────────────────────────────────────────────────────────┘
```

### React Query 設定

```typescript
// src/lib/react-query.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,     // 5分
      gcTime: 1000 * 60 * 30,       // 30分
      retry: 1,
      refetchOnWindowFocus: false,  // Bluesky と同様
    },
  },
});
```

### Query 定義例

```typescript
// src/state/queries/habits.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Habit, HabitWithLog } from '@/types/database';

export const habitKeys = {
  all: ['habits'] as const,
  lists: () => [...habitKeys.all, 'list'] as const,
  list: (filters: { status?: string }) => [...habitKeys.lists(), filters] as const,
  details: () => [...habitKeys.all, 'detail'] as const,
  detail: (id: string) => [...habitKeys.details(), id] as const,
  byDate: (date: string) => [...habitKeys.all, 'byDate', date] as const,
};

export function useHabitsWithLog(date?: string) {
  const targetDate = date ?? new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: habitKeys.byDate(targetDate),
    queryFn: async () => {
      // habits テーブルを直接クエリ（RLS が効く）
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('status', 'active')
        .order('sort_order');

      if (habitsError) throw habitsError;
      if (!habits || habits.length === 0) return [] as HabitWithLog[];

      // 指定日のログを取得して クライアント側で結合
      const habitIds = habits.map(h => h.id);
      const { data: logs, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .in('habit_id', habitIds)
        .eq('target_date', targetDate);

      if (logsError) throw logsError;

      const logMap = new Map(logs?.map(l => [l.habit_id, l]) ?? []);
      return habits.map(h => {
        const log = logMap.get(h.id) ?? null;
        const logStatus = log?.status ?? null;
        return {
          ...h,
          log_id: log?.id ?? null,
          log_value: log?.value ?? null,
          log_completed_at: log?.completed_at ?? null,
          log_note: log?.note ?? null,
          log_status: logStatus,
          is_completed: log !== null && logStatus === 'completed' && log.value >= h.goal_value,
          is_skipped: logStatus === 'skipped',
        } as HabitWithLog;
      });
    },
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('habits')
        .insert(habit)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
    },
  });
}
```

---

## 認証フロー

Supabase Auth + GitHub OAuth を使用。

```typescript
// src/state/session/index.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/api/supabase';

interface SessionContextType {
  session: Session | null;
  isLoading: boolean;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // セッション変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGitHub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: 'habity://auth/callback',
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SessionContext.Provider value={{ session, isLoading, signInWithGitHub, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
```

---

## 開発環境セットアップ

```bash
# 1. リポジトリクローン
git clone https://github.com/naotama2002/habity.git
cd habity

# 2. ツールインストール (mise)
mise install

# 3. 依存パッケージインストール
pnpm install

# 4. 環境変数設定
cp .env.example .env

# 5. Supabase 起動
supabase start

# 6. 開発サーバー起動
pnpm web          # Web 版
```

---

## 参考リンク

- [Bluesky social-app](https://github.com/bluesky-social/social-app) - 参考実装
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Lingui Documentation](https://lingui.dev/)
