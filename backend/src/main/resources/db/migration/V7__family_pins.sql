-- Parents now sign in with their mobile number and a PIN, like staff, instead of a code sent on WhatsApp (which
-- Meta bills per message, however often the form is used). The owner issues a one-time PIN from the player's
-- profile and the parent replaces it at first sign-in. Only a bcrypt hash is stored.
ALTER TABLE parent_account
    ADD COLUMN pin_hash        VARCHAR(100),
    ADD COLUMN must_change_pin BOOLEAN NOT NULL DEFAULT TRUE;

DROP TABLE login_code;
