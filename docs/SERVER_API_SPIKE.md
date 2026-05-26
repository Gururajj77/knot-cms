# Server API spike notes

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full system design. This doc records the spike conclusion only.

## Conclusion

Headless auto-sync works when the CMS collection is **owned by the Framer Server API session**, following [framer/server-api-examples/notion-automations-sync](https://github.com/framer/server-api-examples/tree/main/examples/notion-automations-sync).

Collections created only in the plugin UI may not appear in `getManagedCollections()`. This project uses:

1. `createManagedCollection(name)` or find by **Notion database title**
2. `setFields` → `addItems` / `removeItems`
3. Optional `publish()` + `deploy()` when auto-publish is enabled

## Flow

```text
Notion webhook → Worker → connect(projectUrl, apiKey)
  → getManagedCollections() / createManagedCollection(name)
  → sync items → publish (optional)
```

## Plugin role

- Setup wizard: OAuth, mapping, license
- Triggers server sync via `POST /api/projects` and `POST /api/projects/:id/sync`
- Does **not** write Notion rows into the empty plugin CMS slot

## Requirements

- API key from **Site Settings → General** (same project as the URL)
- Project URL: `https://framer.com/projects/...` from the browser
- Collection name defaults to the Notion data source title

## References

- https://www.framer.com/developers/server-api-introduction
- https://github.com/framer/server-api-examples/tree/main/examples/notion-automations-sync
