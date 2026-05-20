import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Expose la version de package.json au bundle. Vite remplace le token
  // __APP_VERSION__ par la valeur littérale au build (inlining, pas de
  // coût runtime). Source de vérité unique : package.json.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['belzebold', 'belzebold.tail20ed67.ts.net', 'synth-dev.lab.rm-info.fr']
  }
})
