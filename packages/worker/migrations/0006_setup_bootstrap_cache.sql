CREATE TABLE IF NOT EXISTS setup_bootstrap_cache (
  setup_session_id TEXT NOT NULL,
  framer_collection_id TEXT NOT NULL,
  parent_page_id TEXT NOT NULL,
  database_title TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (setup_session_id, framer_collection_id, parent_page_id, database_title)
);

ALTER TABLE projects ADD COLUMN framer_template_collection_id TEXT;
