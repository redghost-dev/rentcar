import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html',
        clearStorage: 'clear-storage.html',
        hakkimizda: 'hakkimizda.html'
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  plugins: [
    {
      name: 'copy-public-assets',
      closeBundle() {
        // img klasörünü kopyala
        const copyDir = (src, dest) => {
          try {
            mkdirSync(dest, { recursive: true })
            const entries = readdirSync(src, { withFileTypes: true })
            
            for (const entry of entries) {
              const srcPath = join(src, entry.name)
              const destPath = join(dest, entry.name)
              
              if (entry.isDirectory()) {
                copyDir(srcPath, destPath)
              } else {
                copyFileSync(srcPath, destPath)
                console.log(`✓ Kopyalandı: ${entry.name}`)
              }
            }
          } catch (err) {
            console.error(`❌ Kopyalama hatası: ${err.message}`)
          }
        }
        
        console.log('\n📦 Public assets kopyalanıyor...')
        copyDir('img', 'dist/img')
        console.log('✅ img/ klasörü dist/img/ ye kopyalandı\n')
      }
    }
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: 'all',
    middlewareMode: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173
    }
  }
})
