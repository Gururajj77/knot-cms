# Notion → Framer CMS Sync

Framer plugin + Cloudflare Worker that connects a Notion database to a plugin-managed Framer CMS collection, with optional auto-sync via webhooks and auto-publish via the Framer Server API.

## Documentation

- **[Architecture & process](docs/ARCHITECTURE.md)** — diagrams, setup flow, webhooks, sync pipeline, D1 schema
- **[Error boundaries](docs/ERROR_BOUNDARIES.md)** — sync error codes, D1 dedupe, reconfigure behavior
- **[Server API spike notes](docs/SERVER_API_SPIKE.md)** — why sync uses Framer Server API

## Packages

| Package | Description |
|---------|-------------|
| `packages/plugin` | Framer plugin (configure + sync modes) |
| `packages/worker` | Cloudflare Worker API, webhooks, D1 |
| `packages/shared` | Types, Notion fetch, field transforms, licensing |

## Prerequisites

- Node.js 20+
- Cloudflare account + Wrangler
- [Notion integration](https://www.notion.com/my-integrations) with OAuth redirect: `{WORKER_URL}/oauth/notion/callback`
- Framer project with **Server API key** (Site Settings → General)

## Local development

```bash
# Install
npm install

# Build shared types
npm run build -w @notion-framer/shared

# Copy worker secrets
cp packages/worker/.dev.vars.example packages/worker/.dev.vars
# Edit .dev.vars with real values

# Apply D1 migrations (local)
npm run db:migrate:local -w @notion-framer/worker

# Terminal 1 — Worker
npm run dev:worker

# Terminal 2 — Plugin
cp packages/plugin/.env.example packages/plugin/.env
npm run dev:plugin
```

Open the plugin in Framer: https://framer.com/plugins/open/

## Generate a license key

```bash
LICENSE_SIGNING_SECRET=your-secret npm run license:generate -w @notion-framer/worker -- "https://framer.com/projects/YOUR_PROJECT"
```

Paste the key into the plugin setup wizard. Licenses are bound to the Framer project URL you enter.

## Automatic sync (how it works)

1. Notion webhook or manual sync triggers the Worker
2. Worker calls Framer Server API: `createManagedCollection` (or find by **Notion database name**)
3. Full reconcile: `setFields` → `addItems` / `removeItems`
4. If enabled: `publish()` and optionally `deploy()` to live

This matches [Framer's notion-automations-sync example](https://github.com/framer/server-api-examples/tree/main/examples/notion-automations-sync). The collection must be API-managed (created on first connect), not only via the plugin UI.

## Notion webhooks

Register your Worker URL in the Notion integration settings:

```
https://your-worker.workers.dev/webhooks/notion
```

The worker debounces events (~10s after the last change) then runs headless sync. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Deploy worker

```bash
npm run deploy -w @notion-framer/worker
wrangler secret put NOTION_CLIENT_ID
wrangler secret put NOTION_CLIENT_SECRET
wrangler secret put ENCRYPTION_KEY
wrangler secret put LICENSE_SIGNING_SECRET
```

Update `WORKER_PUBLIC_URL` and `NOTION_REDIRECT_URI` in `wrangler.toml` for production.

## V1 limitations

- Plugin-managed collections only (not user-created unmanaged collections)
- Property-level sync (Notion webhooks do not cover all block-level edits)
- Image fields use external URLs where supported
- One Notion data source per Framer collection
