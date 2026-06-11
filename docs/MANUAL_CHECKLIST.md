# KnotCMS — what you do in dashboards

Architecture and code steps: [PIVOT.md](./PIVOT.md#roadmap).

---

## Where you are


| Step | What | Status |
| ---- | ---- | ------ |
| 1 | Plan docs | Done |
| 2 | Google Cloud OAuth | Done |
| 3 | Payments (Polar) | Done (sandbox) |
| 4 | New database (code) | Done |
| 5 | Google login on worker (code) | Done |
| **6** | Web dashboard (code) | Done |
| **7** | Deploy + thin plugin | **Next** |


---

## Step 2 — Google Cloud OAuth (you, now)

No repo changes required. When login code lands (Step 5), it will use these credentials.

### 1. Open Google Cloud Console

Go to [console.cloud.google.com](https://console.cloud.google.com/) → create or pick a project (e.g. `nocms`).

### 2. OAuth consent screen

**APIs & Services → OAuth consent screen**

- User type: **External** (unless you only use Workspace test users)
- App name: **KnotCMS**
- Support email: yours
- Scopes: add `email`, `profile`, `openid` (or use default Google sign-in scopes)
- Save

For testing before “Publish app”, add your Gmail under **Test users**.

### 3. Create OAuth client

**APIs & Services → Credentials → Create credentials → OAuth client ID**

- Type: **Web application**
- Name: `KnotCMS Worker`

**Authorized redirect URIs** — add both:

```
https://notion-framer-sync.framerskool.workers.dev/auth/google/callback
http://localhost:8787/auth/google/callback
```

(Replace the prod URL if your worker hostname changes later.)

### 4. Save credentials locally

Copy **Client ID** and **Client secret** into `packages/worker/.dev.vars`:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8787/auth/google/callback
```

Nothing will use these until **Step 5** (login code). That is expected.

### 5. Optional — generate session secrets

If `.dev.vars` still has placeholders:

```bash
openssl rand -base64 32   # paste as ENCRYPTION_KEY or SESSION_SIGNING_SECRET
```

### 6. Verify Notion OAuth (5 min)

At [notion.so/my-integrations](https://www.notion.com/my-integrations), confirm redirect URIs include:

```
https://notion-framer-sync.framerskool.workers.dev/oauth/notion/callback
http://localhost:8787/oauth/notion/callback
```

Your **current plugin** still uses this. Unrelated to Google, but worth confirming.

**Step 2 done when:** Google client exists, secrets are in `.dev.vars`, Notion redirects verified.

---

## Step 3 — Polar (you, now)

Provider: **Polar** (sandbox for dev, production when you launch).

- [x] Polar approved
- [ ] Create **subscription** product in [sandbox.polar.sh](https://sandbox.polar.sh)
- [ ] Copy checkout URL → `BILLING_CHECKOUT_URL` in `packages/worker/.dev.vars`
- [ ] Set `BILLING_PROVIDER=polar` in `.dev.vars`
- [ ] Create webhook endpoint in Polar sandbox (see below)
- [ ] Copy webhook signing secret → `BILLING_WEBHOOK_SECRET` in `.dev.vars`

**Webhook URL (local via CLI):**

```bash
polar listen http://localhost:8787/webhooks/billing
```

**Webhook URL (prod, after deploy):**

```
https://notion-framer-sync.framerskool.workers.dev/webhooks/billing
```

**Subscribe to events:** `customer.state_changed` (required), plus `subscription.active`, `subscription.revoked`, `subscription.canceled`.

**Test flow:**

1. `npm run dev:worker`
2. Run `polar listen http://localhost:8787/webhooks/billing` in another terminal
3. Complete sandbox checkout with the **same email** as your Google account
4. Set `AUTH_DEV_ALLOW_ANY=false` in `.dev.vars` temporarily
5. Sign in at `http://localhost:8787/auth/google/start` → should succeed with real `customerId` on `/api/auth/me`

---

## Test Google login (local)

```bash
npm run dev:worker
```

1. Open `http://localhost:8787/auth/google/start`
2. Sign in → redirects back with session cookie
3. Check `http://localhost:8787/api/auth/me`

Works with `AUTH_DEV_ALLOW_ANY=true` in wrangler.toml until billing is connected.

**Fresh local DB** (if migrate fails on old schema):

```bash
rm -rf packages/worker/.wrangler/state/v3/d1
npm run db:migrate:local -w @knotcms/worker
```

---

## Step 6 — Web dashboard (local)

Add to `packages/worker/.dev.vars` (overrides prod URLs in wrangler.toml):

```
WEB_APP_URL=http://localhost:8787
WORKER_PUBLIC_URL=http://localhost:8787
```

```bash
npm run build -w @knotcms/web   # first time, or npm run dev for watch + worker
npm run dev:worker
```

Open `http://localhost:8787` — login, projects list, setup wizard, sync status.

---

## Step 4 — New database (remote prod)

For **remote** D1 (not local):

```bash
cd packages/worker
wrangler d1 create publishflow
```

- [ ] Copy `database_id` into `wrangler.toml` (replace old id)
- [ ] `npm run db:migrate:remote -w @knotcms/worker`

Keep old remote D1 until Step 7 dogfood passes.

---

## Step 5 — After login code lands (you)

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put BILLING_WEBHOOK_SECRET
# plus NOTION_*, ENCRYPTION_KEY, SESSION_SIGNING_SECRET
```

- [ ] Add prod Google redirect URI in GCP if worker URL changed
- [ ] Set `AUTH_DEV_ALLOW_ANY=false` in production
- [ ] Test: Polar/LS test purchase → webhook → can log in with same email

---

## Step 6–7 — After web app + deploy

- [ ] Open web URL → Google login → dashboard works
- [ ] End-to-end: Notion edit → sync → Framer CMS
- [ ] Retire old D1 when confident

---

## Env vars quick reference


| Variable                      | You get it from                           |
| ----------------------------- | ----------------------------------------- |
| `GOOGLE_CLIENT_ID` / `SECRET` | Step 2 — GCP Credentials                  |
| `GOOGLE_REDIRECT_URI`         | Your worker URL + `/auth/google/callback` |
| `BILLING_WEBHOOK_SECRET`      | Step 3 — Polar or LS webhook settings     |
| `BILLING_CHECKOUT_URL`        | Step 3 — product checkout link            |
| `NOTION_CLIENT_ID` / `SECRET` | notion.so/my-integrations                 |
| `SESSION_SIGNING_SECRET`      | `openssl rand -base64 32`                 |


