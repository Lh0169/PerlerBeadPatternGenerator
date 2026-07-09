/**
 * Tauri 环境适配层
 * 统一处理浏览器环境和 Tauri 桌面环境的差异
 */

// 检测是否在 Tauri 环境
export const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

/** 检测平台类型（优先使用原生注入的 __PLATFORM__，最可靠） */
export function getPlatform(): string {
  // 1. 原生注入（MainActivity.kt 通过 addDocumentStartJavaScript 设置）
  if (window.__PLATFORM__ === 'android') return 'android';
  // 2. Tauri 元数据
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = (window as any).__TAURI_METADATA__?.platform;
  if (meta === 'android' || meta === 'ios') return meta;
  // 3. User-Agent 回退
  if (/Android/i.test(navigator.userAgent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'ios';
  return meta || '';
}

// 检测是否为移动端
export const isMobile = (): boolean => {
  const p = getPlatform();
  return p === 'android' || p === 'ios';
};

/** Blob → Base64 字符串（去除 data:xxx;base64, 前缀） */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // 去掉 data:image/png;base64, 前缀
      resolve(result.split(',')[1] || result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Android 原生桥接（由 MainActivity.kt 注入） */
declare global {
  interface Window {
    /** Kotlin addJavascriptInterface 注入的相册存储接口 */
    _gallerySaver?: {
      savePng(base64Data: string, filename: string): string;
    };
    /** Kotlin addDocumentStartJavaScript 注入的平台标识（'android'） */
    __PLATFORM__?: string;
  }
}

// 文件保存适配（移动端优先 → Tauri 桌面对话框 → 浏览器下载）
export async function saveFile(blob: Blob, filename: string): Promise<{ success: boolean; path?: string; error?: string }> {
  const platform = getPlatform();
  const isMobilePlatform = platform === 'android' || platform === 'ios';
  const ext = filename.split('.').pop() || '';

  // ---- 移动端：优先原生桥接 > 系统分享 > 插件降级 ----
  if (isMobilePlatform) {
    try {
      // PNG 直存相册（通过 GallerySaver 原生接口，由 MainActivity.kt 注入）
      if (ext === 'png' && window._gallerySaver) {
        const base64 = await blobToBase64(blob);
        const galleryPath = window._gallerySaver.savePng(base64, filename);
        return { success: true, path: `相册: ${galleryPath}` };
      }
      // 系统分享面板
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        pdf: 'application/pdf',
        svg: 'image/svg+xml',
        csv: 'text/csv',
        json: 'application/json',
      };
      const file = new File([blob], filename, { type: mimeMap[ext] || 'application/octet-stream' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return { success: true, path: `已通过系统分享面板发送: ${filename}` };
      }
      // Tauri 插件降级（移动端写入应用缓存目录）
      if (isTauri) {
        const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        const arrayBuffer = await blob.arrayBuffer();
        await writeFile(filename, new Uint8Array(arrayBuffer), { baseDir: BaseDirectory.AppCache });
        return { success: true, path: `应用缓存目录: ${filename}` };
      }
      // 最终降级：浏览器下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a);
      a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      return { success: true, path: `浏览器下载: ${filename}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '移动端保存失败' };
    }
  }

  // ---- 桌面 Tauri：原生保存对话框 ----
  if (isTauri) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');

      const extMap: Record<string, string> = {
        png: 'PNG 图片', pdf: 'PDF 文档', svg: 'SVG 矢量图',
        csv: 'CSV 表格', json: 'JSON 数据',
      };

      const path = await save({
        defaultPath: filename,
        filters: [{ name: extMap[ext] || ext, extensions: [ext] }],
      });

      if (path) {
        const arrayBuffer = await blob.arrayBuffer();
        await writeFile(path, new Uint8Array(arrayBuffer));
        return { success: true, path };
      }
      return { success: false, error: '用户取消了保存' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '桌面端保存失败' };
    }
  }

  // ---- 浏览器环境：传统下载 ----
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a);
    a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    return { success: true, path: `浏览器下载: ${filename}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '浏览器下载失败' };
  }
}

// 文件选择适配
export async function selectImage(): Promise<File | null> {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readFile } = await import('@tauri-apps/plugin-fs');

    const file = await open({
      multiple: false,
      directory: false,
      filters: [
        { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
      ],
    });

    if (file && typeof file === 'string') {
      const data = await readFile(file);
      const blob = new Blob([data]);
      const filename = file.split('/').pop() || file.split('\\').pop() || 'image.png';
      return new File([blob], filename, { type: 'image/png' });
    }
    return null;
  } else {
    // 浏览器环境：使用 input[type="file"]
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0] || null;
        resolve(file);
      };
      input.click();
    });
  }
}
