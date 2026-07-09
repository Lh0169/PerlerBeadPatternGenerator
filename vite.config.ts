import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Tauri 构建 (--mode tauri) 时将插件打包进 bundle，Web 构建时 external
      external: mode === 'tauri' ? [] : ['@tauri-apps/plugin-dialog', '@tauri-apps/plugin-fs'],
    },
  },
}))
