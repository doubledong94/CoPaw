/**
 * 准备脚本：复制前端和 Python 代码到 electron-desktop 目录
 * 在开发时运行：npm run prepare
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..', '..');
const ELECTRON_DIR = path.join(__dirname, '..');
const CONSOLE_SRC = path.join(ROOT_DIR, 'console');
const CONSOLE_DIST = path.join(CONSOLE_SRC, 'dist');
const CONSOLE_DEST = path.join(ELECTRON_DIR, 'console', 'dist');
const PYTHON_SRC = path.join(ROOT_DIR, 'src', 'copaw');
const PYTHON_DEST = path.join(ELECTRON_DIR, 'python', 'copaw');

console.log('🔧 Preparing Electron Desktop build...\n');

// 1. 安装前端依赖
console.log('📦 Installing frontend dependencies...');
try {
  if (!fs.existsSync(CONSOLE_SRC)) {
    console.error(`❌ Frontend source not found: ${CONSOLE_SRC}`);
    process.exit(1);
  }

  const nodeModulesPath = path.join(CONSOLE_SRC, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(`   Running: npm install in ${CONSOLE_SRC}`);
    execSync('npm install', {
      cwd: CONSOLE_SRC,
      stdio: 'inherit'
    });
    console.log('✅ Frontend dependencies installed\n');
  } else {
    console.log('   ✅ node_modules already exists, skipping install\n');
  }
} catch (error) {
  console.error('❌ Frontend dependency installation failed:', error.message);
  process.exit(1);
}

// 2. 构建前端
console.log('📦 Building frontend...');
try {
  console.log(`   Running: cd ${CONSOLE_SRC} && npm run build`);
  execSync('npm run build', {
    cwd: CONSOLE_SRC,
    stdio: 'inherit'
  });
  console.log('✅ Frontend built successfully\n');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// 3. 复制前端构建产物
console.log('📋 Copying frontend dist...');
try {
  if (!fs.existsSync(CONSOLE_DIST)) {
    console.error(`❌ Frontend dist not found: ${CONSOLE_DIST}`);
    console.error('   Please build the frontend first: cd console && npm run build');
    process.exit(1);
  }

  // 确保目标目录存在
  fs.ensureDirSync(path.dirname(CONSOLE_DEST));

  // 复制前端构建产物
  fs.copySync(CONSOLE_DIST, CONSOLE_DEST, {
    overwrite: true,
    filter: (src) => {
      // 过滤掉不需要的文件
      return !src.includes('node_modules') && !src.includes('.DS_Store');
    }
  });

  const files = fs.readdirSync(CONSOLE_DEST);
  console.log(`✅ Copied frontend (${files.length} files/folders)\n`);
} catch (error) {
  console.error('❌ Failed to copy frontend:', error.message);
  process.exit(1);
}

// 4. 复制 Python 代码
console.log('🐍 Copying Python code...');
try {
  if (!fs.existsSync(PYTHON_SRC)) {
    console.error(`❌ Python source not found: ${PYTHON_SRC}`);
    process.exit(1);
  }

  // 确保目标目录存在
  fs.ensureDirSync(path.dirname(PYTHON_DEST));

  // 复制 Python 代码
  fs.copySync(PYTHON_SRC, PYTHON_DEST, {
    overwrite: true,
    filter: (src) => {
      // 过滤掉不需要的文件
      const basename = path.basename(src);
      return !basename.includes('__pycache__') &&
             !basename.includes('.pyc') &&
             !basename.includes('.pyo') &&
             !basename.includes('.DS_Store');
    }
  });

  console.log(`✅ Copied Python code to: ${PYTHON_DEST}\n`);
} catch (error) {
  console.error('❌ Failed to copy Python code:', error.message);
  process.exit(1);
}

// 5. 创建 Python package 标识文件
console.log('📝 Creating Python package files...');
try {
  const pythonRoot = path.join(ELECTRON_DIR, 'python');

  // 创建 __init__.py
  const initPy = path.join(pythonRoot, '__init__.py');
  if (!fs.existsSync(initPy)) {
    fs.writeFileSync(initPy, '# CoPaw Python Package\n');
  }

  // 创建 __main__.py 作为入口点
  const mainPy = path.join(pythonRoot, '__main__.py');
  const mainPyContent = `# -*- coding: utf-8 -*-
"""CoPaw Python entry point for Electron."""
import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Run CoPaw CLI
from copaw.cli.main import cli

if __name__ == '__main__':
    cli()
`;
  fs.writeFileSync(mainPy, mainPyContent);

  console.log('✅ Created Python package files\n');
} catch (error) {
  console.error('❌ Failed to create Python package files:', error.message);
  process.exit(1);
}

console.log('✅ Preparation complete!\n');
console.log('Next steps:');
console.log('  - Development: npm start');
console.log('  - Build for Windows: npm run build:win');
console.log('  - Pack Python (for production): npm run pack:python');
