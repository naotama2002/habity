import { View, Text, StyleSheet, Pressable } from 'react-native';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionApi } from '@/state/session';
import { config } from '@/lib/config';
import { sanitizeReturnTo } from '@/lib/url';

/**
 * ウェルカム画面
 */
export default function WelcomeScreen() {
  const { _ } = useLingui();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { signInWithGitHub } = useSessionApi();

  const handleGitHubSignIn = async () => {
    try {
      await signInWithGitHub();
      // GitHub認証成功後はonAuthStateChangeでセッションが更新される
      // NavigationControllerがリダイレクトを処理するが、
      // returnToがある場合はここで明示的に遷移
      if (returnTo) {
        router.replace(sanitizeReturnTo(returnTo) as Href);
      }
    } catch (error) {
      console.error('GitHub sign in failed:', error);
    }
  };

  const handleEmailSignIn = () => {
    // returnToパラメータを引き継ぐ
    const loginUrl = returnTo
      ? `/(auth)/login?returnTo=${returnTo}`
      : '/(auth)/login';
    router.push(loginUrl as Href);
  };

  const handleSignUp = () => {
    // returnToパラメータを引き継ぐ
    const signupUrl = returnTo
      ? `/(auth)/signup?returnTo=${returnTo}`
      : '/(auth)/signup';
    router.push(signupUrl as Href);
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
          {/* GitHub サインイン */}
          <Pressable
            style={[styles.button, styles.githubButton]}
            onPress={handleGitHubSignIn}
          >
            <Text style={styles.githubButtonText}>{_(msg`Sign in with GitHub`)}</Text>
          </Pressable>

          {/* メールでサインイン */}
          <Pressable
            style={[styles.button, styles.emailButton]}
            onPress={handleEmailSignIn}
          >
            <Text style={styles.emailButtonText}>{_(msg`Sign in with Email`)}</Text>
          </Pressable>

          {/* 新規登録 */}
          {config.enableSignup && (
            <Pressable style={styles.signUpLink} onPress={handleSignUp}>
              <Text style={styles.signUpText}>
                {_(msg`Don't have an account?`)}
                <Text style={styles.signUpLinkText}> {_(msg`Sign Up`)}</Text>
              </Text>
            </Pressable>
          )}
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
  githubButton: {
    backgroundColor: '#24292e',
  },
  githubButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
