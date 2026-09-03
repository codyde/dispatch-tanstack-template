import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: 8080,
    host: '0.0.0.0',
    // Served through Railway's public domain for the agent VM.
    allowedHosts: true,
  },
  plugins: [viteTsConfigPaths({ projects: ['./tsconfig.json'] }), tanstackStart(), viteReact()],
})
