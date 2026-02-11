const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// pnpm compatibility: resolve symlinked packages
config.resolver.unstable_enableSymlinks = true;

// Watch all node_modules for pnpm
config.watchFolders = [__dirname];

// Force @supabase/* packages to use CJS entry points.
// v2.92.0+ uses rolldown which emits import.meta.url in ESM builds,
// and Metro does not support import.meta in non-module scripts.
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
