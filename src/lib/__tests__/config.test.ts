import {describe, expect, it, jest, beforeEach} from '@jest/globals';

describe('config', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should default enableSignup to true when extra is undefined', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {expoConfig: {extra: undefined}},
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const {config} = require('../config');
    expect(config.enableSignup).toBe(true);
  });

  it('should default enableSignup to true when expoConfig is undefined', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {expoConfig: undefined},
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const {config} = require('../config');
    expect(config.enableSignup).toBe(true);
  });

  it('should default enableSignup to true when enableSignup is undefined', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {expoConfig: {extra: {enableSignup: undefined}}},
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const {config} = require('../config');
    expect(config.enableSignup).toBe(true);
  });

  it('should return true when enableSignup is "true"', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {expoConfig: {extra: {enableSignup: 'true'}}},
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const {config} = require('../config');
    expect(config.enableSignup).toBe(true);
  });

  it('should return false when enableSignup is "false"', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {expoConfig: {extra: {enableSignup: 'false'}}},
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const {config} = require('../config');
    expect(config.enableSignup).toBe(false);
  });
});
