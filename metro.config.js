const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// pnpm compatibility: resolve symlinked packages
config.resolver.unstable_enableSymlinks = true;

// Watch all node_modules for pnpm
config.watchFolders = [__dirname];

// Resolve @lingui/* v6 entry points via package.json "exports".
// v6 is ESM-only and dropped the "main" field, but Metro on SDK 52 does not
// read "exports" by default (unstable_enablePackageExports is off).
// Enabling it globally would change resolution for every dependency, so the
// exports map is read directly for @lingui/* only.
function resolveLinguiExport(moduleName, originModulePath) {
  const segments = moduleName.split("/");
  const pkgName = segments.slice(0, 2).join("/");
  const subpath = segments.length > 2 ? `./${segments.slice(2).join("/")}` : ".";

  // Some @lingui packages do not expose "./package.json" in their exports map,
  // so the package directory is located by walking node_modules directly
  // instead of going through require.resolve (which enforces exports).
  const req = createRequire(originModulePath || __filename);
  const pkgDir = (req.resolve.paths(pkgName) || [])
    .map((dir) => path.join(dir, pkgName))
    .find((dir) => fs.existsSync(path.join(dir, "package.json")));
  if (!pkgDir) {
    return null;
  }

  const entry = require(path.join(pkgDir, "package.json")).exports?.[subpath];
  const target =
    typeof entry === "string" ? entry : (entry?.browser ?? entry?.default);

  return target ? path.join(pkgDir, target) : null;
}

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@lingui/")) {
    try {
      const filePath = resolveLinguiExport(
        moduleName,
        context.originModulePath
      );
      if (filePath) {
        return { type: "sourceFile", filePath };
      }
    } catch {}
  }
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
