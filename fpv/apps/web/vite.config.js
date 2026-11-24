import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: { alias: { "@compat": fileURLToPath(new URL("../../packages/compat", import.meta.url)) } },
  server: { fs: { allow: ["../.."] } },
  build: { outDir: "../../app", emptyOutDir: true, assetsDir: "assets" },
});
