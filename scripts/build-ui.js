/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const appName = process.argv[2] || 'shop-ui';
const zipNameMap = {
    'shop-ui': 'marketplace-shop.zip',
    'admin-ui': 'marketplace-admin.zip'
};

const zipName = zipNameMap[appName] || `${appName}.zip`;
const appDir = path.join(rootDir, 'app', appName);
const webappDir = path.join(appDir, 'webapp');
const distDir = path.join(appDir, 'dist');
const stagingDir = path.join(appDir, 'dist_staging');
const zipFilePath = path.join(distDir, zipName);
const genAppDir = path.join(rootDir, 'gen', 'app');
if (!fs.existsSync(genAppDir)) {
    fs.mkdirSync(genAppDir, { recursive: true });
}

console.log(`[build-ui] Building ${appName}...`);

if (!fs.existsSync(webappDir)) {
    console.error(`[build-ui] Error: webapp directory not found at ${webappDir}`);
    process.exit(1);
}

// 1. Clean directories
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(stagingDir, { recursive: true });

// 2. Recursive copy helper
function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Copy webapp to staging & dist
copyDirSync(webappDir, stagingDir);
copyDirSync(webappDir, distDir);

// 3. Ensure xs-app.json exists in staging & dist
const xsAppCandidates = [
    path.join(appDir, 'xs-app.json'),
    path.join(webappDir, 'xs-app.json')
];
for (const cand of xsAppCandidates) {
    if (fs.existsSync(cand)) {
        fs.copyFileSync(cand, path.join(stagingDir, 'xs-app.json'));
        fs.copyFileSync(cand, path.join(distDir, 'xs-app.json'));
        break;
    }
}

// 4. Create ZIP archive of staging contents
console.log(`[build-ui] Creating archive: ${zipFilePath}`);

let zipped = false;

// Try tar (Windows 10/11 built-in, macOS, Linux)
try {
    execSync(`tar -a -cf "${zipFilePath}" -C "${stagingDir}" .`, { stdio: 'inherit' });
    zipped = true;
} catch {
    // Try zip command (Linux/macOS)
    try {
        execSync(`cd "${stagingDir}" && zip -r "${zipFilePath}" .`, { stdio: 'inherit' });
        zipped = true;
    } catch {
        // Try PowerShell Compress-Archive (Windows fallback)
        try {
            execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipFilePath}' -Force"`, { stdio: 'inherit' });
            zipped = true;
        } catch (e3) {
            console.error('[build-ui] Failed to create zip archive:', e3.message);
            process.exit(1);
        }
    }
}

// Clean up staging
if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
}

if (zipped && fs.existsSync(zipFilePath)) {
    const stat = fs.statSync(zipFilePath);
    console.log(`[build-ui] Successfully created ${zipName} (${(stat.size / 1024).toFixed(1)} KB)`);
} else {
    console.error(`[build-ui] Error: archive ${zipFilePath} was not created.`);
    process.exit(1);
}
