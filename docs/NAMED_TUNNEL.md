# Named Cloudflare tunnel (stable local webhooks)

Use a **named tunnel** when you need a **stable HTTPS URL** for local dev webhooks (Google Sheets Drive watch, Notion, billing). Quick tunnels (`trycloudflare.com`) change every restart — named tunnels do not.

OAuth (Google login, Sheets connect, Notion connect) can stay on `http://localhost:8787`. Only `WEBHOOK_PUBLIC_URL` needs the tunnel hostname.

## Prerequisites

- Domain added to Cloudflare (DNS managed by CF)
- Worker running locally on port **8787** (`npm run dev:worker`)
- `cloudflared` installed (repo includes it via `npm install`)

## One-time setup

Run these from the **repo root**.

### 1. Log in to Cloudflare

```bash
npx cloudflared tunnel login
```

A browser opens. Pick the zone (domain) you want to use, e.g. `knotcms.com`.

This saves `~/.cloudflared/cert.pem`.

### 2. Create the tunnel

```bash
npx cloudflared tunnel create knotcms-dev
```

Note the output:

- **Tunnel ID** (UUID)
- **Credentials file** path, e.g. `~/.cloudflared/abc123….json`

### 3. Pick a hostname

Choose a subdomain on your zone, e.g.:

- `dev-api.knotcms.com` — webhooks + full app via tunnel
- `dev.knotcms.com` — same

This hostname must match what you set in `.dev.vars` as `WEBHOOK_PUBLIC_URL`.

### 4. Create the DNS record (automatic)

```bash
npx cloudflared tunnel route dns knotcms-dev dev-api.knotcms.com
```

Cloudflare adds a CNAME: `dev-api` → `<tunnel-id>.cfargotunnel.com`.

**Manual alternative:** Cloudflare dashboard → DNS → CNAME `dev-api` → `<tunnel-id>.cfargotunnel.com` (proxied).

### 5. Configure the tunnel

```bash
cp cloudflared/config.example.yml cloudflared/config.yml
```

Edit `cloudflared/config.yml`:

```yaml
tunnel: knotcms-dev
credentials-file: ~/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: dev-api.knotcms.com
    service: http://localhost:8787
  - service: http_status:404
```

`cloudflared/config.yml` is gitignored (credentials path is local).

### 6. Set worker env

In `packages/worker/.dev.vars`:

```bash
WEBHOOK_PUBLIC_URL=https://dev-api.knotcms.com
```

Keep OAuth on localhost:

```bash
WEB_APP_URL=http://localhost:8787
WORKER_PUBLIC_URL=http://localhost:8787
GOOGLE_SHEETS_REDIRECT_URI=http://localhost:8787/oauth/google-sheets/callback
NOTION_REDIRECT_URI=http://localhost:8787/oauth/notion/callback
```

Restart the worker after editing `.dev.vars`.

### 7. Start the tunnel

```bash
npm run tunnel
```

Or everything together:

```bash
npm run dev
```

`npm run tunnel` uses `cloudflared/config.yml` when present; otherwise it falls back to a quick tunnel.

### 8. Register webhooks

| Feature | Action |
|---------|--------|
| **Google Sheets auto-sync** | Open project → **Sync now** (registers Drive watch to `https://dev-api…/webhooks/google-drive`) |
| **Notion auto-sync** | Notion integration → Webhooks → URL `https://dev-api…/webhooks/notion` |
| **Billing (Dodo/Polar)** | Webhook URL `https://dev-api…/webhooks/billing` |

## Daily workflow

```bash
# Terminal 1 (or use npm run dev for worker + tunnel + web + plugin)
npm run dev:worker

# Terminal 2 — only if not using npm run dev
npm run tunnel
```

No need to update `WEBHOOK_PUBLIC_URL` after restarts. Re-run **Sync now** only if you changed the hostname or deleted the tunnel.

## Verify

```bash
curl -I https://dev-api.knotcms.com
```

You should get a response from your local worker (200/302/404 — not a Cloudflare error page).

In the app, project settings should show a Drive watch endpoint starting with `https://dev-api…`.

## If tunnel still won't start (after fixing Mac DNS)

Check generic tunnel DNS:

```bash
dig srv _v2-origintunneld._tcp.argotunnel.com @1.1.1.1
```

If that returns `region1.v2.argotunnel.com`, your DNS is fine.

### A. Re-link the DNS route

```bash
npx cloudflared tunnel route dns knotcms-dev dev-api.knotcms.com
```

### B. Cloudflare dashboard (often required for cloudflared 2026.x)

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks** → **Tunnels**
2. Open **knotcms-dev**
3. **Public Hostname** tab → **Add a public hostname**
   - Subdomain: `dev-api`
   - Domain: `knotcms.com`
   - Service: `http://localhost:8787`
4. Save

### C. Check DNS records don't conflict

Cloudflare dashboard → **DNS** → `dev-api.knotcms.com` should be:

**CNAME** → `b308a0a5-681b-4c68-b1de-7d44adffba80.cfargotunnel.com` (Proxied)

If you see a manual **A** record instead, delete it and re-run step A.

### D. Flush Mac DNS cache

```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
npm run tunnel
```

Success looks like: `Registered tunnel connection` (process stays running).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Tunnel credentials file doesn't exist` | Check `credentials-file` path in `config.yml` matches `~/.cloudflared/<id>.json` |
| DNS not resolving | Wait 1–2 min; confirm CNAME in CF dashboard |
| Webhooks still HTTP / localhost | Set `WEBHOOK_PUBLIC_URL`, restart worker |
| Sheets auto-sync not firing | **Sync now** after tunnel is up; watch expires after 7 days without sheet edits |
| `Could not lookup srv records` with `_dev-api.knotcms.com-v2-origintunneld` | DNS is fine if `_v2-origintunneld._tcp.argotunnel.com` resolves. Re-link route DNS, confirm CF **Public Hostname** on the tunnel, no manual A record on `dev-api` |
| ISP / Mac DNS | Set DNS to 1.1.1.1 + 1.0.0.1, then `sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder` |

## Optional: open the dashboard via tunnel

You can browse `https://dev-api.knotcms.com` instead of localhost. OAuth redirect URIs must still be registered for whichever origin you use in the browser.

For most dev, use **localhost in the browser** and **tunnel only for inbound webhooks** (`WEBHOOK_PUBLIC_URL`).

## Commands reference

```bash
npx cloudflared tunnel login          # one-time auth
npx cloudflared tunnel create NAME    # create tunnel + credentials
npx cloudflared tunnel route dns NAME HOSTNAME
npx cloudflared tunnel list           # see tunnels
npx cloudflared tunnel delete NAME    # remove tunnel
npm run tunnel                        # run named tunnel (cloudflared/config.yml)
```
