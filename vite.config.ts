import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Set by the Pages workflow ("/ring-designer/"); local dev stays at "/".
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  server: {
    port: 5199,
    strictPort: true,
  },
  worker: {
    format: "es",
  },
});
