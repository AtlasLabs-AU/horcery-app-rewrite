export const DEFAULT_TIMEOUT_TIME = 2_000; // 2 seconds

/**
 * Wraps an API promise with a timeout mechanism
 * @param promise - The API promise to wrap with timeout
 * @param ms - Timeout duration in milliseconds
 * @returns Promise that rejects if timeout is reached
 */
export const apiWithTimeout = <T>(
  promise: Promise<T>,
  ms: number = DEFAULT_TIMEOUT_TIME,
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`API request timed out after ${ms}ms`)),
      ms,
    );
  });

  return Promise.race([
    promise.finally(() => timeoutId && clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
};
