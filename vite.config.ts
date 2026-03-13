import { defineConfig } from "vite";
import livePreview from "vite-live-preview";

export default defineConfig({
  plugins: [
    livePreview({
      reload: true,
      config: {
        build: {
          sourcemap: true,
        },
      },
    }),
  ],
  esbuild: {
    jsxFactory: "h",
    jsxFragment: "Fragment",
    jsxImportSource: "preact",
  },
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
    },
  },
  build: {
    rollupOptions: {
      input: {
        plugin: "src/plugin.ts",
        index: "./index.html",
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
  preview: {
    port: 4400,
    cors: true,
  },
});
