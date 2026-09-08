import {describe, expect, it} from '@jest/globals';

// resolver 本体は CommonJS なので require で読む
// eslint-disable-next-line @typescript-eslint/no-var-requires
const resolver = require('../resolver.js') as {
  needsWebVariant: (request: string, basedir: string) => boolean;
  stripNativeExtensions: (extensions?: string[]) => string[] | undefined;
  WEB_VARIANT_PACKAGES: string[];
};

const {needsWebVariant, stripNativeExtensions, WEB_VARIANT_PACKAGES} = resolver;

describe('jest resolver', () => {
  describe('needsWebVariant', () => {
    it.each(WEB_VARIANT_PACKAGES)(
      'request が %s を含むとき web 実装を解決する',
      (pkg) => {
        expect(needsWebVariant(`${pkg}/src/index.ts`, '/app')).toBe(true);
      },
    );

    it.each(WEB_VARIANT_PACKAGES)(
      'basedir が %s のとき web 実装を解決する',
      (pkg) => {
        // パッケージ内部からの相対 import (./mutables など) を再現
        expect(needsWebVariant('./mutables', `/app/node_modules/${pkg}/src`)).toBe(
          true,
        );
      },
    );

    it('対象外のパッケージには適用しない', () => {
      expect(needsWebVariant('react-native', '/app')).toBe(false);
      expect(needsWebVariant('./foo', '/app/node_modules/expo-router')).toBe(
        false,
      );
    });

    it('reanimated を対象に含む (worklets 0.12 で web 例外を投げるため)', () => {
      // 回帰: reanimated が漏れていると
      // `[Worklets] createShareable is not supported on web.` で
      // reanimated を import する全 suite が起動不能になる
      expect(WEB_VARIANT_PACKAGES).toContain('react-native-reanimated');
      expect(WEB_VARIANT_PACKAGES).toContain('react-native-worklets');
    });
  });

  describe('stripNativeExtensions', () => {
    it('.native を含む拡張子を除外する', () => {
      expect(
        stripNativeExtensions([
          '.native.ts',
          '.ts',
          '.native.tsx',
          '.tsx',
          '.js',
        ]),
      ).toEqual(['.ts', '.tsx', '.js']);
    });

    it('.native が無ければそのまま返す', () => {
      expect(stripNativeExtensions(['.ts', '.tsx'])).toEqual(['.ts', '.tsx']);
    });

    it('undefined を渡しても落ちない', () => {
      expect(stripNativeExtensions(undefined)).toBeUndefined();
    });
  });
});
