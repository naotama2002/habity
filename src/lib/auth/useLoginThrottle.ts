import { useState, useCallback, useRef, useEffect } from 'react';

const MAX_FAILURES = 5;
const LOCKOUT_SECONDS = 60;

export interface LoginThrottleState {
  isLocked: boolean;
  remainingSeconds: number;
  /** Record a login failure. Returns true if the account is now locked. */
  recordFailure: () => boolean;
  /** Reset failure count and unlock immediately. */
  reset: () => void;
}

export function useLoginThrottle(): LoginThrottleState {
  const [failureCount, setFailureCount] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLocked = remainingSeconds > 0;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startLockout = useCallback(() => {
    clearTimer();
    setRemainingSeconds(LOCKOUT_SECONDS);

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearTimer();
          setFailureCount(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const recordFailure = useCallback((): boolean => {
    const next = failureCount + 1;
    setFailureCount(next);

    if (next >= MAX_FAILURES) {
      startLockout();
      return true;
    }
    return false;
  }, [failureCount, startLockout]);

  const reset = useCallback(() => {
    clearTimer();
    setFailureCount(0);
    setRemainingSeconds(0);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return { isLocked, remainingSeconds, recordFailure, reset };
}
