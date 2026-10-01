-- Policy tests. Run by supabase/tests/run.sh against a scratch database with
-- stub_supabase.sql and every migration applied. Any failed assertion raises
-- and the run exits non-zero (psql -v ON_ERROR_STOP=1).
--
-- Each block impersonates a role the way PostgREST does, inside a transaction
-- that is rolled back, so the blocks are independent.

\set QUIET on

-- ---------------------------------------------------------------------------
-- Fixtures: an invited customer, a second customer, and an owner
-- ---------------------------------------------------------------------------

insert into public.tester_allowlist (email) values
  ('cust@example.com'), ('other@example.com'), ('owner@example.com');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'cust@example.com', '{"full_name":"Cust"}'),
  ('00000000-0000-0000-0000-00000000000b', 'Other@Example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'owner@example.com', '{}');

update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-00000000000c';

insert into public.vehicles (owner_id, make, model) values
  ('00000000-0000-0000-0000-00000000000a', 'Porsche', 'Macan'),
  ('00000000-0000-0000-0000-00000000000b', 'Ford', 'F-150');

-- ---------------------------------------------------------------------------
-- Signup trigger
-- ---------------------------------------------------------------------------

do $$
begin
  assert (select count(*) from public.profiles) = 3, 'every auth user gets a profile';
  assert (select full_name from public.profiles where email = 'cust@example.com') = 'Cust',
    'full_name is copied from signup metadata';
end $$;

-- An address that is not invited cannot create an account at all.
do $$
begin
  begin
    insert into auth.users (email) values ('stranger@example.com');
    raise exception 'FAILED: uninvited signup was allowed';
  exception when raise_exception then
    if sqlerrm like 'FAILED%' then raise; end if;
  end;
  assert not exists (select 1 from public.profiles where email = 'stranger@example.com'),
    'no profile left behind by a rejected signup';
end $$;

-- A null email (phone or anonymous sign-in) is not a way round the list.
do $$
begin
  begin
    insert into auth.users (email) values (null);
    raise exception 'FAILED: signup with no email was allowed';
  exception when raise_exception then
    if sqlerrm like 'FAILED%' then raise; end if;
  end;
end $$;

-- The allowlist itself only accepts lower-case addresses.
do $$
begin
  begin
    insert into public.tester_allowlist (email) values ('Mixed@Example.com');
    raise exception 'FAILED: mixed-case allowlist entry accepted';
  exception when check_violation then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Role escalation (the hole 0004 closes)
-- ---------------------------------------------------------------------------

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
begin
  begin
    update public.profiles set role = 'owner' where id = auth.uid();
    raise exception 'FAILED: a customer promoted themselves';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
begin
  begin
    update public.profiles set deleted_at = now() where id = auth.uid();
    raise exception 'FAILED: a customer wrote deleted_at';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set email = 'x@example.com' where id = auth.uid();
    raise exception 'FAILED: a customer rewrote their profile email';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- The owner cannot change roles from the client either — that is an edge
-- function's job, with the service role.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$
begin
  begin
    update public.profiles set role = 'admin' where email = 'cust@example.com';
    raise exception 'FAILED: role changed from the client';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- ---------------------------------------------------------------------------
-- What a customer *can* do
-- ---------------------------------------------------------------------------

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare n int;
begin
  update public.profiles set full_name = 'Cust B', phone = '5045550100', gallery_consent = true
    where id = auth.uid();
  get diagnostics n = row_count;
  assert n = 1, 'customer can edit their own name, phone and consent';

  -- Someone else's row: RLS filters it out, so the update touches nothing.
  update public.profiles set full_name = 'hijacked'
    where id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  assert n = 0, 'customer cannot edit another profile';

  assert (select count(*) from public.profiles) = 1, 'customer sees only their own profile';
  assert (select count(*) from public.vehicles) = 1, 'customer sees only their own vehicles';
  assert (select count(*) from public.tester_allowlist) = 0, 'customer cannot read the allowlist';

  begin
    insert into public.vehicles (owner_id, make, model)
      values ('00000000-0000-0000-0000-00000000000b', 'Fake', 'Car');
    raise exception 'FAILED: customer added a vehicle to someone else''s garage';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$
declare n int;
begin
  assert (select count(*) from public.profiles) = 3, 'staff read every profile';
  assert (select count(*) from public.vehicles) = 2, 'staff read every vehicle';

  update public.profiles set phone = '5045550199' where email = 'cust@example.com';
  get diagnostics n = row_count;
  assert n = 1, 'staff can correct a customer''s details';

  insert into public.tester_allowlist (email) values ('new@example.com');
end $$;
rollback;

-- ---------------------------------------------------------------------------
-- Signed out
-- ---------------------------------------------------------------------------

begin;
set local role anon;
do $$
begin
  assert (select count(*) from public.services) = 6, 'the service menu is public';
  assert (select count(*) from public.profiles) = 0, 'anon reads no profiles';
  assert (select count(*) from public.vehicles) = 0, 'anon reads no vehicles';
  begin
    update public.profiles set full_name = 'x';
    raise exception 'FAILED: anon holds update on profiles';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- ---------------------------------------------------------------------------
-- Account deletion cascades
-- ---------------------------------------------------------------------------

begin;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
do $$
begin
  assert not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
    'deleting the auth user deletes the profile';
  assert (select count(*) from public.vehicles) = 1, 'and their vehicles, and nobody else''s';
end $$;
rollback;

\echo 'rls: all assertions passed'
