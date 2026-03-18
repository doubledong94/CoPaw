/**
 * Python 打包脚本
 * 下载 Python Embedded 版本并安装所有依赖
 * 仅在构建 Windows 安装包前运行一次
 */

const fs = require('fs-extra');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const { Extract } = require('unzipper');

const PYTHON_VERSION = '3.11.7';
const PLATFORM = process.platform;
const ELECTRON_DIR = path.join(__dirname, '..');
const EMBED_DIR = path.join(ELECTRON_DIR, 'python-embed');

console.log('🐍 Python Embedded Packaging Script\n');
console.log(`Platform: ${PLATFORM}`);
console.log(`Python version: ${PYTHON_VERSION}`);
console.log(`Target directory: ${EMBED_DIR}\n`);

/**
 * 下载文件
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading: ${url}`);

    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // 处理重定向
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloaded = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        const percent = ((downloaded / totalSize) * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${percent}% (${(downloaded / 1024 / 1024).toFixed(1)}MB / ${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\n✅ Download complete\n');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

/**
 * 解压 ZIP 文件
 */
async function extractZip(zipPath, targetDir) {
  console.log(`📦 Extracting to: ${targetDir}`);

  await fs.createReadStream(zipPath)
    .pipe(Extract({ path: targetDir }))
    .promise();

  console.log('✅ Extraction complete\n');
}

/**
 * Windows: 打包 Python Embedded
 */
async function packWindowsPython() {
  console.log('🪟 Packing Python for Windows...\n');

  // 1. 下载 Python Embedded
  const pythonUrl = `https://mirrors.huaweicloud.com/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip`;
  const zipPath = path.join(ELECTRON_DIR, 'python-embed.zip');

  try {
    // 清理旧文件
    if (fs.existsSync(EMBED_DIR)) {
      console.log('🧹 Cleaning old python-embed directory...');
      fs.removeSync(EMBED_DIR);
    }
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    // 下载
    await downloadFile(pythonUrl, zipPath);

    // 解压
    fs.ensureDirSync(EMBED_DIR);
    await extractZip(zipPath, EMBED_DIR);

    // 清理 ZIP
    fs.unlinkSync(zipPath);

    // 2. 配置 Python 路径
    console.log('⚙️  Configuring Python paths...');
    const pthFile = path.join(EMBED_DIR, `python${PYTHON_VERSION.split('.').slice(0, 2).join('')}._pth`);
    const pthContent = `python${PYTHON_VERSION.split('.').slice(0, 2).join('')}.zip
.
Lib
Lib/site-packages

# Uncomment to run site.main() automatically
import site
`;
    fs.writeFileSync(pthFile, pthContent);
    console.log('✅ Python paths configured\n');

    // 3. 安装 pip
    console.log('📦 Installing pip...');
    const pythonExe = path.join(EMBED_DIR, 'python.exe');
    const getPipCandidates = [
      process.env.COPAW_GET_PIP_PATH,
      path.join(ELECTRON_DIR, 'get-pip.py'),
    ].filter(Boolean);

    const resolvedGetPipPath = getPipCandidates.find((candidatePath) => fs.existsSync(candidatePath));

    if (resolvedGetPipPath) {
      console.log(`   Using local get-pip.py: ${resolvedGetPipPath}`);
      execSync(`"${pythonExe}" "${resolvedGetPipPath}"`, {
        cwd: EMBED_DIR,
        stdio: 'inherit'
      });
    } else {
      console.log('   No local get-pip.py found, falling back to ensurepip...');
      execSync(`"${pythonExe}" -m ensurepip --upgrade`, {
        cwd: EMBED_DIR,
        stdio: 'inherit'
      });
    }

    console.log('✅ pip installed\n');

    // 4. 升级 pip
    console.log('⬆️  Upgrading pip...');
    execSync(`"${pythonExe}" -m pip install --upgrade pip -i https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple`, {
      cwd: EMBED_DIR,
      stdio: 'inherit'
    });
    console.log('✅ pip upgraded\n');

    // 5. 安装 CoPaw 依赖
    console.log('📦 Installing CoPaw dependencies...');

    // 读取项目的 pyproject.toml 获取依赖
    const rootDir = path.join(ELECTRON_DIR, '..');
    const pyprojectPath = path.join(rootDir, 'pyproject.toml');

    console.log('   Installing from CoPaw package...');

    // 安装 CoPaw（会自动安装依赖）
    fs.ensureDirSync(path.join(EMBED_DIR, 'Lib', 'site-packages'));
    execSync(`"${pythonExe}" -m pip install "${rootDir}" --target "${path.join(EMBED_DIR, 'Lib', 'site-packages')}" -i https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1'
      }
    });

    console.log('✅ Dependencies installed\n');

    // 6. 验证安装
    console.log('🔍 Verifying installation...');
    try {
      const output = execSync(`"${pythonExe}" -c "import copaw; print(copaw.__version__.__version__)"`, {
        cwd: EMBED_DIR,
        encoding: 'utf-8'
      });
      console.log(`✅ CoPaw version: ${output.trim()}\n`);
    } catch (error) {
      console.warn('⚠️  Could not verify CoPaw installation');
    }

    // 7. 清理缓存
    console.log('🧹 Cleaning up...');
    const cacheDir = path.join(EMBED_DIR, 'Lib', 'site-packages', '__pycache__');
    if (fs.existsSync(cacheDir)) {
      fs.removeSync(cacheDir);
    }

    // 删除不需要的文件
    const scriptsDir = path.join(EMBED_DIR, 'Scripts');
    if (fs.existsSync(scriptsDir)) {
      fs.removeSync(scriptsDir);
    }

    console.log('✅ Cleanup complete\n');

    // 8. 显示大小
    const dirSize = execSync(`du -sh "${EMBED_DIR}"`, { encoding: 'utf-8' }).trim();
    console.log(`📊 python-embed size: ${dirSize}\n`);

    console.log('✅ Python Embedded packaging complete!\n');

  } catch (error) {
    console.error('❌ Failed to pack Python:', error.message);
    process.exit(1);
  }
}

/**
 * macOS: 打包 Python（使用 python.org 官方发行版）
 */
async function packMacOSPython() {
  console.log('🍎 Packing Python for macOS...\n');

  const PYTHON_VERSION_FULL = '3.11.7';
  const PYTHON_VERSION_SHORT = '3.11';

  try {
    // 清理旧文件
    if (fs.existsSync(EMBED_DIR)) {
      console.log('🧹 Cleaning old python-embed directory...');
      fs.removeSync(EMBED_DIR);
    }

    // 创建目录结构
    fs.ensureDirSync(EMBED_DIR);
    fs.ensureDirSync(path.join(EMBED_DIR, 'bin'));
    fs.ensureDirSync(path.join(EMBED_DIR, 'lib'));

    console.log('📦 Creating Python virtual environment...\n');

    // 检查系统 Python 版本
    try {
      const pythonVersionCheck = execSync('python3 --version', { encoding: 'utf-8' });
      console.log(`System Python: ${pythonVersionCheck.trim()}`);
    } catch (error) {
      console.error('❌ Python 3 not found. Please install Python 3.11+ first:');
      console.error('   brew install python@3.11');
      process.exit(1);
    }

    // 创建虚拟环境
    console.log('Creating virtual environment...');
    execSync(`python3 -m venv "${EMBED_DIR}"`, {
      stdio: 'inherit'
    });

    const pythonBin = path.join(EMBED_DIR, 'bin', 'python3');
    const pipBin = path.join(EMBED_DIR, 'bin', 'pip3');

    // 升级 pip
    console.log('\n⬆️  Upgrading pip...');
    execSync(`"${pipBin}" install --upgrade pip -i https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple`, {
      stdio: 'inherit'
    });
    console.log('✅ pip upgraded\n');

    // 安装 CoPaw 及其依赖
    console.log('📦 Installing CoPaw dependencies...');
    const rootDir = path.join(ELECTRON_DIR, '..');

    execSync(`"${pipBin}" install "${rootDir}" -i https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1'
      }
    });

    console.log('✅ Dependencies installed\n');

    // 验证安装
    console.log('🔍 Verifying installation...');
    try {
      const output = execSync(`"${pythonBin}" -c "import copaw; print(copaw.__version__.__version__)"`, {
        cwd: EMBED_DIR,
        encoding: 'utf-8'
      });
      console.log(`✅ CoPaw version: ${output.trim()}\n`);
    } catch (error) {
      console.warn('⚠️  Could not verify CoPaw installation');
    }

    // 修复符号链接（macOS 代码签名要求）
    console.log('🔗 Fixing symbolic links for code signing...');

    // 找到所有指向系统 Python 的符号链接并替换为实际文件
    const pythonBinDir = path.join(EMBED_DIR, 'bin');
    const files = fs.readdirSync(pythonBinDir);

    for (const file of files) {
      const filePath = path.join(pythonBinDir, file);
      const stats = fs.lstatSync(filePath);

      if (stats.isSymbolicLink()) {
        const target = fs.readlinkSync(filePath);

        // 如果符号链接指向绝对路径（系统 Python），则替换为副本
        if (path.isAbsolute(target)) {
          console.log(`   Replacing symlink: ${file} -> ${target}`);
          fs.unlinkSync(filePath);
          fs.copyFileSync(target, filePath);
          fs.chmodSync(filePath, 0o755);
        }
      }
    }

    console.log('✅ Symbolic links fixed\n');

    // 清理缓存和不必要的文件
    console.log('🧹 Cleaning up...');

    // 删除 __pycache__
    execSync(`find "${EMBED_DIR}" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true`, {
      shell: '/bin/bash'
    });

    // 删除 .pyc 文件
    execSync(`find "${EMBED_DIR}" -type f -name "*.pyc" -delete 2>/dev/null || true`, {
      shell: '/bin/bash'
    });

    // 删除测试文件
    const testsDir = path.join(EMBED_DIR, 'lib', `python${PYTHON_VERSION_SHORT}`, 'site-packages', 'tests');
    if (fs.existsSync(testsDir)) {
      fs.removeSync(testsDir);
    }

    console.log('✅ Cleanup complete\n');

    // 显示大小
    try {
      const dirSize = execSync(`du -sh "${EMBED_DIR}"`, { encoding: 'utf-8' }).trim();
      console.log(`📊 python-embed size: ${dirSize}\n`);
    } catch (error) {
      // Ignore size calculation errors
    }

    console.log('✅ Python packaging complete for macOS!\n');

  } catch (error) {
    console.error('❌ Failed to pack Python:', error.message);
    process.exit(1);
  }
}

/**
 * Linux: 打包说明
 */
function packLinuxPython() {
  console.log('🐧 Linux Python packaging\n');
  console.log('Note: Similar to macOS, use virtual environment approach.');
  console.log('The macOS script can be adapted for Linux.\n');
}

// 主函数
async function main() {
  if (PLATFORM === 'win32') {
    await packWindowsPython();
  } else if (PLATFORM === 'darwin') {
    await packMacOSPython();
  } else {
    packLinuxPython();
  }

  console.log('Done!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
