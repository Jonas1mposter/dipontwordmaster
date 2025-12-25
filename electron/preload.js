const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 平台信息
  platform: process.platform,
  
  // 应用版本
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // 窗口控制
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  
  // 系统通知
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  
  // 文件操作
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  
  // 剪贴板
  copyToClipboard: (text) => ipcRenderer.send('copy-to-clipboard', text),
  
  // 检查更新
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // 监听事件
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback)
});

// 通知主进程渲染进程已就绪
window.addEventListener('DOMContentLoaded', () => {
  console.log('Electron preload script loaded');
});
