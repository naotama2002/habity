import {useCallback} from 'react';
import {impactAsync, ImpactFeedbackStyle} from 'expo-haptics';

import {IS_IOS, IS_WEB} from '@/lib/platform';

type HapticStrength = 'Light' | 'Medium' | 'Heavy';

/**
 * Haptic フィードバックフック
 * Bluesky social-app の useHaptics パターンを参考
 *
 * - Web: 何もしない
 * - Android: Light で統一（Medium は振動が強すぎるため）
 * - iOS: リクエストされた強さを使用
 */
export function useHaptics() {
  return useCallback((strength: HapticStrength = 'Medium') => {
    if (IS_WEB) {
      return;
    }

    const style = IS_IOS
      ? ImpactFeedbackStyle[strength]
      : ImpactFeedbackStyle.Light;
    impactAsync(style);
  }, []);
}
