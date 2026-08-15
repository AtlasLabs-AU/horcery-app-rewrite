// Metro for the chart harness.
//
// The harness renders the APP's chart domain layer (../../src/charts) so the two
// renderers are compared on drawing alone. That folder is outside this package,
// so Metro must watch it and resolve `@/charts/*` into it. Everything else —
// luxon, react, the renderers — resolves from THIS package's node_modules only,
// so there is exactly one copy of each.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const harness = __dirname;
const appSrc = path.resolve(harness, '../../src');
const charts = path.join(appSrc, 'charts');

const config = getDefaultConfig(harness);

config.watchFolders = [charts];
config.resolver.nodeModulesPaths = [path.join(harness, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/charts/')) {
    return context.resolveRequest(
      context,
      path.join(charts, moduleName.slice('@/charts/'.length)),
      platform,
    );
  }
  return (defaultResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
