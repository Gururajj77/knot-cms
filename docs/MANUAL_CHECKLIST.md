# PublishFlow — what you do in dashboards

Architecture and code steps: [PIVOT.md](./PIVOT.md#roadmap).

---

## Where you are


| Step | What | Status |
| ---- | ---- | ------ |
| 1 | Plan docs | Done |
| 2 | Google Cloud OAuth | Done |
| 3 | Payments (Polar / LS) | When approved |
| 4 | New database (code) | Done |
| 5 | Google login on worker (code) | Done |
| **6** | **Web dashboard (code)** | **Next** |
| 7 | Deploy + thin plugin | Not started |


---

## Step 2 — Google Cloud OAuth (you, now)

No repo changes required. When login code lands (Step 5), it will use these credentials.

### 1. Open Google Cloud Console

Go to [console.cloud.google.com](https://console.cloud.google.com/) → create or pick a project (e.g. `publishflow`).

### 2. OAuth consent screen

**APIs & Services → OAuth consent screen**

- User type: **External** (unless you only use Workspace test users)
- App name: **PublishFlow**
- Support email: yours
- Scopes: add `email`, `profile`, `openid` (or use default Google sign-in scopes)
- Save

For testing before “Publish app”, add your Gmail under **Test users**.

### 3. Create OAuth client

**APIs & Services → Credentials → Create credentials → OAuth client ID**

- Type: **Web application**
- Name: `PublishFlow Worker`

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

## Step 3 — Payments provider (you, when approved)

Skip until Polar or Lemon Squeezy approves you.

- [ ] Apply to **Polar** (and LS when you want)
- [ ] Pick one after comparing fees / UX
- [ ] Create **subscription** product (no license keys for LS)
- [ ] Webhook URL (for later, Step 5 code): `https://YOUR-WORKER.workers.dev/webhooks/billing`
- [ ] Save webhook signing secret + checkout URL for `.dev.vars`

Do **not** create the webhook until Step 5 code exists — note the URL for later.

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
npm run db:migrate:local -w @notion-framer/worker
```

---

## Step 4 — New database (remote prod)

For **remote** D1 (not local):

```bash
cd packages/worker
wrangler d1 create publishflow
```

- [ ] Copy `database_id` into `wrangler.toml` (replace old id)
- [ ] `npm run db:migrate:remote -w @notion-framer/worker`

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


