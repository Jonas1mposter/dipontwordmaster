import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // 使用相对路径，让 Electron 打包后能正确加载资源
  base: './',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // 确保资源路径正确
    assetsDir: 'assets',
    // 生成 sourcemap 便于调试
    sourcemap: mode === 'development',
    rollupOptions: {
      // Capacitor 插件在原生环境中由 Capacitor 运行时提供，web/Electron 构建时跳过
      external: [
        '@capacitor/splash-screen',
        '@capacitor/status-bar',
        '@capacitor/core',
      ],
      output: {
        // 确保动态导入的模块正确分割
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  // 优化依赖预构建
  optimizeDeps: {
    exclude: ['@capacitor/splash-screen', '@capacitor/status-bar', '@capacitor/core'],
  },
}));
