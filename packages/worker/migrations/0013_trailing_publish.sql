ALTER TABLE sync_state ADD COLUMN publish_pending INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sync_state ADD COLUMN publish_scheduled_at TEXT;
