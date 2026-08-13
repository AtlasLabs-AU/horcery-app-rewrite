/**
 * Runtime environment flags.
 *
 * The current app's version of this file also computes bundle identifiers,
 * icons and Firebase file paths, because its `app.config.ts` builds those
 * dynamically per environment. The rewrite declares them statically in
 * `app.json`, so only the runtime flags are ported here.
 */
export const getAppEnvConfig = () => {
  const env = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

  return {
    env,
    isProduction: env === 'production',
    isPreview: env === 'preview',
    isDevelopment: env === 'development',
  };
};
