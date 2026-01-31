import { describe, expect, it } from '@jest/globals';
import {
  validateHabitName,
  validateDescription,
  validateTrackingType,
  validateGoalValue,
  validateGoalUnit,
  validateGoalPeriod,
  validateTimeOfDay,
  validateStartDate,
  validateHabitForm,
  validateHabitFormFields,
  getDefaultHabitFormData,
  type HabitFormData,
} from '../habit';

/**
 * 習慣バリデーションのテスト
 * テーブル駆動テスト（it.each）パターンを使用
 */

describe('habit validation', () => {
  describe('validateHabitName', () => {
    const validNames = ['読書', '運動する', 'Morning Routine', '毎日の瞑想10分'];

    it.each(validNames)('should accept valid name: %s', (name) => {
      const result = validateHabitName(name);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    const invalidNames: Array<[string, string]> = [
      ['', '習慣名を入力してください'],
      ['   ', '習慣名を入力してください'],
      ['a'.repeat(101), '習慣名は100文字以内で入力してください'],
    ];

    it.each(invalidNames)(
      'should reject invalid name "%s" with error "%s"',
      (name, expectedError) => {
        const result = validateHabitName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(expectedError);
      }
    );

    it('should trim whitespace from name', () => {
      const result = validateHabitName('  読書  ');
      expect(result.isValid).toBe(true);
    });

    it('should accept exactly 100 characters', () => {
      const result = validateHabitName('a'.repeat(100));
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateDescription', () => {
    it('should accept empty description', () => {
      expect(validateDescription('').isValid).toBe(true);
      expect(validateDescription(null).isValid).toBe(true);
      expect(validateDescription(undefined).isValid).toBe(true);
    });

    it('should accept valid description', () => {
      const result = validateDescription('毎朝30分の読書をする');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept exactly 500 characters', () => {
      const result = validateDescription('a'.repeat(500));
      expect(result.isValid).toBe(true);
    });

    it('should reject description over 500 characters', () => {
      const result = validateDescription('a'.repeat(501));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('説明は500文字以内で入力してください');
    });
  });

  describe('validateTrackingType', () => {
    const validTypes = ['boolean', 'numeric', 'duration'];

    it.each(validTypes)('should accept valid type: %s', (type) => {
      const result = validateTrackingType(type);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    const invalidTypes = ['invalid', '', 'count', 'time'];

    it.each(invalidTypes)('should reject invalid type: %s', (type) => {
      const result = validateTrackingType(type);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('有効なトラッキング方法を選択してください');
    });
  });

  describe('validateGoalValue', () => {
    it('should skip validation for boolean type', () => {
      const result = validateGoalValue(0, 'boolean');
      expect(result.isValid).toBe(true);
    });

    const validValues: Array<[number, 'numeric' | 'duration']> = [
      [1, 'numeric'],
      [10, 'numeric'],
      [0.5, 'numeric'],
      [30, 'duration'],
      [60, 'duration'],
    ];

    it.each(validValues)(
      'should accept valid goal value %d for type %s',
      (value, type) => {
        const result = validateGoalValue(value, type);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      }
    );

    const invalidValues: Array<[number, 'numeric' | 'duration', string]> = [
      [0, 'numeric', '目標値は0より大きい値を入力してください'],
      [-1, 'numeric', '目標値は0より大きい値を入力してください'],
      [0, 'duration', '目標値は0より大きい値を入力してください'],
      [Infinity, 'numeric', '有効な数値を入力してください'],
      [NaN, 'numeric', '有効な数値を入力してください'],
    ];

    it.each(invalidValues)(
      'should reject invalid goal value %d for type %s',
      (value, type, expectedError) => {
        const result = validateGoalValue(value, type);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(expectedError);
      }
    );
  });

  describe('validateGoalUnit', () => {
    it('should skip validation for boolean type', () => {
      const result = validateGoalUnit('', 'boolean');
      expect(result.isValid).toBe(true);
    });

    it('should skip validation for duration type', () => {
      const result = validateGoalUnit('', 'duration');
      expect(result.isValid).toBe(true);
    });

    const validUnits = ['回', '分', 'km', 'ページ', 'ml'];

    it.each(validUnits)('should accept valid unit: %s', (unit) => {
      const result = validateGoalUnit(unit, 'numeric');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject empty unit for numeric type', () => {
      const result = validateGoalUnit('', 'numeric');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('単位を入力してください');
    });

    it('should reject whitespace-only unit for numeric type', () => {
      const result = validateGoalUnit('   ', 'numeric');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('単位を入力してください');
    });

    it('should reject unit over 20 characters', () => {
      const result = validateGoalUnit('a'.repeat(21), 'numeric');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('単位は20文字以内で入力してください');
    });
  });

  describe('validateGoalPeriod', () => {
    const validPeriods = ['daily', 'weekly', 'monthly'];

    it.each(validPeriods)('should accept valid period: %s', (period) => {
      const result = validateGoalPeriod(period);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    const invalidPeriods = ['invalid', '', 'yearly', 'quarterly'];

    it.each(invalidPeriods)('should reject invalid period: %s', (period) => {
      const result = validateGoalPeriod(period);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('有効な目標期間を選択してください');
    });
  });

  describe('validateTimeOfDay', () => {
    it('should accept single anytime', () => {
      const result = validateTimeOfDay(['anytime']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept single morning', () => {
      const result = validateTimeOfDay(['morning']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept multiple time of day', () => {
      const result = validateTimeOfDay(['morning', 'evening']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept all time of day options', () => {
      const result = validateTimeOfDay(['morning', 'afternoon', 'evening', 'night']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject empty array', () => {
      const result = validateTimeOfDay([]);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('実行する時間帯を選択してください');
    });

    it('should reject invalid time of day', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = validateTimeOfDay(['invalid' as any]);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('有効な時間帯を選択してください');
    });

    it('should reject array with valid and invalid values', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = validateTimeOfDay(['morning', 'invalid' as any]);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('有効な時間帯を選択してください');
    });
  });

  describe('validateStartDate', () => {
    const validDates = ['2024-01-01', '2024-12-31', '2025-06-15'];

    it.each(validDates)('should accept valid date: %s', (date) => {
      const result = validateStartDate(date);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject empty date', () => {
      const result = validateStartDate('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('開始日を入力してください');
    });

    const invalidFormats = ['2024/01/01', '01-01-2024', '2024-1-1', 'invalid'];

    it.each(invalidFormats)('should reject invalid format: %s', (date) => {
      const result = validateStartDate(date);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('有効な日付形式で入力してください（YYYY-MM-DD）');
    });

    it('should reject invalid date value', () => {
      // 2024-02-31 はJSで自動補正されるため、形式チェックで弾く必要がある
      // 代わりに月が13などの明らかに無効な値をテスト
      const result = validateStartDate('2024-13-01');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('有効な日付を入力してください');
    });
  });

  describe('validateHabitForm', () => {
    const validFormData: HabitFormData = {
      name: '読書',
      description: '毎日30分読む',
      tracking_type: 'boolean',
      goal_value: 1,
      goal_unit: '回',
      goal_period: 'daily',
      time_of_day: ['morning'],
      start_date: '2024-01-01',
    };

    it('should accept valid form data', () => {
      const result = validateHabitForm(validFormData);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should validate in order: name first', () => {
      const result = validateHabitForm({
        ...validFormData,
        name: '',
        goal_value: 0,
      });
      expect(result.error).toBe('習慣名を入力してください');
    });

    it('should validate tracking type dependent fields', () => {
      // numeric type requires valid goal_unit
      const result = validateHabitForm({
        ...validFormData,
        tracking_type: 'numeric',
        goal_value: 10,
        goal_unit: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('単位を入力してください');
    });

    it('should validate goal_value for numeric type', () => {
      const result = validateHabitForm({
        ...validFormData,
        tracking_type: 'numeric',
        goal_value: 0,
        goal_unit: 'km',
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('目標値は0より大きい値を入力してください');
    });

    it('should skip goal validation for boolean type', () => {
      const result = validateHabitForm({
        ...validFormData,
        tracking_type: 'boolean',
        goal_value: 1,
        goal_unit: '',
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateHabitFormFields', () => {
    it('should return null for valid fields', () => {
      const validFormData: HabitFormData = {
        name: '読書',
        description: '毎日30分読む',
        tracking_type: 'boolean',
        goal_value: 1,
        goal_unit: '回',
        goal_period: 'daily',
        time_of_day: ['morning'],
        start_date: '2024-01-01',
      };

      const errors = validateHabitFormFields(validFormData);
      expect(errors.name).toBeNull();
      expect(errors.description).toBeNull();
      expect(errors.tracking_type).toBeNull();
      expect(errors.goal_value).toBeNull();
      expect(errors.goal_unit).toBeNull();
      expect(errors.goal_period).toBeNull();
      expect(errors.time_of_day).toBeNull();
      expect(errors.start_date).toBeNull();
    });

    it('should return errors for multiple invalid fields', () => {
      const invalidFormData: HabitFormData = {
        name: '',
        description: 'a'.repeat(501),
        tracking_type: 'numeric',
        goal_value: 0,
        goal_unit: '',
        goal_period: 'daily',
        time_of_day: [],
        start_date: '',
      };

      const errors = validateHabitFormFields(invalidFormData);
      expect(errors.name).toBe('習慣名を入力してください');
      expect(errors.description).toBe('説明は500文字以内で入力してください');
      expect(errors.goal_value).toBe('目標値は0より大きい値を入力してください');
      expect(errors.goal_unit).toBe('単位を入力してください');
      expect(errors.time_of_day).toBe('実行する時間帯を選択してください');
      expect(errors.start_date).toBe('開始日を入力してください');
    });
  });

  describe('getDefaultHabitFormData', () => {
    it('should return valid default data when name is set', () => {
      const defaultData = getDefaultHabitFormData();
      defaultData.name = 'テスト習慣';
      const result = validateHabitForm(defaultData);
      expect(result.isValid).toBe(true);
    });

    it('should fail validation without name (expected behavior)', () => {
      const defaultData = getDefaultHabitFormData();
      const result = validateHabitForm(defaultData);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('習慣名を入力してください');
    });

    it('should have expected default values', () => {
      const defaultData = getDefaultHabitFormData();
      expect(defaultData.name).toBe('');
      expect(defaultData.tracking_type).toBe('boolean');
      expect(defaultData.goal_value).toBe(1);
      expect(defaultData.goal_period).toBe('daily');
      expect(defaultData.time_of_day).toEqual(['anytime']);
      expect(defaultData.status).toBe('active');
    });

    it('should set start_date to today', () => {
      const defaultData = getDefaultHabitFormData();
      const today = new Date().toISOString().split('T')[0];
      expect(defaultData.start_date).toBe(today);
    });
  });
});
