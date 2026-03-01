import { describe, expect, it } from '@jest/globals';
import {
  validateHabitName,
  validateDescription,
  validateRecurrence,
  validateTimeOfDay,
  validateStartDate,
  validateEndDate,
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

  describe('validateRecurrence', () => {
    describe('weekly', () => {
      it('should accept valid weekdays', () => {
        const result = validateRecurrence('weekly', [0, 2, 4], [], 1);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });

      it('should accept single weekday', () => {
        const result = validateRecurrence('weekly', [3], [], 1);
        expect(result.isValid).toBe(true);
      });

      it('should reject empty weekdays', () => {
        const result = validateRecurrence('weekly', [], [], 1);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('曜日を1つ以上選択してください');
      });
    });

    describe('monthly', () => {
      it('should accept valid monthdays', () => {
        const result = validateRecurrence('monthly', [], [1, 15], 1);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });

      it('should accept single monthday', () => {
        const result = validateRecurrence('monthly', [], [28], 1);
        expect(result.isValid).toBe(true);
      });

      it('should reject empty monthdays', () => {
        const result = validateRecurrence('monthly', [], [], 1);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('日付を1つ以上選択してください');
      });
    });

    describe('interval', () => {
      it('should accept valid interval', () => {
        const result = validateRecurrence('interval', [], [], 3);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });

      it('should accept interval of 1 (every day)', () => {
        const result = validateRecurrence('interval', [], [], 1);
        expect(result.isValid).toBe(true);
      });

      it('should reject interval of 0', () => {
        const result = validateRecurrence('interval', [], [], 0);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('間隔は1以上の整数を入力してください');
      });

      it('should reject negative interval', () => {
        const result = validateRecurrence('interval', [], [], -1);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('間隔は1以上の整数を入力してください');
      });

      it('should reject non-integer interval', () => {
        const result = validateRecurrence('interval', [], [], 1.5);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('間隔は1以上の整数を入力してください');
      });
    });

    it('should reject invalid type', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = validateRecurrence('invalid' as any, [], [], 1);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('有効な繰り返しタイプを選択してください');
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
      const result = validateStartDate('2024-13-01');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('有効な日付を入力してください');
    });

    it.each(['2024-02-31', '2024-04-31', '2024-06-31'])(
      'should reject rollover date: %s',
      (date) => {
        const result = validateStartDate(date);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('有効な日付を入力してください');
      },
    );
  });

  describe('validateEndDate', () => {
    const startDate = '2024-01-15';

    it('should accept null (indefinite habit)', () => {
      const result = validateEndDate(null, startDate);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept undefined (indefinite habit)', () => {
      const result = validateEndDate(undefined, startDate);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept empty string (indefinite habit)', () => {
      const result = validateEndDate('', startDate);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept end_date equal to start_date', () => {
      const result = validateEndDate('2024-01-15', startDate);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept end_date after start_date', () => {
      const result = validateEndDate('2024-06-30', startDate);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject end_date before start_date', () => {
      const result = validateEndDate('2024-01-01', startDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('終了日は開始日以降の日付を指定してください');
    });

    const invalidFormats = ['2024/01/01', '01-01-2024', '2024-1-1', 'invalid'];

    it.each(invalidFormats)('should reject invalid format: %s', (date) => {
      const result = validateEndDate(date, startDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('有効な日付形式で入力してください（YYYY-MM-DD）');
    });

    it('should reject invalid date value', () => {
      const result = validateEndDate('2024-13-01', startDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('有効な日付を入力してください');
    });

    it.each(['2024-02-31', '2024-04-31', '2024-06-31'])(
      'should reject rollover date: %s',
      (date) => {
        const result = validateEndDate(date, '2024-01-01');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('有効な日付を入力してください');
      },
    );
  });

  describe('validateHabitForm', () => {
    const validFormData: HabitFormData = {
      name: '読書',
      description: '毎日30分読む',
      recurrence_type: 'interval',
      recurrence_weekdays: [],
      recurrence_monthdays: [],
      recurrence_interval: 1,
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
      });
      expect(result.error).toBe('習慣名を入力してください');
    });

    it('should validate recurrence for weekly with no days', () => {
      const result = validateHabitForm({
        ...validFormData,
        recurrence_type: 'weekly',
        recurrence_weekdays: [],
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('曜日を1つ以上選択してください');
    });

    it('should accept weekly with weekdays selected', () => {
      const result = validateHabitForm({
        ...validFormData,
        recurrence_type: 'weekly',
        recurrence_weekdays: [0, 2, 4],
      });
      expect(result.isValid).toBe(true);
    });

    it('should validate recurrence for monthly with no days', () => {
      const result = validateHabitForm({
        ...validFormData,
        recurrence_type: 'monthly',
        recurrence_monthdays: [],
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('日付を1つ以上選択してください');
    });

    it('should accept form with valid end_date', () => {
      const result = validateHabitForm({
        ...validFormData,
        end_date: '2024-12-31',
      });
      expect(result.isValid).toBe(true);
    });

    it('should accept form with null end_date', () => {
      const result = validateHabitForm({
        ...validFormData,
        end_date: null,
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject form with end_date before start_date', () => {
      const result = validateHabitForm({
        ...validFormData,
        start_date: '2024-06-01',
        end_date: '2024-01-01',
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('終了日は開始日以降の日付を指定してください');
    });
  });

  describe('validateHabitFormFields', () => {
    it('should return null for valid fields', () => {
      const validFormData: HabitFormData = {
        name: '読書',
        description: '毎日30分読む',
        recurrence_type: 'interval',
        recurrence_weekdays: [],
        recurrence_monthdays: [],
        recurrence_interval: 1,
        time_of_day: ['morning'],
        start_date: '2024-01-01',
      };

      const errors = validateHabitFormFields(validFormData);
      expect(errors.name).toBeNull();
      expect(errors.description).toBeNull();
      expect(errors.recurrence).toBeNull();
      expect(errors.time_of_day).toBeNull();
      expect(errors.start_date).toBeNull();
      expect(errors.end_date).toBeNull();
    });

    it('should return errors for multiple invalid fields', () => {
      const invalidFormData: HabitFormData = {
        name: '',
        description: 'a'.repeat(501),
        recurrence_type: 'weekly',
        recurrence_weekdays: [],
        recurrence_monthdays: [],
        recurrence_interval: 1,
        time_of_day: [],
        start_date: '',
      };

      const errors = validateHabitFormFields(invalidFormData);
      expect(errors.name).toBe('習慣名を入力してください');
      expect(errors.description).toBe('説明は500文字以内で入力してください');
      expect(errors.recurrence).toBe('曜日を1つ以上選択してください');
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
      expect(defaultData.recurrence_type).toBe('interval');
      expect(defaultData.recurrence_weekdays).toEqual([]);
      expect(defaultData.recurrence_monthdays).toEqual([]);
      expect(defaultData.recurrence_interval).toBe(1);
      expect(defaultData.time_of_day).toEqual(['anytime']);
      expect(defaultData.end_date).toBeNull();
      expect(defaultData.status).toBe('active');
    });

    it('should set start_date to today', () => {
      const defaultData = getDefaultHabitFormData();
      const today = new Date().toISOString().split('T')[0];
      expect(defaultData.start_date).toBe(today);
    });
  });
});
