import { copyFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "src",
  // Use relative base so assets load correctly when served via file:// in Electron
  base: "./",
  plugins: [
    react(),
    // Copy AudioWorklet file to build output
    {
      name: "copy-worklets",
      closeBundle() {
        const outDir = join(__dirname, "dist", "renderer");
        const workletDir = join(outDir, "worklets");
        const srcWorklet = join(
          __dirname,
          "src",
          "main",
          "worklets",
          "audio-processor.worklet.js",
        );
        const destWorklet = join(workletDir, "audio-processor.worklet.js");

        if (!existsSync(workletDir)) {
          mkdirSync(workletDir, { recursive: true });
        }

        try {
          copyFileSync(srcWorklet, destWorklet);
          console.log("[Vite] Copied AudioWorklet to", destWorklet);
        } catch (err) {
          console.error("[Vite] Failed to copy AudioWorklet:", err);
        }
      },
    },
  ],
  build: {
    outDir: "../dist/renderer",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    open: false,
  },
  // Serve worklets directory in dev mode
  publicDir: "../public",
});
