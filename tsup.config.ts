import { defineConfig } from "tsup";

export default defineConfig([
  // Main process as ESM
  {
    entry: {
      main: "src/main/main.ts",
    },
    outDir: "dist",
    format: ["esm"],
    platform: "node",
    target: "es2020",
    sourcemap: true,
    splitting: false,
    clean: true,
    shims: false,
    dts: false,
    skipNodeModulesBundle: true,
  },
  // Preload script as CommonJS (.cjs) for Electron compatibility
  {
    entry: {
      preload: "src/main/preload.ts",
    },
    outDir: "dist",
    format: ["cjs"],
    outExtension: () => ({ js: ".cjs" }),
    platform: "node",
    target: "es2020",
    sourcemap: true,
    splitting: false,
    clean: false,
    shims: false,
    dts: false,
    skipNodeModulesBundle: true,
  },
]);
