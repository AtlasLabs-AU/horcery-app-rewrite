const renderer = process.env.HORCERY_RENDERER;
if (renderer && renderer !== 'echarts-skia' && renderer !== 'victory') {
  throw new Error('HORCERY_RENDERER must be "echarts-skia" or "victory".');
}

const isolated = Boolean(renderer);
const suffix = renderer === 'echarts-skia' ? 'echarts' : renderer;
const identifier = `au.com.atlaslabs.horcery.chartsharness${suffix ? `.${suffix}` : ''}`;

module.exports = {
  expo: {
    name: `Horcery Charts Harness${suffix ? ` — ${suffix}` : ''}`,
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
    scheme: `horcery-charts-harness${suffix ? `-${suffix}` : ''}`,
    newArchEnabled: true,
    plugins: isolated ? [] : ['expo-dev-client'],
    autolinking: {
      exclude: isolated
        ? ['expo-dev-client', 'expo-dev-launcher', 'expo-dev-menu', 'expo-dev-menu-interface', 'react-native-svg']
        : [],
    },
  },
};
