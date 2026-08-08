const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Force @supabase/* packages to use CJS entry points.
//
// supabase-js v2.92.0+ ships a rolldown-built ESM entry that calls
// `createRequire(import.meta.url)`. SDK 57 の Metro は package exports が
// 既定で有効なため、放置すると ESM 側が選ばれてしまう。
// Metro は import.meta を globalThis.__ExpoImportMetaRegistry に書き換えるので
// バンドルは成功するが、ブラウザ実行時に
//   TypeError: (0 , e.createRequire) is not a function
// で真っ白になる。
//
// 注意: バンドルを "import.meta" で grep しても上記の書き換えにより
// 検出できない。この回避策の要否を判断するときは実際に実行して確認すること
// (scripts/check-web-bundle.js)。
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@supabase/")) {
    const pkgName = moduleName.split("/").slice(0, 2).join("/");
    try {
      const pkgJson = require(`${pkgName}/package.json`);
      if (pkgJson.main && pkgJson.main.endsWith(".cjs")) {
        const cjsPath = require.resolve(`${pkgName}/${pkgJson.main}`);
        return { type: "sourceFile", filePath: cjsPath };
      }
    } catch {}
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
