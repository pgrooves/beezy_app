-- 0001_base_schema.sql
-- Beezy Luxury Detailing — base schema.
--
-- Covers identity, the service menu, and vehicles. Bookings, jobs, photos,
-- payments and subscriptions arrive in later migrations alongside the features
-- that need them.
--
-- Every table enables RLS in the same statement block that creates it. The
-- client bundle is public and ships the anon key, so these policies are the
-- only thing standing between a customer and someone else's data.
--
-- Applied migrations are never edited. Corrections go in a new file.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Tech exists now so RLS can be written once. The tech shell ships in Phase 8.
create type public.user_role as enum ('customer', 'tech', 'admin', 'owner');

-- Drives the size multiplier in the pricing engine (src/core/pricing).
create type public.body_type as enum (
  'coupe',
  'sedan',
  'compact_suv',
  'mid_suv',
  'large_suv',
  'truck',
  'van',
  'xl'
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text,
  email text,
  phone text,
  -- Consent to publish this customer's before/after pairs to the public
  -- gallery, captured at booking. Defaults to withheld.
  gallery_consent boolean not null default false,
  -- Set by the account-deletion flow. The row is anonymised rather than
  -- deleted where a booking must survive for tax records; see docs/COMPLIANCE.md.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user. Role drives which app shell renders and every RLS policy below.';

alter table public.profiles enable row level security;

-- Staff checks are their own function so policies stay readable and a role
-- change does not require rewriting every policy.
create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'owner')
      and deleted_at is null
  );
$$;

create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner' and deleted_at is null
  );
$$;

create policy "profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: staff read all"
  on public.profiles for select
  using (public.is_staff());

create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Role escalation is blocked: only the owner may change anyone's role, and
-- that path goes through an edge function, not the client.
create policy "profiles: owner manages roles"
  on public.profiles for update
  using (public.is_owner())
  with check (public.is_owner());

-- New signups get a profile automatically; the client never inserts one.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  -- Plain-language outcome copy for the service card.
  summary text not null,
  description text,
  -- Floor price in cents for the baseline vehicle (sedan, light condition).
  -- Every published price carries a '+' because size and condition move it.
  base_price_cents integer not null check (base_price_cents > 0),
  -- Baseline duration; the pricing engine scales it by size and condition so
  -- the scheduler never offers a slot the day cannot physically support.
  base_duration_minutes integer not null check (base_duration_minutes > 0),
  -- Can this be attached to another service rather than booked alone?
  is_addon boolean not null default false,
  -- Shown in the champagne accent as a premium highlight.
  is_premium boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  -- Set once the Catalog API mirror runs (Phase 4).
  square_catalog_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.services.base_price_cents is
  'Floor price for a sedan in light condition. See src/core/pricing for multipliers.';

alter table public.services enable row level security;

-- The service menu is public: guideline 5.1.1(iv) forbids gating browsable
-- content behind an account.
create policy "services: public read"
  on public.services for select
  using (active or public.is_staff());

create policy "services: staff write"
  on public.services for all
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------------

-- Vehicle-level modelling is mandatory: coating warranty windows and paint
-- condition live on the car, not the customer.
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  year integer check (year between 1900 and 2100),
  make text not null,
  model text not null,
  colour text,
  body_type public.body_type not null default 'sedan',
  -- Third row forces the large-SUV size band regardless of body_type, because
  -- that is exactly where solo detailers lose money.
  third_row boolean not null default false,
  vin text,
  plate text,
  notes text,
  -- Coating state drives warranty reminders and maintenance upsells.
  coating_applied_at date,
  coating_warranty_expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_owner_idx on public.vehicles (owner_id);

alter table public.vehicles enable row level security;

create policy "vehicles: owner reads own"
  on public.vehicles for select
  using (owner_id = auth.uid());

create policy "vehicles: staff read all"
  on public.vehicles for select
  using (public.is_staff());

create policy "vehicles: owner writes own"
  on public.vehicles for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "vehicles: staff writes all"
  on public.vehicles for all
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- tester_allowlist
-- ---------------------------------------------------------------------------

-- Beta gate. The Pages site is public, so signup is restricted to invited
-- emails. This MUST be removed before store submission: gating account
-- creation this way conflicts with guideline 5.1.1(iv).
-- Tracked in docs/COMPLIANCE.md as a pre-submission task.
create table public.tester_allowlist (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);

alter table public.tester_allowlist enable row level security;

create policy "tester_allowlist: staff only"
  on public.tester_allowlist for all
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger services_touch before update on public.services
  for each row execute function public.touch_updated_at();
create trigger vehicles_touch before update on public.vehicles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Seed: the live service menu from beezynola.com
-- ---------------------------------------------------------------------------

insert into public.services
  (slug, name, summary, base_price_cents, base_duration_minutes, is_addon, is_premium, sort_order)
values
  ('express-wash', 'Express Wash',
   'Hand wash, rims cleaned and tires dressed, door jambs, all glass, dash and console wiped, interior vacuum.',
   10000, 120, false, false, 1),
  ('luxe-wash', 'Luxe Wash',
   'Everything in the Express, plus exterior spray wax and an interior blowout of the hard-to-reach places.',
   14000, 180, false, false, 2),
  ('beezy-wash', 'Beezy Wash',
   'Express and Luxe in full, plus conditioning of every plastic and leather surface in the car.',
   20000, 270, false, false, 3),
  ('clay-bar', 'Clay Bar',
   'Pulls embedded contaminants out of the paint, restores a smooth finish, and preps the surface for wax or coating.',
   39900, 360, true, false, 4),
  ('headlight-restore', 'Headlight Restoration',
   'Removes oxidation and restores clarity, so you actually see the road at night.',
   9900, 90, true, false, 5),
  ('ceramic-coating', 'Ceramic Coating',
   'A liquid polymer bonded to the paint: UV, dirt and water-spot protection, hydrophobic, long-term gloss.',
   87900, 600, true, true, 6);
