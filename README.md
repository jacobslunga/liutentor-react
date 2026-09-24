# LiU Tentor (React)

React rewrite of [liutentor.se](https://liutentor.se) — find and study old exams from Linköping University.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (default styles; only `--primary` is customised)
- TanStack Router (file-based routes in `src/routes`) + TanStack Query for server data
- Zustand for client state (always read through selectors)
- [EmbedPDF](https://www.embedpdf.com) for PDF rendering
- Supabase for auth and user data
- Netlify Functions for upload and feedback (`netlify/functions`)

## Development

```sh
cp .env.example .env   # fill in values
pnpm install
pnpm dev               # http://localhost:5173
```

Keep the default port: the AI chat service only allows `localhost:5173` (and the production origin).

`pnpm dev` also serves the Netlify Functions (`/api/upload`, `/api/feedback`) and proxies the Go exam
API under `/api/go`, so no Netlify CLI is needed.

Other scripts: `pnpm build`, `pnpm preview`, `pnpm lint`.

## Environment

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` | client, functions | Public anon key |
| `VITE_AI_API_URL` | client | Optional; defaults to the Cloud Run chat service |
| `GO_API_URL` | dev proxy | Optional; point at a local Go service |
| `RESEND_API_KEY`, `UPLOAD_NOTIFICATION_TO` | upload function | Without them uploads still work, the email is skipped |
| `UPLOAD_NOTIFICATION_FROM`, `UPLOAD_REVIEW_URL` | upload function | Optional overrides |

## Deploy

Netlify builds with `pnpm build` and publishes `dist` (see `netlify.toml`):

- `/api/go/*` is rewritten to the Go exam service (it sends no CORS headers).
- `/api/upload` and `/api/feedback` are Netlify Functions.
- Every other path falls back to `index.html`.

The AI chat service allows requests from `liutentor.se`; add preview domains to its CORS list to use
chat on deploy previews.
