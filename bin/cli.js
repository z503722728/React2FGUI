#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const binDir = path.join(rootDir, 'bin');
const mainPath = path.join(binDir, 'main.js');

/**
 * 检查是否需要重新编译
 */
function checkNeedsBuild() {
    if (!fs.existsSync(mainPath)) return true;

    const srcFiles = getAllFiles(srcDir);
    const binFiles = getAllFiles(binDir);

    if (srcFiles.length === 0) return false;
    
    const lastSrcMtime = Math.max(...srcFiles.map(f => fs.statSync(f).mtimeMs));
    const lastBinMtime = Math.max(...binFiles.map(f => fs.statSync(f).mtimeMs));

    return lastSrcMtime > lastBinMtime;
}

function getAllFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(file));
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

// 自动执行编译
if (checkNeedsBuild()) {
    console.log('🔄 Detected changes in src, rebuilding...');
    const tsc = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const buildResult = spawnSync(tsc, ['tsc'], { cwd: rootDir, stdio: 'inherit' });
    if (buildResult.status !== 0) {
        console.error('❌ Build failed. Please check your TypeScript code.');
        process.exit(1);
    }
}

const args = process.argv.slice(2);
const result = spawnSync('node', [mainPath, ...args], { stdio: 'inherit' });
process.exit(result.status);
