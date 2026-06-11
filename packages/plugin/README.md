# KnotCMS Framer plugin (canvas connector)

Opens from the **Framer canvas** — not as a CMS collection plugin. Sync and setup run in the KnotCMS web dashboard.

## Flow

1. Plugins menu → KnotCMS (canvas)
2. **Open dashboard** → sign in, connect Notion, map fields, Server API key

## Dev

```bash
cp .env.example .env
npm run dev -w @knotcms/plugin
```

## Build

```bash
npm run build -w @knotcms/plugin
```
