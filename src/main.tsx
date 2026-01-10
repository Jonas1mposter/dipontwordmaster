import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 隐藏启动画面（仅在 Capacitor 原生环境中）
// 使用 window.Capacitor 检测，避免在 web 环境中导入 @capacitor/core
if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
  import("@capacitor/splash-screen")
    .then(({ SplashScreen }) => {
      setTimeout(() => SplashScreen.hide(), 500);
    })
    .catch(() => {
      // 忽略错误 - 可能未安装 splash-screen 插件
    });
}
