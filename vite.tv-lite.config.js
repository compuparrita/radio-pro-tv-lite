import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist-tv-lite',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: './public/tv-lite/index.html',
            },
        },
    },
    publicDir: 'public',
})
