-- Polar cancel-at-period-end (access until current_period_end).
ALTER TABLE customers ADD COLUMN subscription_cancel_at_period_end INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN subscription_ends_at TEXT;
