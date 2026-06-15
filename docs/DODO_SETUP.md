# Dodo Payments — Phase 2 setup

Configure Dodo **before** Phase 3 webhook code lands. Until then, `POST /webhooks/billing` returns **503** with `Dodo billing webhooks are not implemented yet` once secrets are set — that is expected.

Polar remains the production default (`BILLING_PROVIDER=polar`). Use a **staging** worker or local tunnel when testing Dodo.

---

## 1. Create Dodo account

1. Sign up at [dodopayments.com](https://dodopayments.com).
2. Create a **test** business (sandbox) and a **production** business when you are ready to launch.
3. Note which mode you are in — API keys and product IDs are per business.

---

## 2. Product — “KnotCMS Project”

Create one recurring subscription product for per-project pricing:

| Setting | Value |
| ------- | ----- |
| Name | KnotCMS Project |
| Billing | Recurring monthly |
| Pricing | **Per unit** — $9/unit (or your price) |
| Quantity | Customer chooses at checkout (1, 10, 100…) |

After creation, copy the **product ID** (`prod_…`) → `DODO_PROJECT_PRODUCT_ID`.

This maps to `customers.subscription_project_limit` (same as Polar seats).

---

## 3. Webhook

**Production URL:**

```
https://app.knotcms.com/webhooks/billing
```

**Staging / local:** use your staging worker URL or a tunnel (e.g. `https://<tunnel>.trycloudflare.com/webhooks/billing`).

### Subscribe to events

- `subscription.active`
- `subscription.updated`
- `subscription.renewed`
- `subscription.cancelled`
- `subscription.expired`
- `subscription.on_hold`

### Verify endpoint is live

```bash
curl -s https://app.knotcms.com/webhooks/billing | jq
```

With `BILLING_PROVIDER=dodo` and secrets set, `POST /webhooks/billing` verifies Standard Webhooks signatures and updates `customers`. `GET /webhooks/billing` shows `configured: true` when ready.

Copy the webhook **signing secret** → `DODO_WEBHOOK_SECRET`.

---

## 4. API key

Developer settings → create API key → `DODO_API_KEY`.

Used in Phase 4 (checkout API) and Phase 5 (customer portal API). Set it now so staging is ready.

---

## 5. Customer portal (optional in Phase 2)

Enable the Dodo customer portal so subscribers can change quantity and cancel.

- Static portal URL → `DODO_CUSTOMER_PORTAL_URL` (if Dodo provides a hosted link), **or**
- Phase 5 will add an API-fetched portal URL.

---

## 6. Checkout (Phase 4 — API)

When `BILLING_PROVIDER=dodo` and `DODO_API_KEY` are set, the app creates checkout sessions via `POST /api/billing/checkout` with `{ quantity: N }` instead of a static link.

Profile → Subscribe uses a project quantity picker; checkout pre-fills `customer.email` from the signed-in Google session. **Use the same email** or webhooks will not match.

Optional static fallback: `DODO_CHECKOUT_URL_PAID` (used when API key is unset).

## 7. Checkout link (optional static fallback)

If Dodo offers a hosted checkout page with quantity selection:

- Copy checkout URL → `DODO_CHECKOUT_URL_PAID`

Phase 4 adds API checkout with `product_cart: [{ product_id, quantity }]`. Until then, a static link works like Polar’s `BILLING_CHECKOUT_URL_PAID`.

---

## 8. Environment variables

### Local — `packages/worker/.dev.vars`

```bash
# Switch provider only on a Dodo test branch / machine
BILLING_PROVIDER=dodo

DODO_API_KEY=
DODO_WEBHOOK_SECRET=
DODO_PROJECT_PRODUCT_ID=prod_...

# Optional until Phase 4–5
DODO_CHECKOUT_URL_PAID=
DODO_CUSTOMER_PORTAL_URL=

# Keep Polar vars for switching back or running Polar tests
BILLING_WEBHOOK_SECRET=
POLAR_PROJECT_PRODUCT_ID=
BILLING_CHECKOUT_URL_PAID=
BILLING_CUSTOMER_PORTAL_URL=
```

See `packages/worker/.dev.vars.example` for the full template.

### Production — wrangler secrets

```bash
cd packages/worker

wrangler secret put BILLING_PROVIDER          # "dodo" when cutting over
wrangler secret put DODO_API_KEY
wrangler secret put DODO_WEBHOOK_SECRET
wrangler secret put DODO_PROJECT_PRODUCT_ID
wrangler secret put DODO_CHECKOUT_URL_PAID    # optional
wrangler secret put DODO_CUSTOMER_PORTAL_URL  # optional
```

Keep Polar secrets in place for rollback (`BILLING_PROVIDER=polar`).

---

## 9. Acceptance checklist (Phase 2)

- [ ] Test product created in Dodo sandbox with per-unit monthly pricing
- [ ] `DODO_PROJECT_PRODUCT_ID` copied to `.dev.vars` / wrangler
- [ ] Webhook registered pointing at `/webhooks/billing` with subscription events
- [ ] `DODO_WEBHOOK_SECRET` and `DODO_API_KEY` set
- [ ] `GET /webhooks/billing` shows provider `dodo`, lists no missing required secrets
- [ ] `POST /webhooks/billing` returns **202** for signed Dodo subscription events
- [ ] Polar path unchanged with `BILLING_PROVIDER=polar`

---

## 10. Test purchase flow (after Phase 3)

1. Set `AUTH_DEV_ALLOW_ANY=false`
2. Complete Dodo checkout with the **same email** as Google login
3. Webhook fires → `customers.subscription_project_limit` = checkout quantity
4. Sign in at `/auth/google/start` → entitled

---

## Rollback

```bash
wrangler secret put BILLING_PROVIDER   # value: polar
```

Polar webhooks and checkout URLs resume immediately; no customer data migration required.
