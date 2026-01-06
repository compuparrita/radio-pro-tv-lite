import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app', // Este es el ID único
  appName: 'Radio FM',      // Cambia esto por el nombre real de tu radio
  webDir: 'dist',           // ¡MUY IMPORTANTE! Si tu carpeta de build es 'build', cámbialo aquí.
  bundledWebRuntime: false
};

export default config;
