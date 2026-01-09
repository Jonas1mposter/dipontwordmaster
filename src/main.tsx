import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// 检测运行环境
const isCapacitor = typeof window !== 'undefined' && 
  'Capacitor' in window && 
  (window as any).Capacitor?.isNativePlatform?.();

// 隐藏启动画面（仅在 Capacitor 原生环境中）
const hideSplash = async () => {
  // 仅在 Capacitor 原生环境中执行
  if (!isCapacitor) return;
  
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    // 忽略错误
  }
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 仅在 Capacitor 环境中延迟隐藏启动画面
if (isCapacitor) {
  setTimeout(hideSplash, 500);
}
