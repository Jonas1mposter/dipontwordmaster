import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// 隐藏启动画面（在 App 完成首次渲染后）
const hideSplash = async () => {
  try {
    // 动态导入，避免 web 构建时报错
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    // Web 环境或未安装时忽略错误
  }
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 延迟隐藏启动画面，确保首屏已渲染
setTimeout(hideSplash, 500);
