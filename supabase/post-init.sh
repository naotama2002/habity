#!/bin/bash
set -e

# Post-initialization script for local development
# Runs after migrate.sh (alphabetical order in docker-entrypoint-initdb.d)
#
# Fixes issues in supabase/postgres image for local development:
# 1. Passwords not set for service roles (authenticator, supabase_auth_admin, supabase_storage_admin)
# 2. auth functions (uid, role, email) owned by postgres instead of supabase_auth_admin
# 3. _realtime schema missing (required by Supabase Realtime)

psql -v ON_ERROR_STOP=1 --username postgres <<-EOSQL
  -- Set passwords for service roles
  ALTER USER authenticator WITH PASSWORD '${POSTGRES_PASSWORD:-postgres}';
  ALTER USER supabase_auth_admin WITH PASSWORD '${POSTGRES_PASSWORD:-postgres}';
  ALTER USER supabase_storage_admin WITH PASSWORD '${POSTGRES_PASSWORD:-postgres}';

  -- Fix auth function ownership for GoTrue compatibility
  ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;
  ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;
  ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

  -- Create _realtime schema for Supabase Realtime
  CREATE SCHEMA IF NOT EXISTS _realtime;
  GRANT ALL ON SCHEMA _realtime TO supabase_admin;
EOSQL
