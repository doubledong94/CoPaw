/**
 * Preload 脚本
 * 在渲染进程加载前执行，用于安全地暴露部分 Electron API 给前端
 *
 * 遵循 Electron 安全最佳实践：
 * - nodeIntegration: false
 * - contextIsolation: true
 * - 通过 contextBridge 暴露有限的 API
 */

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electron', {
  /**
   * 获取 CDP 调试端口 URL
   */
  getCdpUrl: () => ipcRenderer.invoke('get-cdp-url'),

  /**
   * 创建新的浏览器窗口
   * @param {Object} options - 窗口选项
   */
  createBrowser: (options) => ipcRenderer.invoke('create-browser', options),

  /**
   * 获取所有浏览器窗口列表
   */
  getBrowserList: () => ipcRenderer.invoke('get-browser-list'),

  /**
   * 打开模型设置页面
   */
  openModelSettings: () => ipcRenderer.invoke('open-model-settings'),

  /**
   * 平台信息
   */
  platform: process.platform,

  /**
   * 是否为打包环境
   */
  isPackaged: process.env.NODE_ENV === 'production'
});

// 保留原有的 electronAPI (向后兼容)
contextBridge.exposeInMainWorld('electronAPI', {
  getCdpUrl: () => ipcRenderer.invoke('get-cdp-url'),
  createBrowser: (options) => ipcRenderer.invoke('create-browser', options),
  getBrowserList: () => ipcRenderer.invoke('get-browser-list'),
  openModelSettings: () => ipcRenderer.invoke('open-model-settings'),
  platform: process.platform,
  isPackaged: process.env.NODE_ENV === 'production'
});

// 注入一些环境信息到 window 对象
contextBridge.exposeInMainWorld('copawDesktop', {
  version: '1.0.0',
  electronMode: true,
  platform: process.platform
});

console.log('✅ Preload script loaded');

