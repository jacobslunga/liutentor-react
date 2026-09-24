import { Readable } from "node:stream";
import type { Plugin } from "vite";

/**
 * Serves the Netlify Functions under netlify/functions during `vite dev`, so
 * forms that post to /api/* work without the Netlify CLI. Each function is
 * loaded through Vite's SSR loader and called with a standard Request.
 */
export function netlifyFunctionsDev(routes: Record<string, string>): Plugin {
  return {
    name: "netlify-functions-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        const file = routes[path];
        if (!file) return next();

        try {
          const mod = await server.ssrLoadModule(file);
          const hasBody = req.method !== "GET" && req.method !== "HEAD";
          const request = new Request(new URL(req.url!, `http://${req.headers.host}`), {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
            // Required by Node when streaming a request body.
            ...(hasBody ? { duplex: "half" } : {}),
          });
          const response: Response = await mod.default(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          server.ssrFixStacktrace(error as Error);
          console.error(error);
          res.statusCode = 500;
          res.end(JSON.stringify({ message: "Function failed" }));
        }
      });
    },
  };
}
