import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // tauri 模式使用相对路径，确保 Android APK file:///android_asset/ 下资源能正确加载
  base: mode === 'tauri' ? './' : '/',
  server: { port: 5173 },
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Tauri 构建 (--mode tauri) 时将插件打包进 bundle，Web 构建时 external
      external: mode === 'tauri' ? [] : ['@tauri-apps/plugin-dialog', '@tauri-apps/plugin-fs'],
    },
  },
}))
