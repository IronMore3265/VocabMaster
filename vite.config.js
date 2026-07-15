import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { version } from './package.json' with { type: 'json' };

export default defineConfig({
  // Relative base so the built assets resolve from file:// inside the APK WebView.
  base: '',
  plugins: [tailwindcss()],
  // Settings shows the version it was built from instead of a hand-kept number.
  define: { __APP_VERSION__: JSON.stringify(version) },
});
