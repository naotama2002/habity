import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';
import { useLoginThrottle } from '../useLoginThrottle';

describe('useLoginThrottle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start with unlocked state', async () => {
    const { result } = await renderHook(() => useLoginThrottle());

    expect(result.current.isLocked).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('should stay unlocked after 4 failures', async () => {
    const { result } = await renderHook(() => useLoginThrottle());

    for (let i = 0; i < 4; i++) {
      await act(() => {
        result.current.recordFailure();
      });
    }

    expect(result.current.isLocked).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('should lock after 5 failures', async () => {
    const { result } = await renderHook(() => useLoginThrottle());

    for (let i = 0; i < 5; i++) {
      await act(() => {
        result.current.recordFailure();
      });
    }

    expect(result.current.isLocked).toBe(true);
    expect(result.current.remainingSeconds).toBe(60);
  });

  it('should return true from recordFailure when locking', async () => {
    const { result } = await renderHook(() => useLoginThrottle());

    let locked = false;
    for (let i = 0; i < 4; i++) {
      await act(() => {
        locked = result.current.recordFailure();
      });
      expect(locked).toBe(false);
    }

    await act(() => {
      locked = result.current.recordFailure();
    });
    expect(locked).toBe(true);
  });

  it('should count down remaining seconds', async () => {
    const { result } = await renderHook(() => useLoginThrottle());

    for (let i = 0; i < 5; i++) {
      await act(() => {
        result.current.recordFailure();
      });
    }

    expect(result.current.remainingSeconds).toBe(60);

    await act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(result.current.remainingSeconds).toBe(50);
    expect(result.current.isLocked).toBe(true);
  });

  it('should unlock and reset count after 60 seconds', async () => {
    const { result } = await renderHook(() => useLoginThrottle());

    for (let i = 0; i < 5; i++) {
      await act(() => {
        result.current.recordFailure();
      });
    }

    await act(() => {
      jest.advanceTimersByTime(60000);
    });

    expect(result.current.isLocked).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);

    // After unlock, failure count should be reset so 4 more failures don't lock
    for (let i = 0; i < 4; i++) {
      await act(() => {
        result.current.recordFailure();
      });
    }
    expect(result.current.isLocked).toBe(false);
  });

  it('should immediately unlock on reset()', async () => {
    const { result } = await renderHook(() => useLoginThrottle());

    for (let i = 0; i < 5; i++) {
      await act(() => {
        result.current.recordFailure();
      });
    }

    expect(result.current.isLocked).toBe(true);

    await act(() => {
      result.current.reset();
    });

    expect(result.current.isLocked).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });
});
