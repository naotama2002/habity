/**
 * Habitify → Habity import service
 * Ported from: backend/internal/service/import.go
 *
 * Uses Supabase Client SDK instead of raw SQL.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { HabitifyHabit } from './types';
import { getHabits, getLogs } from './client';
import { transformHabit, transformLog } from './transform';

export interface ImportParams {
  apiKey: string;
  importHabits: boolean;
  importLogs: boolean;
  timezone: string;
  userId: string;
  supabase: SupabaseClient;
}

export interface ImportResult {
  habits_imported: number;
  logs_imported: number;
  errors: string[];
}

/** Run the full Habitify → Habity import. */
export async function runImport(params: ImportParams): Promise<ImportResult> {
  const { apiKey, importHabits, importLogs, timezone, userId, supabase } =
    params;

  // 1. Fetch habits (also validates API key)
  const habits = await getHabits(apiKey);

  const result: ImportResult = {
    habits_imported: 0,
    logs_imported: 0,
    errors: [],
  };

  if (!importHabits && !importLogs) {
    return result;
  }

  // 2. Extract areas → create categories
  const categoryMap = await ensureCategories(supabase, userId, habits);

  // 3. Import habits
  const habitIdMap = new Map<string, string>(); // habitify ID → habity ID

  if (importHabits) {
    for (const h of habits) {
      try {
        const habityHabit = transformHabit(h, userId, categoryMap);
        const habityId = await upsertHabit(supabase, habityHabit);
        habitIdMap.set(h.id, habityId);
        result.habits_imported++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push(`habit "${h.name}": ${msg}`);
      }
    }
  } else {
    // If not importing habits, still need to build the ID map for logs
    for (const h of habits) {
      const habityId = await findHabitByExternalId(supabase, userId, h.id);
      if (habityId) {
        habitIdMap.set(h.id, habityId);
      }
    }
  }

  // 4. Import logs
  if (importLogs) {
    for (const h of habits) {
      const habityHabitId = habitIdMap.get(h.id);
      if (!habityHabitId) {
        continue;
      }

      const from = h.start_date
        ? new Date(h.start_date)
        : new Date('2020-01-01T00:00:00Z');
      const to = new Date();

      let logs;
      try {
        logs = await getLogs(apiKey, h.id, from, to);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push(`logs for "${h.name}": ${msg}`);
        continue;
      }

      for (const l of logs) {
        try {
          const habityLog = transformLog(l, habityHabitId, userId, timezone);
          await upsertLog(supabase, habityLog);
          result.logs_imported++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          result.errors.push(`log ${l.id}: ${msg}`);
        }
      }
    }
  }

  return result;
}

// ─── DB operations ─────────────────────────────────────

async function ensureCategories(
  supabase: SupabaseClient,
  userId: string,
  habits: HabitifyHabit[],
): Promise<Record<string, string>> {
  const categoryMap: Record<string, string> = {};
  const seen = new Set<string>();

  for (const h of habits) {
    if (!h.area || seen.has(h.area.id)) {
      continue;
    }
    seen.add(h.area.id);

    const { data, error } = await supabase
      .from('categories')
      .upsert(
        {
          user_id: userId,
          name: h.area.name,
          color: '#6366f1',
          sort_order: 0,
        },
        { onConflict: 'user_id,name' },
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`insert category "${h.area.name}": ${error.message}`);
    }

    categoryMap[h.area.id] = data.id;
  }

  return categoryMap;
}

interface HabityHabitRow {
  user_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  tracking_type: string;
  goal_value: number;
  goal_unit: string;
  goal_period: string;
  recurrence_rule: string | null;
  time_of_day: string[];
  reminder_enabled: boolean;
  start_date: string;
  status: string;
  sort_order: number;
  external_id: string;
  external_source: string;
}

async function upsertHabit(
  supabase: SupabaseClient,
  h: HabityHabitRow,
): Promise<string> {
  const { data, error } = await supabase
    .from('habits')
    .upsert(h, { onConflict: 'user_id,external_id' })
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id;
}

interface HabityLogRow {
  user_id: string;
  habit_id: string;
  value: number;
  target_date: string;
  completed_at: string;
  status: string;
  external_id: string;
}

async function upsertLog(
  supabase: SupabaseClient,
  l: HabityLogRow,
): Promise<void> {
  const { error } = await supabase
    .from('habit_logs')
    .upsert(l, {
      onConflict: 'habit_id,target_date',
      ignoreDuplicates: true,
    });

  if (error) {
    throw new Error(error.message);
  }
}

async function findHabitByExternalId(
  supabase: SupabaseClient,
  userId: string,
  externalId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', userId)
    .eq('external_id', externalId)
    .eq('external_source', 'habitify')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id;
}
