-- 0004_auth_go_live.sql
--
-- Everything the database needs before sign-in is switched on (Phase 3).
--
-- 1. Close a role-escalation hole in `profiles`.
-- 2. Enforce the beta tester allowlist at account creation.
--
-- See docs/DECISIONS.md#0020.

-- ---------------------------------------------------------------------------
-- 1. Profiles: customers may edit their details, never their role
-- ---------------------------------------------------------------------------

-- "profiles: update own" permits updating *any* column of your own row, and
-- RLS policies are permissive — they OR together. The "owner manages roles"
-- policy beside it restricts nothing; it only adds a second way in. So any
-- signed-in customer could run
--
--   update profiles set role = 'owner' where id = auth.uid()
--
-- and every staff policy in the schema would open up to them. RLS cannot
-- express "this column may not change" without a trigger, but column
-- privileges can, and they are checked before any policy runs.
--
-- `role`, `email` and `deleted_at` are therefore not client-writable at all.
-- Role changes go through an edge function with the service role, as 0001
-- always intended; email follows auth.users; deleted_at belongs to the
-- deletion flow.

revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, gallery_consent) on public.profiles to authenticated;

-- With role off the table the owner policy has nothing left to do that the
-- staff edit below does not, and keeping it would mislead the next reader
-- exactly as it misled this one.
drop policy "profiles: owner manages roles" on public.profiles;

-- Staff correct a customer's name or phone on the phone with them. The column
-- grant above still applies, so this cannot touch role either.
create policy "profiles: staff update"
  on public.profiles for update
  to authenticated
  using (private.is_staff())
  with check (private.is_staff());

-- ---------------------------------------------------------------------------
-- 2. The tester allowlist is enforced, not just declared
-- ---------------------------------------------------------------------------

-- 0001 created the table; nothing consulted it. The Pages site is public, so
-- without this anyone who finds the URL can create an account.
--
-- A BEFORE INSERT trigger on auth.users aborts the signup inside the same
-- transaction, so no auth row, no profile, and no email is ever sent to an
-- address that is not invited. Supabase reports the abort to the client as a
-- generic "Database error saving new user"; the app maps that to an
-- invite-only message.
--
-- Existing users are unaffected: this fires on insert only, so removing
-- someone from the list does not lock them out. Delete their account for that.
--
-- PRE-SUBMISSION: drop this trigger and the table. Gating account creation
-- conflicts with guideline 5.1.1(iv). See docs/COMPLIANCE.md.

create function private.enforce_tester_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or not exists (
    select 1 from public.tester_allowlist
    where lower(email) = lower(new.email)
  ) then
    raise exception 'beezy: % is not on the beta tester allowlist', coalesce(new.email, '(no email)')
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger enforce_tester_allowlist
  before insert on auth.users
  for each row execute function private.enforce_tester_allowlist();

-- Emails are compared case-insensitively above; store them that way too so
-- the primary key cannot hold two spellings of one address.
alter table public.tester_allowlist
  add constraint tester_allowlist_email_lower check (email = lower(email));
