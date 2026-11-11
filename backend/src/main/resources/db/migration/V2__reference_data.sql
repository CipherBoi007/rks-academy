-- Reference data that exists in every environment: courts, coaches, batches, fee plans and the fee policy.

INSERT INTO court (id, name, surface_type, sort_order) VALUES
    (1, 'Court 1', 'Wooden synthetic', 1),
    (2, 'Court 2', 'BWF synthetic mat', 2),
    (3, 'Court 3', 'Wooden synthetic', 3),
    (4, 'Court 4', 'BWF synthetic mat', 4);
SELECT setval('court_id_seq', 4);

INSERT INTO coach (id, name, title, mobile) VALUES
    (1, 'S. Divya', 'Junior Coach', NULL),
    (2, 'M. Anand', 'Senior Coach', NULL),
    (3, 'R. Sethupathi', 'Head Coach', NULL);
SELECT setval('coach_id_seq', 3);

INSERT INTO batch (id, name, court_id, coach_id, start_time, end_time, days_of_week, level) VALUES
    (1, 'Morning Beginners',    1, 1, '06:00', '07:00', 'MON,TUE,WED,THU,FRI',     'BEGINNER'),
    (2, 'Evening Juniors',      1, 1, '16:30', '17:30', 'MON,TUE,WED,THU,FRI',     'BEGINNER'),
    (3, 'Morning Intermediate', 2, 2, '06:00', '07:30', 'MON,TUE,WED,THU,FRI',     'INTERMEDIATE'),
    (4, 'Evening Intermediate', 2, 2, '17:30', '19:00', 'MON,TUE,WED,THU,FRI',     'INTERMEDIATE'),
    (5, 'Morning Advanced',     3, 3, '07:00', '08:30', 'MON,TUE,WED,THU,FRI',     'ADVANCED'),
    (6, 'Tournament Squad',     4, 3, '18:00', '20:00', 'MON,TUE,WED,THU,FRI,SAT', 'TOURNAMENT');
SELECT setval('batch_id_seq', 6);

INSERT INTO fee_plan (id, name, level_label, price, period_months, sessions_per_week, most_popular, sort_order) VALUES
    (1, 'Monthly',          'Beginner & Intermediate', 1500.00,  1, 5, FALSE, 1),
    (2, 'Quarterly',        'All skill levels',        4200.00,  3, 5, TRUE,  2),
    (3, 'Annual',           'All skill levels',        15000.00, 12, 5, FALSE, 3),
    (4, 'Tournament Squad', 'Advanced & Tournament',   2500.00,  1, 6, FALSE, 4);
SELECT setval('fee_plan_id_seq', 4);

INSERT INTO fee_plan_perk (fee_plan_id, position, text) VALUES
    (1, 0, '5 sessions / week'),
    (1, 1, 'Shuttles included'),
    (1, 2, 'Monthly skill report'),
    (2, 0, 'Save ₹300'),
    (2, 1, '5 sessions / week'),
    (2, 2, 'Free grip every quarter'),
    (3, 0, 'Save ₹3,000'),
    (3, 1, 'Academy jersey kit'),
    (3, 2, 'Priority court booking'),
    (4, 0, '6 sessions / week'),
    (4, 1, 'Fitness & video analysis'),
    (4, 2, 'District/State entry support');

INSERT INTO fee_policy (registration_fee, sibling_discount_2nd_pct, sibling_discount_3rd_pct,
                        late_fee_after_day, late_fee_base, late_fee_per_day, late_fee_max, effective_from)
VALUES (1000.00, 10.00, 15.00, 10, 100.00, 10.00, 300.00, DATE '2000-01-01');
