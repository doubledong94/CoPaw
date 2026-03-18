@echo off
REM CoPaw Electron Desktop - 开发环境一键启动脚本 (Windows)

setlocal enabledelayedexpansion

echo 🚀 CoPaw Electron Desktop - 开发环境启动
echo ========================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ 错误：未找到 Node.js
    echo 请安装 Node.js 18+ from https://nodejs.org/
    exit /b 1
)

REM 检查 Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ 错误：未找到 Python
    echo 请安装 Python 3.11+ from https://www.python.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i

echo ✅ Node.js: %NODE_VERSION%
echo ✅ Python: %PYTHON_VERSION%
echo.

REM 第一步：安装 Node.js 依赖
echo 📦 第一步：安装 Node.js 依赖...
cd electron-desktop
if not exist "node_modules\" (
    echo    运行 npm install...
    call npm install
    echo    ✅ 依赖安装完成
) else (
    echo    ✅ 依赖已存在，跳过安装
)
echo.

REM 第二步：检查 Python 包
echo 🐍 第二步：检查 CoPaw Python 包...
cd ..
python -c "import copaw" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo    ⚠️  CoPaw 包未安装，正在安装...
    pip install -e .
    echo    ✅ 安装完成
) else (
    echo    ✅ CoPaw 包已安装
)
echo.

REM 第三步：准备构建产物
echo 🔧 第三步：准备构建产物...
cd electron-desktop

if not exist "console\dist\index.html" (
    echo    前端未构建，运行 prepare 脚本...
    call npm run prepare
    echo    ✅ 准备完成
) else (
    echo    ✅ 构建产物已存在
    set /p REBUILD="   是否重新构建？(y/N) "
    if /i "!REBUILD!"=="y" (
        call npm run prepare
        echo    ✅ 重新构建完成
    )
)
echo.

REM 第四步：启动应用
echo 🚀 第四步：启动 Electron 应用...
echo.
echo ================================================
echo 启动中，请稍候...
echo ================================================
echo.

call npm start
