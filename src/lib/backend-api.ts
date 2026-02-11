import Constants from 'expo-constants';
import { supabase } from './supabase';

const BACKEND_URL =
  Constants.expoConfig?.extra?.backendUrl || 'http://localhost:8080';

export interface ImportHabitifyParams {
  api_key: string;
  import_habits: boolean;
  import_logs: boolean;
  timezone: string;
}

export interface ImportHabitifyResult {
  status: string;
  habits_imported: number;
  logs_imported: number;
  errors?: string[];
}

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Not authenticated');
  }
  return token;
}

export async function importFromHabitify(
  params: ImportHabitifyParams,
): Promise<ImportHabitifyResult> {
  const token = await getAuthToken();

  const res = await fetch(`${BACKEND_URL}/api/v1/import/habitify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Import failed with status ${res.status}`);
  }

  return res.json();
}
