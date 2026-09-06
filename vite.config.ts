import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 5173 falls in a Windows Hyper-V excluded port range (EACCES on listen)
    host: '127.0.0.1',
    port: 5273,
  },
})
