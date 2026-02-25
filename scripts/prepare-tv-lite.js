import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const distDir = path.join(root, 'dist-tv-lite');
const publicDir = path.join(root, 'public');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied: ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
        return true;
    }
    console.error(`Error: Source not found: ${src}`);
    return false;
}

console.log('--- Starting TV Lite Asset Preparation ---');

const indexSrc = path.join(publicDir, 'tv-lite', 'index.html');
const indexDest = path.join(distDir, 'index.html');

const stationsSrc = path.join(publicDir, 'stations.json');
const stationsDest = path.join(distDir, 'stations.json');

const swSrc = path.join(publicDir, 'sw.js');
const swDest = path.join(distDir, 'sw.js');

let success = true;

if (!copyFile(indexSrc, indexDest)) success = false;
if (!copyFile(stationsSrc, stationsDest)) success = false;
copyFile(swSrc, swDest); // Optional

if (success) {
    console.log('--- Success: Assets prepared for Capacitor ---');
    process.exit(0);
} else {
    console.error('--- Failure: Required assets missing ---');
    process.exit(1);
}
