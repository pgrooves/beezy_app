-- 0005_bookings_photos.sql
--
-- Phase 3's real data: bookings, condition photos and their storage bucket,
-- the service menu's display copy, invite-time roles, and what account
-- deletion does to bookings. See docs/DECISIONS.md#0023.
--
-- No DROP statements: the Supabase MCP connector holds those for an
-- interactive confirmation (see 0004), so everything here is additive or an
-- ALTER / CREATE OR REPLACE.

-- ---------------------------------------------------------------------------
-- 1. Invites carry a role
-- ---------------------------------------------------------------------------

-- The first owner cannot be promoted from the client (0004), and should not
-- need someone with dashboard access to run SQL after they sign in. The
-- invite says what the account will be, and the signup trigger honours it.
alter table public.tester_allowlist
  add column role public.user_role not null default 'customer';

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(
      (select a.role from public.tester_allowlist a where a.email = lower(new.email)),
      'customer'
    )
  );
  return new;
end;
$$;

-- Staff manage invites, but only the owner may invite staff. Otherwise an
-- admin could invite a second address of their own as owner — the same
-- escalation 0004 closed, one table over.
alter policy "tester_allowlist: staff only" on public.tester_allowlist
  to authenticated
  using (private.is_staff())
  with check (private.is_staff() and (role in ('customer', 'tech') or private.is_owner()));

-- ---------------------------------------------------------------------------
-- 2. Service menu display copy
-- ---------------------------------------------------------------------------

-- The booking flow shows what each service includes and a photo. Until now
-- that lived only in src/core/fixtures.ts; it moves here so the menu is
-- edited in one place.
alter table public.services
  add column includes text[] not null default '{}',
  -- Relative to the app's public base (resolved by src/lib/assets.ts), or a
  -- full URL once images are uploaded.
  add column image_path text;

update public.services set
  summary = 'The weekly reset. Clean inside and out, done in a couple of hours.',
  image_path = 'brand/photos/foam-windshield.webp',
  includes = array['Hand wash, dried by hand', 'Rims cleaned, tires dressed', 'Door jambs wiped',
                   'All glass, inside and out', 'Dash and console wiped', 'Interior vacuum']
where slug = 'express-wash';

update public.services set
  summary = 'Everything in the Express, plus protection on the paint and a proper interior blowout.',
  image_path = 'brand/photos/wheel-detail.webp',
  includes = array['Everything in the Express Wash', 'Exterior spray wax',
                   'Interior blowout of vents and seams', 'Hard-to-reach areas detailed']
where slug = 'luxe-wash';

update public.services set
  summary = 'The full treatment. Every surface in the car conditioned and protected.',
  image_path = 'brand/photos/owner-portrait.webp',
  includes = array['Everything in the Express and Luxe', 'All plastic surfaces conditioned',
                   'Leather cleaned and conditioned', 'Full interior detail']
where slug = 'beezy-wash';

update public.services set
  summary = 'Pulls contaminants out of the paint so it feels like glass again.',
  image_path = 'brand/photos/beezy-mobile-van.webp',
  includes = array['Removes embedded contaminants', 'Restores a smooth finish',
                   'Preps the surface for wax or coating']
where slug = 'clay-bar';

update public.services set
  summary = 'Removes the yellow haze so you actually see the road at night.',
  includes = array['Oxidation removed', 'Clarity restored', 'Sealed against re-yellowing']
where slug = 'headlight-restore';

update public.services set
  summary = 'A polymer bonded to the paint. Years of gloss, and water that runs straight off.',
  image_path = 'brand/photos/make-life-easy-card.webp',
  includes = array['Liquid polymer bonded to the paint', 'UV, dirt and water-spot protection',
                   'Hydrophobic — water beads and runs', 'Long-term gloss']
where slug = 'ceramic-coating';

-- ---------------------------------------------------------------------------
-- 3. Bookings
-- ---------------------------------------------------------------------------

create type public.booking_status as enum (
  'requested', 'confirmed', 'en_route', 'in_progress', 'complete', 'paid', 'cancelled'
);
create type public.condition_tier as enum ('light', 'moderate', 'heavy', 'extreme');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  -- Null once the customer deletes their account and the booking is kept,
  -- anonymised, for the tax record (section 6).
  client_id uuid references public.profiles (id) on delete set null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  -- "2023 Porsche Macan", frozen at booking: the history must still read
  -- correctly after the car is edited or removed from the garage.
  vehicle_label text not null,
  service_ids uuid[] not null check (cardinality(service_ids) > 0),
  condition public.condition_tier not null,
  surcharges text[] not null default '{}',

  address_line1 text,
  address_line2 text,
  city text,
  state text not null default 'LA',
  postal_code text,
  gate_code text,
  parking_notes text,
  covered boolean not null default false,
  latitude double precision,
  longitude double precision,

  scheduled_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  status public.booking_status not null default 'requested',

  -- The customer's estimate, as the pricing engine showed it. The deposit
  -- function (Phase 4) recomputes from `services` before charging anything;
  -- these numbers are what was quoted, not what will be taken.
  subtotal_cents integer not null check (subtotal_cents >= 0),
  deposit_cents integer not null check (deposit_cents >= 0),
  quote_lines jsonb not null default '[]',
  needs_review boolean not null default false,
  -- Set by Beezy on site, approved by the customer before work starts.
  final_cents integer check (final_cents >= 0),

  notes text,
  square_booking_id text,
  anonymised_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Live bookings need somewhere to send the van. Only anonymisation clears it.
  constraint bookings_address_present check (anonymised_at is not null or address_line1 is not null)
);

comment on table public.bookings is
  'A requested or completed job. Survives account deletion anonymised, for tax records.';

create index bookings_client_idx on public.bookings (client_id);
create index bookings_scheduled_idx on public.bookings (scheduled_at);

alter table public.bookings enable row level security;

create policy "bookings: client reads own"
  on public.bookings for select
  to authenticated
  using (client_id = (select auth.uid()));

create policy "bookings: staff read all"
  on public.bookings for select
  to authenticated
  using (private.is_staff());

-- What a customer may write is narrow enough that the policy only pins
-- ownership; the shape of the write is checked by the guard trigger below,
-- which can compare old and new rows where a policy cannot.
create policy "bookings: client requests own"
  on public.bookings for insert
  to authenticated
  with check (client_id = (select auth.uid()));

create policy "bookings: client updates own"
  on public.bookings for update
  to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

create policy "bookings: staff write all"
  on public.bookings for all
  to authenticated
  using (private.is_staff())
  with check (private.is_staff());

-- No delete for anyone on the client. A booking is cancelled, never erased.
revoke delete on public.bookings from anon, authenticated;

create function private.guard_booking_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Staff, and the service role (edge functions, the dashboard), are trusted.
  if private.is_staff() or (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'requested' then
      raise exception 'beezy: a new booking starts as requested' using errcode = '42501';
    end if;
    if new.final_cents is not null or new.square_booking_id is not null
       or new.anonymised_at is not null then
      raise exception 'beezy: those booking fields are set by Beezy' using errcode = '42501';
    end if;
    if new.scheduled_at <= now() then
      raise exception 'beezy: a booking must be in the future' using errcode = '23514';
    end if;
    if new.vehicle_id is not null and not exists (
      select 1 from public.vehicles v
      where v.id = new.vehicle_id and v.owner_id = (select auth.uid())
    ) then
      raise exception 'beezy: that vehicle is not in your garage' using errcode = '42501';
    end if;
    if exists (
      select 1 from unnest(new.service_ids) as s(id)
      where not exists (select 1 from public.services sv where sv.id = s.id and sv.active)
    ) then
      raise exception 'beezy: unknown or retired service' using errcode = '23503';
    end if;
    return new;
  end if;

  -- UPDATE by a customer: cancelling a booking that has not started, and
  -- nothing else. Every other column must come through unchanged.
  if new.status = 'cancelled'
     and old.status in ('requested', 'confirmed')
     and (to_jsonb(new) - 'status' - 'updated_at') = (to_jsonb(old) - 'status' - 'updated_at') then
    return new;
  end if;
  raise exception 'beezy: a booking can only be cancelled from the app' using errcode = '42501';
end;
$$;

create trigger bookings_guard
  before insert or update on public.bookings
  for each row execute function private.guard_booking_write();

create trigger bookings_touch before update on public.bookings
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Photos
-- ---------------------------------------------------------------------------

create type public.photo_kind as enum ('condition', 'before', 'after', 'damage');

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  -- Whose car this is. Deleted with the account; see section 6.
  owner_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  kind public.photo_kind not null,
  -- 'exterior', 'interior_front', … for condition photos.
  slot text,
  -- Object path in the `photos` bucket: <owner_id>/<booking_id>/<file>.
  storage_path text not null unique,
  width integer,
  height integer,
  captured_at timestamptz,
  -- Retained deliberately: proves when and where (DATA_MODEL.md).
  latitude double precision,
  longitude double precision,
  -- Public gallery only with the customer's consent (profiles.gallery_consent).
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create index photos_owner_idx on public.photos (owner_id);
create index photos_booking_idx on public.photos (booking_id);

alter table public.photos enable row level security;

create policy "photos: owner reads own"
  on public.photos for select
  to authenticated
  using (owner_id = (select auth.uid()));

-- A customer adds condition photos to their own booking, under their own
-- folder, unpublished. Before/after and damage photos are Beezy's.
create policy "photos: owner adds condition photos"
  on public.photos for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and kind = 'condition'
    and published = false
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and (booking_id is null or exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.client_id = (select auth.uid())
    ))
  );

create policy "photos: staff all"
  on public.photos for all
  to authenticated
  using (private.is_staff())
  with check (private.is_staff());

-- ---------------------------------------------------------------------------
-- 5. Storage: a private bucket, foldered by owner
-- ---------------------------------------------------------------------------

-- Private: every read is a short-lived signed URL. JPEG and WebP only, 5 MB
-- ceiling — the app resizes on device to well under that (free-tier storage
-- is 1 GB, and photography exhausts it first).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "photos bucket: owner uploads to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "photos bucket: owner reads own folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "photos bucket: staff read all"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'photos' and private.is_staff());

create policy "photos bucket: staff write all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'photos' and private.is_staff())
  with check (bucket_id = 'photos' and private.is_staff());

-- ---------------------------------------------------------------------------
-- 6. Account deletion keeps the invoice, not the person
-- ---------------------------------------------------------------------------

-- Runs whenever a profile is deleted — from the delete-account function, the
-- dashboard, or anywhere else — so no deletion path can skip it.
--
-- Work that happened (complete, paid) is kept for the tax record with every
-- personal detail removed: the customer link, the address beyond city and
-- ZIP, coordinates, gate code, notes, and the vehicle link. Work that never
-- happened (requested, confirmed, cancelled, or abandoned mid-job) has no
-- record to keep and is deleted, taking its photos with it.
create function private.anonymise_bookings_on_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bookings set
    client_id = null,
    vehicle_id = null,
    vehicle_label = 'Vehicle',
    address_line1 = null,
    address_line2 = null,
    gate_code = null,
    parking_notes = null,
    latitude = null,
    longitude = null,
    notes = null,
    anonymised_at = now()
  where client_id = old.id and status in ('complete', 'paid');

  delete from public.bookings
  where client_id = old.id and status not in ('complete', 'paid');

  return old;
end;
$$;

create trigger profiles_anonymise_bookings
  before delete on public.profiles
  for each row execute function private.anonymise_bookings_on_profile_delete();
