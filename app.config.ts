import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic config layered over app.json.
 *
 * Its only job is the Firebase file. The plist holds real credentials, so it is
 * gitignored — and EAS Build only uploads files tracked by git, which is why a
 * static `googleServicesFile` path fails there. On EAS the file arrives through
 * the `GOOGLE_SERVICE_INFO_PLIST` file secret and this reads the path EAS
 * provides; locally it falls back to the copy in the project root.
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
});
