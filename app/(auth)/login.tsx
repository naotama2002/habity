import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionApi } from '@/state/session';
import { validateLoginForm } from '@/lib/validation/auth';
import { sanitizeReturnTo } from '@/lib/url';
import { useLoginThrottle } from '@/lib/auth/useLoginThrottle';

/**
 * ログイン画面
 */
export default function LoginScreen() {
  const { _ } = useLingui();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { signInWithEmail } = useSessionApi();

  const passwordRef = useRef<TextInput>(null);
  const { isLocked, remainingSeconds, recordFailure, reset: resetThrottle } =
    useLoginThrottle();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setError(null);

    if (isLocked) {
      return;
    }

    // バリデーション
    const validationResult = validateLoginForm(email, password);
    if (!validationResult.isValid) {
      setError(validationResult.error);
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
      resetThrottle();
      // 成功時にreturnToがあればそこに遷移、なければトップへ
      router.replace(sanitizeReturnTo(returnTo) as Href);
    } catch (err) {
      console.error('Login error:', err);
      recordFailure();
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('Invalid login credentials')) {
        setError(_(msg`Email or password is incorrect`));
      } else {
        setError(_(msg`Login failed. Please try again.`));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>{_(msg`← Back`)}</Text>
            </Pressable>
            <Text style={styles.title}>{_(msg`Sign In`)}</Text>
            <Text style={styles.subtitle}>
              {_(msg`Enter your email and password`)}
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
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            {/* パスワード */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{_(msg`Password`)}</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder={_(msg`Password`)}
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!isSubmitting}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            {/* ロックメッセージ */}
            {isLocked && (
              <View style={styles.lockContainer}>
                <Text style={styles.lockText}>
                  {_(msg`Too many failed attempts. Try again in ${remainingSeconds} seconds.`)}
                </Text>
              </View>
            )}

            {/* ログインボタン */}
            <Pressable
              style={[
                styles.loginButton,
                (isSubmitting || isLocked) && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isSubmitting || isLocked}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>{_(msg`Sign In`)}</Text>
              )}
            </Pressable>
          </View>
        </View>
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
  lockContainer: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 12,
  },
  lockText: {
    color: '#92400e',
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
