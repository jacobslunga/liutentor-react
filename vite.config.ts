import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { netlifyFunctionsDev } from "./netlify-functions-dev.ts";

const DEFAULT_GO_API_URL =
  "https://liutentor-go-687405545415.europe-west1.run.app";

// Fonts the first paint needs. Without a preload the browser only finds them
// after the CSS has downloaded and parsed.
const PRELOAD_FONTS = [/inter-latin-[\w-]+\.woff2$/];

function fontPreload(): Plugin {
  return {
    name: "font-preload",
    apply: "build",
    transformIndexHtml(_html, ctx) {
      const files = Object.keys(ctx.bundle ?? {});
      return files
        .filter((file) => PRELOAD_FONTS.some((re) => re.test(file)))
        .map((file) => ({
          tag: "link",
          attrs: {
            rel: "preload",
            href: `/${file}`,
            as: "font",
            type: "font/woff2",
            crossorigin: "",
          },
          injectTo: "head" as const,
        }));
    },
  };
}

// Primer's component CSS is unlayered, which would beat every Tailwind
// utility. Wrapping it in a layer (ordered in index.html between Tailwind's
// base and utilities) lets Primer override preflight while className still
// overrides Primer.
function primerCssLayer(): Plugin {
  return {
    name: "primer-css-layer",
    enforce: "pre",
    transform(code, id) {
      if (!/@primer[\\/]react[\\/].*\.css$/.test(id.split("?")[0])) return;
      return { code: `@layer primer {\n${code}\n}`, map: null };
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Functions run in-process during dev and read their config from process.env.
  for (const [key, value] of Object.entries(env)) process.env[key] ??= value;

  // The Go service sends no CORS headers, so the browser reaches it through a
  // same-origin proxy (Netlify does the same in production).
  const goApiProxy = {
    "/api/go": {
      target: env.GO_API_URL || DEFAULT_GO_API_URL,
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/api\/go/, ""),
    },
  };

  return {
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      react(),
      primerCssLayer(),
      tailwindcss(),
      fontPreload(),
      netlifyFunctionsDev({
        "/api/upload": "/netlify/functions/upload.mts",
        "/api/feedback": "/netlify/functions/feedback.mts",
      }),
    ],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "./src") },
    },
    // Deps only reached through lazy routes are otherwise discovered late in
    // dev, which triggers a full reload mid-navigation.
    optimizeDeps: {
      include: [
        "recharts",
        "markdown-it",
        "markdown-it-texmath",
        "katex",
        "dompurify",
        "@embedpdf/core/react",
        "@embedpdf/engines/react",
        "@embedpdf/plugin-document-manager/react",
        "@embedpdf/plugin-interaction-manager/react",
        "@embedpdf/plugin-render/react",
        "@embedpdf/plugin-rotate/react",
        "@embedpdf/plugin-scroll/react",
        "@embedpdf/plugin-selection/react",
        "@embedpdf/plugin-viewport/react",
        "@embedpdf/plugin-zoom/react",
      ],
    },
    server: { proxy: goApiProxy },
    preview: { proxy: goApiProxy },
    build: {
      // The chunks over the default limit (PDF engine, KaTeX/markdown, Shiki
      // grammars) are all lazy-loaded, so their size doesn't block startup.
      chunkSizeWarningLimit: 1000,
    },
  };
});
