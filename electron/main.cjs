const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 保持对窗口对象的全局引用
let mainWindow;

// 检测是否为开发模式
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '狄邦单词通',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  if (isDev) {
    // 开发模式：加载开发服务器
    console.log('开发模式：加载 http://localhost:8080');
    mainWindow.loadURL('http://localhost:8080').catch((err) => {
      console.error('开发服务器加载失败:', err.message);
    });
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载打包后的文件
    // 在打包后的 app 中，__dirname 指向 app.asar/electron/
    // 需要使用 app.getAppPath() 获取正确路径
    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, 'dist', 'index.html');
    console.log('生产模式：加载', indexPath);
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('本地文件加载失败:', err.message);
    });
  }

  // 在默认浏览器中打开外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
