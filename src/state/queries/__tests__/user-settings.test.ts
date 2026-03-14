import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Supabase モック
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
      }),
    },
  },
}));

// React Query モック
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(
    (opts: { queryFn: () => Promise<unknown> }) => opts,
  ),
  useMutation: jest.fn(
    (opts: { mutationFn: (...args: unknown[]) => Promise<unknown> }) => opts,
  ),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

import { useQuery, useMutation } from '@tanstack/react-query';
import { userSettingsKeys, useUserSettings, useUpdateUserSettings } from '../user-settings';

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockedUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

describe('user-settings queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('userSettingsKeys', () => {
    it('generates correct query keys', () => {
      expect(userSettingsKeys.all).toEqual(['userSettings']);
      expect(userSettingsKeys.detail()).toEqual(['userSettings', 'detail']);
    });
  });

  describe('useUserSettings', () => {
    it('fetches user settings from supabase', async () => {
      const mockSettings = {
        user_id: 'user-123',
        notifications_enabled: true,
        notification_times: ['08:00'],
      };

      mockFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle.mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      });

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useUserSettings();
      const call = mockedUseQuery.mock.calls[0];
      const opts = call[0] as unknown as { queryFn: () => Promise<unknown> };
      const result = await opts.queryFn();

      expect(mockFrom).toHaveBeenCalledWith('user_settings');
      expect(result).toEqual(mockSettings);
    });
  });

  describe('useUpdateUserSettings', () => {
    it('updates user settings in supabase', async () => {
      const mockUpdated = {
        user_id: 'user-123',
        notifications_enabled: true,
      };

      mockFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockReturnValue({
            select: mockSelect.mockReturnValue({
              single: mockSingle.mockResolvedValue({
                data: mockUpdated,
                error: null,
              }),
            }),
          }),
        }),
      });

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useUpdateUserSettings();
      const call = mockedUseMutation.mock.calls[0];
      const opts = call[0] as unknown as { mutationFn: (updates: unknown) => Promise<unknown> };
      const result = await opts.mutationFn({ notifications_enabled: true });

      expect(mockFrom).toHaveBeenCalledWith('user_settings');
      expect(result).toEqual(mockUpdated);
    });
  });
});
