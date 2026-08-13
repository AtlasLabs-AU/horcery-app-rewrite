import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic config layered over app.json.
 *
 * Its only job is the Firebase files. They hold real credentials, so they are
 * gitignored — and EAS Build only uploads files tracked by git, which is why
 * static `googleServicesFile` paths fail there. On EAS the files arrive through
 * file secrets; locally the config falls back to copies in the project root.
 *
 * This mirrors how the current app handles the same problem.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Horcery Rewrite',
  slug: config.slug ?? 'horcery-app-rewrite',
  ios: {
    ...config.ios,
    googleServicesFile:
      process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist',
  },
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
