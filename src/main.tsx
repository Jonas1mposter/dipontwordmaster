import React from "react";
import { createRoot } from "react-dom/client";
import { SplashScreen } from "@capacitor/splash-screen";
import App from "./App.tsx";
import "./index.css";

// 隐藏启动画面（在 App 完成首次渲染后）
const hideSplash = async () => {
  try {
    await SplashScreen.hide();
  } catch {
    // Web 环境下忽略错误
  }
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 延迟隐藏启动画面，确保首屏已渲染
setTimeout(hideSplash, 500);
