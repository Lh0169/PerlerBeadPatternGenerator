import { useState } from 'react';
import { isTauri, getPlatform } from '../utils/tauriAdapter';

export interface PlatformInfo {
  isTauri: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  platform: 'web' | 'windows' | 'macos' | 'linux' | 'android' | 'ios';
}

function getPlatformInfo(): PlatformInfo {
  // Web 环境：同样通过 getPlatform() 检测（支持 PWA / 移动端浏览器场景）
  if (!isTauri) {
    const p = getPlatform();
    const mobile = p === 'android' || p === 'ios';
    return {
      isTauri: false,
      isMobile: mobile,
      isDesktop: !mobile,
      platform: mobile ? (p as PlatformInfo['platform']) : 'web',
    };
  }
  const p = getPlatform();
  const isMobile = p === 'android' || p === 'ios';
  return {
    isTauri: true,
    isMobile,
    isDesktop: !isMobile,
    platform: (isMobile ? p : (p || 'windows')) as PlatformInfo['platform'],
  };
}

export function usePlatform(): PlatformInfo {
  // 同步计算初始状态，消除 useEffect 异步导致的移动端按钮闪烁
  const [info] = useState<PlatformInfo>(getPlatformInfo);
  return info;
}
