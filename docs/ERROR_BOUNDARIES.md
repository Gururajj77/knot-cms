# Error boundaries (NF Sync)

This doc explains how errors are handled so dev noise (duplicate D1 rows, Framer slug clashes) becomes **clear messages** in the plugin without changing the happy path.

## Layers

| Layer | What it does |
|--------|----------------|
| **D1** (`0004_sync_boundaries.sql`) | One row per `(framer_project_url, notion_data_source_id)`; short sync lock per project |
| **Shared** (`packages/shared/src/errors.ts`) | Stable `SyncErrorCode`, `prepareSyncItems()`, `classifySyncError()` |
| **Worker** `runSync` | Lock → validate slugs → sync → store `last_error` + `last_error_code` |
| **Worker** API | JSON `{ error, code, details? }` on failures |
| **Plugin** | `ApiRequestError`, dashboard shows friendly `lastError` |

## Stable error codes

| Code | Meaning | What to do |
|------|---------|------------|
| `FRAMER_UNAUTHORIZED` | API key ≠ Framer project URL | Reconfigure with correct URL + key |
| `FRAMER_DUPLICATE_ITEM` | Id/slug already in CMS | Unique slugs in Notion |
| `FRAMER_FIELD_MISMATCH` | CMS field id ≠ stored mapping (collection changed) | New project or delete old Framer collection |
| `SLUG_COLLISION` | Two Notion pages → same slug (caught before Framer) | Fix slug column in Notion |
| `SYNC_IN_PROGRESS` | Overlapping sync (webhook + manual) | Wait and retry |
| `LICENSE_INACTIVE` | License mismatch | Regenerate key for project URL |

## What did **not** change

- OAuth, field mapping, and Server API flow are the same on success.
- Webhook URL and debounce behavior unchanged.
- **Reconfigure** now always calls `POST /api/projects` so a different Notion DB updates D1 (fixes second-database setup).

## After pulling these changes

```bash
npm run db:migrate:local -w @knotcms/worker
npm run build
```

Migration `0004` dedupes duplicate local `projects` rows and adds the unique index.

## Local cleanup (optional)

If you still see `matched 5 project(s)` in logs, reset local D1:

```bash
rm -rf packages/worker/.wrangler/state/v3/d1
npm run db:migrate:local -w @knotcms/worker
```
