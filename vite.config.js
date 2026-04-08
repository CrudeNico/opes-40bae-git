import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind on all addresses so http://localhost:5173 works for IPv4 and IPv6 stacks.
    host: true,
    port: 5173,
    strictPort: true,
  },
})


