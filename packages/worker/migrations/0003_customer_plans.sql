-- Plan tier + lifetime sync usage (Basic quota). Enforcement wired in commit 2.
ALTER TABLE customers ADD COLUMN plan_id TEXT NOT NULL DEFAULT 'basic';
ALTER TABLE customers ADD COLUMN sync_count INTEGER NOT NULL DEFAULT 0;

-- Existing paying customers keep Pro until Polar webhook sets pro vs max.
UPDATE customers
SET plan_id = 'pro'
WHERE subscription_status IN ('active', 'trialing');
