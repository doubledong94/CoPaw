# CoPaw Electron Desktop

将 CoPaw 打包为独立的桌面应用，支持 Windows/macOS/Linux。

## 特性

- ✅ 单一安装包，无需安装 Python/Node.js
- ✅ Playwright 控制 Electron 内嵌浏览器
- ✅ 完整保留所有 CoPaw 功能
- ✅ 跨平台支持

## 架构

```
Electron App
├── 主窗口：CoPaw 控制台（React 前端）
├── 内嵌浏览器：AI 控制的浏览器窗口
├── Python 后端：FastAPI + Playwright
└── CDP 桥接：Playwright ←→ Electron
```

## 开发

### 前置要求

- Node.js 18+
- Python 3.11+（开发环境）
- npm 或 yarn

### 安装依赖

```bash
cd electron-desktop
npm install
```

### 准备构建产物

首次运行前，需要复制前端和 Python 代码：

```bash
npm run prepare
```

这个命令会：
1. 构建 React 前端（`console/`）
2. 复制前端产物到 `electron-desktop/console/dist/`
3. 复制 Python 代码到 `electron-desktop/python/`

### 开发模式运行

```bash
npm start
```

这会：
1. 启动 Electron 主进程
2. 自动启动 Python FastAPI 后端
3. 打开主窗口显示控制台界面
4. Playwright 通过 CDP 连接到 Electron 浏览器

**注意：** 开发模式使用系统的 Python，确保已安装 CoPaw：

```bash
# 在项目根目录
pip install -e .
```

### 调试

- **前端调试**：主窗口会自动打开 DevTools
- **Python 调试**：查看终端输出的 `[Python]` 日志
- **Electron 调试**：查看终端输出

## 打包生产版本

### Windows

1. 打包 Python 环境（仅第一次或依赖更新时）：

```bash
npm run pack:python
```

这会下载 Python Embedded 并安装所有依赖到 `python-embed/` 目录（约 5-10 分钟）。

2. 构建 Windows 安装包：

```bash
npm run build:win
```

输出：`dist/CoPaw-Setup-1.0.0.exe`（约 200-250MB）

### macOS

```bash
npm run build:mac
```

输出：`dist/CoPaw-1.0.0.dmg`

### Linux

```bash
npm run build:linux
```

输出：`dist/CoPaw-1.0.0.AppImage`

## 项目结构

```
electron-desktop/
├── package.json              # Electron 项目配置
├── electron/                 # Electron 主进程
│   ├── main.js              # 主进程入口
│   ├── preload.js           # 安全桥接
│   └── browser-manager.js   # 浏览器窗口管理
├── scripts/                  # 构建脚本
│   ├── prepare.js           # 准备脚本（复制文件）
│   └── pack-python.js       # Python 打包脚本
├── assets/                   # 应用资源
│   ├── icon.ico             # Windows 图标
│   ├── icon.icns            # macOS 图标
│   └── icon.png             # Linux 图标
├── console/                  # 前端构建产物
│   └── dist/
├── python/                   # Python 代码
│   └── copaw/
├── python-embed/             # 嵌入式 Python（仅打包时）
└── dist/                     # 最终安装包
```

## 工作原理

### Electron 启动流程

1. **Electron 主进程启动**
   - 开启 CDP 端口：`--remote-debugging-port=9222`
   - 启动 Python 子进程：`python -m copaw app`
   - 传递环境变量：
     - `COPAW_ELECTRON_MODE=1`
     - `COPAW_CDP_URL=http://localhost:9222`

2. **Python 后端启动**
   - FastAPI 服务启动在 `localhost:8088`
   - 检测到 `COPAW_ELECTRON_MODE`，Playwright 使用 CDP 模式
   - 连接到 Electron 的 CDP 端点

3. **前端加载**
   - 主窗口加载 `http://localhost:8088`
   - 显示 CoPaw 控制台界面

4. **浏览器控制**
   - 用户在控制台发送指令
   - Python 通过 Playwright 连接到 Electron 浏览器窗口
   - AI 控制内嵌浏览器执行操作

### 关键修改点

**Python 端（`src/copaw/agents/tools/browser_control.py`）：**

```python
# 检测 Electron 模式
if os.environ.get('COPAW_ELECTRON_MODE') == '1':
    cdp_url = os.environ.get('COPAW_CDP_URL', 'http://localhost:9222')
    browser = await playwright.chromium.connect_over_cdp(cdp_url)
else:
    # 原有逻辑：启动独立浏览器
    browser = await playwright.chromium.launch(...)
```

**Electron 端（`electron/main.js`）：**

```javascript
// 启用 CDP
app.commandLine.appendSwitch('remote-debugging-port', '9222');

// 启动 Python 时传递环境变量
env: {
  COPAW_ELECTRON_MODE: '1',
  COPAW_CDP_URL: 'http://localhost:9222'
}
```

## 常见问题

### 1. 端口被占用

**错误：** `Port 8088 is already in use`

**解决：** 检查是否有其他 CoPaw 实例运行，或修改 `electron/main.js` 中的 `BACKEND_PORT`。

### 2. Python 启动失败

**错误：** `Failed to start Python process`

**解决：**
- 开发模式：确保系统安装了 Python 3.11+ 和 CoPaw
- 生产模式：确保 `python-embed/` 目录存在且完整

### 3. Playwright 无法连接 CDP

**错误：** `Failed to connect to Electron CDP`

**解决：**
- 检查 CDP 端口 9222 是否被占用
- 检查 Electron 是否正确启动了 CDP

### 4. 前端显示空白

**解决：**
- 检查 `console/dist/` 是否存在
- 运行 `npm run prepare` 重新复制文件
- 检查 Python 后端是否正常启动（查看终端日志）

## 性能优化

1. **启动速度**：使用启动画面掩盖 Python 启动时间
2. **内存占用**：关闭不用的浏览器窗口
3. **安装包大小**：移除不必要的 Python 依赖

## 安全性

- ✅ `contextIsolation: true` - 隔离渲染进程
- ✅ `nodeIntegration: false` - 禁用 Node.js 集成
- ✅ `webSecurity: true` - 启用 Web 安全策略
- ✅ Preload 脚本仅暴露必要的 API

## 贡献

请参考主项目的 [CONTRIBUTING.md](../CONTRIBUTING.md)。

## 许可证

Apache License 2.0 - 详见 [LICENSE](../LICENSE)。
