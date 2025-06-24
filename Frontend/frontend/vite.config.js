import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Adicione esta secção para permitir o anfitrião do ngrok
    allowedHosts: [
      '.ngrok-free.app' // Permite qualquer subdomínio do ngrok
    ],
  },
})