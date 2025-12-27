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
      preload: path.join(__dirname, 'preload.cjs'),
      // 允许 SVG 和内联样式正确渲染
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // 设置 CSP 允许 inline SVG 和样式
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' https: wss:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com data:; " +
          "img-src 'self' data: blob: https:; " +
          "connect-src 'self' https: wss:;"
        ]
      }
    });
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
    // app.getAppPath() 返回 app.asar 根目录
    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, 'dist', 'index.html');
    
    console.log('App Path:', appPath);
    console.log('Index Path:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));
    
    // 如果文件不存在，尝试备用路径
    let finalPath = indexPath;
    if (!fs.existsSync(indexPath)) {
      // 尝试 __dirname 相对路径
      const altPath = path.join(__dirname, '..', 'dist', 'index.html');
      console.log('Alt Path:', altPath);
      if (fs.existsSync(altPath)) {
        finalPath = altPath;
      }
    }
    
    mainWindow.loadFile(finalPath).catch((err) => {
      console.error('本地文件加载失败:', err.message);
      // 显示错误信息给用户
      mainWindow.loadURL(`data:text/html,<h1>加载失败</h1><p>路径: ${finalPath}</p><p>错误: ${err.message}</p>`);
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
