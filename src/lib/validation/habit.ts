/**
 * 習慣関連のバリデーション
 */

import type {
  TimeOfDay,
} from '@/types/database';
import type {RecurrenceType} from '@/lib/recurrence';

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface HabitFormData {
  name: string;
  description?: string | null;
  recurrence_type: RecurrenceType;
  recurrence_weekdays: number[];
  recurrence_monthdays: number[];
  recurrence_interval: number;
  time_of_day: TimeOfDay[];
  start_date: string;
  end_date?: string | null;
  category_id?: string | null;
  reminder_times?: string[] | null;
  reminder_enabled?: boolean;
  status?: 'active' | 'paused' | 'archived';
  sort_order?: number;
}

// ===========================================
// フィールド単位のバリデーション
// ===========================================

/**
 * 習慣名のバリデーション
 */
export function validateHabitName(name: string): ValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: '習慣名を入力してください',
    };
  }

  if (trimmed.length > 100) {
    return {
      isValid: false,
      error: '習慣名は100文字以内で入力してください',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * 説明のバリデーション
 */
export function validateDescription(description: string | null | undefined): ValidationResult {
  if (!description) {
    return {
      isValid: true,
      error: null,
    };
  }

  if (description.length > 500) {
    return {
      isValid: false,
      error: '説明は500文字以内で入力してください',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * 繰り返し設定のバリデーション
 */
export function validateRecurrence(
  type: RecurrenceType,
  weekdays: number[],
  monthdays: number[],
  interval: number,
): ValidationResult {
  switch (type) {
    case 'weekly':
      if (!weekdays || weekdays.length === 0) {
        return {
          isValid: false,
          error: '曜日を1つ以上選択してください',
        };
      }
      return {isValid: true, error: null};

    case 'monthly':
      if (!monthdays || monthdays.length === 0) {
        return {
          isValid: false,
          error: '日付を1つ以上選択してください',
        };
      }
      return {isValid: true, error: null};

    case 'interval':
      if (!Number.isInteger(interval) || interval < 1) {
        return {
          isValid: false,
          error: '間隔は1以上の整数を入力してください',
        };
      }
      return {isValid: true, error: null};

    default:
      return {
        isValid: false,
        error: '有効な繰り返しタイプを選択してください',
      };
  }
}

/**
 * 時間帯のバリデーション
 */
export function validateTimeOfDay(timeOfDay: TimeOfDay[]): ValidationResult {
  if (!timeOfDay || timeOfDay.length === 0) {
    return {
      isValid: false,
      error: '実行する時間帯を選択してください',
    };
  }

  const validTimes: TimeOfDay[] = ['anytime', 'morning', 'afternoon', 'evening', 'night'];
  const hasInvalidTime = timeOfDay.some((time) => !validTimes.includes(time));

  if (hasInvalidTime) {
    return {
      isValid: false,
      error: '有効な時間帯を選択してください',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * YYYY-MM-DD 文字列が実在するカレンダー日付かを厳密に判定する。
 * new Date('2024-02-31') のようなロールオーバーも検出して reject する。
 */
function isValidCalendarDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  // UTC パース結果が元の年月日と一致するか確認（ロールオーバー検出）
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() + 1 === m &&
    date.getUTCDate() === d
  );
}

/**
 * 開始日のバリデーション
 */
export function validateStartDate(startDate: string): ValidationResult {
  if (!startDate) {
    return {
      isValid: false,
      error: '開始日を入力してください',
    };
  }

  // ISO 8601形式（YYYY-MM-DD）のチェック
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate)) {
    return {
      isValid: false,
      error: '有効な日付形式で入力してください（YYYY-MM-DD）',
    };
  }

  // 実際に有効な日付かチェック（ロールオーバーも検出）
  if (!isValidCalendarDate(startDate)) {
    return {
      isValid: false,
      error: '有効な日付を入力してください',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * 終了日のバリデーション
 */
export function validateEndDate(endDate: string | null | undefined, startDate: string): ValidationResult {
  // NULL/空 → valid（無期限）
  if (!endDate) {
    return {
      isValid: true,
      error: null,
    };
  }

  // ISO 8601形式（YYYY-MM-DD）のチェック
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(endDate)) {
    return {
      isValid: false,
      error: '有効な日付形式で入力してください（YYYY-MM-DD）',
    };
  }

  // 実際に有効な日付かチェック（ロールオーバーも検出）
  if (!isValidCalendarDate(endDate)) {
    return {
      isValid: false,
      error: '有効な日付を入力してください',
    };
  }

  // end_date >= start_date チェック
  if (startDate && endDate < startDate) {
    return {
      isValid: false,
      error: '終了日は開始日以降の日付を指定してください',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

// ===========================================
// フォーム全体のバリデーション
// ===========================================

/**
 * 習慣フォームのバリデーション
 */
export function validateHabitForm(data: HabitFormData): ValidationResult {
  // 習慣名
  const nameResult = validateHabitName(data.name);
  if (!nameResult.isValid) {
    return nameResult;
  }

  // 説明
  const descriptionResult = validateDescription(data.description);
  if (!descriptionResult.isValid) {
    return descriptionResult;
  }

  // 繰り返し
  const recurrenceResult = validateRecurrence(
    data.recurrence_type,
    data.recurrence_weekdays,
    data.recurrence_monthdays,
    data.recurrence_interval,
  );
  if (!recurrenceResult.isValid) {
    return recurrenceResult;
  }

  // 時間帯
  const timeOfDayResult = validateTimeOfDay(data.time_of_day);
  if (!timeOfDayResult.isValid) {
    return timeOfDayResult;
  }

  // 開始日
  const startDateResult = validateStartDate(data.start_date);
  if (!startDateResult.isValid) {
    return startDateResult;
  }

  // 終了日
  const endDateResult = validateEndDate(data.end_date, data.start_date);
  if (!endDateResult.isValid) {
    return endDateResult;
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * 習慣フォームの全フィールドをバリデーションし、フィールドごとのエラーを返す
 */
export function validateHabitFormFields(data: HabitFormData): Record<string, string | null> {
  return {
    name: validateHabitName(data.name).error,
    description: validateDescription(data.description).error,
    recurrence: validateRecurrence(
      data.recurrence_type,
      data.recurrence_weekdays,
      data.recurrence_monthdays,
      data.recurrence_interval,
    ).error,
    time_of_day: validateTimeOfDay(data.time_of_day).error,
    start_date: validateStartDate(data.start_date).error,
    end_date: validateEndDate(data.end_date, data.start_date).error,
  };
}

/**
 * デフォルトの習慣フォームデータを生成
 */
export function getDefaultHabitFormData(): HabitFormData {
  const today = new Date().toISOString().split('T')[0];

  return {
    name: '',
    description: null,
    recurrence_type: 'interval',
    recurrence_weekdays: [],
    recurrence_monthdays: [],
    recurrence_interval: 1,
    time_of_day: ['anytime'],
    start_date: today,
    end_date: null,
    category_id: null,
    reminder_times: null,
    reminder_enabled: false,
    status: 'active',
    sort_order: 0,
  };
}
