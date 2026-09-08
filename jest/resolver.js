/**
 * Jest resolver for Habity
 *
 * jest-expo が設定する @react-native/jest-preset の resolver と、
 * react-native-worklets が要求する解決ルールを合成する。
 *
 * Reanimated 4 以降 worklets は react-native-worklets に分離され、
 * jest からは `.native` 実装ではなく web 実装を読ませる必要がある。
 * `.native` はネイティブランタイム前提のため jest では動かない:
 *   - NativeWorklets.native.ts は TurboModule 前提で loadUnpackers が undefined
 *   - worklets 0.12 以降は createShareable が web で例外を投げ、
 *     reanimated を import しただけでテストが落ちる
 *
 * 本プロジェクトは Web 専用 (CLAUDE.md) なので、jest でも web 実装を
 * 解決させるのが本番の挙動とも一致する。
 * なお web 実装は DOM を参照するため jest.config.js で
 * testEnvironment: 'jsdom' を指定している。
 *
 * react-native-worklets/jest/resolver.js は defaultResolver に委譲するため
 * そのまま resolver に指定すると RN 側の resolver が失われる。
 * ここでは拡張子フィルタだけ適用し、解決自体は RN の resolver に任せる。
 */

const reactNativeResolver = require('@react-native/jest-preset/jest/resolver');

/**
 * `.native` 実装ではなく web 実装を解決させるパッケージ。
 * これらの `.native` はネイティブランタイム前提で jest では動かない。
 * 本プロジェクトは Web 専用 (CLAUDE.md) なので web 実装が本番とも一致する。
 */
const WEB_VARIANT_PACKAGES = [
  'react-native-worklets',
  'react-native-reanimated',
];

/**
 * この request/basedir が web 実装解決の対象か
 * @param {string} request
 * @param {string} basedir
 */
function needsWebVariant(request, basedir) {
  return WEB_VARIANT_PACKAGES.some(
    (pkg) => basedir.includes(pkg) || request.includes(pkg),
  );
}

/** `.native` を含む拡張子を除外する */
function stripNativeExtensions(extensions) {
  return extensions?.filter((ext) => !ext.includes('native'));
}

/** @type {import('jest-resolve').SyncResolver} */
const resolver = (request, options) => {
  if (needsWebVariant(request, options.basedir)) {
    return reactNativeResolver(request, {
      ...options,
      extensions: stripNativeExtensions(options.extensions),
    });
  }

  return reactNativeResolver(request, options);
};

module.exports = resolver;
// テスト用に内部ロジックを公開する
module.exports.needsWebVariant = needsWebVariant;
module.exports.stripNativeExtensions = stripNativeExtensions;
module.exports.WEB_VARIANT_PACKAGES = WEB_VARIANT_PACKAGES;
