import {describe, expect, it} from '@jest/globals';
import {extractUrls} from '../url';

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
