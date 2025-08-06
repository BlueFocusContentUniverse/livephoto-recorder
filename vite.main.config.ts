import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: "src/main/main.ts",
      fileName: () => "[name].js",
      formats: ["es"],
    },
  },
});
