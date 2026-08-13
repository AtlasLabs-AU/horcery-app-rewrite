import { logger, transportFunctionType } from 'react-native-logs';

import { getAppEnvConfig } from './app-config-helper';

// Create a simple logger that only works in development
const devLogger = logger.createLogger({
  severity: getAppEnvConfig().isDevelopment ? 'debug' : 'silent',
  transport: ((msg: any, level: any) => {
    // Only log in development
    if (getAppEnvConfig().isDevelopment) {
      const consoleMethod =
        level === 'error'
          ? 'error'
          : level === 'warn'
            ? 'warn'
            : level === 'info'
              ? 'info'
              : 'log';

      console[consoleMethod](consoleMethod.toUpperCase(), msg);
    }
  }) as transportFunctionType<any>,
});

// Export the logger methods
export const { debug, info, warn, error } = devLogger;
