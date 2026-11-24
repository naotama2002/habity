import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { FormField } from '../FormField';

describe('FormField', () => {
  it('should render label', async () => {
    await render(
      <FormField label="テストラベル">
        <Text>子要素</Text>
      </FormField>
    );

    expect(screen.getByText('テストラベル')).toBeTruthy();
  });

  it('should render children', async () => {
    await render(
      <FormField label="ラベル">
        <Text>子要素テスト</Text>
      </FormField>
    );

    expect(screen.getByText('子要素テスト')).toBeTruthy();
  });

  it('should show required marker when required is true', async () => {
    await render(
      <FormField label="必須フィールド" required>
        <Text>内容</Text>
      </FormField>
    );

    expect(screen.getByText('*')).toBeTruthy();
  });

  it('should not show required marker when required is false', async () => {
    await render(
      <FormField label="任意フィールド" required={false}>
        <Text>内容</Text>
      </FormField>
    );

    expect(screen.queryByText('*')).toBeNull();
  });

  it('should show error message when error is provided', async () => {
    await render(
      <FormField label="フィールド" error="エラーメッセージ">
        <Text>内容</Text>
      </FormField>
    );

    expect(screen.getByText('エラーメッセージ')).toBeTruthy();
  });

  it('should show hint when provided and no error', async () => {
    await render(
      <FormField label="フィールド" hint="ヒントテキスト">
        <Text>内容</Text>
      </FormField>
    );

    expect(screen.getByText('ヒントテキスト')).toBeTruthy();
  });

  it('should not show hint when error is present', async () => {
    await render(
      <FormField label="フィールド" hint="ヒント" error="エラー">
        <Text>内容</Text>
      </FormField>
    );

    expect(screen.getByText('エラー')).toBeTruthy();
    expect(screen.queryByText('ヒント')).toBeNull();
  });

  it('should not show error or hint when both are null', async () => {
    await render(
      <FormField label="フィールド" error={null} hint={undefined}>
        <Text>内容</Text>
      </FormField>
    );

    expect(screen.getByText('フィールド')).toBeTruthy();
    expect(screen.getByText('内容')).toBeTruthy();
  });
});
