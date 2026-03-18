const { BrowserWindow } = require('electron');

/**
 * 浏览器窗口管理器
 * 管理多个由 AI 控制的浏览器窗口
 */
class BrowserManager {
  constructor() {
    // 存储浏览器窗口实例
    this.browsers = new Map();
  }

  /**
   * 创建新的浏览器窗口
   * @param {string} id - 浏览器窗口唯一标识
   * @param {Object} options - 窗口选项
   * @returns {BrowserWindow}
   */
  createBrowser(id, options = {}) {
    // 如果已存在，先关闭旧窗口
    if (this.browsers.has(id)) {
      console.log(`Browser ${id} already exists, closing old one...`);
      this.closeBrowser(id);
    }

    const {
      width = 1280,
      height = 1024,
      show = true,
      parent = null,
      x = undefined,
      y = undefined
    } = options;

    const browser = new BrowserWindow({
      width,
      height,
      x,
      y,
      show,
      parent,
      title: `CoPaw Browser - ${id}`,
      backgroundColor: '#ffffff',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        // 允许 Playwright 通过 CDP 控制
        enableRemoteModule: false,
        // 禁用同源策略以便 Playwright 更好控制
        webSecurity: false
      }
    });

    // 初始加载空白页
    browser.loadURL('about:blank');

    // 监听窗口关闭事件
    browser.on('closed', () => {
      console.log(`Browser ${id} closed`);
      this.browsers.delete(id);
    });

    // 监听页面加载事件（用于调试）
    browser.webContents.on('did-finish-load', () => {
      console.log(`Browser ${id} loaded: ${browser.webContents.getURL()}`);
    });

    // 监听控制台消息（可选，用于调试）
    browser.webContents.on('console-message', (event, level, message, line, sourceId) => {
      const levels = ['verbose', 'info', 'warning', 'error'];
      console.log(`[Browser ${id} Console ${levels[level]}] ${message}`);
    });

    // 存储窗口实例
    this.browsers.set(id, browser);
    console.log(`✅ Created browser window: ${id} (${width}x${height}, show: ${show})`);

    return browser;
  }

  /**
   * 获取指定浏览器窗口
   * @param {string} id - 浏览器窗口 ID
   * @returns {BrowserWindow|null}
   */
  getBrowser(id) {
    return this.browsers.get(id) || null;
  }

  /**
   * 获取所有浏览器窗口
   * @returns {Array<[string, BrowserWindow]>}
   */
  getAllBrowsers() {
    return Array.from(this.browsers.entries());
  }

  /**
   * 关闭指定浏览器窗口
   * @param {string} id - 浏览器窗口 ID
   */
  closeBrowser(id) {
    const browser = this.browsers.get(id);
    if (browser && !browser.isDestroyed()) {
      browser.close();
    }
    this.browsers.delete(id);
  }

  /**
   * 关闭所有浏览器窗口
   */
  closeAll() {
    console.log(`Closing ${this.browsers.size} browser windows...`);
    for (const [id, browser] of this.browsers.entries()) {
      if (!browser.isDestroyed()) {
        browser.close();
      }
    }
    this.browsers.clear();
  }

  /**
   * 显示浏览器窗口
   * @param {string} id - 浏览器窗口 ID
   */
  showBrowser(id) {
    const browser = this.browsers.get(id);
    if (browser && !browser.isDestroyed()) {
      browser.show();
      browser.focus();
    }
  }

  /**
   * 隐藏浏览器窗口
   * @param {string} id - 浏览器窗口 ID
   */
  hideBrowser(id) {
    const browser = this.browsers.get(id);
    if (browser && !browser.isDestroyed()) {
      browser.hide();
    }
  }

  /**
   * 获取浏览器窗口数量
   * @returns {number}
   */
  getCount() {
    return this.browsers.size;
  }

  /**
   * 检查浏览器是否存在
   * @param {string} id - 浏览器窗口 ID
   * @returns {boolean}
   */
  hasBrowser(id) {
    return this.browsers.has(id);
  }
}

// 导出单例
module.exports = new BrowserManager();
