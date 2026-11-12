-- =====================================================================================================
-- RKS Academy: load your real academy data into Supabase.
--
-- How to use
--   1. Deploy the API once first, so Flyway has created the tables in the "rks" schema
--      (V2 already added 4 courts, 3 coaches, 6 batches, 4 fee plans and a fee policy as placeholders).
--   2. Change every value marked  -- CHANGE  below. Delete any section you don't need.
--   3. Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
-- Safety
--   * Everything runs in one transaction. The checks at the end abort the whole run (nothing saved) if a
--     'CHANGE_ME' value is left, a mobile number isn't 10 digits, or a batch/plan name doesn't match.
--   * Safe to run once. Running it twice would add the same players twice, so remove the player rows you
--     already loaded before running it again.
--   * Payments are NOT loaded here. Record them in the app (Fees -> Record payment), which issues the
--     receipt numbers, applies sibling discounts and late fees, and keeps the totals consistent.
-- =====================================================================================================

BEGIN;

-- rks = the app's tables. extensions = where Supabase keeps pgcrypto (crypt / gen_salt for PIN hashes).
SET LOCAL search_path TO rks, extensions, public;


-- -----------------------------------------------------------------------------------------------------
-- 1. Owner login. Skipped automatically if an owner already exists (for example from create-owner.cmd).
--    The PIN here is temporary: the app makes the owner pick their own 6-12 digit PIN at first sign-in.
-- -----------------------------------------------------------------------------------------------------
INSERT INTO admin_user (name, mobile, pin_hash, role, must_change_pin)
SELECT 'CHANGE_ME Owner Name',                        -- CHANGE: owner's full name
       'CHANGE_ME',                                   -- CHANGE: owner's 10-digit mobile
       crypt('739104', gen_salt('bf', 10)),           -- CHANGE: any 6-digit temporary PIN
       'OWNER', TRUE
WHERE NOT EXISTS (SELECT 1 FROM admin_user WHERE role = 'OWNER');


-- -----------------------------------------------------------------------------------------------------
-- 2. Courts. V2 created 'Court 1'..'Court 4'. Rename / change surface; retire unused ones with active=false.
-- -----------------------------------------------------------------------------------------------------
UPDATE court SET name = 'Court 1', surface_type = 'Wooden synthetic',  active = TRUE, updated_at = now() WHERE id = 1;  -- CHANGE
UPDATE court SET name = 'Court 2', surface_type = 'BWF synthetic mat', active = TRUE, updated_at = now() WHERE id = 2;  -- CHANGE
UPDATE court SET name = 'Court 3', surface_type = 'Wooden synthetic',  active = TRUE, updated_at = now() WHERE id = 3;  -- CHANGE
UPDATE court SET name = 'Court 4', surface_type = 'BWF synthetic mat', active = TRUE, updated_at = now() WHERE id = 4;  -- CHANGE
-- More courts:
-- INSERT INTO court (name, surface_type, sort_order) VALUES ('Court 5', 'Wooden synthetic', 5);


-- -----------------------------------------------------------------------------------------------------
-- 3. Coaches. V2 created 3 placeholder coaches (ids 1-3). Put your real coaches' names on them.
--    mobile is optional here (NULL is fine); a coach's login is created in section 7.
-- -----------------------------------------------------------------------------------------------------
UPDATE coach SET name = 'CHANGE_ME Coach One',   title = 'Junior Coach', mobile = NULL, updated_at = now() WHERE id = 1;  -- CHANGE
UPDATE coach SET name = 'CHANGE_ME Coach Two',   title = 'Senior Coach', mobile = NULL, updated_at = now() WHERE id = 2;  -- CHANGE
UPDATE coach SET name = 'CHANGE_ME Coach Three', title = 'Head Coach',   mobile = NULL, updated_at = now() WHERE id = 3;  -- CHANGE
-- Fewer coaches? Retire instead of deleting:  UPDATE coach SET active = FALSE WHERE id = 3;
-- More coaches:
-- INSERT INTO coach (name, title) VALUES ('Coach Four', 'Assistant Coach');


-- -----------------------------------------------------------------------------------------------------
-- 4. Batches. V2 created these 6. Edit times, days, court and coach.
--    days_of_week: comma-separated, no spaces, from MON,TUE,WED,THU,FRI,SAT,SUN.
--    level: BEGINNER, INTERMEDIATE, ADVANCED or TOURNAMENT.
-- -----------------------------------------------------------------------------------------------------
UPDATE batch SET name = 'Morning Beginners',    court_id = 1, coach_id = 1, start_time = '06:00', end_time = '07:00', days_of_week = 'MON,TUE,WED,THU,FRI',     level = 'BEGINNER',     updated_at = now() WHERE id = 1;  -- CHANGE
UPDATE batch SET name = 'Evening Juniors',      court_id = 1, coach_id = 1, start_time = '16:30', end_time = '17:30', days_of_week = 'MON,TUE,WED,THU,FRI',     level = 'BEGINNER',     updated_at = now() WHERE id = 2;  -- CHANGE
UPDATE batch SET name = 'Morning Intermediate', court_id = 2, coach_id = 2, start_time = '06:00', end_time = '07:30', days_of_week = 'MON,TUE,WED,THU,FRI',     level = 'INTERMEDIATE', updated_at = now() WHERE id = 3;  -- CHANGE
UPDATE batch SET name = 'Evening Intermediate', court_id = 2, coach_id = 2, start_time = '17:30', end_time = '19:00', days_of_week = 'MON,TUE,WED,THU,FRI',     level = 'INTERMEDIATE', updated_at = now() WHERE id = 4;  -- CHANGE
UPDATE batch SET name = 'Morning Advanced',     court_id = 3, coach_id = 3, start_time = '07:00', end_time = '08:30', days_of_week = 'MON,TUE,WED,THU,FRI',     level = 'ADVANCED',     updated_at = now() WHERE id = 5;  -- CHANGE
UPDATE batch SET name = 'Tournament Squad',     court_id = 4, coach_id = 3, start_time = '18:00', end_time = '20:00', days_of_week = 'MON,TUE,WED,THU,FRI,SAT', level = 'TOURNAMENT',   updated_at = now() WHERE id = 6;  -- CHANGE
-- Unused batch:  UPDATE batch SET active = FALSE WHERE id = 6;
-- More batches:
-- INSERT INTO batch (name, court_id, coach_id, start_time, end_time, days_of_week, level)
-- VALUES ('Weekend Batch', 1, 2, '07:00', '09:00', 'SAT,SUN', 'BEGINNER');


-- -----------------------------------------------------------------------------------------------------
-- 5. Fee plans (prices in rupees). Only one active plan may be most_popular = TRUE.
--    Changing a price only affects future payments; old receipts keep the amount they were paid at.
-- -----------------------------------------------------------------------------------------------------
UPDATE fee_plan SET name = 'Monthly',          level_label = 'Beginner & Intermediate', price = 1500.00,  period_months = 1,  sessions_per_week = 5, most_popular = FALSE, updated_at = now() WHERE id = 1;  -- CHANGE
UPDATE fee_plan SET name = 'Quarterly',        level_label = 'All skill levels',        price = 4200.00,  period_months = 3,  sessions_per_week = 5, most_popular = TRUE,  updated_at = now() WHERE id = 2;  -- CHANGE
UPDATE fee_plan SET name = 'Annual',           level_label = 'All skill levels',        price = 15000.00, period_months = 12, sessions_per_week = 5, most_popular = FALSE, updated_at = now() WHERE id = 3;  -- CHANGE
UPDATE fee_plan SET name = 'Tournament Squad', level_label = 'Advanced & Tournament',   price = 2500.00,  period_months = 1,  sessions_per_week = 6, most_popular = FALSE, updated_at = now() WHERE id = 4;  -- CHANGE
-- Bullet points shown under each plan: edit text by (plan id, position).
-- UPDATE fee_plan_perk SET text = 'Save ₹300' WHERE fee_plan_id = 2 AND position = 0;


-- -----------------------------------------------------------------------------------------------------
-- 6. Fee rules. Rules are versioned: add a NEW row starting from a month instead of editing the old one,
--    so earlier months are still charged by the rules that applied then. effective_from = 1st of a month.
--    Skip this section if the V2 defaults are right: ₹1000 registration, 10% / 15% sibling discount,
--    late fee after the 10th = ₹100 + ₹10 a day, at most ₹300.
-- -----------------------------------------------------------------------------------------------------
-- INSERT INTO fee_policy (registration_fee, sibling_discount_2nd_pct, sibling_discount_3rd_pct,
--                         late_fee_after_day, late_fee_base, late_fee_per_day, late_fee_max, effective_from)
-- VALUES (1000.00, 10.00, 15.00, 10, 100.00, 10.00, 300.00, DATE '2026-12-01');


-- -----------------------------------------------------------------------------------------------------
-- 7. Coach logins (optional; the owner can also add these in the app under Staff).
--    Each one gets a temporary PIN and must choose their own at first sign-in. coach_id = the coach above.
-- -----------------------------------------------------------------------------------------------------
INSERT INTO admin_user (name, mobile, pin_hash, role, coach_id, must_change_pin) VALUES
    ('CHANGE_ME Coach One', 'CHANGE_ME_C1', crypt('482915', gen_salt('bf', 10)), 'COACH', 1, TRUE),  -- CHANGE
    ('CHANGE_ME Coach Two', 'CHANGE_ME_C2', crypt('615038', gen_salt('bf', 10)), 'COACH', 2, TRUE);  -- CHANGE


-- -----------------------------------------------------------------------------------------------------
-- 8. Players. One line per player; batch and plan are matched by the names used above.
--    dob / join_date: 'YYYY-MM-DD'.  gender: MALE, FEMALE or OTHER.  level: as in section 4.
--    blood_group (or NULL): A+ A- B+ B- AB+ AB- O+ O-.
--    Children with the same parent mobile are linked as siblings automatically (for the sibling discount),
--    and that mobile is what the parent signs in to the family portal with.
-- -----------------------------------------------------------------------------------------------------
CREATE TEMP TABLE new_player (
    name text, dob date, gender text, parent_name text, parent_mobile text, level text,
    batch_name text, plan_name text, join_date date, school text, blood_group text
) ON COMMIT DROP;

INSERT INTO new_player VALUES
--   name                 dob           gender    parent name          parent mobile  level         batch                 plan        joined        school               blood
    ('CHANGE_ME Child A', '2014-05-20', 'MALE',   'CHANGE_ME Parent',  'CHANGE_ME',   'BEGINNER',   'Morning Beginners',  'Monthly',  '2026-11-01', 'CHANGE_ME School',  'O+'),   -- CHANGE
    ('CHANGE_ME Child B', '2016-02-11', 'FEMALE', 'CHANGE_ME Parent',  'CHANGE_ME',   'BEGINNER',   'Evening Juniors',    'Quarterly','2026-11-01', NULL,                NULL);   -- CHANGE

-- Stop if a batch or plan name above doesn't exist (otherwise that player would silently be skipped).
DO $$
DECLARE bad text;
BEGIN
    SELECT string_agg(DISTINCT n.name, ', ') INTO bad
    FROM new_player n
    LEFT JOIN batch b ON b.name = n.batch_name AND b.active
    LEFT JOIN fee_plan f ON f.name = n.plan_name AND f.active
    WHERE b.id IS NULL OR f.id IS NULL;
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'Unknown batch or plan name for: %. Nothing was saved.', bad;
    END IF;
END $$;

-- Same steps as adding a player in the app: next RKS code, plan starts on the 1st of the joining month,
-- and the starting level goes into the level history.
WITH added AS (
    INSERT INTO player (code, name, dob, gender, parent_name, parent_mobile, level, batch_id, fee_plan_id,
                        join_date, plan_start_date, school, blood_group)
    SELECT 'RKS' || nextval('player_code_seq'), n.name, n.dob, n.gender, n.parent_name, n.parent_mobile,
           n.level, b.id, f.id, n.join_date, date_trunc('month', n.join_date)::date, n.school, n.blood_group
    FROM new_player n
    JOIN batch b ON b.name = n.batch_name AND b.active
    JOIN fee_plan f ON f.name = n.plan_name AND f.active
    RETURNING id, level, join_date
)
INSERT INTO player_level_history (player_id, level, achieved_on)
SELECT id, level, join_date FROM added;

-- Link brothers and sisters: active players sharing a parent mobile get one sibling group.
UPDATE player p
SET sibling_group_id = g.group_id, updated_at = now()
FROM (SELECT parent_mobile, gen_random_uuid() AS group_id
      FROM player
      WHERE active AND parent_mobile IN (SELECT parent_mobile FROM new_player)
      GROUP BY parent_mobile
      HAVING count(*) > 1) g
WHERE p.active AND p.parent_mobile = g.parent_mobile AND p.sibling_group_id IS NULL;


-- -----------------------------------------------------------------------------------------------------
