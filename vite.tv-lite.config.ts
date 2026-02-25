import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist-tv-lite',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'public/tv-lite/index.html'),
            },
        },
    },
    publicDir: 'public',
})
