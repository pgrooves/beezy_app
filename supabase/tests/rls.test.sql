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

-- ===========================================================================
-- 0005: invites with roles, bookings, photos, storage, anonymisation
-- ===========================================================================

-- An invite's role is applied at signup.
insert into public.tester_allowlist (email, role) values ('tech@example.com', 'tech');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000d', 'TECH@example.com');
do $$
begin
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000d') = 'tech',
    'invite role applied at signup, matched case-insensitively';
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'customer',
    'default invite is customer';
end $$;

-- Only the owner invites staff. An admin inviting an owner is the 0004 hole again.
insert into public.tester_allowlist (email) values ('admin@example.com');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000e', 'admin@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000e';

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$
begin
  insert into public.tester_allowlist (email, role) values ('newtech@example.com', 'tech');
  begin
    insert into public.tester_allowlist (email, role) values ('sneaky@example.com', 'owner');
    raise exception 'FAILED: an admin invited an owner';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$
begin
  insert into public.tester_allowlist (email, role) values ('brandon@example.com', 'owner');
end $$;
rollback;

-- Service menu copy moved into the database.
do $$
begin
  assert (select cardinality(includes) from public.services where slug = 'express-wash') = 6,
    'service includes seeded';
end $$;

-- Fixtures for bookings.
create temp table ids as
  select
    (select id from public.vehicles where make = 'Porsche') as cust_vehicle,
    (select id from public.vehicles where make = 'Ford') as other_vehicle,
    (select id from public.services where slug = 'express-wash') as express;
grant select on ids to authenticated;

-- A customer requests a booking for their own car.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare v uuid := (select cust_vehicle from ids); s uuid := (select express from ids); b uuid;
begin
  insert into public.bookings (client_id, vehicle_id, vehicle_label, service_ids, condition,
    address_line1, city, postal_code, scheduled_at, duration_minutes, subtotal_cents, deposit_cents)
  values (auth.uid(), v, '2023 Porsche Macan', array[s], 'moderate',
    '1428 Napoleon Ave', 'New Orleans', '70115', now() + interval '3 days', 180, 15000, 3000)
  returning id into b;
  assert (select status from public.bookings where id = b) = 'requested', 'starts requested';

  -- Cancel: allowed.
  update public.bookings set status = 'cancelled' where id = b;
  assert (select status from public.bookings where id = b) = 'cancelled', 'customer can cancel';
end $$;
rollback;

-- Everything a customer must not be able to do with a booking.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare v uuid := (select cust_vehicle from ids); ov uuid := (select other_vehicle from ids);
        s uuid := (select express from ids); b uuid;
begin
  begin
    insert into public.bookings (client_id, vehicle_id, vehicle_label, service_ids, condition,
      address_line1, scheduled_at, duration_minutes, subtotal_cents, deposit_cents, status)
    values (auth.uid(), v, 'x', array[s], 'light', 'a', now() + interval '1 day', 60, 1, 0, 'confirmed');
    raise exception 'FAILED: customer self-confirmed';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.bookings (client_id, vehicle_id, vehicle_label, service_ids, condition,
      address_line1, scheduled_at, duration_minutes, subtotal_cents, deposit_cents)
    values ('00000000-0000-0000-0000-00000000000b', v, 'x', array[s], 'light', 'a',
      now() + interval '1 day', 60, 1, 0);
    raise exception 'FAILED: customer booked for someone else';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.bookings (client_id, vehicle_id, vehicle_label, service_ids, condition,
      address_line1, scheduled_at, duration_minutes, subtotal_cents, deposit_cents)
    values (auth.uid(), ov, 'x', array[s], 'light', 'a', now() + interval '1 day', 60, 1, 0);
    raise exception 'FAILED: customer booked someone else''s car';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.bookings (client_id, vehicle_id, vehicle_label, service_ids, condition,
      address_line1, scheduled_at, duration_minutes, subtotal_cents, deposit_cents)
    values (auth.uid(), v, 'x', array[gen_random_uuid()], 'light', 'a', now() + interval '1 day', 60, 1, 0);
    raise exception 'FAILED: booked a service that does not exist';
  exception when foreign_key_violation then null;
  end;

  begin
    insert into public.bookings (client_id, vehicle_id, vehicle_label, service_ids, condition,
      address_line1, scheduled_at, duration_minutes, subtotal_cents, deposit_cents)
    values (auth.uid(), v, 'x', array[s], 'light', 'a', now() - interval '1 day', 60, 1, 0);
    raise exception 'FAILED: booked in the past';
  exception when check_violation then null;
  end;

  insert into public.bookings (client_id, vehicle_id, vehicle_label, service_ids, condition,
    address_line1, scheduled_at, duration_minutes, subtotal_cents, deposit_cents)
  values (auth.uid(), v, 'x', array[s], 'light', 'a', now() + interval '1 day', 60, 15000, 3000)
  returning id into b;

  begin
    update public.bookings set subtotal_cents = 1 where id = b;
    raise exception 'FAILED: customer repriced a booking';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.bookings set status = 'cancelled', subtotal_cents = 1 where id = b;
    raise exception 'FAILED: repriced while cancelling';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.bookings set status = 'confirmed' where id = b;
    raise exception 'FAILED: customer confirmed their own booking';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.bookings where id = b;
    raise exception 'FAILED: customer deleted a booking';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Staff see every booking and move it along; customers see only their own.
insert into public.bookings (id, client_id, vehicle_id, vehicle_label, service_ids, condition,
  address_line1, city, postal_code, gate_code, scheduled_at, duration_minutes, subtotal_cents,
  deposit_cents, status)
values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a',
   (select cust_vehicle from ids), '2023 Porsche Macan', array[(select express from ids)], 'moderate',
   '1428 Napoleon Ave', 'New Orleans', '70115', '1234', now() - interval '30 days', 180, 15000, 3000, 'paid'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000000a',
   (select cust_vehicle from ids), '2023 Porsche Macan', array[(select express from ids)], 'moderate',
   '1428 Napoleon Ave', 'New Orleans', '70115', null, now() + interval '5 days', 180, 15000, 3000, 'confirmed'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-00000000000b',
   (select other_vehicle from ids), 'Ford F-150', array[(select express from ids)], 'light',
   '1 Canal St', 'New Orleans', '70130', null, now() + interval '6 days', 120, 12000, 2400, 'requested');

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
begin
  assert (select count(*) from public.bookings) = 2, 'customer sees only their own bookings';
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$
begin
  assert (select count(*) from public.bookings) = 3, 'staff see every booking';
  update public.bookings set status = 'confirmed' where id = '00000000-0000-0000-0000-0000000000b3';
  assert (select status from public.bookings where id = '00000000-0000-0000-0000-0000000000b3') = 'confirmed',
    'staff confirm a request';
end $$;
rollback;

begin;
set local role anon;
do $$
begin
  assert (select count(*) from public.bookings) = 0, 'anon reads no bookings';
  assert (select count(*) from public.photos) = 0, 'anon reads no photos';
end $$;
rollback;

-- Photos and the bucket.
insert into storage.objects (bucket_id, name, owner) values
  ('photos', '00000000-0000-0000-0000-00000000000b/x/other.jpg', '00000000-0000-0000-0000-00000000000b');

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare me text := '00000000-0000-0000-0000-00000000000a';
begin
  insert into storage.objects (bucket_id, name) values ('photos', me || '/b2/exterior.jpg');
  begin
    insert into storage.objects (bucket_id, name)
      values ('photos', '00000000-0000-0000-0000-00000000000b/b3/planted.jpg');
    raise exception 'FAILED: uploaded into someone else''s folder';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from storage.objects) = 1, 'customer sees only their own folder';

  insert into public.photos (owner_id, booking_id, kind, slot, storage_path)
    values (auth.uid(), '00000000-0000-0000-0000-0000000000b2', 'condition', 'exterior',
            me || '/b2/exterior.jpg');

  begin
    insert into public.photos (owner_id, booking_id, kind, storage_path)
      values (auth.uid(), '00000000-0000-0000-0000-0000000000b3', 'condition', me || '/b3/x.jpg');
    raise exception 'FAILED: attached a photo to someone else''s booking';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.photos (owner_id, booking_id, kind, storage_path, published)
      values (auth.uid(), '00000000-0000-0000-0000-0000000000b2', 'condition', me || '/b2/y.jpg', true);
    raise exception 'FAILED: customer published to the gallery directly';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.photos (owner_id, booking_id, kind, storage_path)
      values (auth.uid(), '00000000-0000-0000-0000-0000000000b2', 'after', me || '/b2/z.jpg');
    raise exception 'FAILED: customer added an after photo';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Deleting the account: completed work kept without the person; the rest goes.
insert into public.photos (owner_id, booking_id, kind, storage_path)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000b2',
          'condition', '00000000-0000-0000-0000-00000000000a/b2/exterior.jpg');

begin;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
do $$
declare kept public.bookings;
begin
  select * into kept from public.bookings where id = '00000000-0000-0000-0000-0000000000b1';
  assert kept.id is not null, 'paid booking survives deletion';
  assert kept.client_id is null and kept.vehicle_id is null, 'unlinked from the person and the car';
  assert kept.address_line1 is null and kept.gate_code is null, 'address and gate code cleared';
  assert kept.vehicle_label = 'Vehicle', 'vehicle description cleared';
  assert kept.anonymised_at is not null, 'marked anonymised';
  assert kept.subtotal_cents = 15000 and kept.postal_code = '70115', 'the financial record is intact';
  assert not exists (select 1 from public.bookings where id = '00000000-0000-0000-0000-0000000000b2'),
    'an upcoming booking that never happened is deleted';
  assert not exists (select 1 from public.photos where owner_id = '00000000-0000-0000-0000-00000000000a'),
    'their photos go with them';
  assert exists (select 1 from public.bookings where id = '00000000-0000-0000-0000-0000000000b3'),
    'nobody else''s booking is touched';
end $$;
rollback;

\echo 'rls: all assertions passed'
