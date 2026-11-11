-- Uploaded images live in the database, so they survive redeploys on hosts whose disks are wiped
-- (Render, most PaaS) and are included in every database backup. Images are capped at 2 MB by the API.
CREATE TABLE stored_file (
    id            BIGSERIAL PRIMARY KEY,
    kind          VARCHAR(20)  NOT NULL,
    name          VARCHAR(120) NOT NULL,
    content_type  VARCHAR(40)  NOT NULL,
    data          BYTEA        NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (kind, name)
);

-- Defence in depth for hosted Postgres that also publishes tables over an HTTP API (Supabase's Data API
-- exposes the public schema to anyone holding the project's anon key). With row-level security on and no
-- policies, those API roles see nothing. The API connects as the tables' owner, which RLS does not apply to,
-- so the application is unaffected. On plain PostgreSQL this changes nothing.
-- flyway_schema_history is skipped: Flyway holds a lock on it while migrating, and it only lists migrations.
DO $$
DECLARE t record;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables
             WHERE schemaname = current_schema() AND tablename <> 'flyway_schema_history' LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
END $$;
