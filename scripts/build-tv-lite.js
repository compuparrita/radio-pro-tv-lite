const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist-tv-lite');
const publicDir = path.join(__dirname, '..', 'public');

// Crear carpeta dist si no existe
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Copiar archivos
function copyFile(src, dest) {
    fs.copyFileSync(src, dest);
    console.log(`Copiado: ${path.basename(src)} -> ${dest}`);
}

// 1. tv-lite/index.html -> index.html
copyFile(path.join(publicDir, 'tv-lite', 'index.html'), path.join(distDir, 'index.html'));

// 2. stations.json
copyFile(path.join(publicDir, 'stations.json'), path.join(distDir, 'stations.json'));

// 3. sw.js (si existe)
if (fs.existsSync(path.join(publicDir, 'sw.js'))) {
    copyFile(path.join(publicDir, 'sw.js'), path.join(distDir, 'sw.js'));
}

console.log('Construcción de TV Lite completada en dist-tv-lite');
