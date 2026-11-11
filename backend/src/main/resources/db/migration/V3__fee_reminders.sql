-- One WhatsApp fee reminder per player per billing period; re-running a month only retries failures.
CREATE TABLE fee_reminder (
    id                   BIGSERIAL PRIMARY KEY,
    player_id            BIGINT         NOT NULL REFERENCES player (id) ON DELETE CASCADE,
    period_from          DATE           NOT NULL,
    to_mobile            VARCHAR(15)    NOT NULL,
    amount               NUMERIC(10, 2) NOT NULL,
    message              TEXT           NOT NULL,
    status               VARCHAR(7)     NOT NULL CHECK (status IN ('SENT', 'FAILED')),
    provider             VARCHAR(10)    NOT NULL,
    provider_message_id  VARCHAR(100),
    error                VARCHAR(300),
    attempts             INT            NOT NULL DEFAULT 1,
    sent_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_fee_reminder UNIQUE (player_id, period_from)
);
CREATE INDEX idx_fee_reminder_period ON fee_reminder (period_from);
