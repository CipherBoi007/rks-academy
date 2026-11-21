-- Occupation and school were collected but never used for anything (not on receipts, reminders or fees), so the
-- academy no longer asks for them or keeps them.
ALTER TABLE player DROP COLUMN contact_occupation;
ALTER TABLE player DROP COLUMN school;
