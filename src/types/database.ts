// ===========================================
// Database Types
// ===========================================

export type TrackingType = 'boolean' | 'numeric' | 'duration';
export type HabitStatus = 'active' | 'paused' | 'archived';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly';
export type TimeOfDay = 'anytime' | 'morning' | 'afternoon' | 'evening' | 'night';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  tracking_type: TrackingType;
  goal_value: number;
  goal_unit: string;
  goal_period: GoalPeriod;
  recurrence_rule: string | null;
  time_of_day: TimeOfDay[];
  reminder_times: string[] | null;
  reminder_enabled: boolean;
  start_date: string;
  status: HabitStatus;
  sort_order: number;
  external_id: string | null;
  external_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  value: number;
  note: string | null;
  completed_at: string;
  target_date: string;
  external_id: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  locale: string;
  timezone: string;
  week_start: number;
  notifications_enabled: boolean;
  daily_reminder_time: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

// ===========================================
// Extended Types (Views)
// ===========================================

export interface HabitWithTodayLog extends Habit {
  log_id: string | null;
  log_value: number | null;
  log_completed_at: string | null;
  log_note: string | null;
  is_completed_today: boolean;
}

export interface HabitStats {
  total_days: number;
  completed_days: number;
  completion_rate: number;
  current_streak: number;
  longest_streak: number;
}

// ===========================================
// Input Types (for mutations)
// ===========================================

export type CreateHabitInput = Omit<
  Habit,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'external_id' | 'external_source'
>;

export type UpdateHabitInput = Partial<CreateHabitInput>;

export type CreateCategoryInput = Omit<
  Category,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export type CreateHabitLogInput = {
  habit_id: string;
  value: number;
  note?: string | null;
  target_date: string;
  completed_at?: string;
};
