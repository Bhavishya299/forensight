import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/*
 * SPA history fallback: emit a copy of index.html as 404.html so static
 * hosts (GitHub Pages, S3/CloudFront, nginx with try_files off, etc.)
 * serve the app shell for deep links such as /login, /request-access,
 * and /entities/:id instead of returning a 404.
 */
function spaFallback404() {
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '404.html', source: '' })
    },
    closeBundle: async () => {
      const { copyFile } = await import('node:fs/promises')
      const { join } = await import('node:path')
      try {
        await copyFile(join('dist', 'index.html'), join('dist', '404.html'))
        console.log('[spa-fallback] dist/404.html emitted')
      } catch (err) {
        console.warn('[spa-fallback] could not copy index.html -> 404.html', err.message)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback404()],
})
