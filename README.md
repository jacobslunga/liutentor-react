# LiU Tentor (React)

React rewrite of [liutentor.se](https://liutentor.se) — find and study old exams from Linköping University.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (default styles, custom primary color only)
- TanStack Router (file-based routes in `src/routes`) + TanStack Query
- Zustand for client state
- [EmbedPDF](https://www.embedpdf.com) for PDF rendering
- Supabase for auth and user data

## Development

```sh
cp .env.example .env   # fill in values
pnpm install
pnpm dev
```

Other scripts: `pnpm build`, `pnpm preview`, `pnpm lint`.

## Deploy

Netlify (see `netlify.toml`); all routes fall back to `index.html`.
