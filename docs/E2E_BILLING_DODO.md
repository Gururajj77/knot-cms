# Dodo billing — sandbox E2E test guide

Complete this on **local** or a **staging** worker with `BILLING_PROVIDER=dodo` and Dodo **test mode** credentials. Production cutover is Phase 8 (skipped here).

**Prerequisites:** [DODO_SETUP.md](./DODO_SETUP.md) dashboard steps done, worker running (`npm run dev:worker`), web built.

---

## 1. Configure `.dev.vars`

```bash
BILLING_PROVIDER=dodo
DODO_API_KEY=...
DODO_WEBHOOK_SECRET=...
DODO_PROJECT_PRODUCT_ID=prod_...
DODO_PAYMENTS_ENVIRONMENT=test

# Optional static fallbacks (API checkout/portal preferred):
# DODO_CHECKOUT_URL_PAID=
# DODO_CUSTOMER_PORTAL_URL=

AUTH_DEV_ALLOW_ANY=false   # enforce real entitlement for this test
```

Verify config:

```bash
curl -s http://localhost:8787/webhooks/billing | jq
curl -s http://localhost:8787/api/billing/config | jq
```

Expect `provider: "dodo"`, `checkoutUsesApi: true`, `portalUsesApi: true`, `configured: true` on webhooks.

---

## 2. Webhook tunnel (local)

Dodo cannot reach `localhost`. Use one of:

- **Cloudflare tunnel:** from repo root, `npm run tunnel` (or `npx cloudflared tunnel --url http://localhost:8787`)
- **Deploy to staging** worker with public URL

Register webhook URL: `https://<public-host>/webhooks/billing`

Subscribe to: `subscription.active`, `subscription.updated`, `subscription.renewed`, `subscription.cancelled`, `subscription.expired`, `subscription.on_hold`

---

## 3. E2E script

### A. New user → Basic

1. Sign in with Google (`test-user@…`)
2. Confirm Profile shows **Basic** — 1 project, 3 manual syncs
3. Create **1 project** — should succeed

### B. Purchase (qty = 2)

1. Profile → **Subscribe** (or inline subscribe on usage card)
2. Set quantity **2** → **Subscribe**
3. Complete Dodo test checkout with the **same Google email**
4. Return to `/profile/plans?billing=success`
5. Click **Refresh status**
6. Confirm: plan **Project**, `2 / 2` projects, auto-sync enabled
7. Create **2nd project** — OK; **3rd** — blocked

### C. Upgrade quantity (2 → 5)

1. Profile → **Manage seats & billing estimate**
2. Set desired seats to **5** → **Update seats**
3. Wait for `subscription.plan_changed` or `subscription.updated` webhook (check worker logs)
4. **Refresh status** on Profile
5. Confirm `5 / 5` project limit; create up to 5 projects

### D. Downgrade quantity (5 → 1) with over-limit

1. With **3+ projects** in use, open the seat controls on Profile
2. Set seats to **1** → **Update seats** (blocked in UI if below projects in use)
3. After webhook + refresh: over-limit banner, sync paused on excess projects
4. Delete extra projects OR upgrade seats again to resume

Use **Open billing portal** on Profile for cancel, payment method, and invoices — not seat quantity.

### E. Cancel subscription

1. Portal → cancel at period end
2. Profile shows **Subscription ending** banner with end date
3. Entitlement remains until period end, then **inactive** / Basic limits

---

## 4. API smoke tests (curl)

**Checkout** (authenticated — use browser devtools or cookie from login):

```bash
# After signing in, copy pf_session cookie from browser
curl -s -X POST http://localhost:8787/api/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: pf_session=..." \
  -d '{"quantity":3}' | jq
```

**Portal** (requires `external_customer_id` from webhook after first purchase):

```bash
curl -s http://localhost:8787/api/billing/portal \
  -H "Cookie: pf_session=..." | jq
```

---

## 5. Troubleshooting

| Symptom | Fix |
| ------- | --- |
| Checkout 502 | Check `DODO_API_KEY`, product ID, test vs live API host |
| Paid but still Basic | Email mismatch at checkout; webhook not received; click Refresh |
| Portal 409 | Webhook not processed yet — wait and Refresh status |
| Seats not updating | Confirm `subscription.plan_changed` or `subscription.updated` in Dodo webhook logs; click **Refresh status** after **Update seats** |
| Polar still active | `BILLING_PROVIDER` must be `dodo` in `.dev.vars` |

---

## 6. Polar regression (optional)

Set `BILLING_PROVIDER=polar` + Polar secrets. Confirm static checkout URL and portal link still work; no Dodo API calls.
