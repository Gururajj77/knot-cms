CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  framer_project_url TEXT NOT NULL,
  framer_collection_id TEXT NOT NULL,
  notion_data_source_id TEXT NOT NULL,
  notion_data_source_title TEXT,
  slug_notion_property_id TEXT NOT NULL,
  auto_sync INTEGER NOT NULL DEFAULT 1,
  auto_publish INTEGER NOT NULL DEFAULT 0,
  publish_mode TEXT NOT NULL DEFAULT 'preview_only',
  license_key_hash TEXT,
  license_status TEXT NOT NULL DEFAULT 'inactive',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_projects_framer_url ON projects(framer_project_url);

CREATE TABLE IF NOT EXISTS secrets (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  notion_access_token_enc TEXT NOT NULL,
  framer_api_key_enc TEXT NOT NULL,
  notion_webhook_verification_token TEXT
);

CREATE TABLE IF NOT EXISTS field_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  notion_property_id TEXT NOT NULL,
  notion_property_name TEXT NOT NULL DEFAULT '',
  notion_property_type TEXT NOT NULL,
  framer_field_id TEXT NOT NULL,
  framer_field_name TEXT NOT NULL,
  framer_field_type TEXT NOT NULL,
  ignored INTEGER NOT NULL DEFAULT 0,
  transform_json TEXT,
  UNIQUE(project_id, notion_property_id)
);

CREATE INDEX IF NOT EXISTS idx_field_mappings_project ON field_mappings(project_id);

CREATE TABLE IF NOT EXISTS sync_state (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  last_sync_at TEXT,
  last_notion_cursor TEXT,
  last_error TEXT,
  items_synced_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  notion_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  last_event_at TEXT
);

CREATE TABLE IF NOT EXISTS setup_sessions (
  id TEXT PRIMARY KEY,
  notion_access_token_enc TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS debounce_sync (
  project_id TEXT PRIMARY KEY,
  scheduled_at TEXT NOT NULL
);
