import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionApi } from '@/state/session';
import { validateSignupForm } from '@/lib/validation/auth';

/**
 * サインアップ画面
 */
export default function SignupScreen() {
  const { _ } = useLingui();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { signUpWithEmail } = useSessionApi();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async () => {
    setError(null);

    // バリデーション
    const validationResult = validateSignupForm(email, password, confirmPassword);
    if (!validationResult.isValid) {
      setError(validationResult.error);
      return;
    }

    setIsSubmitting(true);
    try {
      await signUpWithEmail(email.trim(), password);
      setSuccess(true);
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.message?.includes('already registered')) {
        setError(_(msg`This email is already registered`));
      } else {
        setError(_(msg`Registration failed. Please try again.`));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleGoToLogin = () => {
    // returnToパラメータを引き継ぐ
    const loginUrl = returnTo
      ? `/(auth)/login?returnTo=${returnTo}`
      : '/(auth)/login';
    router.replace(loginUrl as any);
  };

  // 登録成功後の画面
  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContent}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>{_(msg`Registration complete`)}</Text>
          <Text style={styles.successMessage}>
            {_(msg`We sent you a confirmation email.`)}
            {'\n'}
            {_(msg`Click the link in the email to activate your account.`)}
          </Text>
          <Pressable style={styles.loginButton} onPress={handleGoToLogin}>
            <Text style={styles.loginButtonText}>{_(msg`Go to Sign In`)}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* ヘッダー */}
            <View style={styles.header}>
              <Pressable onPress={handleBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>{_(msg`← Back`)}</Text>
              </Pressable>
              <Text style={styles.title}>{_(msg`Create Account`)}</Text>
              <Text style={styles.subtitle}>
                {_(msg`Let's create a new account`)}
              </Text>
            </View>

            {/* フォーム */}
            <View style={styles.form}>
              {/* エラーメッセージ */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* メールアドレス */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{_(msg`Email`)}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>

              {/* パスワード */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{_(msg`Password`)}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={_(msg`6 or more characters`)}
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!isSubmitting}
                />
              </View>

              {/* パスワード確認 */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{_(msg`Confirm Password`)}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={_(msg`Re-enter password`)}
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!isSubmitting}
                />
              </View>

              {/* 登録ボタン */}
              <Pressable
                style={[
                  styles.signupButton,
                  isSubmitting && styles.signupButtonDisabled,
                ]}
                onPress={handleSignup}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signupButtonText}>{_(msg`Create Account`)}</Text>
                )}
              </Pressable>

              {/* ログインリンク */}
              <View style={styles.loginLink}>
                <Text style={styles.loginLinkText}>
                  {_(msg`Already have an account?`)}
                </Text>
                <Pressable onPress={handleGoToLogin}>
                  <Text style={styles.loginLinkAction}> {_(msg`Sign In`)}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 16,
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6366f1',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    gap: 20,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  signupButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLinkAction: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  // 成功画面
  successContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 64,
    color: '#10b981',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
