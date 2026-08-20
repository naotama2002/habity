/**
 * Habitify v2 → Habity import service
 *
 * Uses batch upsert to minimize API requests to Supabase.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { HabitifyHabit } from './types';
import { getHabits, getStatistics, formatDate } from './client';
import { transformHabit, transformDailyProgress } from './transform';

export interface ImportParams {
  apiKey: string;
  importHabits: boolean;
  importLogs: boolean;
  userId: string;
  supabase: SupabaseClient;
}

export interface ImportResult {
  habits_imported: number;
  logs_imported: number;
  errors: string[];
}

/** Max rows per upsert request to stay within Supabase payload limits. */
const BATCH_SIZE = 500;

/** Run the full Habitify v2 → Habity import. */
export async function runImport(params: ImportParams): Promise<ImportResult> {
  const { apiKey, importHabits, importLogs, userId, supabase } = params;

  const result: ImportResult = {
    habits_imported: 0,
    logs_imported: 0,
    errors: [],
  };

  // 1. Fetch habits (also validates API key)
  let habits: HabitifyHabit[];
  try {
    const fetched = await getHabits(apiKey);
    habits = fetched.habits;
    result.errors.push(...fetched.errors);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`Habitify API: ${msg}`);
    return result;
  }

  if (!importHabits && !importLogs) {
    return result;
  }

  // 2. Extract areas → create categories. A failure here shouldn't block
  // habit/log import — fall back to no categorization and keep going.
  let categoryMap: Record<string, string> = {};
  try {
    categoryMap = await ensureCategories(supabase, userId, habits);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`categories: ${msg}`);
  }

  // 3. Import habits (batch upsert)
  const habitIdMap = new Map<string, string>(); // habitify ID → habity ID

  if (importHabits) {
    const rows: HabityHabitRow[] = [];
    for (const h of habits) {
      try {
        rows.push(transformHabit(h, userId, categoryMap));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push(`habit "${h.name}": ${msg}`);
      }
    }

    if (rows.length > 0) {
      const { data, error } = await supabase
        .from('habits')
        .upsert(rows, { onConflict: 'user_id,external_id' })
        .select('id, external_id');

      if (error) {
        result.errors.push(`habits upsert: ${error.message}`);
      } else if (data) {
        result.habits_imported = data.length;
        for (const row of data) {
          habitIdMap.set(row.external_id, row.id);
        }
      }
    }
  } else {
    // If not importing habits, still need to build the ID map for logs
    const { data } = await supabase
      .from('habits')
      .select('id, external_id')
      .eq('user_id', userId)
      .eq('external_source', 'habitify');

    if (data) {
      for (const row of data) {
        if (row.external_id) {
          habitIdMap.set(row.external_id, row.id);
        }
      }
    }
  }

  // 4. Import logs via statistics endpoint (batch upsert per habit, chunked)
  if (importLogs) {
    for (const h of habits) {
      const habityHabitId = habitIdMap.get(h.id);
      if (!habityHabitId) {
        continue;
      }

      let stats;
      try {
        const endDate = formatDate(new Date());
        stats = await getStatistics(apiKey, h.id, h.startDate, endDate);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push(`statistics for "${h.name}": ${msg}`);
        continue;
      }

      // Transform dailyProgress entries
      const rows: HabityLogRow[] = [];
      for (const dp of stats.dailyProgress) {
        try {
          const log = transformDailyProgress(dp, habityHabitId, userId);
          if (log) {
            rows.push(log);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          result.errors.push(`log ${dp.date}: ${msg}`);
        }
      }

      // Batch upsert in chunks
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const chunk = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('habit_logs')
          .upsert(chunk, {
            onConflict: 'habit_id,target_date',
            ignoreDuplicates: true,
          });

        if (error) {
          result.errors.push(`logs for "${h.name}" (batch): ${error.message}`);
        } else {
          result.logs_imported += chunk.length;
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

  // Collect unique areas (use first area from each habit)
  const areas: { id: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const h of habits) {
    if (h.areas.length === 0) continue;
    const area = h.areas[0];
    if (seen.has(area.id)) continue;
    seen.add(area.id);
    areas.push({ id: area.id, name: area.name });
  }

  if (areas.length === 0) {
    return categoryMap;
  }

  // Batch upsert all categories
  const rows = areas.map((a) => ({
    user_id: userId,
    name: a.name,
    color: '#6366f1',
    sort_order: 0,
  }));

  const { data, error } = await supabase
    .from('categories')
    .upsert(rows, { onConflict: 'user_id,name' })
    .select('id, name');

  if (error) {
    throw new Error(`insert categories: ${error.message}`);
  }

  if (data) {
    // Build name → id map, then map area.id → category.id
    const nameToId: Record<string, string> = {};
    for (const row of data) {
      nameToId[row.name] = row.id;
    }
    for (const a of areas) {
      const id = nameToId[a.name];
      if (id) {
        categoryMap[a.id] = id;
      }
    }
  }

  return categoryMap;
}

interface HabityHabitRow {
  user_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  tracking_type: string;
  goal_value: number | null;
  goal_unit: string | null;
  goal_period: string | null;
  recurrence_rule: string | null;
  time_of_day: string[];
  reminder_enabled: boolean;
  start_date: string;
  end_date: string | null;
  status: string;
  sort_order: number;
  external_id: string;
  external_source: string;
}

interface HabityLogRow {
  user_id: string;
  habit_id: string;
  value: number;
  target_date: string;
  completed_at: string;
  status: string;
  external_id: string | null;
}
