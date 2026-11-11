-- Staff sessions can be revoked: every token carries the user's token_version, bumped on PIN change,
-- PIN reset, role change or deactivation.
ALTER TABLE admin_user ADD COLUMN token_version INT NOT NULL DEFAULT 0;

-- Courts and coaches are retired rather than deleted, so history keeps pointing at them.
ALTER TABLE court ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE coach ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;

-- Payments are never deleted. A wrong entry is voided with a reason and can then be recorded again.
ALTER TABLE payment
    ADD COLUMN voided_at   TIMESTAMPTZ,
    ADD COLUMN voided_by   BIGINT REFERENCES admin_user (id),
    ADD COLUMN void_reason VARCHAR(200),
    ADD CONSTRAINT chk_payment_void CHECK ((voided_at IS NULL) = (void_reason IS NULL));

-- Only live payments must be unique per period, so a voided period can be paid again.
DROP INDEX uq_payment_player_period;
CREATE UNIQUE INDEX uq_payment_player_period ON payment (player_id, period_from) WHERE voided_at IS NULL;
CREATE INDEX idx_payment_player ON payment (player_id);

-- "Is this the last active owner?" checks.
CREATE INDEX idx_admin_user_role ON admin_user (role) WHERE active;
