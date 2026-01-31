import { View, Text, StyleSheet, Pressable } from 'react-native';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionApi } from '@/state/session';

/**
 * ウェルカム画面
 */
export default function WelcomeScreen() {
  const { _ } = useLingui();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { signInWithGoogle } = useSessionApi();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // Google認証成功後はonAuthStateChangeでセッションが更新される
      // NavigationControllerがリダイレクトを処理するが、
      // returnToがある場合はここで明示的に遷移
      if (returnTo) {
        router.replace(decodeURIComponent(returnTo) as any);
      }
    } catch (error) {
      console.error('Google sign in failed:', error);
    }
  };

  const handleEmailSignIn = () => {
    // returnToパラメータを引き継ぐ
    const loginUrl = returnTo
      ? `/(auth)/login?returnTo=${returnTo}`
      : '/(auth)/login';
    router.push(loginUrl as any);
  };

  const handleSignUp = () => {
    // returnToパラメータを引き継ぐ
    const signupUrl = returnTo
      ? `/(auth)/signup?returnTo=${returnTo}`
      : '/(auth)/signup';
    router.push(signupUrl as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* ロゴ・タイトル */}
        <View style={styles.header}>
          <Text style={styles.logo}>Habity</Text>
          <Text style={styles.tagline}>{_(msg`Make habits simpler`)}</Text>
        </View>

        {/* 説明 */}
        <View style={styles.description}>
          <Text style={styles.descriptionText}>
            {_(msg`Track your daily habits and become a better you`)}
          </Text>
        </View>

        {/* ボタン */}
        <View style={styles.buttons}>
          {/* Google サインイン */}
          <Pressable
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleSignIn}
          >
            <Text style={styles.googleButtonText}>{_(msg`Sign in with Google`)}</Text>
          </Pressable>

          {/* メールでサインイン */}
          <Pressable
            style={[styles.button, styles.emailButton]}
            onPress={handleEmailSignIn}
          >
            <Text style={styles.emailButtonText}>{_(msg`Sign in with Email`)}</Text>
          </Pressable>

          {/* 新規登録 */}
          <Pressable style={styles.signUpLink} onPress={handleSignUp}>
            <Text style={styles.signUpText}>
              {_(msg`Don't have an account?`)}
              <Text style={styles.signUpLinkText}> {_(msg`Sign Up`)}</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 48,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: '#6b7280',
  },
  description: {
    alignItems: 'center',
    marginBottom: 48,
  },
  descriptionText: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttons: {
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emailButton: {
    backgroundColor: '#6366f1',
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  signUpLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  signUpText: {
    fontSize: 14,
    color: '#6b7280',
  },
  signUpLinkText: {
    color: '#6366f1',
    fontWeight: '600',
  },
});
