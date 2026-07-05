import { useState, useEffect } from 'react';
import { isTauri } from '../utils/tauriAdapter';

export interface PlatformInfo {
  isTauri: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  platform: 'web' | 'windows' | 'macos' | 'linux' | 'android' | 'ios';
}

export function usePlatform(): PlatformInfo {
  const [info, setInfo] = useState<PlatformInfo>({
    isTauri: false,
    isMobile: false,
    isDesktop: true,
    platform: 'web',
  });

  useEffect(() => {
    if (isTauri) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tauriPlatform = (window as any).__TAURI_METADATA__?.platform || 'windows';
      setInfo({
        isTauri: true,
        isMobile: ['android', 'ios'].includes(tauriPlatform),
        isDesktop: ['windows', 'macos', 'linux'].includes(tauriPlatform),
        platform: tauriPlatform,
      });
    }
  }, []);

  return info;
}
