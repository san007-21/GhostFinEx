import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Sensible default: after route-level splitting, the entry chunk holds
    // React + the Supabase client (needed at boot and not safely deferrable)
    // at ~555KB — measured, not guessed. All views load as small cached
    // chunks on demand; a real regression past this point still warns.
    chunkSizeWarningLimit: 560,
  },
})
