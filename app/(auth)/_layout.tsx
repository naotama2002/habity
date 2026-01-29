import { Stack } from 'expo-router';

/**
 * 認証フロー用のレイアウト
 * Bluesky の認証画面構成を参考に設計
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
