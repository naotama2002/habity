/**
 * 習慣関連のバリデーション
 */

import type {
  TrackingType,
  GoalPeriod,
  TimeOfDay,
} from '@/types/database';

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface HabitFormData {
  name: string;
  description?: string | null;
  tracking_type: TrackingType;
  goal_value: number;
  goal_unit: string;
  goal_period: GoalPeriod;
  time_of_day: TimeOfDay[];
  start_date: string;
  category_id?: string | null;
  recurrence_rule?: string | null;
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
 * トラッキングタイプのバリデーション
 */
export function validateTrackingType(trackingType: string): ValidationResult {
  const validTypes: TrackingType[] = ['boolean', 'numeric', 'duration'];

  if (!validTypes.includes(trackingType as TrackingType)) {
    return {
      isValid: false,
      error: '有効なトラッキング方法を選択してください',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * 目標値のバリデーション（数値/時間タイプの場合）
 */
export function validateGoalValue(
  goalValue: number,
  trackingType: TrackingType
): ValidationResult {
  // booleanタイプの場合は常に1なのでスキップ
  if (trackingType === 'boolean') {
    return {
      isValid: true,
      error: null,
    };
  }

  if (goalValue <= 0) {
    return {
      isValid: false,
      error: '目標値は0より大きい値を入力してください',
    };
  }

  if (!Number.isFinite(goalValue)) {
    return {
      isValid: false,
      error: '有効な数値を入力してください',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * 目標単位のバリデーション（数値/時間タイプの場合）
 */
export function validateGoalUnit(
  goalUnit: string,
  trackingType: TrackingType
): ValidationResult {
  // booleanタイプの場合は単位不要
  if (trackingType === 'boolean') {
    return {
      isValid: true,
      error: null,
    };
  }

  // durationタイプの場合は自動的に「分」
  if (trackingType === 'duration') {
    return {
      isValid: true,
      error: null,
    };
  }

  const trimmed = goalUnit.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: '単位を入力してください',
    };
  }

  if (trimmed.length > 20) {
    return {
      isValid: false,
      error: '単位は20文字以内で入力してください',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * 目標期間のバリデーション
 */
export function validateGoalPeriod(goalPeriod: string): ValidationResult {
  const validPeriods: GoalPeriod[] = ['daily', 'weekly', 'monthly'];

  if (!validPeriods.includes(goalPeriod as GoalPeriod)) {
    return {
      isValid: false,
      error: '有効な目標期間を選択してください',
    };
  }

  return {
    isValid: true,
    error: null,
  };
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

  // 実際に有効な日付かチェック
  const date = new Date(startDate);
  if (isNaN(date.getTime())) {
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

  // トラッキングタイプ
  const trackingTypeResult = validateTrackingType(data.tracking_type);
  if (!trackingTypeResult.isValid) {
    return trackingTypeResult;
  }

  // 目標値
  const goalValueResult = validateGoalValue(data.goal_value, data.tracking_type);
  if (!goalValueResult.isValid) {
    return goalValueResult;
  }

  // 目標単位
  const goalUnitResult = validateGoalUnit(data.goal_unit, data.tracking_type);
  if (!goalUnitResult.isValid) {
    return goalUnitResult;
  }

  // 目標期間
  const goalPeriodResult = validateGoalPeriod(data.goal_period);
  if (!goalPeriodResult.isValid) {
    return goalPeriodResult;
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
    tracking_type: validateTrackingType(data.tracking_type).error,
    goal_value: validateGoalValue(data.goal_value, data.tracking_type).error,
    goal_unit: validateGoalUnit(data.goal_unit, data.tracking_type).error,
    goal_period: validateGoalPeriod(data.goal_period).error,
    time_of_day: validateTimeOfDay(data.time_of_day).error,
    start_date: validateStartDate(data.start_date).error,
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
    tracking_type: 'boolean',
    goal_value: 1,
    goal_unit: '回',
    goal_period: 'daily',
    time_of_day: ['anytime'],
    start_date: today,
    category_id: null,
    recurrence_rule: null,
    reminder_times: null,
    reminder_enabled: false,
    status: 'active',
    sort_order: 0,
  };
}
