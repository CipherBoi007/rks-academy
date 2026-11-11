-- RKS Academy schema. Money is NUMERIC(10,2) in INR; dates are Asia/Kolkata calendar dates.

CREATE TABLE court (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(60)  NOT NULL UNIQUE,
    surface_type  VARCHAR(60)  NOT NULL,
    sort_order    INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE coach (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    title       VARCHAR(40),
    mobile      VARCHAR(15),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE admin_user (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    mobile           VARCHAR(15)  NOT NULL UNIQUE,
    pin_hash         VARCHAR(100) NOT NULL,
    role             VARCHAR(10)  NOT NULL CHECK (role IN ('OWNER', 'COACH')),
    coach_id         BIGINT REFERENCES coach (id),
    must_change_pin  BOOLEAN      NOT NULL DEFAULT FALSE,
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE batch (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(80)  NOT NULL,
    court_id      BIGINT       NOT NULL REFERENCES court (id),
    coach_id      BIGINT       NOT NULL REFERENCES coach (id),
    start_time    TIME         NOT NULL,
    end_time      TIME         NOT NULL,
    days_of_week  VARCHAR(40)  NOT NULL,
    level         VARCHAR(12)  CHECK (level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'TOURNAMENT')),
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK (end_time > start_time)
);
CREATE INDEX idx_batch_court ON batch (court_id);

CREATE TABLE fee_plan (
    id                 BIGSERIAL PRIMARY KEY,
    name               VARCHAR(60)    NOT NULL,
    level_label        VARCHAR(80)    NOT NULL,
    price              NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    period_months      INT            NOT NULL CHECK (period_months BETWEEN 1 AND 12),
    sessions_per_week  INT            NOT NULL CHECK (sessions_per_week BETWEEN 1 AND 7),
    most_popular       BOOLEAN        NOT NULL DEFAULT FALSE,
    sort_order         INT            NOT NULL DEFAULT 0,
    active             BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_fee_plan_most_popular ON fee_plan (most_popular) WHERE most_popular AND active;

CREATE TABLE fee_plan_perk (
    fee_plan_id  BIGINT       NOT NULL REFERENCES fee_plan (id) ON DELETE CASCADE,
    position     INT          NOT NULL,
    text         VARCHAR(120) NOT NULL,
    PRIMARY KEY (fee_plan_id, position)
);

-- Versioned: the row in force for a billing period is the latest one with effective_from <= period start.
CREATE TABLE fee_policy (
    id                         BIGSERIAL PRIMARY KEY,
    registration_fee           NUMERIC(10, 2) NOT NULL CHECK (registration_fee >= 0),
    sibling_discount_2nd_pct   NUMERIC(5, 2)  NOT NULL CHECK (sibling_discount_2nd_pct BETWEEN 0 AND 100),
    sibling_discount_3rd_pct   NUMERIC(5, 2)  NOT NULL CHECK (sibling_discount_3rd_pct BETWEEN 0 AND 100),
    late_fee_after_day         INT            NOT NULL CHECK (late_fee_after_day BETWEEN 1 AND 28),
    late_fee_base              NUMERIC(10, 2) NOT NULL CHECK (late_fee_base >= 0),
    late_fee_per_day           NUMERIC(10, 2) NOT NULL CHECK (late_fee_per_day >= 0),
    late_fee_max               NUMERIC(10, 2) NOT NULL CHECK (late_fee_max >= 0),
    effective_from             DATE           NOT NULL UNIQUE,
    created_at                 TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE SEQUENCE player_code_seq START 101;

CREATE TABLE player (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(12)  NOT NULL UNIQUE,
    name              VARCHAR(100) NOT NULL,
    dob               DATE         NOT NULL,
    gender            VARCHAR(6)   NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    photo_url         VARCHAR(300),
    parent_name       VARCHAR(100) NOT NULL,
    parent_mobile     VARCHAR(15)  NOT NULL,
    parent_occupation VARCHAR(80),
    blood_group       VARCHAR(4)   CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    school            VARCHAR(120),
    address           VARCHAR(200),
    level             VARCHAR(12)  NOT NULL CHECK (level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'TOURNAMENT')),
    batch_id          BIGINT       NOT NULL REFERENCES batch (id),
    fee_plan_id       BIGINT       NOT NULL REFERENCES fee_plan (id),
    join_date         DATE         NOT NULL,
    plan_start_date   DATE         NOT NULL CHECK (EXTRACT(DAY FROM plan_start_date) = 1),
    active            BOOLEAN      NOT NULL DEFAULT TRUE,
    sibling_group_id  UUID,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_player_batch ON player (batch_id);
CREATE INDEX idx_player_name ON player (lower(name));
CREATE INDEX idx_player_sibling ON player (sibling_group_id) WHERE sibling_group_id IS NOT NULL;

CREATE TABLE player_level_history (
    id           BIGSERIAL PRIMARY KEY,
    player_id    BIGINT      NOT NULL REFERENCES player (id) ON DELETE CASCADE,
    level        VARCHAR(12) NOT NULL CHECK (level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'TOURNAMENT')),
    achieved_on  DATE        NOT NULL,
    UNIQUE (player_id, level)
);

-- Coach-assessed skill scores out of 100, shown as bars on the player profile.
CREATE TABLE player_skill (
    player_id   BIGINT      NOT NULL REFERENCES player (id) ON DELETE CASCADE,
    skill       VARCHAR(10) NOT NULL CHECK (skill IN ('FOOTWORK', 'SMASH', 'DEFENCE', 'NET_PLAY', 'STAMINA')),
    score       INT         NOT NULL CHECK (score BETWEEN 0 AND 100),
    updated_on  DATE        NOT NULL,
    PRIMARY KEY (player_id, skill)
);

CREATE TABLE attendance_record (
    id          BIGSERIAL PRIMARY KEY,
    player_id   BIGINT      NOT NULL REFERENCES player (id) ON DELETE CASCADE,
    batch_id    BIGINT      NOT NULL REFERENCES batch (id),
    date        DATE        NOT NULL,
    status      VARCHAR(7)  NOT NULL CHECK (status IN ('PRESENT', 'ABSENT')),
    marked_by   BIGINT REFERENCES admin_user (id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_attendance UNIQUE (player_id, batch_id, date)
);
CREATE INDEX idx_attendance_batch_date ON attendance_record (batch_id, date);
CREATE INDEX idx_attendance_date ON attendance_record (date);

CREATE TABLE payment (
    id                BIGSERIAL PRIMARY KEY,
    receipt_no        VARCHAR(20)    NOT NULL UNIQUE,
    player_id         BIGINT         NOT NULL REFERENCES player (id),
    fee_plan_id       BIGINT         NOT NULL REFERENCES fee_plan (id),
    plan_amount       NUMERIC(10, 2) NOT NULL,
    sibling_discount  NUMERIC(10, 2) NOT NULL DEFAULT 0,
    late_fee          NUMERIC(10, 2) NOT NULL DEFAULT 0,
    registration_fee  NUMERIC(10, 2) NOT NULL DEFAULT 0,
    adjustment        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    amount            NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    mode              VARCHAR(4)     NOT NULL CHECK (mode IN ('UPI', 'CASH')),
    paid_on           DATE           NOT NULL,
    period_from       DATE           NOT NULL,
    period_to         DATE           NOT NULL,
    note              VARCHAR(200),
    recorded_by       BIGINT REFERENCES admin_user (id),
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CHECK (period_to >= period_from),
    CHECK (amount = plan_amount - sibling_discount + late_fee + registration_fee + adjustment),
    CHECK (adjustment = 0 OR note IS NOT NULL)
);
CREATE UNIQUE INDEX uq_payment_player_period ON payment (player_id, period_from);
CREATE INDEX idx_payment_paid_on ON payment (paid_on DESC);

CREATE TABLE receipt_sequence (
    year_suffix  VARCHAR(2) PRIMARY KEY,
    next_value   INT        NOT NULL
);

CREATE TABLE product (
    id            BIGSERIAL PRIMARY KEY,
    brand         VARCHAR(40)    NOT NULL,
    category      VARCHAR(14)    NOT NULL CHECK (category IN ('RACKETS', 'SHUTTLECOCKS', 'SHOES', 'GRIPS', 'BAGS', 'JERSEYS')),
    name          VARCHAR(120)   NOT NULL,
    description   TEXT,
    price         NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    mrp           NUMERIC(10, 2) NOT NULL CHECK (mrp >= 0),
    rating        NUMERIC(2, 1)  CHECK (rating BETWEEN 0 AND 5),
    review_count  INT            NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    stock         INT            CHECK (stock >= 0),
    tag_label     VARCHAR(30),
    advertised    BOOLEAN        NOT NULL DEFAULT FALSE,
    ad_placement  VARCHAR(6)     CHECK (ad_placement IN ('HERO', 'INLINE', 'STRIP')),
    ad_headline   VARCHAR(80),
    ad_highlight  VARCHAR(40),
    ad_copy       VARCHAR(200),
    ad_image      VARCHAR(300),
    active        BOOLEAN        NOT NULL DEFAULT TRUE,
    sort_order    INT            NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_category ON product (category);
CREATE INDEX idx_product_ad ON product (ad_placement) WHERE advertised AND active;

CREATE TABLE product_image (
    product_id  BIGINT       NOT NULL REFERENCES product (id) ON DELETE CASCADE,
    position    INT          NOT NULL,
    url         VARCHAR(300) NOT NULL,
    PRIMARY KEY (product_id, position)
);

CREATE TABLE product_spec (
    product_id  BIGINT       NOT NULL REFERENCES product (id) ON DELETE CASCADE,
    position    INT          NOT NULL,
    label       VARCHAR(60)  NOT NULL,
    value       VARCHAR(120) NOT NULL,
    PRIMARY KEY (product_id, position)
);

CREATE TABLE product_variant (
    product_id  BIGINT      NOT NULL REFERENCES product (id) ON DELETE CASCADE,
    position    INT         NOT NULL,
    group_name  VARCHAR(40) NOT NULL,
    value       VARCHAR(40) NOT NULL,
    PRIMARY KEY (product_id, position)
);
