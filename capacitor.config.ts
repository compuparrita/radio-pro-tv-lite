import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: process.env.CAP_APP_ID || 'com.example.app', // Este es el ID único
  appName: process.env.CAP_APP_NAME || 'Radio FM',      // Cambia esto por el nombre real de tu radio
  webDir: process.env.CAP_WEB_DIR || 'dist',           // ¡MUY IMPORTANTE! Si tu carpeta de build es 'build', cámbialo aquí.
  bundledWebRuntime: false
};

export default config;
