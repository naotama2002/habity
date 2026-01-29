import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '@/lib/react-query';
import { SessionProvider, useSession } from '@/state/session';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

/**
 * ナビゲーション制御コンポーネント
 * Bluesky の createNativeStackNavigatorWithAuth を参考に設計
 * 認証状態に応じて適切な画面にリダイレクト
 */
function NavigationController({ children }: { children: React.ReactNode }) {
  const { hasSession, isInitialized } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 初期化が完了するまで待機
    if (!isInitialized) return;

    // 現在のルートグループを確認
    const inAuthGroup = segments[0] === '(auth)';

    if (!hasSession && !inAuthGroup) {
      // 未認証でメイン画面にいる場合 → ウェルカム画面へ
      router.replace('/(auth)/welcome');
    } else if (hasSession && inAuthGroup) {
      // 認証済みで認証画面にいる場合 → メイン画面へ
      router.replace('/(tabs)');
    }
  }, [hasSession, isInitialized, segments, router]);

  return <>{children}</>;
}

/**
 * メインレイアウトコンポーネント
 */
function MainLayout() {
  const { isInitialized } = useSession();

  useEffect(() => {
    // セッション初期化が完了したらスプラッシュスクリーンを非表示
    if (isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [isInitialized]);

  return (
    <NavigationController>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </NavigationController>
  );
}

/**
 * ルートレイアウト
 * Provider 階層: GestureHandler → QueryClient → Session
 * Bluesky の App.native.tsx を参考に設計
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <MainLayout />
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
