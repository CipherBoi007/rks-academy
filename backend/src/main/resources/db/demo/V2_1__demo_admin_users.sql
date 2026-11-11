-- Dev-only logins. Never shipped to production (db/demo is only on the dev profile's Flyway path).
-- Owner 9000000000 / PIN 1234; coaches 9000000001 and 9000000002 / PIN 1234.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO admin_user (id, name, mobile, pin_hash, role, coach_id, must_change_pin) VALUES
    (1, 'R. Sethupathi', '9000000000', crypt('1234', gen_salt('bf', 10)), 'OWNER', 3, FALSE),
    (2, 'S. Divya',      '9000000001', crypt('1234', gen_salt('bf', 10)), 'COACH', 1, FALSE),
    (3, 'M. Anand',      '9000000002', crypt('1234', gen_salt('bf', 10)), 'COACH', 2, FALSE);
SELECT setval('admin_user_id_seq', 3);
