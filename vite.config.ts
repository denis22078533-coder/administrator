import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import archiver from 'archiver';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'zip-project-plugin',
      configureServer(server) {
        server.middlewares.use('/download-project-zip', (req, res) => {
          const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
          });

          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', 'attachment; filename=project.zip');

          archive.pipe(res);

          // Add src and dist directories
          const srcDir = path.join(__dirname, 'src');
          const distDir = path.join(__dirname, 'dist');

          if (fs.existsSync(srcDir)) {
            archive.directory(srcDir, 'src');
          }
          if (fs.existsSync(distDir)) {
            archive.directory(distDir, 'dist');
          }

          archive.finalize();
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    strictPort: true,
    port: 3000,
  }
});
