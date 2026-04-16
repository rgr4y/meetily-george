export type Platform = 'macos' | 'windows' | 'linux' | 'unknown';

type TauriWindow = Window & {
  __TAURI_OS_PLUGIN_INTERNALS__?: {
    platform?: Platform;
  };
};

export function detectPlatformFromUserAgent(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('linux')) return 'linux';
  return 'unknown';
}

export function hasTauriOsPlugin(): boolean {
  if (typeof window === 'undefined') return false;

  const tauriWindow = window as TauriWindow;
  return Boolean(tauriWindow.__TAURI_OS_PLUGIN_INTERNALS__);
}

export async function getPlatform(): Promise<Platform> {
  if (!hasTauriOsPlugin()) {
    return detectPlatformFromUserAgent();
  }

  try {
    const { platform } = await import('@tauri-apps/plugin-os');
    const platformName = platform();

    switch (platformName) {
      case 'macos':
      case 'ios':
        return 'macos';
      case 'windows':
        return 'windows';
      case 'linux':
      case 'android':
        return 'linux';
      default:
        return 'unknown';
    }
  } catch (error) {
    console.warn('[platform] Tauri platform detection failed, using user agent:', error);
    return detectPlatformFromUserAgent();
  }
}
