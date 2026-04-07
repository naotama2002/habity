/**
 * Habitify API v2 client
 * API docs: https://api-docs.habitify.me/api#description/introduction
 */

import type { HabitifyHabit, HabitifyStatistics } from './types';
import {
  HabitifyHabitSchema,
  HabitifyStatisticsSchema,
  HabitifyV2ResponseSchema,
} from './types';

const DEFAULT_BASE_URL = 'https://api.habitify.me/v2';

/** Max items per page for the habits list endpoint. */
const PAGE_LIMIT = 100;

/**
 * Format a Date to YYYY-MM-DD (the only date format v2 uses).
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function doRequest(
  baseURL: string,
  apiKey: string,
  path: string,
): Promise<Response> {
  return fetch(`${baseURL}${path}`, {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
    },
  });
}

/**
 * Fetch all habits from the Habitify API v2 (paginated).
 * Fetches both active and archived habits.
 */
export async function getHabits(
  apiKey: string,
  baseURL = DEFAULT_BASE_URL,
): Promise<HabitifyHabit[]> {
  const allHabits: HabitifyHabit[] = [];

  for (const archived of [false, true]) {
    let offset = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const params = new URLSearchParams({
        limit: String(PAGE_LIMIT),
        offset: String(offset),
        archived: String(archived),
      });
      const resp = await doRequest(baseURL, apiKey, `/habits?${params}`);

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`get habits: status ${resp.status}: ${body}`);
      }

      const json: unknown = await resp.json();
      const result = HabitifyV2ResponseSchema(
        HabitifyHabitSchema.array(),
      ).parse(json);

      allHabits.push(...result.data);

      // Check if there are more pages
      if (!result.pagination || offset + PAGE_LIMIT >= result.pagination.total) {
        break;
      }
      offset += PAGE_LIMIT;
    }
  }

  return allHabits;
}

/**
 * Fetch statistics (including dailyProgress) for a specific habit.
 */
export async function getStatistics(
  apiKey: string,
  habitId: string,
  startDate?: string,
  endDate?: string,
  baseURL = DEFAULT_BASE_URL,
): Promise<HabitifyStatistics> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const query = params.toString();
  const path = `/habits/${habitId}/statistics${query ? `?${query}` : ''}`;

  const resp = await doRequest(baseURL, apiKey, path);

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(
      `get statistics for habit ${habitId}: status ${resp.status}: ${body}`,
    );
  }

  const json: unknown = await resp.json();
  const result = HabitifyV2ResponseSchema(HabitifyStatisticsSchema).parse(json);

  return result.data;
}

/** Validate an API key by calling getHabits. */
export async function validate(
  apiKey: string,
  baseURL = DEFAULT_BASE_URL,
): Promise<void> {
  await getHabits(apiKey, baseURL);
}
