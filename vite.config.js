// vite.config.js
import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    root: path.join(__dirname, 'src', 'renderer'), // The folder containing your React code
    plugins: [react()],
    build: {
        target: 'esnext',
        outDir: path.join(__dirname, 'dist', 'renderer'),
        emptyOutDir: true
    },
    server: {
        port: 3000,
        fs: {
            allow: ['.'], // Allow Vite to serve all files in the project
        },
    }
})
