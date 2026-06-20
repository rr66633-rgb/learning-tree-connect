/**
 * Offline Cache Hook
 * Provides automatic caching of API data for offline access.
 * Uses IndexedDB for larger datasets and localStorage for quick access.
 */
import { useEffect, useCallback, useRef } from 'react';
import { network, storage } from '../lib/native';

const CACHE_PREFIX = 'offline_cache_';
const CACHE_TIMESTAMP_PREFIX = 'offline_ts_';
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Cache data for offline access
 */
export async function cacheData(key: string, data: unknown): Promise<void> {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const tsKey = CACHE_TIMESTAMP_PREFIX + key;
    await storage.set(cacheKey, JSON.stringify(data));
    await storage.set(tsKey, Date.now().toString());
  } catch (e) {
    console.warn('Failed to cache data:', e);
  }
}

/**
 * Get cached data
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const tsKey = CACHE_TIMESTAMP_PREFIX + key;
    
    const timestamp = await storage.get(tsKey);
    if (timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age > MAX_CACHE_AGE_MS) {
        // Cache expired
        await storage.remove(cacheKey);
        await storage.remove(tsKey);
        return null;
      }
    }

    const cached = await storage.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (e) {
    console.warn('Failed to read cache:', e);
  }
  return null;
}

/**
 * Hook to monitor network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(true);

  useEffect(() => {
    // Get initial status
    network.getStatus().then((status) => {
      setIsOnline(status.connected);
    });

    // Listen for changes
    network.onStatusChange((status) => {
      setIsOnline(status.connected);
    });
  }, []);

  return isOnline;
}

import React from 'react';

/**
 * Hook that provides offline-aware data fetching
 * Automatically caches successful responses and serves from cache when offline
 */
export function useOfflineData<T>(
  key: string,
  queryData: T | undefined,
  isLoading: boolean
) {
  const [offlineData, setOfflineData] = React.useState<T | null>(null);
  const [isOffline, setIsOffline] = React.useState(false);
  const hasCached = useRef(false);

  // Monitor network
  useEffect(() => {
    network.getStatus().then((status) => {
      setIsOffline(!status.connected);
    });
    network.onStatusChange((status) => {
      setIsOffline(!status.connected);
    });
  }, []);

  // Cache data when online and data is available
  useEffect(() => {
    if (queryData && !isLoading && !hasCached.current) {
      cacheData(key, queryData);
      hasCached.current = true;
    }
  }, [queryData, isLoading, key]);

  // Load from cache when offline
  useEffect(() => {
    if (isOffline && !queryData) {
      getCachedData<T>(key).then((cached) => {
        if (cached) setOfflineData(cached);
      });
    }
  }, [isOffline, queryData, key]);

  const clearCache = useCallback(async () => {
    await storage.remove(CACHE_PREFIX + key);
    await storage.remove(CACHE_TIMESTAMP_PREFIX + key);
    setOfflineData(null);
    hasCached.current = false;
  }, [key]);

  return {
    data: queryData ?? offlineData,
    isOffline,
    isFromCache: !queryData && !!offlineData,
    clearCache,
  };
}
