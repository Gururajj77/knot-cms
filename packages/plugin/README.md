# KnotCMS Framer plugin (canvas connector)

Opens from the **Framer canvas** — not as a CMS collection plugin. Setup, mapping, and sync run at [app.knotcms.com](https://app.knotcms.com).

## Flow

1. Plugins menu → KnotCMS (canvas)
2. **New project** or **Open projects** → web dashboard

## Dev

```bash
cp .env.example .env
npm run dev -w @knotcms/plugin
```

Production defaults in `.env.example` use `https://app.knotcms.com`. For local worker:

```
VITE_API_BASE_URL=http://localhost:8787
VITE_WEB_APP_URL=http://localhost:8787
```

## Build

```bash
npm run build -w @knotcms/plugin
```
