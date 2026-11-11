-- Family portal: parents sign in with the mobile number the academy has on file, using a one-time code.

-- One row per parent mobile that has signed in. Access itself always comes from active players with that
-- parent_mobile, so deactivating a player (or changing the number) removes access immediately.
CREATE TABLE parent_account (
    id             BIGSERIAL PRIMARY KEY,
    mobile         VARCHAR(15) NOT NULL UNIQUE,
    token_version  INT         NOT NULL DEFAULT 0,
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One-time sign-in codes. Only a keyed hash is stored; codes expire quickly and allow a few attempts.
CREATE TABLE login_code (
    id          BIGSERIAL PRIMARY KEY,
    mobile      VARCHAR(15) NOT NULL,
    code_hash   VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    attempts    INT         NOT NULL DEFAULT 0,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_code_mobile ON login_code (mobile, created_at DESC);

CREATE INDEX idx_player_parent_mobile ON player (parent_mobile) WHERE active;
