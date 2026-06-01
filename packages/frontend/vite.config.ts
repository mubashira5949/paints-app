import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    allowedHosts: true, // Allow all hosts (Railway dynamically assigns domains)
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_DATE__: JSON.stringify(
      new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    ),
  },
})
