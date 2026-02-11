import type {LogStatus} from '@/types/database';

/**
 * ログステータスがスキップかどうかを判定
 */
export function isSkippedLog(status: LogStatus | null | undefined): boolean {
  return status === 'skipped';
}

/**
 * ログステータスが完了かどうかを判定
 */
export function isCompletedLog(status: LogStatus | null | undefined): boolean {
  return status === 'completed';
}
