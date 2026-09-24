import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const DEFAULT_GO_API_URL =
  "https://liutentor-go-687405545415.europe-west1.run.app";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    // Deps only reached through lazy routes are otherwise discovered late in
    // dev, which triggers a full reload mid-navigation.
    optimizeDeps: {
      include: ["recharts", "cmdk"],
    },
    server: {
      proxy: {
        // The Go service sends no CORS headers, so the browser reaches it
        // through a same-origin proxy (Netlify does the same in production).
        "/api/go": {
          target: env.GO_API_URL || DEFAULT_GO_API_URL,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/go/, ""),
        },
      },
    },
  };
});
