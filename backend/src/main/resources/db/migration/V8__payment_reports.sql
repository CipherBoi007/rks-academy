-- Parents pay the academy by UPI straight from their own app (no payment gateway) and report the payment with its
-- UPI reference. The owner checks it against the bank and confirms it, which records the payments and receipts,
-- or rejects it with a reason. One report can cover several children: brothers and sisters are often paid together.
CREATE TABLE payment_report (
    id                 BIGSERIAL PRIMARY KEY,
    parent_account_id  BIGINT         NOT NULL REFERENCES parent_account (id),
    utr                VARCHAR(22)    NOT NULL CHECK (utr ~ '^[A-Z0-9]{10,22}$'),
    amount             NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    paid_on            DATE           NOT NULL,
    status             VARCHAR(9)     NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
    reviewed_by        BIGINT         REFERENCES admin_user (id),
    reviewed_at        TIMESTAMPTZ,
    reject_reason      VARCHAR(200),
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CHECK ((status = 'PENDING') = (reviewed_at IS NULL)),
    CHECK (status <> 'REJECTED' OR reject_reason IS NOT NULL)
);
-- A UPI reference can be reported once; after a rejection it may be reported again.
CREATE UNIQUE INDEX uq_payment_report_utr ON payment_report (utr) WHERE status <> 'REJECTED';
CREATE INDEX idx_payment_report_pending ON payment_report (created_at) WHERE status = 'PENDING';
CREATE INDEX idx_payment_report_parent ON payment_report (parent_account_id, created_at DESC);

-- The fee each child's share covers: the billing period and the amount quoted for the day the parent paid.
CREATE TABLE payment_report_item (
    id           BIGSERIAL PRIMARY KEY,
    report_id    BIGINT         NOT NULL REFERENCES payment_report (id) ON DELETE CASCADE,
    player_id    BIGINT         NOT NULL REFERENCES player (id),
    period_from  DATE           NOT NULL,
    amount       NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_id   BIGINT         REFERENCES payment (id),
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    UNIQUE (report_id, player_id)
);
CREATE INDEX idx_payment_report_item_player ON payment_report_item (player_id);

-- Same protection as every other table (see V6).
ALTER TABLE payment_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_report_item ENABLE ROW LEVEL SECURITY;
