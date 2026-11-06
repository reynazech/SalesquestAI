import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // API runs separately in dev (npm run dev starts both).
    proxy: { '/api': 'http://localhost:8787' },
  },
})
