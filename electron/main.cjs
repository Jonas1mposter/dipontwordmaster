const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// 保持对窗口对象的全局引用
let mainWindow;

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

  // 始终尝试加载开发服务器
  const devUrl = 'http://localhost:8080';
  
  console.log('正在加载:', devUrl);
  
  mainWindow.loadURL(devUrl).catch((err) => {
    console.error('加载失败，尝试加载本地文件:', err.message);
    // 如果开发服务器加载失败，尝试加载打包文件
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch((e) => {
      console.error('本地文件也加载失败:', e.message);
    });
  });

  // 总是打开开发者工具以便调试
  mainWindow.webContents.openDevTools();

  // 监听加载完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('页面加载完成');
  });

  // 监听加载失败事件
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription);
  });

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
