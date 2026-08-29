-- Operational job coordination and run history.
-- Additive migration: safe for existing data.

CREATE TABLE IF NOT EXISTS operational_job_runs (
    job_run_id SERIAL PRIMARY KEY,
    job_name VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('running','succeeded','failed','skipped')),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMP,
    duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
    result_summary TEXT,
    error_message TEXT,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_operational_job_runs_name_started
    ON operational_job_runs(job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_job_runs_status_started
    ON operational_job_runs(status, started_at DESC);
