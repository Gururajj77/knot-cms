# KnotCMS

**KnotCMS** is a calm publishing workflow for Framer creators: connect Notion, map fields, and keep Framer CMS in sync with optional auto-publish via the Framer Server API.

KnotCMS is a **web-first product** (Kitful-style dashboard + thin Framer plugin). Setup, mapping, and sync run in the web app at `https://app.knotcms.com`. The Framer plugin is a shortcut to open the dashboard. Architecture: **[docs/PIVOT.md](docs/PIVOT.md)**. Legacy V1 plugin-wizard notes: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Documentation

- **[KnotCMS pivot](docs/PIVOT.md)** — target architecture: web dashboard, Google login, MoR billing, phases
- **[Manual checklist](docs/MANUAL_CHECKLIST.md)** — what to do in Cloudflare, Google, MoR dashboards after code lands
- **[Architecture & process](docs/ARCHITECTURE.md)** — historical V1 plugin wizard, sync pipeline, D1 schema
- **[Error boundaries](docs/ERROR_BOUNDARIES.md)** — sync error codes, D1 dedupe, reconfigure behavior
- **[Server API spike notes](docs/SERVER_API_SPIKE.md)** — why sync uses Framer Server API

## Packages

| Package | Description |
|---------|-------------|
| `packages/web` | Web dashboard (login, setup, projects, billing) |
| `packages/worker` | Cloudflare Worker API, webhooks, D1, serves web assets |
| `packages/shared` | Types, Notion fetch, field transforms, plans |
| `packages/plugin` | Thin Framer plugin — opens the web dashboard |

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
npm run build -w @knotcms/shared

# Copy worker secrets
cp packages/worker/.dev.vars.example packages/worker/.dev.vars
# Edit .dev.vars with real values

# Apply D1 migrations (local)
npm run db:migrate:local -w @knotcms/worker

# Worker + web dashboard (same origin)
npm run dev:worker
```

Open `http://localhost:8787` for the dashboard.

**Public HTTPS for webhooks (Notion, Dodo billing):** from repo root:

```bash
npm run tunnel
```

Copy the `https://….trycloudflare.com` URL (changes each restart). Examples:

- Notion: `https://<tunnel>/webhooks/notion`
- Dodo: `https://<tunnel>/webhooks/billing`

Or start worker + tunnel together: `npm run dev` (includes web, worker, plugin, tunnel).

Optional — thin Framer plugin (points at local worker):

```bash
cp packages/plugin/.env.example packages/plugin/.env
npm run dev:plugin
```

Open in Framer: https://framer.com/plugins/open/

## Automatic sync (how it works)

1. Notion webhook or manual sync triggers the Worker
2. Worker calls Framer Server API: `createManagedCollection` (or find by **Notion database name**)
3. Full reconcile: `setFields` → `addItems` / `removeItems`
4. If enabled: `publish()` and optionally `deploy()` to live

This matches [Framer's notion-automations-sync example](https://github.com/framer/server-api-examples/tree/main/examples/notion-automations-sync). The collection must be API-managed (created on first connect), not only via the plugin UI.

## Notion webhooks

Register your Worker URL in the Notion integration settings:

```
https://app.knotcms.com/webhooks/notion
```

The worker debounces events (~10s after the last change) then runs headless sync. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Deploy worker

```bash
npm run deploy -w @knotcms/worker
wrangler secret put NOTION_CLIENT_ID
wrangler secret put NOTION_CLIENT_SECRET
wrangler secret put ENCRYPTION_KEY
wrangler secret put SESSION_SIGNING_SECRET
```

Production deploys automatically on push to `main` (see `.github/workflows/deploy.yml`). `wrangler.toml` uses `https://app.knotcms.com` for `WORKER_PUBLIC_URL`, `WEB_APP_URL`, and OAuth redirect URIs.

## V1 limitations

- Plugin-managed collections only (not user-created unmanaged collections)
- Property-level sync (Notion webhooks do not cover all block-level edits)
- Image fields use external URLs where supported
- One Notion data source per Framer collection
