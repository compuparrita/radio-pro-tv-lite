import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist-tv-lite');
const publicDir = path.join(__dirname, '..', 'public');

// Crear carpeta dist si no existe
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Copiar archivos
function copyFile(src, dest) {
    try {
        fs.copyFileSync(src, dest);
        console.log(`Copiado: ${path.basename(src)} -> ${dest}`);
    } catch (err) {
        console.error(`Error al copiar ${src}:`, err.message);
    }
}

// 1. tv-lite/index.html -> index.html
const tvLiteHtml = path.join(publicDir, 'tv-lite', 'index.html');
if (fs.existsSync(tvLiteHtml)) {
    copyFile(tvLiteHtml, path.join(distDir, 'index.html'));
} else {
    console.error('No se encontró tv-lite/index.html');
}

// 2. stations.json
const stationsJson = path.join(publicDir, 'stations.json');
if (fs.existsSync(stationsJson)) {
    copyFile(stationsJson, path.join(distDir, 'stations.json'));
}

// 3. sw.js (si existe)
const swJs = path.join(publicDir, 'sw.js');
if (fs.existsSync(swJs)) {
    copyFile(swJs, path.join(distDir, 'sw.js'));
}

console.log('Construcción de TV Lite completada en dist-tv-lite');
