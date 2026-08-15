// Metro for the chart harness.
//
// The harness renders the APP's chart domain layer (../../src/charts) so the two
// renderers are compared on drawing alone. That folder is outside this package,
// so Metro must watch it and resolve `@/charts/*` into it. The domain files
// import only `luxon`, which is pure, so it does not matter which copy they get.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const harness = __dirname;
const appSrc = path.resolve(harness, '../../src');
const charts = path.join(appSrc, 'charts');

const config = getDefaultConfig(harness);

config.watchFolders = [charts];
// The shared domain files sit under the APP's tree, so hierarchical lookup
// would find the app's node_modules first for their `luxon` import. Listing the
// harness's node_modules here makes it the fallback for anything not found
// walking up — and hierarchical lookup stays ON, because Expo's own packages
// have nested node_modules that only it can find.
config.resolver.nodeModulesPaths = [path.join(harness, 'node_modules')];

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // echarts/zrender import `tslib`, whose package `exports` map offers Metro an
  // ESM wrapper (modules/index.js) whose default-import interop comes back
  // undefined at runtime → "Cannot read property '__extends' of undefined".
  // Pin every `tslib` import to the CommonJS entry, which is what tslib's own
  // `main` field says. (Wuba's docs recommend the same for Metro.)
  if (moduleName === 'tslib') {
    return context.resolveRequest(context, 'tslib/tslib.js', platform);
  }
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
