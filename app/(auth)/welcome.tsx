import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionApi } from '@/state/session';

/**
 * ウェルカム画面
 * Bluesky の LoggedOut/SplashScreen を参考に設計
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const { signInWithGoogle } = useSessionApi();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign in failed:', error);
    }
  };

  const handleEmailSignIn = () => {
    router.push('/(auth)/login');
  };

  const handleSignUp = () => {
    router.push('/(auth)/signup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* ロゴ・タイトル */}
        <View style={styles.header}>
          <Text style={styles.logo}>Habity</Text>
          <Text style={styles.tagline}>習慣を、もっとシンプルに</Text>
        </View>

        {/* 説明 */}
        <View style={styles.description}>
          <Text style={styles.descriptionText}>
            毎日の習慣を記録して、{'\n'}
            より良い自分を目指しましょう
          </Text>
        </View>

        {/* ボタン */}
        <View style={styles.buttons}>
          {/* Google サインイン */}
          <Pressable
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleSignIn}
          >
            <Text style={styles.googleButtonText}>Google でサインイン</Text>
          </Pressable>

          {/* メールでサインイン */}
          <Pressable
            style={[styles.button, styles.emailButton]}
            onPress={handleEmailSignIn}
          >
            <Text style={styles.emailButtonText}>メールでサインイン</Text>
          </Pressable>

          {/* 新規登録 */}
          <Pressable style={styles.signUpLink} onPress={handleSignUp}>
            <Text style={styles.signUpText}>
              アカウントをお持ちでない方は
              <Text style={styles.signUpLinkText}> 新規登録</Text>
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
