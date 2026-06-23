ALTER TABLE connect_sessions ADD COLUMN customer_id TEXT REFERENCES customers(id);

CREATE INDEX IF NOT EXISTS idx_connect_sessions_customer ON connect_sessions(customer_id);
