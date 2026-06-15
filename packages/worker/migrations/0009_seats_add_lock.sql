-- Track billing cycle end and in-app seat-add lock (one add per cycle).
ALTER TABLE customers ADD COLUMN subscription_renews_at TEXT;
ALTER TABLE customers ADD COLUMN seats_add_locked_until TEXT;
