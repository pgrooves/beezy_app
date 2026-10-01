#!/usr/bin/env bash
# Applies every migration to a scratch database on a plain Postgres and runs
# the policy tests against it. Never touches the live project.
#
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres supabase/tests/run.sh
#
# Uses the standard libpq environment variables. The scratch database is
# dropped and recreated on every run.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
db="${BEEZY_TEST_DB:-beezy_rls_test}"

psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists ${db}" -c "create database ${db}"

# Roles are cluster-wide, so a second run finds them already there.
psql -v ON_ERROR_STOP=1 -q -d postgres <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
SQL

run() { psql -v ON_ERROR_STOP=1 -q -d "$db" "$@"; }

run -f "$here/stub_supabase.sql"

for migration in "$here"/../migrations/*.sql; do
  echo "apply  $(basename "$migration")"
  run -f "$migration"
done

run -f "$here/rls.test.sql"
