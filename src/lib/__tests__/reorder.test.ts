import {describe, expect, it} from '@jest/globals';
import {moveUp, moveDown, buildSortOrderUpdates} from '../reorder';

describe('reorder utilities', () => {
  describe('moveUp', () => {
    it('should not change array when index is 0 (first element)', () => {
      const items = ['a', 'b', 'c'];
      expect(moveUp(items, 0)).toEqual(['a', 'b', 'c']);
    });

    it('should move item one position up', () => {
      const items = ['a', 'b', 'c'];
      expect(moveUp(items, 1)).toEqual(['b', 'a', 'c']);
    });

    it('should move last item one position up', () => {
      const items = ['a', 'b', 'c'];
      expect(moveUp(items, 2)).toEqual(['a', 'c', 'b']);
    });

    it('should not mutate the original array', () => {
      const items = ['a', 'b', 'c'];
      moveUp(items, 1);
      expect(items).toEqual(['a', 'b', 'c']);
    });

    it('should handle negative index', () => {
      const items = ['a', 'b', 'c'];
      expect(moveUp(items, -1)).toEqual(['a', 'b', 'c']);
    });

    it('should handle out-of-bounds index', () => {
      const items = ['a', 'b', 'c'];
      expect(moveUp(items, 5)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('moveDown', () => {
    it('should not change array when index is last element', () => {
      const items = ['a', 'b', 'c'];
      expect(moveDown(items, 2)).toEqual(['a', 'b', 'c']);
    });

    it('should move item one position down', () => {
      const items = ['a', 'b', 'c'];
      expect(moveDown(items, 1)).toEqual(['a', 'c', 'b']);
    });

    it('should move first item one position down', () => {
      const items = ['a', 'b', 'c'];
      expect(moveDown(items, 0)).toEqual(['b', 'a', 'c']);
    });

    it('should not mutate the original array', () => {
      const items = ['a', 'b', 'c'];
      moveDown(items, 0);
      expect(items).toEqual(['a', 'b', 'c']);
    });

    it('should handle negative index', () => {
      const items = ['a', 'b', 'c'];
      expect(moveDown(items, -1)).toEqual(['a', 'b', 'c']);
    });

    it('should handle out-of-bounds index', () => {
      const items = ['a', 'b', 'c'];
      expect(moveDown(items, 5)).toEqual(['a', 'b', 'c']);
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
