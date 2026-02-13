import {describe, expect, it} from '@jest/globals';
import {IS_WEB, IS_IOS, IS_NATIVE} from '../platform';

describe('platform', () => {
  it('should export IS_WEB as boolean', () => {
    expect(typeof IS_WEB).toBe('boolean');
  });

  it('should export IS_IOS as boolean', () => {
    expect(typeof IS_IOS).toBe('boolean');
  });

  it('should export IS_NATIVE as boolean', () => {
    expect(typeof IS_NATIVE).toBe('boolean');
  });

  it('IS_NATIVE should be the inverse of IS_WEB', () => {
    expect(IS_NATIVE).toBe(!IS_WEB);
  });
});
