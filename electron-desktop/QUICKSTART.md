# CoPaw Electron Desktop - 快速开始

5 分钟快速启动 CoPaw Desktop 开发环境。

## 🚀 快速开始（开发模式）

### 前置条件检查

确保已安装：
- ✅ Node.js 18+ (`node --version`)
- ✅ Python 3.11+ (`python --version`)
- ✅ npm 9+ (`npm --version`)

### 三步启动

```bash
# 第一步：安装依赖
cd electron-desktop
npm install

# 第二步：安装 CoPaw Python 包（使用可编辑模式）
cd ..
pip install -e .

# 第三步：准备并启动
cd electron-desktop
npm run prepare
npm start
```

就是这样！应用会自动启动，你会看到：
- 🖥️ 主窗口：CoPaw 控制台
- 🌐 后台运行：Python FastAPI 服务器
- 🔗 自动连接：Playwright → Electron CDP

## 📝 验证安装

启动后，在控制台输入：

```
请帮我打开 https://www.example.com
```

如果看到新的浏览器窗口打开并加载 example.com，说明一切正常！✅

## 🔧 开发工作流

### 修改代码后的操作

| 修改内容 | 操作 |
|---------|------|
| **Electron 代码** (`electron/*.js`) | 重启：`npm start` |
| **Python 代码** (`src/copaw/`) | 重启：`npm start`（如果用了 `pip install -e .`） |
| **前端代码** (`console/`) | `npm run prepare` → `npm start` |

### 常用命令

```bash
npm start           # 启动开发模式
npm run prepare     # 重新复制前端和 Python 代码
npm run build:win   # 构建 Windows 安装包
```

## 🐛 遇到问题？

### 端口被占用
```bash
# 查找占用 8088 端口的进程
lsof -i :8088       # macOS/Linux
netstat -ano | findstr :8088  # Windows

# 终止进程
kill -9 <PID>       # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Python 找不到 copaw 模块
```bash
# 确认安装
pip list | grep copaw

# 重新安装
cd ..
pip install -e .
```

### 前端显示空白
```bash
# 重新构建前端
cd ../console
npm run build
cd ../electron-desktop
npm run prepare
npm start
```

## 📚 更多文档

- **详细开发指南**: [DEVELOPMENT.md](DEVELOPMENT.md)
- **完整 README**: [README.md](README.md)
- **改造方案文档**: [../ELECTRON_TRANSFORMATION_PLAN.md](../ELECTRON_TRANSFORMATION_PLAN.md)

## 🎯 下一步

1. **测试基本功能**: 打开网页、截图、表单填写
2. **修改代码**: 尝试修改一些功能
3. **构建安装包**: `npm run pack:python` → `npm run build:win`

## 💡 提示

- **开发模式**使用系统 Python，修改代码立即生效（使用 `pip install -e .`）
- **生产模式**使用打包的 Python，需要运行 `npm run pack:python`
- Electron 会自动打开 DevTools，方便调试前端
- 终端会显示所有日志：`[Python]` 前缀的是 Python 后端日志

祝开发愉快！🎉
