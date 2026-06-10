# PublishFlow Framer plugin (canvas connector)

Opens from the **Framer canvas** — not as a CMS collection plugin. It does not create or sync collections; PublishFlow does that via the Server API from the web dashboard.

## Flow

1. Plugins menu → PublishFlow (canvas)
2. Paste your Framer project URL
3. **Open dashboard** → sign in, connect Notion, map fields, Server API key
4. **Link workspace** in the plugin

## Dev

```bash
cp .env.example .env
npm run dev -w @notion-framer/plugin
```

Open https://framer.com/plugins/open/

## Prod build

```bash
VITE_API_BASE_URL=https://your-worker.workers.dev \
VITE_WEB_APP_URL=https://your-worker.workers.dev \
npm run build -w @notion-framer/plugin
```
