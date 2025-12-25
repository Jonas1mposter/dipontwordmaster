# 狄邦单词通 - macOS 桌面应用构建指南

本文档详细说明如何在本地构建 macOS 桌面应用程序。

## 前置要求

- **Node.js**: 18.x 或更高版本
- **npm**: 9.x 或更高版本
- **macOS**: 用于构建 macOS 应用
- **Git**: 用于克隆仓库

## 第一步：克隆仓库

```bash
git clone <你的仓库地址>
cd <项目目录名>
```

> 如果目录已存在，先删除或进入目录拉取最新代码：
> ```bash
> rm -rf <项目目录名>
> # 或
> cd <项目目录名> && git pull origin main
> ```

## 第二步：安装项目依赖

```bash
npm install
```

## 第三步：安装 Electron 相关依赖

```bash
npm install --save-dev electron electron-builder concurrently wait-on
```

## 第四步：修改 package.json

在 `package.json` 中添加以下配置：

### 4.1 添加 main 入口

在 `"name"` 字段后添加：

```json
{
  "name": "your-project-name",
  "main": "electron/main.js",
  ...
}
```

### 4.2 添加构建脚本

在 `"scripts"` 中添加：

```json
{
  "scripts": {
    ...
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:8080 && electron .\"",
    "electron:build": "npm run build && electron-builder --config electron/electron-builder.json"
  }
}
```

### 完整 package.json 示例修改

```json
{
  "name": "dipontwordmaster",
  "private": true,
  "version": "1.0.0",
  "main": "electron/main.js",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:8080 && electron .\"",
    "electron:build": "npm run build && electron-builder --config electron/electron-builder.json"
  },
  ...
}
```

## 第五步：准备应用图标

将应用图标放置在 `assets/` 目录下：

```bash
# 确保 assets 目录存在
mkdir -p assets

# 复制 logo 作为图标（需要 1024x1024 PNG）
cp public/logo.png assets/icon.png
```

> **图标要求**：
> - 格式：PNG
> - 尺寸：1024 x 1024 像素
> - 用于生成 macOS 的 .icns 图标文件

## 第六步：开发模式运行

```bash
npm run electron:dev
```

这将同时启动 Vite 开发服务器和 Electron 应用，支持热重载。

## 第七步：构建生产版本

```bash
npm run electron:build
```

构建完成后，输出文件位于：

```
release/
├── 狄邦单词通-1.0.0.dmg          # macOS 安装包
├── 狄邦单词通-1.0.0-mac.zip      # macOS 压缩包
└── mac/
    └── 狄邦单词通.app            # macOS 应用
```

## 项目结构说明

```
项目根目录/
├── electron/
│   ├── main.js              # Electron 主进程
│   ├── preload.js           # 预加载脚本
│   ├── electron-builder.json # 构建配置
│   └── entitlements.mac.plist # macOS 权限配置
├── assets/
│   ├── icon.png             # 应用图标 (1024x1024)
│   └── splash.png           # 启动画面（可选）
├── dist/                    # Vite 构建输出
└── release/                 # Electron 构建输出
```

## 常见问题

### Q: 构建时提示找不到图标文件

确保 `assets/icon.png` 存在且为 1024x1024 像素的 PNG 文件。

### Q: 应用无法启动，显示白屏

1. 确保先运行 `npm run build` 生成 `dist/` 目录
2. 检查 `electron/main.js` 中的路径配置

### Q: 如何更改应用名称

修改 `electron/electron-builder.json` 中的 `productName` 字段。

### Q: 代码签名问题

如需分发应用，需要 Apple Developer 账户进行代码签名：

1. 获取开发者证书
2. 修改 `electron-builder.json` 中的签名配置
3. 设置环境变量 `CSC_LINK` 和 `CSC_KEY_PASSWORD`

## 开发调试

在开发模式下，可以使用以下快捷键：

- `Cmd + Option + I` - 打开开发者工具
- `Cmd + R` - 刷新页面
- `Cmd + Q` - 退出应用

## 更新日志

- **v1.0.0** - 初始版本，支持 macOS 桌面应用
