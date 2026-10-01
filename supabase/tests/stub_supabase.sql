-- A minimal stand-in for the parts of a Supabase project the migrations touch,
-- so they can be applied to a plain Postgres and their policies exercised as
-- the real roles. Not a migration; never applied to the live project.
--
-- auth.uid() reads the same claim GUC Supabase's does, so tests impersonate a
-- user with:  set local role authenticated;
--             set local request.jwt.claim.sub = '<uuid>';
--
-- The anon/authenticated/service_role roles are created by run.sh, because
-- roles are cluster-wide and outlive the scratch database.

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

-- Supabase-managed; 0003 revokes execute on it.
create function public.rls_auto_enable() returns event_trigger
language plpgsql as $$ begin end $$;

-- Supabase's default privileges: table access is wide open at the grant level
-- and RLS does the real work. Reproducing that is the point — a test against
-- tighter grants than production would pass for the wrong reason.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
