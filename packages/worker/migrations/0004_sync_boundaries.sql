-- One connection per Framer project URL + Notion data source (removes duplicate dev rows).
DELETE FROM projects
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM projects
  GROUP BY framer_project_url, notion_data_source_id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_framer_notion_unique
  ON projects(framer_project_url, notion_data_source_id);

-- Short-lived lock so webhook + manual sync do not overlap on the same project.
ALTER TABLE sync_state ADD COLUMN sync_lock_until TEXT;

-- Optional code for plugin-friendly errors (message stays in last_error).
ALTER TABLE sync_state ADD COLUMN last_error_code TEXT;
