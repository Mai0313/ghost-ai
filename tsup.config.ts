import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      main: 'src/main/main.ts',
      preload: 'src/main/preload.ts',
    },
    outDir: 'dist',
    format: ['esm'],
    platform: 'node',
    target: 'es2020',
    sourcemap: true,
    splitting: false,
    clean: true,
    shims: false,
    dts: false,
    skipNodeModulesBundle: true,
  },
]);
