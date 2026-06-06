CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  billing_provider TEXT,
  external_customer_id TEXT,
  external_subscription_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  framer_project_url TEXT NOT NULL,
  framer_collection_id TEXT NOT NULL,
  framer_collection_name TEXT,
  source_provider TEXT NOT NULL DEFAULT 'notion',
  source_data_source_id TEXT NOT NULL,
  source_database_id TEXT,
  source_title TEXT,
  slug_source_property_id TEXT NOT NULL,
  auto_sync INTEGER NOT NULL DEFAULT 1,
  auto_publish INTEGER NOT NULL DEFAULT 0,
  publish_mode TEXT NOT NULL DEFAULT 'preview_only',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_framer_source_unique
  ON projects(framer_project_url, source_provider, source_data_source_id);

CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_framer_url ON projects(framer_project_url);

CREATE TABLE IF NOT EXISTS secrets (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  source_access_token_enc TEXT NOT NULL,
  framer_api_key_enc TEXT NOT NULL,
  source_webhook_verification_token TEXT
);

CREATE TABLE IF NOT EXISTS field_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_property_id TEXT NOT NULL,
  source_property_name TEXT NOT NULL DEFAULT '',
  source_property_type TEXT NOT NULL,
  framer_field_id TEXT NOT NULL,
  framer_field_name TEXT NOT NULL,
  framer_field_type TEXT NOT NULL,
  ignored INTEGER NOT NULL DEFAULT 0,
  transform_json TEXT,
  UNIQUE(project_id, source_property_id)
);

CREATE INDEX IF NOT EXISTS idx_field_mappings_project ON field_mappings(project_id);

CREATE TABLE IF NOT EXISTS sync_state (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  last_sync_at TEXT,
  last_notion_cursor TEXT,
  last_error TEXT,
  last_error_code TEXT,
  items_synced_count INTEGER NOT NULL DEFAULT 0,
  sync_lock_until TEXT,
  last_publish_at TEXT
);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  source_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  last_event_at TEXT
);

CREATE TABLE IF NOT EXISTS connect_sessions (
  id TEXT PRIMARY KEY,
  source_access_token_enc TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS debounce_sync (
  project_id TEXT PRIMARY KEY,
  scheduled_at TEXT NOT NULL
);
