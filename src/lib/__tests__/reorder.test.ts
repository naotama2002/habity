import {describe, expect, it} from '@jest/globals';
import {reorder, buildSortOrderUpdates} from '../reorder';

describe('reorder utilities', () => {
  describe('reorder', () => {
    it('should move item forward', () => {
      expect(reorder(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    });

    it('should move item backward', () => {
      expect(reorder(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    });

    it('should return same order when from equals to', () => {
      expect(reorder(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
    });

    it('should not mutate the original array', () => {
      const items = ['a', 'b', 'c'];
      reorder(items, 0, 2);
      expect(items).toEqual(['a', 'b', 'c']);
    });

    it('should handle moving to first position', () => {
      expect(reorder(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    });

    it('should handle moving to last position', () => {
      expect(reorder(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    });

    it('should handle single item array', () => {
      expect(reorder(['a'], 0, 0)).toEqual(['a']);
    });
  });

  describe('buildSortOrderUpdates', () => {
    it('should generate sequential sort_order values', () => {
      const items = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
      expect(buildSortOrderUpdates(items)).toEqual([
        {id: 'a', sort_order: 0},
        {id: 'b', sort_order: 1},
        {id: 'c', sort_order: 2},
      ]);
    });

    it('should return empty array for empty input', () => {
      expect(buildSortOrderUpdates([])).toEqual([]);
    });

    it('should handle single item', () => {
      expect(buildSortOrderUpdates([{id: 'x'}])).toEqual([
        {id: 'x', sort_order: 0},
      ]);
    });
  });
});
