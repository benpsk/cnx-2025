import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use a non-root base when building for GitHub Pages project sites
  // so assets resolve under /<repo>/ instead of domain root.
  base: process.env.NODE_ENV === 'production' ? '/cnx-2025/' : '/',
});
