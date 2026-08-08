/**
 * Jest resolver for Habity
 *
 * jest-expo が設定する @react-native/jest-preset の resolver と、
 * react-native-worklets が要求する解決ルールを合成する。
 *
 * Reanimated 4 以降 worklets は react-native-worklets に分離され、
 * jest からは `.native` 実装ではなく通常実装を読ませる必要がある
 * (NativeWorklets.native.ts はネイティブ TurboModule 前提で、
 *  jest では loadUnpackers が undefined になり落ちる)。
 *
 * react-native-worklets/jest/resolver.js は defaultResolver に委譲するため
 * そのまま resolver に指定すると RN 側の resolver が失われる。
 * ここでは拡張子フィルタだけ適用し、解決自体は RN の resolver に任せる。
 */

const reactNativeResolver = require('@react-native/jest-preset/jest/resolver');

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  if (
    options.basedir.includes('react-native-worklets') ||
    request.includes('react-native-worklets')
  ) {
    return reactNativeResolver(request, {
      ...options,
      extensions: options.extensions?.filter((ext) => !ext.includes('native')),
    });
  }

  return reactNativeResolver(request, options);
};
