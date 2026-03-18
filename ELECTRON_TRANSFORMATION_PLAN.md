# CoPaw Electron Desktop 改造方案

## 📋 改造目标

将 CoPaw 从前后端分离架构改造为 **Electron 桌面应用**，实现：
- ✅ 单一 Windows 安装包（.exe）
- ✅ 无需安装 Python、Node.js 等依赖
- ✅ Playwright 控制 Electron **内嵌浏览器**（非外部浏览器）
- ✅ 保留所有现有功能，最小化代码改动

---

## 🏗️ 架构设计

### 最终架构

```
┌──────────────────────────────────────────────────┐
│  Electron App (CoPaw.exe)                       │
│                                                  │
│  ┌────────────────────┐  ┌────────────────────┐ │
│  │ 主窗口 (控制台)     │  │ 内嵌浏览器窗口      │ │
│  │ React前端界面      │  │ (BrowserWindow)    │ │
│  │                    │  │                    │ │
│  │ localhost:8088     │  │ ← Playwright控制   │ │
│  └────────────────────┘  └────────────────────┘ │
│                                                  │
│  Electron Main Process                          │
│  ├─ 启动 Python 子进程                           │
│  ├─ 开启 CDP 端点 (localhost:9222)              │
│  └─ 管理内嵌浏览器窗口                           │
│                                                  │
│  Python Backend (子进程)                         │
│  ├─ FastAPI Server (localhost:8088)             │
│  └─ Playwright ───(CDP)───┘                     │
│     (连接到 Electron CDP，不启动新浏览器)        │
└──────────────────────────────────────────────────┘
```

### 关键技术点

1. **Electron 开启 CDP (Chrome DevTools Protocol)**
   - 启动参数添加 `--remote-debugging-port=9222`
   - Electron 的 BrowserWindow 暴露 CDP 接口

2. **Playwright 连接 Electron**
   - 使用 `playwright.chromium.connect_over_cdp()` 连接到 Electron
   - 不再使用 `playwright.chromium.launch()` 启动新浏览器

3. **Python 嵌入式打包**
   - 使用 Python Embedded 版本（~50MB）
   - 预安装所有依赖到 `site-packages`
   - 不需要用户系统安装 Python

---

## 📂 项目结构

```
CoPaw/
├── electron-desktop/              # 新增：Electron 桌面应用目录
│   ├── package.json              # Electron 项目配置
│   ├── electron/                 # Electron 主进程代码
│   │   ├── main.js              # 主进程入口
│   │   ├── preload.js           # 安全桥接
│   │   └── browser-manager.js   # 浏览器窗口管理
│   ├── scripts/                  # 构建脚本
│   │   ├── pack-python.js       # 打包 Python 环境
│   │   └── build.js             # 构建流程
│   ├── assets/                   # 应用资源
│   │   ├── icon.ico             # Windows 图标
│   │   ├── icon.icns            # macOS 图标
│   │   └── icon.png             # Linux 图标
│   ├── console/                  # 前端构建产物（从 ../console/dist 复制）
│   │   └── dist/
│   ├── python/                   # Python 代码（从 ../src/copaw 复制）
│   │   └── copaw/
│   ├── python-embed/             # 嵌入式 Python 环境（构建时生成）
│   │   ├── python.exe
│   │   ├── python311.dll
│   │   └── Lib/
│   └── dist/                     # 最终打包产物
│       └── CoPaw-Setup-1.0.0.exe
│
├── src/copaw/                     # 原 Python 后端（需微调）
│   └── agents/tools/
│       └── browser_control.py    # 修改：支持 Electron CDP 模式
│
├── console/                       # 原 React 前端（无需修改）
│   └── ...
│
└── ELECTRON_TRANSFORMATION_PLAN.md  # 本文档
```

---

## 🔧 代码改动清单

### 1. 新增文件（Electron 部分）

#### `electron-desktop/package.json`
- Electron 项目配置
- 依赖：electron, electron-builder, express
- 构建配置：electron-builder 打包规则

#### `electron-desktop/electron/main.js`
- Electron 主进程入口
- 启动 Python 子进程
- 开启 CDP 调试端口（9222）
- 创建主窗口（控制台）
- 管理浏览器窗口生命周期

#### `electron-desktop/electron/browser-manager.js`
- 管理多个内嵌浏览器窗口
- 提供创建、获取、销毁浏览器窗口的 API
- 支持 headless 模式

#### `electron-desktop/electron/preload.js`
- 安全隔离层（Electron 安全最佳实践）
- 暴露有限的 API 给渲染进程

#### `electron-desktop/scripts/pack-python.js`
- 下载 Python Embedded 版本
- 安装 CoPaw 及所有依赖
- 打包到 `python-embed/` 目录

#### `electron-desktop/scripts/build.js`
- 自动化构建流程
- 复制前端构建产物
- 复制 Python 代码
- 调用 electron-builder 打包

---

### 2. 修改现有文件

#### `src/copaw/agents/tools/browser_control.py`

**修改位置：** 浏览器启动逻辑

**原代码（约第 123 行）：**
```python
async def _launch_browser(self):
    browser = await self.playwright.chromium.launch(
        executable_path=self.executable_path,
        headless=self.headless,
        args=self.launch_args,
    )
    return browser
```

**修改后：**
```python
async def _launch_browser(self):
    # 检查是否在 Electron 模式
    if os.environ.get('COPAW_ELECTRON_MODE') == '1':
        cdp_url = os.environ.get('COPAW_CDP_URL', 'http://localhost:9222')
        try:
            # 连接到 Electron 的 CDP
            browser = await self.playwright.chromium.connect_over_cdp(cdp_url)
            logger.info(f"✅ Connected to Electron browser via CDP: {cdp_url}")
            return browser
        except Exception as e:
            logger.error(f"Failed to connect to Electron CDP: {e}")
            raise
    else:
        # 原有逻辑：启动独立浏览器
        browser = await self.playwright.chromium.launch(
            executable_path=self.executable_path,
            headless=self.headless,
            args=self.launch_args,
        )
        return browser
```

**改动说明：**
- 新增环境变量检测：`COPAW_ELECTRON_MODE` 和 `COPAW_CDP_URL`
- Electron 模式下使用 `connect_over_cdp()` 连接现有浏览器
- 非 Electron 模式保持原有逻辑不变
- **其他所有代码（navigate, screenshot, snapshot 等）完全不需要修改**

---

### 3. 无需修改的部分

- ✅ `console/` 前端代码：完全不需要修改
- ✅ `src/copaw/app/` FastAPI 路由：完全不需要修改
- ✅ `src/copaw/agents/` Agent 逻辑：除 browser_control.py 外不需要修改
- ✅ `src/copaw/config/` 配置管理：完全不需要修改

---

## 🚀 实施步骤

### 阶段 1：Electron 基础搭建（第 1 天）

**时间：** 4-6 小时

**任务：**
1. 创建 `electron-desktop/` 目录结构
2. 编写 `package.json` 和依赖配置
3. 实现 `electron/main.js` 主进程
4. 实现 `electron/browser-manager.js` 浏览器管理器
5. 实现 `electron/preload.js` 安全桥接
6. 本地测试：`npm start` 启动 Electron

**验收标准：**
- Electron 窗口成功启动
- CDP 端口 9222 正常开启
- 能够创建多个 BrowserWindow

---

### 阶段 2：Playwright 对接 Electron（第 2 天）

**时间：** 4-6 小时

**任务：**
1. 修改 `src/copaw/agents/tools/browser_control.py`
2. 添加 Electron 模式检测逻辑
3. 实现 `connect_over_cdp()` 连接
4. 本地测试：Python 连接到 Electron CDP

**测试脚本：**
```python
import asyncio
import os
from playwright.async_api import async_playwright

async def test_electron_connection():
    os.environ['COPAW_ELECTRON_MODE'] = '1'
    os.environ['COPAW_CDP_URL'] = 'http://localhost:9222'

    playwright = await async_playwright().start()
    browser = await playwright.chromium.connect_over_cdp('http://localhost:9222')

    # 获取或创建页面
    contexts = browser.contexts
    if contexts:
        page = contexts[0].pages[0] if contexts[0].pages else await contexts[0].new_page()
    else:
        context = await browser.new_context()
        page = await context.new_page()

    # 测试导航
    await page.goto('https://www.example.com')
    print(f"✅ Title: {await page.title()}")

    # 测试截图
    await page.screenshot(path='test.png')
    print("✅ Screenshot saved")

    await browser.close()

asyncio.run(test_electron_connection())
```

**验收标准：**
- Playwright 成功连接到 Electron CDP
- 能够控制 Electron 窗口导航
- 截图、snapshot 等功能正常

---

### 阶段 3：集成现有代码（第 3 天）

**时间：** 6-8 小时

**任务：**
1. 构建前端：`cd console && npm run build`
2. 复制前端到 `electron-desktop/console/dist/`
3. 复制 Python 代码到 `electron-desktop/python/`
4. 修改 Electron 主进程启动 FastAPI 子进程
5. 测试完整流程

**Electron 启动 Python 示例：**
```javascript
const { spawn } = require('child_process');
const path = require('path');

function startPythonBackend() {
  const pythonPath = app.isPackaged
    ? path.join(process.resourcesPath, 'python-embed', 'python.exe')
    : 'python';

  const pythonProcess = spawn(pythonPath, [
    '-m', 'copaw', 'app',
    '--host', '127.0.0.1',
    '--port', '8088'
  ], {
    env: {
      ...process.env,
      COPAW_ELECTRON_MODE: '1',
      COPAW_CDP_URL: 'http://localhost:9222',
      PYTHONPATH: path.join(__dirname, '..', 'python')
    }
  });

  return pythonProcess;
}
```

**验收标准：**
- Electron 主窗口加载 `http://localhost:8088`
- 前端界面正常显示
- AI 能够控制内嵌浏览器窗口

---

### 阶段 4：Python 环境打包（第 4 天）

**时间：** 6-8 小时

**任务：**
1. 编写 `scripts/pack-python.js`
2. 下载 Python 3.11 Embedded（约 30MB）
3. 安装 pip 到嵌入式环境
4. 安装 CoPaw 依赖：`copaw`, `playwright`, `fastapi` 等
5. 注意：**不安装 Playwright 浏览器**（因为用 Electron 的 Chromium）

**pack-python.js 示例：**
```javascript
const { execSync } = require('child_process');
const fs = require('fs-extra');
const https = require('https');
const path = require('path');
const { Extract } = require('unzipper');

async function packPython() {
  const pythonVersion = '3.11.7';
  const pythonUrl = `https://www.python.org/ftp/python/${pythonVersion}/python-${pythonVersion}-embed-amd64.zip`;
  const embedDir = path.join(__dirname, '..', 'python-embed');

  console.log('📦 Downloading Python Embedded...');
  // 下载并解压

  console.log('📦 Installing pip...');
  execSync(`${embedDir}\\python.exe -m ensurepip`, { stdio: 'inherit' });

  console.log('📦 Installing CoPaw and dependencies...');
  const requirements = [
    'copaw',
    'playwright>=1.49.0',
    // ... 其他依赖
  ];

  for (const pkg of requirements) {
    execSync(
      `${embedDir}\\python.exe -m pip install ${pkg} -t ${embedDir}\\Lib\\site-packages`,
      { stdio: 'inherit' }
    );
  }

  console.log('✅ Python environment packed successfully!');
}

packPython().catch(console.error);
```

**验收标准：**
- `python-embed/` 目录包含完整 Python 环境
- 所有依赖已安装到 `site-packages`
- 大小约 150-200MB

---

### 阶段 5：electron-builder 打包配置（第 5 天）

**时间：** 4-6 小时

**任务：**
1. 配置 `package.json` 的 `build` 字段
2. 准备应用图标（icon.ico）
3. 配置 NSIS 安装程序选项
4. 设置 `extraResources`（python-embed）
5. 设置 `asarUnpack`（Python 代码）
6. 执行打包：`npm run build:win`

**关键配置：**
```json
{
  "build": {
    "extraResources": [
      {
        "from": "python-embed",
        "to": "python-embed"
      }
    ],
    "asarUnpack": [
      "python/**/*"
    ],
    "files": [
      "electron/**/*",
      "console/dist/**/*",
      "python/**/*"
    ]
  }
}
```

**验收标准：**
- 生成 `dist/CoPaw-Setup-1.0.0.exe`
- 安装包大小约 200-250MB
- 安装程序可以正常运行

---

### 阶段 6：测试与优化（第 6 天）

**时间：** 6-8 小时

**任务：**
1. 在干净的 Windows 系统测试安装
2. 验证无需安装任何依赖即可运行
3. 测试所有浏览器控制功能
4. 优化启动速度
5. 处理边缘情况（端口占用、进程清理等）
6. 编写用户文档

**测试清单：**
- [ ] 安装程序正常运行
- [ ] 应用启动无报错
- [ ] 控制台界面正常显示
- [ ] AI 能控制内嵌浏览器
- [ ] 截图功能正常
- [ ] 多窗口/多标签正常
- [ ] 关闭应用时 Python 进程正常退出
- [ ] 卸载后无残留文件

---

## 📊 工作量评估

| 阶段 | 任务 | 预计时间 | 难度 |
|------|------|----------|------|
| 1 | Electron 基础搭建 | 4-6h | ⭐⭐ |
| 2 | Playwright 对接 | 4-6h | ⭐⭐⭐ |
| 3 | 集成现有代码 | 6-8h | ⭐⭐ |
| 4 | Python 环境打包 | 6-8h | ⭐⭐⭐ |
| 5 | electron-builder 配置 | 4-6h | ⭐⭐ |
| 6 | 测试与优化 | 6-8h | ⭐⭐⭐ |
| **总计** | | **30-42h** | **4-6 天** |

---

## 🎯 预期成果

### 最终交付物

```
CoPaw-Setup-1.0.0.exe        # Windows 安装程序（~220MB）
├── 包含 Electron + Chromium (~150MB)
├── 包含 Python Embedded + 依赖 (~70MB)
└── 包含应用代码和前端资源
```

### 用户体验

1. **下载安装：**
   - 用户下载 `CoPaw-Setup-1.0.0.exe`
   - 双击安装，选择安装路径
   - 约 1-2 分钟完成安装

2. **启动使用：**
   - 桌面快捷方式或开始菜单启动
   - 首次启动约 5-10 秒（启动 Python 后端）
   - 看到主窗口（控制台界面）

3. **AI 控制浏览器：**
   - 在控制台发送指令
   - 自动打开内嵌浏览器窗口
   - AI 实时控制浏览器操作
   - 用户可以看到浏览器操作过程

4. **完全离线：**
   - 无需安装 Python
   - 无需安装 Chrome/Edge
   - 无需安装 Node.js
   - 无需任何外部依赖

---

## 🔐 技术优势

### 1. 最小改动
- Python 业务代码改动 < 10 行
- 前端代码 0 改动
- Playwright 功能 100% 保留

### 2. 完全内嵌
- 浏览器运行在 Electron 内部
- 不依赖系统浏览器
- 统一的用户体验

### 3. 单一安装包
- 一个 .exe 文件
- 包含所有依赖
- 开箱即用

### 4. 跨平台潜力
- 同样的架构可以打包 macOS (.dmg)
- 同样的架构可以打包 Linux (.AppImage)
- 只需修改 electron-builder 配置

---

## 🐛 潜在问题与解决方案

### 问题 1：CDP 端口冲突

**现象：** 如果系统上已有程序占用 9222 端口

**解决方案：**
```javascript
// 动态查找可用端口
function findAvailablePort(startPort = 9222) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}
```

### 问题 2：Python 进程清理

**现象：** Electron 退出后 Python 进程未终止

**解决方案：**
```javascript
// 监听所有退出信号
const exitSignals = ['exit', 'SIGINT', 'SIGTERM', 'SIGQUIT'];
exitSignals.forEach(signal => {
  process.on(signal, () => {
    if (pythonProcess && !pythonProcess.killed) {
      pythonProcess.kill('SIGTERM');
    }
  });
});
```

### 问题 3：首次启动慢

**现象：** Python 后端启动需要 5-10 秒

**解决方案：**
```javascript
// 显示启动加载界面
const splashWindow = new BrowserWindow({
  width: 400,
  height: 300,
  transparent: true,
  frame: false
});
splashWindow.loadFile('splash.html');

// 后端就绪后关闭加载界面
await waitForBackendReady();
splashWindow.close();
mainWindow.show();
```

### 问题 4：Playwright 浏览器下载

**现象：** 首次运行可能尝试下载 Playwright 浏览器

**解决方案：**
```bash
# 打包时设置环境变量，禁用 Playwright 浏览器下载
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# 或在代码中设置
os.environ['PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD'] = '1'
```

---

## 📚 参考文档

- [Electron 官方文档](https://www.electronjs.org/docs/latest/)
- [electron-builder 文档](https://www.electron.build/)
- [Playwright CDP 文档](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Python Embedded 版本](https://www.python.org/downloads/windows/)

---

## 📝 待办事项

- [ ] 阶段 1：Electron 基础搭建
- [ ] 阶段 2：Playwright 对接
- [ ] 阶段 3：集成现有代码
- [ ] 阶段 4：Python 环境打包
- [ ] 阶段 5：electron-builder 配置
- [ ] 阶段 6：测试与优化

---

## ✅ 验收标准

最终交付物需满足：

1. **功能完整性**
   - 所有原有功能正常工作
   - Playwright 控制内嵌浏览器
   - 前端界面无异常

2. **独立性**
   - 无需安装 Python
   - 无需安装浏览器
   - 无需任何外部依赖

3. **易用性**
   - 单一 .exe 安装包
   - 一键安装
   - 启动速度 < 15 秒

4. **稳定性**
   - 无内存泄漏
   - 进程正常清理
   - 错误处理完善

---

**文档版本：** v1.0
**更新日期：** 2026-03-13
**作者：** Claude Code
