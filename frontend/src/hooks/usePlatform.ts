import { useState, useEffect } from 'react';
import { detectPlatformFromUserAgent, getPlatform, type Platform } from '@/lib/platform';

/**
 * Hook to detect the current platform
 * Uses Tauri's OS plugin if available, falls back to user agent detection
 * @returns The current platform
 */
export function usePlatform(): Platform {
  const [currentPlatform, setCurrentPlatform] = useState<Platform>(() => detectPlatformFromUserAgent());

  useEffect(() => {
    async function detectPlatform() {
      setCurrentPlatform(await getPlatform());
    }

    detectPlatform();
  }, []);

  return currentPlatform;
}

/**
 * Simple helper to check if the current platform is Linux
 * @returns true if running on Linux
 */
export function useIsLinux(): boolean {
  const currentPlatform = usePlatform();
  return currentPlatform === 'linux';
}
