-- Bootstrapping for the Postgres container.
-- The control plane DB (operate_control) is created by the POSTGRES_DB env var.
-- This script ensures the operate user has CREATEDB so the provisioning CLI
-- can spin up new tenant databases dynamically.

ALTER USER operate CREATEDB;

-- Seed a development tenant DB stub so M&M has a place to live.
-- The actual schema is applied by the tenant provisioning CLI later.
SELECT 'CREATE DATABASE operate_tenant_mm OWNER operate'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'operate_tenant_mm')\gexec
