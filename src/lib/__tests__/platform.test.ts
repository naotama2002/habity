import {describe, expect, it} from '@jest/globals';
import {IS_WEB} from '../platform';

describe('platform', () => {
  it('should export IS_WEB as boolean', () => {
    expect(typeof IS_WEB).toBe('boolean');
  });
});
