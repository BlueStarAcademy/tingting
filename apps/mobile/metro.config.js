const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Skia 2.6.2's native useVideoLoading calls Reanimated at module load, which throws
// "react-native-reanimated is not installed!" on any Skia import. We don't ship Reanimated
// or use Skia video, so resolve it to Skia's own Reanimated-free web implementation.
const skiaRoot = [projectRoot, workspaceRoot]
  .map((root) => path.join(root, 'node_modules', '@shopify', 'react-native-skia'))
  .find((dir) => fs.existsSync(dir));
const skiaVideoLoadingSafe =
  skiaRoot && path.join(skiaRoot, 'src', 'external', 'reanimated', 'useVideoLoading.web.ts');
const skiaDirMarker = `${path.sep}@shopify${path.sep}react-native-skia${path.sep}`;
const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    skiaVideoLoadingSafe &&
    platform !== 'web' &&
    /(^|\/)useVideoLoading$/.test(moduleName) &&
    context.originModulePath.includes(skiaDirMarker)
  ) {
    return { type: 'sourceFile', filePath: skiaVideoLoadingSafe };
  }
  return (upstreamResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
