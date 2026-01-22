UPDATE subscriptions 
SET trial_ends_at = now() + interval '7 days', 
    created_at = now() 
WHERE id = '17cc6732-6f6f-48f5-a2a7-6fed61646361'