import { describe, expect, it } from '@jest/globals';
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateLoginForm,
  validateSignupForm,
} from '../auth';

/**
 * 認証バリデーションのテスト
 * テーブル駆動テスト（it.each）パターンを使用
 */

describe('auth validation', () => {
  describe('validateEmail', () => {
    // 有効なメールアドレス
    const validEmails = [
      'test@example.com',
      'user.name@example.com',
      'user+tag@example.com',
      'user@subdomain.example.com',
    ];

    it.each(validEmails)('should accept valid email: %s', (email) => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    // 無効なメールアドレス
    const invalidEmails: Array<[string, string]> = [
      ['', 'メールアドレスを入力してください'],
      ['   ', 'メールアドレスを入力してください'],
      ['invalid', '有効なメールアドレスを入力してください'],
      ['invalid@', '有効なメールアドレスを入力してください'],
      ['@example.com', '有効なメールアドレスを入力してください'],
      ['test@.com', '有効なメールアドレスを入力してください'],
    ];

    it.each(invalidEmails)(
      'should reject invalid email "%s" with error "%s"',
      (email, expectedError) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(expectedError);
      }
    );

    it('should trim whitespace from email', () => {
      const result = validateEmail('  test@example.com  ');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePassword', () => {
    // 有効なパスワード（8文字以上、大文字・小文字・数字含む）
    const validPasswords = [
      'Abcdef1x',
      'Password1',
      'myPass99',
      'LongerPassword123',
    ];

    it.each(validPasswords)('should accept valid password: %s', (password) => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    // 無効なパスワード
    const invalidPasswords: Array<[string, string]> = [
      ['', 'パスワードを入力してください'],
      ['Ab1', 'Password must be at least 8 characters'],
      ['Short1A', 'Password must be at least 8 characters'],
      ['UPPERCASE1', 'Password must include a lowercase letter'],
      ['lowercase1', 'Password must include an uppercase letter'],
      ['Abcdefgh', 'Password must include a digit'],
    ];

    it.each(invalidPasswords)(
      'should reject invalid password "%s" with error "%s"',
      (password, expectedError) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(expectedError);
      }
    );
  });

  describe('validatePasswordConfirmation', () => {
    it('should accept matching passwords', () => {
      const result = validatePasswordConfirmation('Password1', 'Password1');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject non-matching passwords', () => {
      const result = validatePasswordConfirmation('Password1', 'Different1');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('パスワードが一致しません');
    });

    it('should handle empty passwords', () => {
      const result = validatePasswordConfirmation('Password1', '');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('パスワードが一致しません');
    });
  });

  describe('validateLoginForm', () => {
    it('should accept valid login credentials', () => {
      const result = validateLoginForm('test@example.com', 'password');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject empty email', () => {
      const result = validateLoginForm('', 'password');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('メールアドレスを入力してください');
    });

    it('should reject invalid email format', () => {
      const result = validateLoginForm('invalid', 'password');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('有効なメールアドレスを入力してください');
    });

    it('should reject empty password', () => {
      const result = validateLoginForm('test@example.com', '');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('パスワードを入力してください');
    });

    it('should accept short password for login (existing user)', () => {
      // ログインの場合、既存ユーザーなのでパスワード長は不問
      const result = validateLoginForm('test@example.com', 'abc');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateSignupForm', () => {
    it('should accept valid signup data', () => {
      const result = validateSignupForm(
        'test@example.com',
        'Password1',
        'Password1'
      );
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject empty email', () => {
      const result = validateSignupForm('', 'Password1', 'Password1');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('メールアドレスを入力してください');
    });

    it('should reject invalid email format', () => {
      const result = validateSignupForm(
        'invalid',
        'Password1',
        'Password1'
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('有効なメールアドレスを入力してください');
    });

    it('should reject empty password', () => {
      const result = validateSignupForm('test@example.com', '', '');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('パスワードを入力してください');
    });

    it('should reject short password', () => {
      const result = validateSignupForm('test@example.com', 'Ab1', 'Ab1');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters');
    });

    it('should reject password without lowercase', () => {
      const result = validateSignupForm(
        'test@example.com',
        'ALLCAPS12',
        'ALLCAPS12'
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must include a lowercase letter');
    });

    it('should reject non-matching passwords', () => {
      const result = validateSignupForm(
        'test@example.com',
        'Password1',
        'Different1'
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('パスワードが一致しません');
    });

    // 検証順序のテスト（メール → パスワード → 確認）
    it('should validate in order: email first', () => {
      const result = validateSignupForm('', 'ab', 'different');
      expect(result.error).toBe('メールアドレスを入力してください');
    });

    it('should validate in order: password second', () => {
      const result = validateSignupForm('test@example.com', 'ab', 'different');
      expect(result.error).toBe('Password must be at least 8 characters');
    });

    it('should validate in order: confirmation last', () => {
      const result = validateSignupForm(
        'test@example.com',
        'Password1',
        'Different1'
      );
      expect(result.error).toBe('パスワードが一致しません');
    });
  });
});
