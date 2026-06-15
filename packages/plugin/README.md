# KnotCMS Framer plugin (canvas connector)

Opens from the **Framer canvas** — not as a CMS collection plugin. Setup, mapping, and sync run at [app.knotcms.com](https://app.knotcms.com).

## Flow

1. Plugins menu → KnotCMS (canvas)
2. **New project** or **Projects** → web dashboard (`https://app.knotcms.com`)

## Dev

```bash
cp .env.example .env
# For local worker, uncomment localhost lines in .env
npm run dev -w @knotcms/plugin
```

Production build defaults to `https://app.knotcms.com` when env vars are unset. The plugin also loads canonical URLs from `GET /api/plugin/config` at runtime.

## Build

```bash
npm run build -w @knotcms/plugin
```

Republish to Framer after changing `VITE_*` URLs or UI copy.
