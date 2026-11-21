-- Players aren't all children. Each player has one contact who manages their account: their parent, a guardian,
-- or the player themselves (adults). The contact's mobile number is still the family-app sign-in, so a parent
-- who also plays shares one sign-in, one Fees page and one UPI payment with their children.
ALTER TABLE player RENAME COLUMN parent_name TO contact_name;
ALTER TABLE player RENAME COLUMN parent_mobile TO contact_mobile;
ALTER TABLE player RENAME COLUMN parent_occupation TO contact_occupation;
-- Every existing player was entered with a parent or guardian.
ALTER TABLE player ADD COLUMN contact_relation VARCHAR(8) NOT NULL DEFAULT 'PARENT'
    CHECK (contact_relation IN ('SELF', 'PARENT', 'GUARDIAN'));
ALTER TABLE player ALTER COLUMN contact_relation DROP DEFAULT;
ALTER INDEX idx_player_parent_mobile RENAME TO idx_player_contact_mobile;

-- The family-app sign-in belongs to a mobile number, not to a parent.
ALTER TABLE parent_account RENAME TO family_account;
ALTER TABLE payment_report RENAME COLUMN parent_account_id TO family_account_id;
ALTER INDEX idx_payment_report_parent RENAME TO idx_payment_report_account;
