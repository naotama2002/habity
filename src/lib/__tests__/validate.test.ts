import {describe, expect, it} from '@jest/globals';
import {
  ValidationError,
  boolean,
  number,
  object,
  string,
  type Infer,
} from '../validate';

describe('validate', () => {
  describe('プリミティブ', () => {
    it.each([
      ['string', string(), 'hello', 42],
      ['boolean', boolean(), true, 'true'],
      ['number', number(), 1, '1'],
    ] as const)('%s は正しい値を通し、違う型を弾く', (_name, v, ok, ng) => {
      expect(v.parse(ok)).toBe(ok);
      expect(() => v.parse(ng)).toThrow(ValidationError);
    });

    it('number は NaN を弾く', () => {
      expect(() => number().parse(Number.NaN)).toThrow(ValidationError);
      expect(() => number().parse(Number.NaN)).toThrow(/NaN/);
    });

    it('number は 0 と負数を通す（falsy で弾かない）', () => {
      expect(number().parse(0)).toBe(0);
      expect(number().parse(-1)).toBe(-1);
    });

    it('空文字と false を通す（falsy で弾かない）', () => {
      expect(string().parse('')).toBe('');
      expect(boolean().parse(false)).toBe(false);
    });

    it('undefined を弾く（キー欠落の検出）', () => {
      expect(() => string().parse(undefined)).toThrow(ValidationError);
    });

    it('null を弾く（nullable を付けない限り）', () => {
      expect(() => string().parse(null)).toThrow(/expected string, got null/);
    });
  });

  describe('object', () => {
    const Schema = object({id: string(), count: number()});

    it('正しいオブジェクトを通す', () => {
      expect(Schema.parse({id: 'a', count: 1})).toEqual({id: 'a', count: 1});
    });

    it('未知のフィールドを取り除く', () => {
      const parsed = Schema.parse({id: 'a', count: 1, extra: true});
      expect(parsed).toEqual({id: 'a', count: 1});
      expect((parsed as Record<string, unknown>).extra).toBeUndefined();
    });

    it('キーが欠けていたら弾き、どのキーか示す', () => {
      expect(() => Schema.parse({id: 'a'})).toThrow(/count/);
    });

    it.each([
      ['配列', []],
      ['null', null],
      ['文字列', 'x'],
    ])('%s をオブジェクトとして受け付けない', (_name, input) => {
      expect(() => Schema.parse(input)).toThrow(ValidationError);
    });

    it('入れ子のパスをエラーに含める', () => {
      const Nested = object({inner: object({id: string()})});
      expect(() => Nested.parse({inner: {id: 1}})).toThrow(/inner\.id/);
    });
  });

  describe('array', () => {
    const Schema = object({id: string()}).array();

    it('各要素を検証する', () => {
      expect(Schema.parse([{id: 'a'}, {id: 'b'}])).toEqual([
        {id: 'a'},
        {id: 'b'},
      ]);
    });

    it('空配列を通す', () => {
      expect(Schema.parse([])).toEqual([]);
    });

    it('配列でなければ弾く', () => {
      expect(() => Schema.parse({})).toThrow(/expected array, got object/);
    });

    it('何番目の要素が不正かを示す', () => {
      expect(() => Schema.parse([{id: 'a'}, {id: 2}])).toThrow(/\[1\]\.id/);
    });
  });

  describe('nullable', () => {
    const Schema = object({id: string()}).nullable();

    it('null を通す', () => {
      expect(Schema.parse(null)).toBeNull();
    });

    it('値も通す', () => {
      expect(Schema.parse({id: 'a'})).toEqual({id: 'a'});
    });

    it('不正な値は弾く', () => {
      expect(() => Schema.parse({id: 1})).toThrow(ValidationError);
    });

    it('undefined は null とみなさない', () => {
      expect(() => Schema.parse(undefined)).toThrow(ValidationError);
    });
  });

  it('array と nullable を組み合わせられる', () => {
    const Schema = object({id: string()}).array().nullable();
    expect(Schema.parse(null)).toBeNull();
    expect(Schema.parse([{id: 'a'}])).toEqual([{id: 'a'}]);
  });

  it('ValidationError は失敗位置を path に持つ', () => {
    const Schema = object({items: object({id: string()}).array()});
    try {
      Schema.parse({items: [{id: 'ok'}, {id: 3}]});
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).path).toBe('items[1].id');
    }
  });

  it('Infer で検証後の型を取り出せる', () => {
    const Schema = object({id: string(), ok: boolean()});
    const value: Infer<typeof Schema> = Schema.parse({id: 'a', ok: true});
    expect(value.id).toBe('a');
    expect(value.ok).toBe(true);
  });
});
