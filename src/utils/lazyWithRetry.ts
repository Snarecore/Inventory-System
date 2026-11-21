import React from 'react';

/**
 * Wraps dynamic component imports with automatic retries and single-reload fallback.
 * Solves "Failed to fetch dynamically imported module" in Vite dev server and production deployments.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | any>,
  retries = 2,
  interval = 400
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const pageKey = `lazy_retry_${window.location.pathname}`;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const module = await factory();
        try {
          sessionStorage.removeItem(pageKey);
        } catch {
          // ignore session storage access error
        }
        return module && module.default ? module : { default: module };
      } catch (error: any) {
        const errorMsg = String(error?.message || error || '');
        const isDynamicImportError =
          errorMsg.includes('Failed to fetch dynamically imported module') ||
          errorMsg.includes('Importing a module script failed') ||
          errorMsg.includes('error loading dynamically imported module') ||
          error?.name === 'ChunkLoadError';

        // If it's not a dynamic module import failure, throw immediately
        if (!isDynamicImportError) {
          throw error;
        }

        // Wait before next retry attempt
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, interval * (attempt + 1)));
          continue;
        }

        // Retries exhausted: Auto-reload the page once to pull the fresh Vite/production module graph
        try {
          const alreadyReloaded = sessionStorage.getItem(pageKey);
          if (!alreadyReloaded) {
            sessionStorage.setItem(pageKey, 'true');
            window.location.reload();
            // Return an unresolved promise so Suspense shows fallback instead of crashing
            return new Promise<{ default: T }>(() => {});
          }
          sessionStorage.removeItem(pageKey);
        } catch {
          // sessionStorage blocked or unavailable
        }

        throw error;
      }
    }

    throw new Error('Failed to load component after retries');
  });
}

/**
 * Wraps dynamic non-component imports (e.g. exceljs, dynamic libs) with automatic retries.
 */
export async function importWithRetry<T = any>(
  importFactory: () => Promise<T>,
  retries = 2,
  interval = 400
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await importFactory();
    } catch (error: any) {
      const errorMsg = String(error?.message || error || '');
      const isDynamicImportError =
        errorMsg.includes('Failed to fetch dynamically imported module') ||
        errorMsg.includes('Importing a module script failed') ||
        errorMsg.includes('error loading dynamically imported module') ||
        error?.name === 'ChunkLoadError';

      if (!isDynamicImportError || attempt >= retries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, interval * (attempt + 1)));
    }
  }

  throw new Error('Failed to dynamically import module after retries');
}
