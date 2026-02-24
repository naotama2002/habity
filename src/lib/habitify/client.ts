/**
 * Habitify API client
 * Ported from: backend/internal/habitify/client.go
 */

import type { HabitifyHabit, HabitifyLog } from './types';
import {
  HabitifyHabitSchema,
  HabitifyLogSchema,
  HabitifyResponseSchema,
} from './types';

const DEFAULT_BASE_URL = 'https://api.habitify.me';

/**
 * Format a Date to the Habitify date format: YYYY-MM-DDThh:mm:ss±hh:mm
 * Habitify API does not accept "Z" for UTC — it requires ±hh:mm offset.
 */
export function formatHabitifyDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetH = pad(Math.floor(absOffset / 60));
  const offsetM = pad(absOffset % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetH}:${offsetM}`;
}

async function doRequest(
  baseURL: string,
  apiKey: string,
  path: string,
): Promise<Response> {
  return fetch(`${baseURL}${path}`, {
    method: 'GET',
    headers: {
      Authorization: apiKey,
    },
  });
}

/** Fetch all habits from the Habitify API. */
export async function getHabits(
  apiKey: string,
  baseURL = DEFAULT_BASE_URL,
): Promise<HabitifyHabit[]> {
  const resp = await doRequest(baseURL, apiKey, '/habits');

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`get habits: status ${resp.status}: ${body}`);
  }

  const json: unknown = await resp.json();
  const result = HabitifyResponseSchema(
    HabitifyHabitSchema.array().nullable(),
  ).parse(json);

  if (!result.status) {
    throw new Error(`get habits: API returned error: ${result.message}`);
  }

  return result.data ?? [];
}

/** Fetch logs for a specific habit within a date range. */
export async function getLogs(
  apiKey: string,
  habitId: string,
  from: Date,
  to: Date,
  baseURL = DEFAULT_BASE_URL,
): Promise<HabitifyLog[]> {
  const params = new URLSearchParams({
    from: formatHabitifyDate(from),
    to: formatHabitifyDate(to),
  });
  const path = `/logs/${habitId}?${params.toString()}`;

  const resp = await doRequest(baseURL, apiKey, path);

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(
      `get logs for habit ${habitId}: status ${resp.status}: ${body}`,
    );
  }

  const json: unknown = await resp.json();
  const result = HabitifyResponseSchema(
    HabitifyLogSchema.array().nullable(),
  ).parse(json);

  if (!result.status) {
    throw new Error(
      `get logs for habit ${habitId}: API returned error: ${result.message}`,
    );
  }

  return result.data ?? [];
}

/** Validate an API key by calling getHabits. */
export async function validate(
  apiKey: string,
  baseURL = DEFAULT_BASE_URL,
): Promise<void> {
  await getHabits(apiKey, baseURL);
}
