-- Per-project quantity from Polar subscription seats ($10 × N / month).
ALTER TABLE customers ADD COLUMN subscription_project_limit INTEGER;

UPDATE customers
SET plan_id = 'paid', subscription_project_limit = 1
WHERE plan_id = 'pro';

UPDATE customers
SET plan_id = 'paid', subscription_project_limit = 5
WHERE plan_id = 'max';

UPDATE customers
SET subscription_project_limit = 1
WHERE plan_id = 'paid'
  AND subscription_project_limit IS NULL
  AND subscription_status IN ('active', 'trialing');
