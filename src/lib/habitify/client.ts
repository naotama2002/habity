/**
 * Habitify API v2 client
 * API docs: https://api-docs.habitify.me/api#description/introduction
 */

import type { HabitifyHabit, HabitifyStatistics } from './types';
import {
  HabitifyHabitSchema,
  HabitifyHabitsEnvelopeSchema,
  HabitifyStatisticsSchema,
  HabitifyV2ResponseSchema,
} from './types';

const DEFAULT_BASE_URL = 'https://api.habitify.me/v2';

/** Max items per page for the habits list endpoint. */
const PAGE_LIMIT = 100;

/** Max number of retries for 429/5xx responses (in addition to the initial attempt). */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff between retries, in milliseconds. */
const RETRY_BASE_DELAY_MS = 500;

/**
 * Format a Date to YYYY-MM-DD (the only date format v2 uses).
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Injectable backoff delay, overridable in tests to avoid real waits. */
let retrySleep: (ms: number) => Promise<void> = defaultSleep;

/** Test-only hook: override the retry backoff delay implementation. */
export function __setRetrySleepForTesting(fn: (ms: number) => Promise<void>): void {
  retrySleep = fn;
}

/**
 * Issue a GET request, retrying on 429/5xx responses with exponential
 * backoff (respecting a `Retry-After` header in seconds, when present).
 * Non-retryable errors (other 4xx) are returned immediately for the caller
 * to handle.
 */
async function doRequest(
  baseURL: string,
  apiKey: string,
  path: string,
): Promise<Response> {
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const resp = await fetch(`${baseURL}${path}`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (resp.ok || !isRetryableStatus(resp.status) || attempt >= MAX_RETRIES) {
      return resp;
    }

    const retryAfterHeader = resp.headers?.get?.('Retry-After');
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    const delayMs = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : RETRY_BASE_DELAY_MS * 2 ** attempt;

    await retrySleep(delayMs);
    attempt += 1;
  }
}

/** Result of {@link getHabits}: successfully parsed habits plus any per-item errors. */
export interface GetHabitsResult {
  habits: HabitifyHabit[];
  errors: string[];
}

/**
 * Fetch all habits from the Habitify API v2 (paginated).
 * Fetches both active and archived habits.
 *
 * Each habit is parsed individually — a single malformed habit is skipped
 * (and recorded in `errors`) instead of failing the entire import.
 */
export async function getHabits(
  apiKey: string,
  baseURL = DEFAULT_BASE_URL,
): Promise<GetHabitsResult> {
  const allHabits: HabitifyHabit[] = [];
  const errors: string[] = [];

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
      const envelope = HabitifyHabitsEnvelopeSchema.parse(json);
      const rawHabits = envelope.data ?? [];

      rawHabits.forEach((rawHabit, index) => {
        const parsed = HabitifyHabitSchema.safeParse(rawHabit);
        if (parsed.success) {
          allHabits.push(parsed.data);
        } else {
          const name =
            typeof rawHabit === 'object' && rawHabit !== null && 'name' in rawHabit
              ? String((rawHabit as { name?: unknown }).name)
              : `index ${offset + index}`;
          errors.push(`habit "${name}": ${parsed.error.message}`);
        }
      });

      // Check if there are more pages
      if (!envelope.pagination || offset + PAGE_LIMIT >= envelope.pagination.total) {
        break;
      }
      offset += PAGE_LIMIT;
    }
  }

  return { habits: allHabits, errors };
}

/**
 * Fetch statistics (including dailyProgress) for a specific habit.
 * Follows pagination (when present) and merges `dailyProgress` across pages.
 */
export async function getStatistics(
  apiKey: string,
  habitId: string,
  startDate?: string,
  endDate?: string,
  baseURL = DEFAULT_BASE_URL,
): Promise<HabitifyStatistics> {
  let offset = 0;
  let merged: HabitifyStatistics | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (offset > 0) params.set('offset', String(offset));

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

    merged = merged
      ? { ...result.data, dailyProgress: [...merged.dailyProgress, ...result.data.dailyProgress] }
      : result.data;

    const { pagination } = result;
    if (!pagination || offset + pagination.limit >= pagination.total) {
      break;
    }
    offset += pagination.limit;
  }

  return merged;
}

/** Validate an API key by calling getHabits. */
export async function validate(
  apiKey: string,
  baseURL = DEFAULT_BASE_URL,
): Promise<void> {
  await getHabits(apiKey, baseURL);
}
