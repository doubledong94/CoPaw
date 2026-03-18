# CoPaw Electron Desktop - Development Guide

完整的开发、测试和调试指南。

## 目录

- [环境准备](#环境准备)
- [开发流程](#开发流程)
- [测试步骤](#测试步骤)
- [常见问题](#常见问题)
- [调试技巧](#调试技巧)

---

## 环境准备

### 系统要求

- **操作系统**: Windows 10+, macOS 11+, 或 Linux (Ubuntu 20.04+)
- **Node.js**: 18.0+ (推荐 LTS 版本)
- **Python**: 3.11+
- **npm**: 9.0+

### 安装依赖

```bash
# 1. 安装 Node.js 依赖
cd electron-desktop
npm install

# 2. 安装 Python 依赖（开发模式需要）
cd ..
pip install -e .

# 或者如果你使用虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -e .
```

### 验证安装

```bash
# 验证 Node.js
node --version  # 应该 >= 18.0.0
npm --version   # 应该 >= 9.0.0

# 验证 Python
python --version  # 应该 >= 3.11.0
python -c "import copaw; print(copaw.__version__.__version__)"

# 验证 Electron
npx electron --version
```

---

## 开发流程

### 第一次运行

首次运行需要准备构建产物：

```bash
cd electron-desktop

# 运行准备脚本
# 这会：
# 1. 构建 React 前端
# 2. 复制前端到 electron-desktop/console/dist/
# 3. 复制 Python 代码到 electron-desktop/python/
npm run prepare
```

**预期输出：**
```
🔧 Preparing Electron Desktop build...

📦 Building frontend...
   Running: cd /path/to/CoPaw/console && npm run build
   ... (Vite build output) ...
✅ Frontend built successfully

📋 Copying frontend dist...
✅ Copied frontend (XX files/folders)

🐍 Copying Python code...
✅ Copied Python code to: /path/to/electron-desktop/python/copaw

📝 Creating Python package files...
✅ Created Python package files

✅ Preparation complete!

Next steps:
  - Development: npm start
  - Build for Windows: npm run build:win
  - Pack Python (for production): npm run pack:python
```

### 启动开发服务器

```bash
npm start
```

**启动过程：**

1. **Electron 主进程启动**
   ```
   🚀 CoPaw Desktop starting...
   Platform: darwin
   Electron version: 28.0.0
   Chrome version: 120.0.6099.109
   CDP Port: 9222
   ```

2. **Python 后端启动**
   ```
   🐍 Starting Python backend...
   Python executable: python3
   Python code path: /path/to/electron-desktop/python
   ⏳ Waiting for backend on port 8088...
   [Python] INFO:     Started server process [12345]
   [Python] INFO:     Uvicorn running on http://127.0.0.1:8088
   ✅ Python backend is ready!
   ```

3. **主窗口创建**
   ```
   🖥️  Creating main window...
   ✅ Main window ready!
   ✅ CoPaw Desktop started successfully!
   ```

4. **浏览器窗口预创建**
   ```
   ✅ Created browser window: ai-browser-default (1280x1024, show: false)
   ```

### 开发中的代码修改

#### 修改前端代码

前端代码修改后需要重新构建：

```bash
cd ../console
npm run build
cd ../electron-desktop
npm run prepare  # 重新复制前端产物
npm start        # 重启 Electron
```

**提示：** 也可以单独复制前端产物：
```bash
rm -rf console/dist
cp -r ../console/dist console/
npm start
```

#### 修改 Python 代码

Python 代码修改后：

**方式 1：** 如果使用 `pip install -e .`（推荐）
```bash
# 无需重新安装，代码修改会立即生效
npm start  # 只需重启 Electron
```

**方式 2：** 如果没有使用 editable install
```bash
cd ..
pip install .  # 重新安装
cd electron-desktop
npm start
```

#### 修改 Electron 代码

Electron 代码（`electron/` 目录）修改后：

```bash
npm start  # 直接重启即可
```

---

## 测试步骤

### 阶段 1：基础功能测试

#### 1.1 验证 CDP 连接

启动应用后，检查终端日志：

```bash
# 应该看到这些日志
[Python] 🔗 Electron mode detected, connecting to CDP: http://localhost:9222
[Python] ✅ Successfully connected to Electron browser via CDP
[Python] 📋 Using existing browser context with 1 pages
```

#### 1.2 测试控制台界面

1. 主窗口应该显示 CoPaw 控制台
2. 界面应该正常加载，无白屏
3. 可以看到聊天界面和侧边栏

#### 1.3 测试浏览器控制

在控制台输入以下命令测试：

**测试 1：打开网页**
```
请帮我打开 https://www.example.com
```

**预期结果：**
- 看到新的浏览器窗口打开
- 窗口标题显示 "CoPaw Browser - ai-browser-default"
- 页面加载 example.com

**测试 2：截图**
```
请对当前页面截图
```

**预期结果：**
- 截图保存成功
- 可以在工作目录看到截图文件

**测试 3：获取页面信息**
```
这个页面上有什么内容？
```

**预期结果：**
- AI 能够读取页面内容
- 返回页面上的文本信息

### 阶段 2：高级功能测试

#### 2.1 多窗口测试

```
请打开两个不同的网页：
1. https://www.example.com
2. https://www.google.com
```

**预期结果：**
- 创建两个独立的浏览器窗口
- 每个窗口有唯一的 page_id

#### 2.2 表单交互测试

```
请访问 https://httpbin.org/forms/post
然后填写表单并提交
```

**预期结果：**
- 能够定位表单元素
- 能够输入文本
- 能够点击提交按钮

#### 2.3 错误处理测试

```
请访问 https://invalid-domain-12345.com
```

**预期结果：**
- 优雅地处理错误
- 返回明确的错误信息
- 不会导致应用崩溃

### 阶段 3：稳定性测试

#### 3.1 长时间运行测试

1. 启动应用
2. 执行多个浏览器操作（至少 10 次）
3. 检查内存占用是否正常
4. 检查是否有内存泄漏

**监控命令（macOS/Linux）：**
```bash
# 监控 Electron 进程
ps aux | grep electron

# 监控 Python 进程
ps aux | grep python
```

**监控命令（Windows）：**
```powershell
# 任务管理器查看 CoPaw.exe 和 python.exe 内存占用
```

#### 3.2 退出清理测试

1. 关闭主窗口
2. 检查所有进程是否正常退出

**验证命令：**
```bash
# macOS/Linux
ps aux | grep -E "electron|python"

# Windows
tasklist | findstr /i "copaw python"
```

**预期结果：**
- 所有 Electron 进程退出
- Python 子进程正常终止
- 浏览器窗口全部关闭

---

## 常见问题

### 问题 1：端口被占用

**错误：**
```
❌ Port 8088 is already in use!
```

**解决方案：**

```bash
# macOS/Linux：查找占用端口的进程
lsof -i :8088
kill -9 <PID>

# Windows：查找并终止进程
netstat -ano | findstr :8088
taskkill /PID <PID> /F

# 或者修改端口
# 编辑 electron/main.js，修改 BACKEND_PORT
```

### 问题 2：Python 启动失败

**错误：**
```
Failed to start Python process
```

**调试步骤：**

1. **检查 Python 可执行文件：**
   ```bash
   which python3  # macOS/Linux
   where python   # Windows
   ```

2. **检查 CoPaw 是否安装：**
   ```bash
   python -c "import copaw; print('OK')"
   ```

3. **手动测试 Python 后端：**
   ```bash
   cd python
   python -m copaw app --port 8088
   ```

4. **查看详细日志：**
   - 检查终端的 `[Python Error]` 输出
   - 查看 Python traceback

### 问题 3：前端显示空白

**可能原因：**
- 前端未构建
- 前端路径错误
- Python 后端未启动

**解决方案：**

1. **检查前端文件：**
   ```bash
   ls -la console/dist/
   # 应该看到 index.html, assets/ 等文件
   ```

2. **重新准备：**
   ```bash
   npm run prepare
   ```

3. **检查浏览器控制台：**
   - 主窗口打开 DevTools（自动打开，或按 Cmd+Option+I / Ctrl+Shift+I）
   - 查看 Console 和 Network 标签

### 问题 4：Playwright CDP 连接失败

**错误：**
```
❌ Failed to connect to Electron CDP at http://localhost:9222
```

**解决方案：**

1. **检查 CDP 端口：**
   ```bash
   # macOS/Linux
   lsof -i :9222

   # Windows
   netstat -ano | findstr :9222
   ```

2. **验证 Electron 启动参数：**
   - 检查 `electron/main.js` 中的：
     ```javascript
     app.commandLine.appendSwitch('remote-debugging-port', '9222');
     ```

3. **测试 CDP 端点：**
   ```bash
   curl http://localhost:9222/json/version
   ```

   **预期响应：**
   ```json
   {
     "Browser": "Chrome/120.0.6099.109",
     "Protocol-Version": "1.3",
     "User-Agent": "...",
     "WebKit-Version": "...",
     "webSocketDebuggerUrl": "ws://localhost:9222/..."
   }
   ```

### 问题 5：环境变量未传递

**症状：**
- Python 没有检测到 Electron 模式
- Playwright 启动了独立浏览器而不是连接 CDP

**验证：**

在 Python 代码中添加调试日志：
```python
import os
print("COPAW_ELECTRON_MODE:", os.environ.get("COPAW_ELECTRON_MODE"))
print("COPAW_CDP_URL:", os.environ.get("COPAW_CDP_URL"))
```

**解决方案：**
- 检查 `electron/main.js` 的 `env` 配置
- 确保子进程正确继承环境变量

---

## 调试技巧

### Electron 主进程调试

**方法 1：Console.log**
```javascript
// electron/main.js
console.log('Debug info:', someVariable);
```

**方法 2：Chrome DevTools（高级）**
```bash
# 启动时添加调试参数
electron --inspect=5858 .

# 然后在 Chrome 打开
chrome://inspect
```

### Python 后端调试

**方法 1：日志级别**
```bash
# 修改 electron/main.js 中的启动参数
'--log-level', 'debug'
```

**方法 2：远程调试（VSCode）**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Remote Attach",
      "type": "python",
      "request": "attach",
      "connect": {
        "host": "localhost",
        "port": 5678
      },
      "pathMappings": [
        {
          "localRoot": "${workspaceFolder}/python",
          "remoteRoot": "."
        }
      ]
    }
  ]
}
```

然后在 Python 代码中：
```python
import debugpy
debugpy.listen(5678)
debugpy.wait_for_client()  # 可选：等待调试器连接
```

### 前端调试

主窗口自动打开 DevTools（开发模式）：
- **Console**: 查看 JavaScript 日志和错误
- **Network**: 监控 API 请求
- **Elements**: 检查 DOM 结构
- **Sources**: 设置断点调试

### 浏览器窗口调试

AI 控制的浏览器窗口也可以打开 DevTools：

```javascript
// electron/browser-manager.js
// 在 createBrowser 方法中添加
browser.webContents.openDevTools();
```

---

## 性能优化

### 启动速度优化

1. **延迟加载：** 非关键功能延迟初始化
2. **并行启动：** Python 后端和前端资源并行加载
3. **缓存：** 缓存常用数据

### 内存优化

1. **及时关闭页面：** 不用的浏览器页面及时关闭
2. **限制并发：** 限制同时打开的浏览器窗口数量
3. **清理监听器：** 页面关闭时移除事件监听器

---

## 下一步

开发测试完成后，参考以下文档进行打包：

1. **打包 Python 环境：** 参考 [README.md](README.md#打包生产版本) 的 "打包 Python 环境" 部分
2. **构建安装包：** 参考 [README.md](README.md#windows) 的 "Windows" 部分
3. **测试安装包：** 在干净的系统上测试安装和运行

---

## 贡献

发现问题或有改进建议？欢迎提交 Issue 或 Pull Request！

- **Issues**: https://github.com/agentscope-ai/CoPaw/issues
- **Discussions**: https://github.com/agentscope-ai/CoPaw/discussions
