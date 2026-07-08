import { supabase } from './supabase';
import { runImport } from './habitify/import-service';

export interface ImportHabitifyParams {
  api_key: string;
  import_habits: boolean;
  import_logs: boolean;
}

export interface ImportHabitifyResult {
  status: string;
  habits_imported: number;
  logs_imported: number;
  errors?: string[];
}

export async function importFromHabitify(
  params: ImportHabitifyParams,
): Promise<ImportHabitifyResult> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const result = await runImport({
    apiKey: params.api_key,
    importHabits: params.import_habits,
    importLogs: params.import_logs,
    userId,
    supabase,
  });

  return {
    status: 'completed',
    habits_imported: result.habits_imported,
    logs_imported: result.logs_imported,
    errors: result.errors.length > 0 ? result.errors : undefined,
  };
}
