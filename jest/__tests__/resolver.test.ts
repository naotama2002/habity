import {describe, expect, it} from '@jest/globals';

// resolver 本体は CommonJS なので require で読む
// eslint-disable-next-line @typescript-eslint/no-var-requires
const resolver = require('../resolver.js') as {
  needsWebVariant: (request: string, basedir: string) => boolean;
  preferWebExtensions: (extensions?: string[]) => string[] | undefined;
  WEB_VARIANT_PACKAGES: string[];
  WEB_VARIANT_MODULES: string[];
};

const {
  needsWebVariant,
  preferWebExtensions,
  WEB_VARIANT_PACKAGES,
  WEB_VARIANT_MODULES,
} = resolver;

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

    it.each(WEB_VARIANT_MODULES)(
      'モジュール単位の対象 %s は web 実装を解決する',
      (mod) => {
        expect(
          needsWebVariant(
            `./${mod}`,
            '/app/node_modules/react-native-gesture-handler/src/handlers/gestures',
          ),
        ).toBe(true);
      },
    );

    it('gesture-handler をパッケージ単位で対象にしない', () => {
      // 回帰: パッケージ全体を web 実装にすると findNodeHandle.web が
      // 実 DOM ノードを前提とするため react-test-renderer で落ちる
      expect(WEB_VARIANT_PACKAGES).not.toContain('react-native-gesture-handler');
      expect(
        needsWebVariant(
          './findNodeHandle',
          '/app/node_modules/react-native-gesture-handler/src',
        ),
      ).toBe(false);
    });

    it('reanimated を対象に含む (worklets 0.12 で web 例外を投げるため)', () => {
      // 回帰: reanimated が漏れていると
      // `[Worklets] createShareable is not supported on web.` で
      // reanimated を import する全 suite が起動不能になる
      expect(WEB_VARIANT_PACKAGES).toContain('react-native-reanimated');
      expect(WEB_VARIANT_PACKAGES).toContain('react-native-worklets');
    });
  });

  describe('preferWebExtensions', () => {
    it('.native を除外し .web を同じ拡張子より優先する', () => {
      expect(
        preferWebExtensions(['.native.ts', '.ts', '.native.tsx', '.tsx', '.js']),
      ).toEqual(['.web.ts', '.ts', '.web.tsx', '.tsx', '.web.js', '.js']);
    });

    it('.web は必ず対応する素の拡張子より前に来る', () => {
      const result = preferWebExtensions(['.ts', '.js']) ?? [];
      expect(result.indexOf('.web.ts')).toBeLessThan(result.indexOf('.ts'));
      expect(result.indexOf('.web.js')).toBeLessThan(result.indexOf('.js'));
    });

    it('undefined を渡しても落ちない', () => {
      expect(preferWebExtensions(undefined)).toBeUndefined();
    });
  });
});
