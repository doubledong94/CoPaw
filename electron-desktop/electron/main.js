const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const browserManager = require('./browser-manager');

// 关键：启用 Chrome DevTools Protocol (CDP)
// 这允许 Playwright 通过 CDP 连接到 Electron 的浏览器窗口
const CDP_PORT = 9222;
app.commandLine.appendSwitch('remote-debugging-port', String(CDP_PORT));

let pythonProcess = null;
let mainWindow = null;
let browserView = null; // AI 控制的浏览器视图
const BACKEND_PORT = 8088;

/**
 * 获取 Python 可执行文件路径
 * 开发环境：使用系统 Python
 * 生产环境：使用打包的嵌入式 Python
 */
function getPythonPath() {
  if (app.isPackaged) {
    // 生产环境：从 resources 目录获取嵌入式 Python
    const platform = process.platform;
    if (platform === 'win32') {
      return path.join(process.resourcesPath, 'python-embed', 'python.exe');
    } else if (platform === 'darwin') {
      return path.join(process.resourcesPath, 'python-embed', 'bin', 'python3');
    } else {
      return path.join(process.resourcesPath, 'python-embed', 'bin', 'python3');
    }
  } else {
    // 开发环境：使用系统 Python
    return process.platform === 'win32' ? 'python' : 'python3';
  }
}

/**
 * 获取 Python 代码路径
 */
function getPythonCodePath() {
  if (app.isPackaged) {
    // 生产环境：从解包的 asar 获取
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'python');
  } else {
    // 开发环境：使用本地 python 目录
    return path.join(__dirname, '..', 'python');
  }
}

/**
 * 获取前端静态文件路径（console/dist）
 */
function getConsolePath() {
  if (app.isPackaged) {
    // 生产环境：从 asar 或解包目录获取
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'console', 'dist');
  } else {
    // 开发环境：使用本地 console/dist 目录
    return path.join(__dirname, '..', 'console', 'dist');
  }
}

/**
 * 检查端口是否可用
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * 等待端口就绪
 */
function waitForPort(port, timeout = 30000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const checkPort = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for port ${port}`));
        return;
      }

      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.on('timeout', () => {
        socket.destroy();
        setTimeout(checkPort, 500);
      });

      socket.on('error', () => {
        socket.destroy();
        setTimeout(checkPort, 500);
      });

      socket.connect(port, '127.0.0.1');
    };

    checkPort();
  });
}

/**
 * 启动 Python FastAPI 后端
 */
async function startPythonBackend() {
  console.log('🐍 Starting Python backend...');

  // 检查端口是否被占用
  const portAvailable = await isPortAvailable(BACKEND_PORT);
  if (!portAvailable) {
    console.error(`❌ Port ${BACKEND_PORT} is already in use!`);
    throw new Error(`Port ${BACKEND_PORT} is already in use`);
  }

  const pythonPath = getPythonPath();
  const pythonCodePath = getPythonCodePath();

  // 获取前端静态文件路径
  const consolePath = getConsolePath();

  console.log(`Python executable: ${pythonPath}`);
  console.log(`Python code path: ${pythonCodePath}`);
  console.log(`Console static path: ${consolePath}`);

  // 启动 Python 子进程
  pythonProcess = spawn(pythonPath, [
    '-m', 'copaw', 'app',
    '--host', '127.0.0.1',
    '--port', String(BACKEND_PORT),
    '--log-level', 'info'
  ], {
    env: {
      ...process.env,
      // 关键环境变量：告诉 Python 使用 Electron 模式
      COPAW_ELECTRON_MODE: '1',
      COPAW_CDP_URL: `http://localhost:${CDP_PORT}`,
      // 设置前端静态文件路径（注意：Python 代码中期望的是 COPAW_CONSOLE_STATIC_DIR）
      COPAW_CONSOLE_STATIC_DIR: consolePath,
      // 设置 Python 路径
      PYTHONPATH: pythonCodePath,
      PYTHONUNBUFFERED: '1',
      // 禁用 Playwright 浏览器下载（我们使用 Electron 的浏览器）
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1'
    },
    cwd: pythonCodePath
  });

  // 处理 Python 输出
  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[Python] ${output}`);
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`[Python Error] ${output}`);
    }
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
    pythonProcess = null;
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python process:', err);
    throw err;
  });

  // 等待后端就绪
  console.log(`⏳ Waiting for backend on port ${BACKEND_PORT}...`);
  await waitForPort(BACKEND_PORT);
  console.log('✅ Python backend is ready!');
}

/**
 * 创建 AI 控制的 BrowserView
 */
function createBrowserView() {
  console.log('🌐 Creating BrowserView for AI control...');

  browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // 允许 Playwright 更好地控制
      allowRunningInsecureContent: false
    }
  });

  // 初始加载空白页
  browserView.webContents.loadURL('about:blank');

  // 监听页面加载事件
  browserView.webContents.on('did-finish-load', () => {
    const url = browserView.webContents.getURL();
    console.log(`BrowserView loaded: ${url}`);

    // 通知前端页面已加载
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser-view-loaded', url);
    }
  });

  // 监听控制台消息
  browserView.webContents.on('console-message', (event, level, message) => {
    const levels = ['verbose', 'info', 'warning', 'error'];
    console.log(`[BrowserView Console ${levels[level]}] ${message}`);
  });

  console.log('✅ BrowserView created successfully');
  return browserView;
}

/**
 * 更新 BrowserView 的位置和大小
 */
function updateBrowserViewBounds() {
  if (!mainWindow || !browserView || mainWindow.isDestroyed()) {
    return;
  }

  const bounds = mainWindow.getBounds();
  const sidebarWidth = 450; // 侧边栏宽度，与 BrowserLayout CSS 保持一致

  // BrowserView 占据左侧区域，右侧留给侧边栏
  browserView.setBounds({
    x: 0,
    y: 0,
    width: bounds.width - sidebarWidth,
    height: bounds.height
  });
}

/**
 * 创建主窗口（控制台界面）
 */
function createMainWindow() {
  console.log('🖥️  Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'CoPaw',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    show: false // 等待加载完成后再显示
  });

  // 加载前端界面
  const frontendUrl = `http://127.0.0.1:${BACKEND_PORT}`;
  mainWindow.loadURL(frontendUrl);

  // 窗口加载完成后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Main window ready!');

    // 创建并添加 BrowserView
    createBrowserView();
    mainWindow.setBrowserView(browserView);
    updateBrowserViewBounds();
  });

  // 窗口大小改变时更新 BrowserView 边界
  mainWindow.on('resize', () => {
    updateBrowserViewBounds();
  });

  // 打开开发者工具（开发环境）
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    if (browserView) {
      browserView.webContents.close();
      browserView = null;
    }
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * 创建加载启动画面（可选）
 */
function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false
    }
  });

  // 可以加载一个简单的 HTML 启动画面
  splash.loadURL(`data:text/html;charset=utf-8,
    <html>
      <body style="margin:0;padding:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#1890ff;">
        <div style="text-align:center;color:white;">
          <h1>CoPaw</h1>
          <p>Loading...</p>
        </div>
      </body>
    </html>
  `);

  return splash;
}

/**
 * 清理资源
 */
function cleanup() {
  console.log('🧹 Cleaning up...');

  // 关闭所有浏览器窗口
  browserManager.closeAll();

  // 终止 Python 进程
  if (pythonProcess && !pythonProcess.killed) {
    console.log('Terminating Python process...');
    pythonProcess.kill('SIGTERM');

    // 如果 5 秒后还没退出，强制杀死
    setTimeout(() => {
      if (pythonProcess && !pythonProcess.killed) {
        console.log('Force killing Python process...');
        pythonProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

/**
 * 应用启动入口
 */
app.whenReady().then(async () => {
  try {
    console.log('🚀 CoPaw Desktop starting...');
    console.log(`Platform: ${process.platform}`);
    console.log(`Electron version: ${process.versions.electron}`);
    console.log(`Chrome version: ${process.versions.chrome}`);
    console.log(`CDP Port: ${CDP_PORT}`);

    // 可选：显示启动画面
    // const splash = createSplashWindow();

    // 启动 Python 后端
    await startPythonBackend();

    // 创建主窗口
    createMainWindow();

    // 不再预创建独立的浏览器窗口
    // AI将通过webview在主窗口中控制浏览器
    // 如果需要,可以通过IPC动态创建额外的浏览器窗口
    /*
    const aiBrowser = browserManager.createBrowser('ai-browser-default', {
      width: 1280,
      height: 1024,
      show: true,
      parent: null
    });
    */

    console.log('✅ CoPaw Desktop started successfully!');

    // 关闭启动画面
    // if (splash) splash.close();

  } catch (error) {
    console.error('❌ Failed to start CoPaw Desktop:', error);
    app.quit();
  }
});

// macOS：所有窗口关闭后不退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanup();
    app.quit();
  }
});

// macOS：点击 dock 图标重新激活
app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

// 应用退出前清理
app.on('before-quit', (event) => {
  cleanup();
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// IPC 通信：前端可以通过这些接口与主进程交互
ipcMain.handle('get-cdp-url', () => {
  return `http://localhost:${CDP_PORT}`;
});

ipcMain.handle('create-browser', (event, options) => {
  const id = options.id || `browser-${Date.now()}`;
  const browser = browserManager.createBrowser(id, options);
  return { id, success: true };
});

ipcMain.handle('get-browser-list', () => {
  return browserManager.getAllBrowsers().map(([id, browser]) => ({
    id,
    title: browser.getTitle(),
    visible: browser.isVisible()
  }));
});

// 更新 BrowserView 边界（用于响应前端布局变化）
ipcMain.handle('update-browser-view-bounds', (event, { sidebarWidth }) => {
  if (!mainWindow || !browserView || mainWindow.isDestroyed()) {
    return { success: false, error: 'Window or BrowserView not available' };
  }

  const bounds = mainWindow.getBounds();
  browserView.setBounds({
    x: 0,
    y: 0,
    width: bounds.width - (sidebarWidth || 450),
    height: bounds.height
  });

  return { success: true };
});

// 获取 BrowserView URL
ipcMain.handle('get-browser-view-url', () => {
  if (browserView && !browserView.webContents.isDestroyed()) {
    return browserView.webContents.getURL();
  }
  return 'about:blank';
});

console.log('Electron main process initialized.');


