import {describe, expect, it, jest, beforeEach} from '@jest/globals';
import {renderHook} from '@testing-library/react-native';

// expo-haptics モック
const mockImpactAsync = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
jest.mock('expo-haptics', () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: {Light: 'light', Medium: 'medium', Heavy: 'heavy'},
}));

// Platform モック（デフォルトは iOS）
let mockIsWeb = false;
let mockIsIOS = true;
jest.mock('@/lib/platform', () => ({
  get IS_WEB() {
    return mockIsWeb;
  },
  get IS_IOS() {
    return mockIsIOS;
  },
  get IS_NATIVE() {
    return !mockIsWeb;
  },
}));

import {useHaptics} from '../haptics';

describe('useHaptics', () => {
  beforeEach(() => {
    mockImpactAsync.mockClear();
    mockIsWeb = false;
    mockIsIOS = true;
  });

  it('should return a function', () => {
    const {result} = renderHook(() => useHaptics());
    expect(typeof result.current).toBe('function');
  });

  it('should call impactAsync with Medium on iOS by default', () => {
    mockIsIOS = true;
    const {result} = renderHook(() => useHaptics());
    result.current();
    expect(mockImpactAsync).toHaveBeenCalledWith('medium');
  });

  it('should call impactAsync with requested strength on iOS', () => {
    mockIsIOS = true;
    const {result} = renderHook(() => useHaptics());
    result.current('Heavy');
    expect(mockImpactAsync).toHaveBeenCalledWith('heavy');
  });

  it('should call impactAsync with Light on Android regardless of strength', () => {
    mockIsIOS = false;
    const {result} = renderHook(() => useHaptics());
    result.current('Heavy');
    expect(mockImpactAsync).toHaveBeenCalledWith('light');
  });

  it('should not call impactAsync on Web', () => {
    mockIsWeb = true;
    const {result} = renderHook(() => useHaptics());
    result.current();
    expect(mockImpactAsync).not.toHaveBeenCalled();
  });
});
