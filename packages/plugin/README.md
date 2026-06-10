# PublishFlow Framer plugin (thin connector)

Kitful-style connector: setup, mapping, sync, and publish all happen in the **PublishFlow web dashboard**. This plugin links your Framer project to a dashboard connection and opens the web app.

## User flow

1. Open the plugin in Framer.
2. Paste your Framer project URL (from the browser address bar).
3. Click **Open dashboard** → sign in, connect Notion, map fields, add Server API key.
4. Return to the plugin → **Link workspace**.
5. Manage sync and publish from the dashboard.

## Local dev

```bash
cp .env.example .env
# Set VITE_API_BASE_URL and VITE_WEB_APP_URL to your worker (default http://localhost:8787)

npm run dev -w @notion-framer/plugin
```

Open in Framer: https://framer.com/plugins/open/

## Production build

```bash
VITE_API_BASE_URL=https://your-worker.workers.dev \
VITE_WEB_APP_URL=https://your-worker.workers.dev \
npm run build -w @notion-framer/plugin
```

Publish via Framer marketplace tooling (`npm run pack`).
