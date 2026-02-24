import {describe, expect, it} from '@jest/globals';
import {extractUrls, sanitizeReturnTo} from '../url';

describe('extractUrls', () => {
  it.each([
    {input: null, expected: [], label: 'null'},
    {input: '', expected: [], label: 'empty string'},
    {input: '   ', expected: [], label: 'whitespace only'},
  ])('should return empty array for $label', ({input, expected}) => {
    expect(extractUrls(input)).toEqual(expected);
  });

  it('should return empty array for text without URLs', () => {
    expect(extractUrls('just a plain text without any links')).toEqual([]);
  });

  it('should extract a single https URL', () => {
    expect(extractUrls('Visit https://example.com for details')).toEqual([
      'https://example.com',
    ]);
  });

  it('should extract a single http URL', () => {
    expect(extractUrls('Go to http://example.com')).toEqual([
      'http://example.com',
    ]);
  });

  it('should extract a custom scheme URL', () => {
    expect(extractUrls('Open myapp://path/to/action')).toEqual([
      'myapp://path/to/action',
    ]);
  });

  it('should extract multiple URLs from mixed text', () => {
    const text =
      'Check https://example.com and open myapp://start then visit http://other.org/page';
    expect(extractUrls(text)).toEqual([
      'https://example.com',
      'myapp://start',
      'http://other.org/page',
    ]);
  });

  it('should extract URL with path and query params', () => {
    expect(
      extractUrls('https://example.com/path?key=value&other=123'),
    ).toEqual(['https://example.com/path?key=value&other=123']);
  });

  it('should extract URLs separated by newlines', () => {
    const text = 'Links:\nhttps://first.com\nhttps://second.com';
    expect(extractUrls(text)).toEqual([
      'https://first.com',
      'https://second.com',
    ]);
  });

  it('should handle URL at the beginning of text', () => {
    expect(extractUrls('https://example.com is a great site')).toEqual([
      'https://example.com',
    ]);
  });

  it('should handle URL at the end of text', () => {
    expect(extractUrls('Visit https://example.com')).toEqual([
      'https://example.com',
    ]);
  });
});

describe('sanitizeReturnTo', () => {
  describe('safe relative paths', () => {
    const safePaths = [
      '/(tabs)',
      '/(tabs)/habits',
      '/habit/new',
      '/import/habitify',
      '/(auth)/login',
    ];

    it.each(safePaths)('should allow safe relative path: %s', (path) => {
      expect(sanitizeReturnTo(path)).toBe(path);
    });
  });

  describe('encoded safe paths', () => {
    it('should decode and allow encoded relative path', () => {
      expect(sanitizeReturnTo(encodeURIComponent('/(tabs)'))).toBe('/(tabs)');
    });
  });

  describe('malicious inputs', () => {
    const maliciousInputs: Array<[string, string]> = [
      ['https://evil.com', 'absolute URL with https'],
      ['http://evil.com', 'absolute URL with http'],
      ['//evil.com', 'protocol-relative URL'],
      ['javascript:alert(1)', 'javascript protocol'],
      ['data:text/html,<h1>evil</h1>', 'data URI'],
      ['ftp://evil.com/file', 'ftp URL'],
    ];

    it.each(maliciousInputs)(
      'should reject %s (%s) and return fallback',
      (input) => {
        expect(sanitizeReturnTo(input)).toBe('/(tabs)');
      },
    );

    it('should reject encoded malicious URL', () => {
      expect(sanitizeReturnTo(encodeURIComponent('https://evil.com'))).toBe(
        '/(tabs)',
      );
    });

    it('should reject encoded protocol-relative URL', () => {
      expect(sanitizeReturnTo(encodeURIComponent('//evil.com'))).toBe(
        '/(tabs)',
      );
    });
  });

  describe('undefined / empty input', () => {
    it('should return fallback for undefined', () => {
      expect(sanitizeReturnTo(undefined)).toBe('/(tabs)');
    });

    it('should return fallback for empty string', () => {
      expect(sanitizeReturnTo('')).toBe('/(tabs)');
    });
  });

  describe('custom fallback', () => {
    it('should use custom fallback when provided', () => {
      expect(sanitizeReturnTo(undefined, '/custom')).toBe('/custom');
    });

    it('should use custom fallback for malicious input', () => {
      expect(sanitizeReturnTo('https://evil.com', '/custom')).toBe('/custom');
    });
  });

  describe('invalid encoding', () => {
    it('should return fallback for malformed URI encoding', () => {
      expect(sanitizeReturnTo('%E0%A4%A')).toBe('/(tabs)');
    });
  });
});
