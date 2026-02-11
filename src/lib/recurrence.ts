/**
 * RRULE ユーティリティ
 * RFC 5545 RRULE の生成・パース・日付マッチング
 */

import {RRule, Weekday} from 'rrule';

export type RecurrenceType = 'weekly' | 'monthly' | 'interval';

export interface RecurrenceParams {
  weekdays?: number[]; // 0=Mon, 1=Tue, ... 6=Sun
  monthdays?: number[]; // 1-31
  interval?: number; // 1以上の整数
}

export interface ParsedRecurrence {
  type: RecurrenceType;
  weekdays: number[];
  monthdays: number[];
  interval: number;
}

// rrule.js の Weekday マッピング (0=Mon ... 6=Sun)
const WEEKDAY_MAP: Weekday[] = [
  RRule.MO,
  RRule.TU,
  RRule.WE,
  RRule.TH,
  RRule.FR,
  RRule.SA,
  RRule.SU,
];

// rrule.js の weekday → 0-6 インデックス変換テーブル
const WEEKDAY_TO_INDEX: Record<number, number> = {
  0: 0, // MO
  1: 1, // TU
  2: 2, // WE
  3: 3, // TH
  4: 4, // FR
  5: 5, // SA
  6: 6, // SU
};

/**
 * UI の選択状態を RRULE 文字列に変換
 */
export function buildRRule(
  type: RecurrenceType,
  params: RecurrenceParams,
): string {
  switch (type) {
    case 'weekly': {
      const days = (params.weekdays ?? []).map(d => WEEKDAY_MAP[d]);
      const rule = new RRule({
        freq: RRule.WEEKLY,
        byweekday: days,
      });
      return rule.toString();
    }
    case 'monthly': {
      const rule = new RRule({
        freq: RRule.MONTHLY,
        bymonthday: params.monthdays ?? [],
      });
      return rule.toString();
    }
    case 'interval': {
      const rule = new RRule({
        freq: RRule.DAILY,
        interval: params.interval ?? 1,
      });
      return rule.toString();
    }
  }
}

/**
 * RRULE 文字列を UI の選択状態にパース
 * Habitify 形式（DTSTART 付き）にも対応
 */
export function parseRRule(rruleStr: string): ParsedRecurrence {
  // 複数行の場合、RRULE: 行のみを取得
  const lines = rruleStr.split('\n');
  let ruleLine = rruleStr;
  for (const line of lines) {
    if (line.startsWith('RRULE:')) {
      ruleLine = line;
      break;
    }
  }

  const rule = RRule.fromString(ruleLine);
  const options = rule.options;

  if (options.freq === RRule.WEEKLY) {
    const weekdays = (options.byweekday ?? []).map(
      (d: number) => WEEKDAY_TO_INDEX[d] ?? d,
    );
    return {
      type: 'weekly',
      weekdays: weekdays.sort((a: number, b: number) => a - b),
      monthdays: [],
      interval: 1,
    };
  }

  if (options.freq === RRule.MONTHLY) {
    return {
      type: 'monthly',
      weekdays: [],
      monthdays: [...(options.bymonthday ?? [])].sort(
        (a: number, b: number) => a - b,
      ),
      interval: 1,
    };
  }

  // FREQ=DAILY → interval タイプ
  return {
    type: 'interval',
    weekdays: [],
    monthdays: [],
    interval: options.interval ?? 1,
  };
}

/**
 * 指定日が繰り返しルールに該当するか判定
 */
export function isDateMatchingRRule(
  rruleStr: string,
  date: Date,
  startDate?: Date,
): boolean {
  // 複数行の場合、RRULE: 行のみを取得
  const lines = rruleStr.split('\n');
  let ruleLine = rruleStr;
  for (const line of lines) {
    if (line.startsWith('RRULE:')) {
      ruleLine = line;
      break;
    }
  }

  const rule = RRule.fromString(ruleLine);
  const options = rule.options;

  // 日付を UTC 正午に正規化（タイムゾーン問題回避）
  const targetYear = date.getFullYear();
  const targetMonth = date.getMonth();
  const targetDay = date.getDate();

  if (options.freq === RRule.WEEKLY) {
    // 曜日チェック: JS Date.getDay() は 0=Sun, 1=Mon, ... 6=Sat
    // rrule の byweekday は 0=MO, 1=TU, ... 6=SU
    const jsDay = date.getDay(); // 0=Sun
    const rruleDay = jsDay === 0 ? 6 : jsDay - 1; // → 0=Mon ... 6=Sun
    return (options.byweekday ?? []).includes(rruleDay);
  }

  if (options.freq === RRule.MONTHLY) {
    return (options.bymonthday ?? []).includes(targetDay);
  }

  // FREQ=DAILY with INTERVAL
  const interval = options.interval ?? 1;
  if (interval === 1) return true;

  // interval > 1: startDate からの日数で判定
  const start = startDate ?? new Date(2024, 0, 1); // デフォルト基準日
  const startNorm = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const targetNorm = new Date(targetYear, targetMonth, targetDay);
  const diffMs = targetNorm.getTime() - startNorm.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return false;
  return diffDays % interval === 0;
}

/**
 * 繰り返しルールの表示テキスト生成
 */
export function getRecurrenceLabel(rruleStr: string): string {
  const parsed = parseRRule(rruleStr);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  switch (parsed.type) {
    case 'weekly': {
      const days = parsed.weekdays.map(d => dayNames[d]);
      return `Weekly ${days.join(',')}`;
    }
    case 'monthly': {
      const days = parsed.monthdays.join(',');
      return `Monthly ${days}`;
    }
    case 'interval': {
      if (parsed.interval === 1) return 'Every day';
      return `Every ${parsed.interval} days`;
    }
  }
}
