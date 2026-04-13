import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiOrigin = env.VITE_HERMES_API_ORIGIN || "http://127.0.0.1:9119";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
    test: {
      globals: true,
      include: ["src/**/*.test.ts"],
      passWithNoTests: true,
    },
    server: {
      proxy: {
        "/api": apiOrigin,
        "/v1": apiOrigin,
      },
    },
  };
});
