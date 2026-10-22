import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme, colors } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius } from '@/lib/spacing';
import {
  importFromHabitify,
  type ImportHabitifyResult,
} from '@/lib/backend-api';

type ScreenState = 'idle' | 'loading' | 'success' | 'error';

export default function HabitifyImportScreen() {
  const { _ } = useLingui();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [apiKey, setApiKey] = useState('');
  const [importHabits, setImportHabits] = useState(true);
  const [importLogs, setImportLogs] = useState(true);
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [result, setResult] = useState<ImportHabitifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleImport = async () => {
    setScreenState('loading');
    setErrorMessage('');

    try {
      const importResult = await importFromHabitify({
        api_key: apiKey,
        import_habits: importHabits,
        import_logs: importLogs,
      });
      setResult(importResult);
      setScreenState('success');
      queryClient.invalidateQueries();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setScreenState('error');
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const canImport = apiKey.trim().length > 0 && (importHabits || importLogs);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color={lightTheme.text} />
        </Pressable>
        <Text style={styles.title}>{_(msg`Import from Habitify`)}</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
          {screenState === 'success' && result ? (
            <SuccessView result={result} onClose={handleClose} />
          ) : (
            <>
              {/* API Key Input */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {_(msg`Habitify API Key`)}
                </Text>
                <TextInput
                  style={styles.input}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder={_(msg`Enter your Habitify API key`)}
                  placeholderTextColor={lightTheme.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  editable={screenState !== 'loading'}
                  testID="api-key-input"
                />
                <Text style={styles.helpText}>
                  {_(msg`How to get your API key: Open Habitify app → Settings → API Credential → Copy`)}
                </Text>
              </View>

              {/* Import Options */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {_(msg`Import Options`)}
                </Text>
                <View style={styles.optionCard}>
                  <View style={styles.optionRow}>
                    <View style={styles.optionInfo}>
                      <Ionicons
                        name="list-outline"
                        size={20}
                        color={lightTheme.textSecondary}
                      />
                      <Text style={styles.optionLabel}>
                        {_(msg`Import Habits`)}
                      </Text>
                    </View>
                    <Switch
                      value={importHabits}
                      onValueChange={setImportHabits}
                      disabled={screenState === 'loading'}
                      trackColor={{
                        false: colors.gray[200],
                        true: colors.primary[300],
                      }}
                      thumbColor={
                        importHabits ? colors.primary[500] : colors.gray[50]
                      }
                      testID="import-habits-switch"
                    />
                  </View>
                  <View style={styles.separator} />
                  <View style={styles.optionRow}>
                    <View style={styles.optionInfo}>
                      <Ionicons
                        name="document-text-outline"
                        size={20}
                        color={lightTheme.textSecondary}
                      />
                      <Text style={styles.optionLabel}>
                        {_(msg`Import Logs`)}
                      </Text>
                    </View>
                    <Switch
                      value={importLogs}
                      onValueChange={setImportLogs}
                      disabled={screenState === 'loading'}
                      trackColor={{
                        false: colors.gray[200],
                        true: colors.primary[300],
                      }}
                      thumbColor={
                        importLogs ? colors.primary[500] : colors.gray[50]
                      }
                      testID="import-logs-switch"
                    />
                  </View>
                </View>
              </View>

              {/* Error Message */}
              {screenState === 'error' && errorMessage !== '' && (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color={lightTheme.error}
                  />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Import Button */}
              <Pressable
                style={[
                  styles.importButton,
                  (!canImport || screenState === 'loading') &&
                    styles.importButtonDisabled,
                ]}
                onPress={handleImport}
                disabled={!canImport || screenState === 'loading'}
                testID="import-button"
              >
                {screenState === 'loading' ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={colors.white} size="small" />
                    <Text style={styles.importButtonText}>
                      {_(msg`Importing...`)}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.importButtonText}>
                    {_(msg`Import`)}
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SuccessView({
  result,
  onClose,
}: {
  result: ImportHabitifyResult;
  onClose: () => void;
}) {
  const { _ } = useLingui();

  return (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={64} color={lightTheme.success} />
      </View>
      <Text style={styles.successTitle}>{_(msg`Import Complete`)}</Text>

      <View style={styles.resultCard}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>{_(msg`Habits imported`)}</Text>
          <Text style={styles.resultValue}>{result.habits_imported}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>{_(msg`Logs imported`)}</Text>
          <Text style={styles.resultValue}>{result.logs_imported}</Text>
        </View>
      </View>

      {result.errors && result.errors.length > 0 && (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>
            {_(msg`Some items could not be imported`)}
          </Text>
          {result.errors.map((err, i) => (
            <Text key={i} style={styles.warningText}>
              {err}
            </Text>
          ))}
        </View>
      )}

      <Pressable style={styles.closeBtn} onPress={onClose} testID="close-button">
        <Text style={styles.closeBtnText}>{_(msg`Close`)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h4,
    color: lightTheme.text,
  },
  placeholder: {
    width: 32,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    ...typography.bodySmallMedium,
    color: lightTheme.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    backgroundColor: lightTheme.surface,
    borderWidth: 1,
    borderColor: lightTheme.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: lightTheme.text,
  },
  helpText: {
    ...typography.caption,
    color: lightTheme.textTertiary,
    marginTop: spacing.sm,
  },
  optionCard: {
    backgroundColor: lightTheme.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: lightTheme.border,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionLabel: {
    ...typography.body,
    color: lightTheme.text,
  },
  separator: {
    height: 1,
    backgroundColor: lightTheme.border,
    marginHorizontal: spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing['2xl'],
  },
  errorText: {
    ...typography.bodySmall,
    color: lightTheme.error,
    flex: 1,
  },
  importButton: {
    backgroundColor: lightTheme.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    ...typography.button,
    color: colors.white,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Success
  successContainer: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.h3,
    color: lightTheme.text,
    marginBottom: spacing['2xl'],
  },
  resultCard: {
    width: '100%',
    backgroundColor: lightTheme.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: lightTheme.border,
    marginBottom: spacing['2xl'],
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resultLabel: {
    ...typography.body,
    color: lightTheme.textSecondary,
  },
  resultValue: {
    ...typography.bodyMedium,
    color: lightTheme.text,
  },
  warningBox: {
    width: '100%',
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing['2xl'],
  },
  warningTitle: {
    ...typography.bodySmallMedium,
    color: colors.warning[800],
    marginBottom: spacing.xs,
  },
  warningText: {
    ...typography.caption,
    color: colors.warning[700],
  },
  closeBtn: {
    width: '100%',
    backgroundColor: lightTheme.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: lightTheme.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  closeBtnText: {
    ...typography.button,
    color: lightTheme.text,
  },
});
