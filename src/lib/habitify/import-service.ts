/**
 * Habitify → Habity import service
 *
 * Uses batch upsert to minimize API requests to Supabase.
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

/** Max rows per upsert request to stay within Supabase payload limits. */
const BATCH_SIZE = 500;

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

  // 4. Import logs (batch upsert per habit, chunked)
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

      // Transform all logs for this habit
      const rows: HabityLogRow[] = [];
      for (const l of logs) {
        try {
          rows.push(transformLog(l, habityHabitId, userId, timezone));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          result.errors.push(`log ${l.id}: ${msg}`);
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

  // Collect unique areas
  const areas: { id: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const h of habits) {
    if (!h.area || seen.has(h.area.id)) {
      continue;
    }
    seen.add(h.area.id);
    areas.push(h.area);
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
  goal_value: number;
  goal_unit: string;
  goal_period: string;
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
  external_id: string;
}
