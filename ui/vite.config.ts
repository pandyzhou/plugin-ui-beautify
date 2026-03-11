import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: resolve(__dirname, "../src/main/resources/console"),
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "PluginUiBeautify",
      formats: ["iife"],
      fileName: () => "main.js",
    },
    rollupOptions: {
      external: ["vue", "vue-router", "@halo-dev/ui-shared"],
      output: {
        globals: {
          vue: "Vue",
          "vue-router": "VueRouter",
          "@halo-dev/ui-shared": "HaloUiShared",
        },
        assetFileNames: "style.css",
      },
    },
  },
});
