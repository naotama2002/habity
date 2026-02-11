import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';

// onAuthStateChange コールバックをキャプチャ
type AuthCallback = (event: string, session: unknown) => void;
let capturedAuthCallback: AuthCallback | null = null;

jest.mock('@/lib/react-query', () => ({
  queryClient: { clear: jest.fn() },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn((callback: AuthCallback) => {
        capturedAuthCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
    },
  },
}));

import { SessionProvider } from '../index';
import { queryClient } from '@/lib/react-query';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SessionProvider, null, children);

describe('session cache clearing logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedAuthCallback = null;
  });

  it('should clear queryClient on SIGNED_OUT', async () => {
    renderHook(() => null, { wrapper });

    await act(() => {
      capturedAuthCallback!('SIGNED_OUT', null);
    });

    expect(queryClient.clear).toHaveBeenCalledTimes(1);
  });

  it('should clear queryClient on SIGNED_IN', async () => {
    renderHook(() => null, { wrapper });

    await act(() => {
      capturedAuthCallback!('SIGNED_IN', { user: { id: 'user-1' } });
    });

    expect(queryClient.clear).toHaveBeenCalledTimes(1);
  });

  it('should not clear queryClient on TOKEN_REFRESHED', async () => {
    renderHook(() => null, { wrapper });

    await act(() => {
      capturedAuthCallback!('TOKEN_REFRESHED', { user: { id: 'user-1' } });
    });

    expect(queryClient.clear).not.toHaveBeenCalled();
  });
});
