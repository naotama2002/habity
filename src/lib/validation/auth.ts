/**
 * 認証関連のバリデーション
 */

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * メールアドレスの基本的なバリデーション
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'メールアドレスを入力してください',
    };
  }

  // 基本的なメールアドレスの形式チェック
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: '有効なメールアドレスを入力してください',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * パスワードのバリデーション
 * 要件: 8文字以上、大文字・小文字・数字を各1文字以上含む
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return {
      isValid: false,
      error: 'パスワードを入力してください',
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: 'Password must be at least 8 characters',
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must include a lowercase letter',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must include an uppercase letter',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must include a digit',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * パスワード確認のバリデーション
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): ValidationResult {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'パスワードが一致しません',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * ログインフォームのバリデーション
 */
export function validateLoginForm(
  email: string,
  password: string
): ValidationResult {
  const emailResult = validateEmail(email);
  if (!emailResult.isValid) {
    return emailResult;
  }

  // ログインの場合はパスワードの存在チェックのみ（長さは既存ユーザーなので不問）
  if (!password) {
    return {
      isValid: false,
      error: 'パスワードを入力してください',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * サインアップフォームのバリデーション
 */
export function validateSignupForm(
  email: string,
  password: string,
  confirmPassword: string
): ValidationResult {
  const emailResult = validateEmail(email);
  if (!emailResult.isValid) {
    return emailResult;
  }

  const passwordResult = validatePassword(password);
  if (!passwordResult.isValid) {
    return passwordResult;
  }

  const confirmResult = validatePasswordConfirmation(password, confirmPassword);
  if (!confirmResult.isValid) {
    return confirmResult;
  }

  return {
    isValid: true,
    error: null,
  };
}
