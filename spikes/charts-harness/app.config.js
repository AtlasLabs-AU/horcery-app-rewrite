const renderer = process.env.HORCERY_RENDERER;
if (renderer && renderer !== 'echarts-skia' && renderer !== 'victory') {
  throw new Error('HORCERY_RENDERER must be "echarts-skia" or "victory".');
}

const isolated = Boolean(renderer);
const suffix = renderer === 'echarts-skia' ? 'echarts' : renderer;
const memorySequence = process.env.EXPO_PUBLIC_HORCERY_MEMORY_SEQUENCE === '1';
const buildSuffix = [suffix, memorySequence ? 'memory' : null].filter(Boolean).join('.');
const identifier = `au.com.atlaslabs.horcery.chartsharness${buildSuffix ? `.${buildSuffix}` : ''}`;

module.exports = {
  expo: {
    name: `Horcery Charts Harness${suffix ? ` — ${suffix}` : ''}${memorySequence ? ' memory' : ''}`,
    slug: 'horcery-charts-harness',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: identifier,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      package: identifier,
    },
    web: { favicon: './assets/favicon.png' },
    scheme: `horcery-charts-harness${buildSuffix ? `-${buildSuffix.replaceAll('.', '-')}` : ''}`,
    newArchEnabled: true,
    plugins: isolated ? [] : ['expo-dev-client'],
  },
};
