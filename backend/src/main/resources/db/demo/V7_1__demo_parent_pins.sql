-- Dev only: every demo parent can sign in to the family portal with PIN 123456 (never in production).
INSERT INTO parent_account (mobile, pin_hash, must_change_pin)
SELECT mobile, crypt('123456', gen_salt('bf', 10)), FALSE
FROM (SELECT DISTINCT parent_mobile AS mobile FROM player) parents
ON CONFLICT (mobile) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, must_change_pin = FALSE;
