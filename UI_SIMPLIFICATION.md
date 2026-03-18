# UI简化改动说明

## 改动概述

将AI对话页面和被控制的浏览器页面从两个独立窗口合并为一个窗口,AI对话界面简化为右侧侧边栏。

## 主要改动

### 1. 新增组件

- **`console/src/components/ChatSidebar/`** - 简化的聊天侧边栏组件
  - `index.tsx` - 聊天组件,隐藏了会话列表
  - `index.module.less` - 样式文件,通过CSS隐藏左侧会话面板

### 2. 新增布局

- **`console/src/layouts/BrowserLayout/`** - 浏览器+聊天的组合布局
  - `index.tsx` - 使用webview嵌入浏览器,右侧显示聊天侧边栏
  - `index.module.less` - 响应式布局样式

### 3. 修改文件

- **`console/src/App.tsx`** - 检测Electron环境,使用新布局
- **`console/src/vite-env.d.ts`** - 添加Electron和webview的TypeScript类型定义
- **`electron-desktop/electron/main.js`** - 启用webviewTag,注释掉独立浏览器窗口创建
- **`electron-desktop/electron/preload.js`** - 暴露`window.electron`对象用于环境检测

## 布局结构


┌─────────────────────────────────────────────────────┐
│                   CoPaw Desktop                      │
├──────────────────────────────┬──────────────────────┤
│                              │                      │
│                              │   AI对话侧边栏        │
│     浏览器视图区域            │   (ChatSidebar)      │
│     (webview)                │                      │
│                              │   - 模型选择器        │
│                              │   - 消息列表          │
│                              │   - 输入框            │
│                              │                      │
└──────────────────────────────┴──────────────────────┘
     70%宽度                        30%宽度(可调整)


## 测试步骤

1. 构建前端代码:

cd console
npm install
npm run build


2. 启动Electron开发环境:

# macOS/Linux
./start-electron-dev.sh

# Windows
start-electron-dev.bat


3. 验证功能:
   - 主窗口应该显示左右分栏布局
   - 右侧显示AI对话界面(无左侧会话列表)
   - 左侧为浏览器视图区域(webview)
   - 可以在右侧输入消息与AI对话
   - AI控制的浏览器操作应该显示在左侧webview中

## 最小改动原则

- ✅ 保留原有的`MainLayout`用于非Electron环境
- ✅ 通过环境检测自动切换布局
- ✅ 复用原有的Chat页面逻辑
- ✅ 只隐藏会话列表,不修改核心聊天功能
- ✅ 使用标准的webview标签嵌入浏览器

## 注意事项

1. webview需要在Electron主进程中启用`webviewTag: true`
2. 浏览器控制需要通过CDP协议连接到webview
3. 如果需要恢复独立浏览器窗口,取消注释`main.js`中的相关代码
