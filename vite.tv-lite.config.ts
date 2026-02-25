import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Usamos rutas relativas para evitar problemas de __dirname en ESM
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
