# 狄邦单词通 - macOS 桌面应用构建指南

本文档详细说明如何将狄邦单词通构建为 macOS 桌面应用。

## 前置要求

- **Node.js** 18.x 或更高版本
- **npm** 9.x 或更高版本
- **macOS** 系统（用于构建 macOS 应用）
- **Git**

## 步骤 1: 克隆项目

```bash
# 如果目录已存在，先删除
rm -rf dipontwordmaster

# 克隆项目
git clone https://github.com/YOUR_USERNAME/dipontwordmaster.git
cd dipontwordmaster
```

## 步骤 2: 安装依赖

```bash
# 安装项目依赖
npm install

# 安装 Electron 相关依赖
npm install --save-dev electron electron-builder concurrently wait-on
```

## 步骤 3: 修改 package.json

在 `package.json` 文件中添加以下配置：

### 3.1 添加 main 入口点

在 `package.json` 的顶层添加：

```json
{
  "main": "electron/main.js",
  ...
}
```

### 3.2 添加构建脚本

在 `scripts` 部分添加以下脚本：

```json
{
  "scripts": {
    ...
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:8080 && electron .\"",
    "electron:build": "npm run build && electron-builder --mac"
  }
}
```

### 3.3 完整的 package.json 修改示例

```json
{
  "name": "dipontwordmaster",
  "version": "1.0.0",
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:8080 && electron .\"",
    "electron:build": "npm run build && electron-builder --mac"
  },
  ...
}
```

## 步骤 4: 准备应用图标

将应用图标放置在 `assets` 目录中：

```bash
# 创建 assets 目录（如果不存在）
mkdir -p assets

# 复制 logo 作为应用图标（需要 1024x1024 PNG）
cp public/logo.png assets/icon.png
```

### 图标要求

- **格式**: PNG
- **尺寸**: 1024 x 1024 像素
- **位置**: `assets/icon.png`

如需创建专业的 macOS 图标，可以使用以下工具：
- [Icon Generator](https://appicon.co/)
- [MakeAppIcon](https://makeappicon.com/)

## 步骤 5: 开发模式运行

```bash
npm run electron:dev
```

这将同时启动：
1. Vite 开发服务器（端口 8080）
2. Electron 应用窗口

## 步骤 6: 构建发布版本

```bash
npm run electron:build
```

构建完成后，输出文件位于 `release` 目录：

```
release/
├── 狄邦单词通-1.0.0.dmg          # DMG 安装包
├── 狄邦单词通-1.0.0-mac.zip      # ZIP 压缩包
└── mac-universal/                 # 未压缩的应用
    └── 狄邦单词通.app
```

## 项目结构

确保项目包含以下 Electron 相关文件：

```
dipontwordmaster/
├── electron/
│   ├── main.js                    # Electron 主进程
│   ├── preload.js                 # 预加载脚本
│   ├── electron-builder.json      # 构建配置
│   └── entitlements.mac.plist     # macOS 权限配置
├── assets/
│   ├── icon.png                   # 应用图标 (1024x1024)
│   └── splash.png                 # 启动画面（可选）
├── package.json
└── ...
```

## 常见问题

### Q1: 构建时提示找不到 electron

确保已安装 Electron：
```bash
npm install --save-dev electron
```

### Q2: 应用无法打开，提示"来自身份不明的开发者"

首次打开时，右键点击应用，选择"打开"，然后在弹出的对话框中点击"打开"。

或者在终端中运行：
```bash
xattr -cr /Applications/狄邦单词通.app
```

### Q3: 图标不显示

确保：
1. `assets/icon.png` 存在
2. 图标尺寸为 1024 x 1024 像素
3. 清除构建缓存后重新构建：
```bash
rm -rf release
npm run electron:build
```

### Q4: 开发模式下白屏

检查 Vite 开发服务器是否正常运行在 8080 端口。如果使用其他端口，需要修改：
- `electron/main.js` 中的 `loadURL`
- `package.json` 中的 `wait-on` 参数

### Q5: 构建失败 "Error: Cannot find module 'electron'"

尝试删除 node_modules 并重新安装：
```bash
rm -rf node_modules package-lock.json
npm install
npm install --save-dev electron electron-builder concurrently wait-on
```

## 代码签名（可选）

如需分发应用，建议进行代码签名：

1. 获取 Apple 开发者账号
2. 在 Xcode 中创建开发者证书
3. 修改 `electron/electron-builder.json` 添加签名配置：

```json
{
  "mac": {
    "identity": "Developer ID Application: Your Name (TEAM_ID)",
    "hardenedRuntime": true,
    "gatekeeperAssess": false
  }
}
```

## 自动更新（可选）

如需添加自动更新功能，可以集成 `electron-updater`：

```bash
npm install electron-updater
```

然后在 `electron/main.js` 中添加更新检查逻辑。

---

## 快速命令参考

| 命令 | 说明 |
|------|------|
| `npm install` | 安装项目依赖 |
| `npm run electron:dev` | 开发模式运行 |
| `npm run electron:build` | 构建 macOS 应用 |

---

如有问题，请参考 [Electron 官方文档](https://www.electronjs.org/docs) 或 [electron-builder 文档](https://www.electron.build/)。
