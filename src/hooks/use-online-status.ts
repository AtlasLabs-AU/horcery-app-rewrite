import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/**
 * Single source of truth for app-wide connectivity.
 *
 * `onlineManager` already normalizes transport state for React Query.
 * A dedicated hook avoids each screen re-implementing network checks and
 * keeps the offline rules consistent across tabs.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => onlineManager.isOnline());

  useEffect(() => {
    return onlineManager.subscribe(() => {
      setIsOnline(onlineManager.isOnline());
    });
  }, []);

  return isOnline;
}
