import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Asset paths are relative by default, so a copy of `dist/` works wherever it
// is put — domain root, a subfolder, a different host in ten years — without
// being rebuilt. That matters more than it looks: the built folder is the
// thing that has to outlive this toolchain. VITE_BASE still overrides it.
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [react()],
  build: {
    target: 'es2020',
    // The three.js chunk is deliberately large and deliberately lazy: it is
    // only fetched once the visitor enters the 3D room.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Keep three.js in its own chunk: the 2D fallback never downloads it.
        manualChunks: (id) =>
          id.includes('node_modules/three') || id.includes('@react-three') ? 'three' : undefined,
      },
    },
  },
});
