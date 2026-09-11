-- 0002_private_schema_helpers.sql
--
-- Moves the RLS helper functions out of `public`.
--
-- Supabase's security linter flagged is_staff(), is_owner() and
-- handle_new_user() as SECURITY DEFINER functions reachable by `anon` and
-- `authenticated` over PostgREST at /rest/v1/rpc/<name>. On a public repo with
-- a published anon key that is a real exposure: anyone could probe them.
--
-- Revoking EXECUTE is not an option, because RLS policy expressions are
-- evaluated as the querying role — the policies would stop working. The
-- correct fix is to put them in a schema PostgREST does not expose, which
-- keeps them callable from policies and unreachable over the API.
--
-- Also sets an explicit search_path on touch_updated_at(); without one, a
-- caller controlling search_path could shadow the objects it resolves.

create schema if not exists private;

-- PostgREST only exposes schemas in its config (public, graphql_public).
-- These grants let policies and triggers resolve the functions; they do not
-- make them routable.
grant usage on schema private to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Recreate the helpers in `private`
-- ---------------------------------------------------------------------------

create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'owner')
      and deleted_at is null
  );
$$;

create function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'owner'
      and deleted_at is null
  );
$$;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Repoint the policies
-- ---------------------------------------------------------------------------

-- Policies depend on the public functions, so they must be dropped before the
-- functions can be.
drop policy "profiles: staff read all" on public.profiles;
drop policy "profiles: owner manages roles" on public.profiles;
drop policy "services: public read" on public.services;
drop policy "services: staff write" on public.services;
drop policy "vehicles: staff read all" on public.vehicles;
drop policy "vehicles: staff writes all" on public.vehicles;
drop policy "tester_allowlist: staff only" on public.tester_allowlist;

create policy "profiles: staff read all"
  on public.profiles for select
  to authenticated
  using (private.is_staff());

create policy "profiles: owner manages roles"
  on public.profiles for update
  to authenticated
  using (private.is_owner())
  with check (private.is_owner());

-- The service menu stays readable signed out: guideline 5.1.1(iv) forbids
-- gating browsable content behind an account.
create policy "services: public read"
  on public.services for select
  to anon, authenticated
  using (active or private.is_staff());

create policy "services: staff write"
  on public.services for all
  to authenticated
  using (private.is_staff())
  with check (private.is_staff());

create policy "vehicles: staff read all"
  on public.vehicles for select
  to authenticated
  using (private.is_staff());

create policy "vehicles: staff writes all"
  on public.vehicles for all
  to authenticated
  using (private.is_staff())
  with check (private.is_staff());

create policy "tester_allowlist: staff only"
  on public.tester_allowlist for all
  to authenticated
  using (private.is_staff())
  with check (private.is_staff());

-- Scope the remaining owner-side policies to `authenticated` too, so an
-- anonymous request is rejected before the expression is even evaluated.
drop policy "profiles: read own" on public.profiles;
drop policy "profiles: update own" on public.profiles;
drop policy "vehicles: owner reads own" on public.vehicles;
drop policy "vehicles: owner writes own" on public.vehicles;

create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "vehicles: owner reads own"
  on public.vehicles for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "vehicles: owner writes own"
  on public.vehicles for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Repoint the triggers, then drop the public functions
-- ---------------------------------------------------------------------------

drop trigger on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger profiles_touch on public.profiles;
drop trigger services_touch on public.services;
drop trigger vehicles_touch on public.vehicles;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger services_touch before update on public.services
  for each row execute function private.touch_updated_at();
create trigger vehicles_touch before update on public.vehicles
  for each row execute function private.touch_updated_at();

drop function public.is_staff();
drop function public.is_owner();
drop function public.handle_new_user();
drop function public.touch_updated_at();
