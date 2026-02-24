import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Listen on all network interfaces (LAN access)
    port: 3000,
    strictPort: false,
    proxy: {
      '/repretel-stream': {
        target: 'https://d2qsan2ut81n2k.cloudfront.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/repretel-stream/, ''),
        configure: (proxy, _options) => {
          (proxy as any).on('proxyReq', (proxyReq: any) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        }
      },
      '/repretel-c6': {
        target: 'https://alba-cr-repretel-c6.stream.mediatiquestream.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/repretel-c6/, ''),
        configure: (proxy, _options) => {
          (proxy as any).on('proxyReq', (proxyReq: any) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        }
      },
      '/proxy-stream': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'video': ['hls.js'],
          'socket': ['socket.io-client']
        }
      }
    }
  }
})
