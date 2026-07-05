/**
 * Tauri 环境适配层
 * 统一处理浏览器环境和 Tauri 桌面环境的差异
 */

// 检测是否在 Tauri 环境
export const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// 检测是否为移动端
export const isMobile = (): boolean => {
  if (!isTauri) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).__TAURI_METADATA__?.platform === 'android' ||
         (window as any).__TAURI_METADATA__?.platform === 'ios';
};

// 文件保存适配（Tauri 原生对话框 / 移动端分享 / 浏览器下载）
export async function saveFile(blob: Blob, filename: string): Promise<void> {
  if (!isTauri) {
    // 浏览器环境：使用传统下载
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // Tauri 桌面：原生保存对话框 + 文件写入
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const platform = (window as any).__TAURI_METADATA__?.platform || '';

  if (platform === 'android' || platform === 'ios') {
    // 移动端：通过系统分享面板，用户可选择保存到文件、发送等
    const ext = filename.split('.').pop() || '';
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
    } else {
      // 降级：写入应用缓存目录 + 提示
      const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(filename, new Uint8Array(arrayBuffer), { baseDir: BaseDirectory.AppCache });
      alert(`文件已保存到应用缓存目录（可通过文件管理器查看）：${filename}`);
    }
    return;
  }

  // 桌面 Tauri：原生保存对话框
  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeFile } = await import('@tauri-apps/plugin-fs');

  const fext = filename.split('.').pop() || '';
  const extMap: Record<string, string> = {
    png: 'PNG 图片',
    pdf: 'PDF 文档',
    svg: 'SVG 矢量图',
    csv: 'CSV 表格',
    json: 'JSON 数据',
  };

  const path = await save({
    defaultPath: filename,
    filters: [{ name: extMap[fext] || fext, extensions: [fext] }],
  });

  if (path) {
    const arrayBuffer = await blob.arrayBuffer();
    await writeFile(path, new Uint8Array(arrayBuffer));
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
