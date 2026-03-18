#!/bin/bash

# CoPaw Electron Desktop - 开发环境一键启动脚本

set -e  # 遇到错误立即退出

echo "🚀 CoPaw Electron Desktop - 开发环境启动"
echo "========================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js"
    echo "请安装 Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误：未找到 Python"
    echo "请安装 Python 3.11+ from https://www.python.org/"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ Python: $(python3 --version)"
echo ""

# 第一步：安装 Node.js 依赖
echo "📦 第一步：安装 Node.js 依赖..."
cd electron-desktop
if [ ! -d "node_modules" ]; then
    echo "   运行 npm install..."
    npm install
    echo "   ✅ 依赖安装完成"
else
    echo "   ✅ 依赖已存在，跳过安装"
fi
echo ""

# 第二步：检查并安装 Python 包
echo "🐍 第二步：安装 CoPaw Python 包..."
cd ..

# 使用虚拟环境的 Python
if [ -n "$VIRTUAL_ENV" ]; then
    echo "   检测到虚拟环境: $VIRTUAL_ENV"
    PYTHON_CMD="python"
    PIP_CMD="pip"
else
    PYTHON_CMD="python3"
    PIP_CMD="pip3"
fi

echo "   Python 路径: $(which $PYTHON_CMD)"
echo "   正在安装 CoPaw (editable mode)..."

# 安装 CoPaw
$PIP_CMD install -e . || {
    echo "   ❌ 安装失败！"
    echo "   请检查 Python 环境和依赖"
    exit 1
}

# 验证安装
if $PYTHON_CMD -c "import copaw" 2>/dev/null; then
    echo "   ✅ CoPaw 包安装成功"

    # 尝试获取版本（可能会失败，不影响使用）
    VERSION=$($PYTHON_CMD -c "try:
    import copaw
    print(copaw.__version__.__version__)
except:
    print('unknown')" 2>/dev/null)

    if [ "$VERSION" != "unknown" ] && [ -n "$VERSION" ]; then
        echo "   版本: $VERSION"
    fi
else
    echo "   ❌ 验证失败：无法导入 copaw 模块"
    exit 1
fi
echo ""

# 第三步：准备构建产物
echo "🔧 第三步：准备构建产物..."
cd electron-desktop

# 检查前端是否已构建
if [ ! -d "console/dist" ] || [ ! -f "console/dist/index.html" ]; then
    echo "   前端未构建，运行 prepare 脚本..."
    npm run prepare
    echo "   ✅ 准备完成"
else
    echo "   ✅ 构建产物已存在"
    read -p "   是否重新构建？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm run prepare
        echo "   ✅ 重新构建完成"
    fi
fi
echo ""

# 第四步：启动应用
echo "🚀 第四步：启动 Electron 应用..."
echo ""
echo "================================================"
echo "启动中，请稍候..."
echo "================================================"
echo ""

npm start
