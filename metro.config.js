const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// pnpm compatibility: resolve symlinked packages
config.resolver.unstable_enableSymlinks = true;

// Watch all node_modules for pnpm
config.watchFolders = [__dirname];

module.exports = config;
