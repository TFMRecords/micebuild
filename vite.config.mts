import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import replace from '@rollup/plugin-replace';

export default defineConfig({
  plugins: [
    preact(),
    replace({
      "process.env.FENGARICONF": "void 0",
      "typeof process": JSON.stringify("undefined")
    })
  ],
  build: {
    outDir: 'dist/frontend',
  },
  publicDir: 'public'
});