-- PINs are now 6 to 12 digits. Dev logins move from 1234 to 123456 (dev profile only; never in production).
UPDATE admin_user SET pin_hash = crypt('123456', gen_salt('bf', 10))
WHERE mobile IN ('9000000000', '9000000001', '9000000002');
