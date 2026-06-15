ALTER TABLE customers ADD COLUMN pending_checkout_quantity INTEGER;
ALTER TABLE customers ADD COLUMN pending_plan_quantity INTEGER;
ALTER TABLE customers ADD COLUMN pending_plan_reminder_at TEXT;
