# Data model & collection inventory

Two jobs: describe the schema, and keep a per-field record of what we collect
and why. The second half fills out Apple's privacy nutrition labels and
Google Play's Data Safety form — trivial if current, miserable if not.

**Update this in the same commit as any migration.**

---

## Schema

Migrations live in `supabase/migrations/`, numbered, never edited once applied.

### Shipped

| Table | Purpose | Migration |
|---|---|---|
| `profiles` | One row per auth user. Role drives the shell and every policy. | 0001 |
| `services` | The service menu. Seeded from beezynola.com. | 0001 |
| `vehicles` | The car, not just the customer. | 0001 |
| `tester_allowlist` | Beta signup gate, enforced by a trigger on `auth.users` since 0004; carries the invited role since 0005. **Remove before submission.** | 0001, 0004, 0005 |
| `bookings` | A requested or completed job. Customer may create (as `requested`) and cancel only; shape enforced by `private.guard_booking_write()`. Survives account deletion anonymised. | 0005 |
| `photos` | Condition photos now; before/after and damage in Phase 5. Files in the private `photos` bucket at `<owner>/<booking>/<file>`. | 0005 |

### Planned

| Table | Purpose | Phase |
|---|---|---|
| `jobs` | booking ref, assigned_tech, actual start/end, checklist state | 5 |
| `payments` | `square_payment_id`, amount, type, status | 4 |
| `subscriptions` | client, plan, `square_subscription_id`, credits_remaining | 6 |
| `expenses`, `mileage_trips` | Tax-time reporting | 7 |
| `messages` | In-app thread | 8 |

### Why vehicles are modelled separately

Coating warranty windows and paint condition live on the car, not the
customer. A household with three vehicles has three different service
histories, three different coating expiry dates, and three different size
multipliers. Every serious detailing platform models this; collapsing it into
the customer record is the mistake that makes warranty tracking impossible
later.

`vehicles.third_row` is a flag rather than being inferred from `body_type`,
because a third row forces the large-SUV price band regardless of what the
body style suggests. That is exactly where solo detailers lose money.

### Role model

`user_role`: `customer` | `tech` | `admin` | `owner`

`tech` exists in the enum from day one even though the tech shell ships in
Phase 8, so RLS is written once rather than retrofitted.

- **customer** — own profile, own vehicles, own bookings/photos/payments
- **tech** — assigned jobs only, no revenue visibility
- **admin** — everything except financial settings and payroll
- **owner** — everything

Helpers `private.is_staff()` and `private.is_owner()` live in the `private`
schema so they are unreachable over PostgREST (DECISIONS.md#0005).

**Role is never client-writable.** Since 0004 the client may update only
`full_name`, `phone` and `gallery_consent` on `profiles` — a column
privilege, checked before any policy. Role changes go through an edge
function with the service role (DECISIONS.md#0020). Every policy is
exercised as the real roles by `supabase/tests/rls.test.sql`, in CI.

---

## Collection inventory

Per field: what, why, whether it leaves our infrastructure, and how deletion
handles it.

### Identity — `profiles`

| Field | Purpose | Shared with | On account deletion |
|---|---|---|---|
| `email` | Login, confirmations, receipts | Supabase Auth; Resend (Phase 4); Square as customer record (Phase 4) | Deleted |
| `full_name` | Addressing the customer | Square; email | Deleted |
| `phone` | SMS reminders, arrival texts | Square; Twilio (Phase 8) | Deleted |
| `role` | Access control | — | Deleted |
| `gallery_consent` | Consent to publish before/after pairs publicly | — | Deleted; published photos withdrawn |

Linked to the device only by an auth session. No advertising identifiers, no
analytics SDK, no third-party trackers. If that changes, it is a labelled
disclosure and belongs in this table first.

### Vehicle — `vehicles`

| Field | Purpose | Shared with | On account deletion |
|---|---|---|---|
| `year`/`make`/`model`/`colour` | Size multiplier, job prep | — | Deleted |
| `body_type`, `third_row` | Price and duration | — | Deleted |
| `vin` | Optional. Decoded to auto-fill the above. | NHTSA vPIC (public, no key, no account) | Deleted |
| `plate` | Identifying the car on arrival | — | Deleted |
| `coating_applied_at`, `coating_warranty_expires_at` | Warranty tracking, maintenance reminders | — | Deleted |
| `notes` | Free text (gate code, quirks) | — | Deleted |

VIN is optional and never required to book. It decodes against NHTSA's public
vPIC service, which needs no key and no account.

### Location — `bookings`

| Field | Purpose | Precision | On account deletion |
|---|---|---|---|
| Service address | Where the van goes | Street address | **Anonymised, not deleted**, on completed jobs |
| Map pin / coordinates | Routing. **Optional** — only if the customer taps *Pin my exact spot* | Precise | Cleared |
| Gate code, parking notes | Access | — | Deleted |

Declared as **precise location** on both stores. Collected only at booking,
never in the background — the PWA cannot do background location, and the
native build will not ask for `Always`.

### Photography — `photos`

| Field | Purpose | Notes |
|---|---|---|
| Condition photos | Quote accuracy | Uploaded by the customer at booking. Resized and re-encoded on the device, which strips EXIF — no location leaves the phone |
| Before/after | Documentation; dispute protection on pre-existing damage | Captured by the tech |
| EXIF timestamp + coordinates | Proves when and where the work happened | Retained deliberately on Beezy's before/after (Phase 5), never taken from a customer's photo |

Resized and compressed **on device before upload** — free-tier storage is 1 GB
and photography exhausts it first. Thumbnails stored separately.

Photos reach the public gallery only where `gallery_consent` is true.

### Payment — `payments` (Phase 4)

We store **tokens only**. No PAN, no CVV, no expiry ever touches our database
or our client. Square holds the instrument; we hold `square_payment_id` and
`square_customer_id`.

Payment records on completed work survive account deletion in anonymised form,
because Beezy has tax obligations on transactions that actually happened.
Disclosed in the privacy policy and in the deletion confirmation copy.

---

## Third parties

| Service | Receives | Why | Phase |
|---|---|---|---|
| Supabase | Everything above | Database, auth, storage | 1 |
| Square | Name, email, phone, amounts, tokens | Payments — system of record for money | 4 |
| Google Calendar | Job title, time, address, client name, phone | Beezy's day-to-day calendar | 4 |
| Resend | Email, name, booking details | Transactional email | 4 |
| NHTSA vPIC | VIN only, and only when the customer taps *Look up* | Decode to year/make/model | 3 (live) |
| Twilio | Phone, message body | SMS reminders and two-way | 8 |

No analytics or advertising SDK is present. Adding one requires a label update
and an entry here in the same commit.

---

## Retention

| Data | Retained |
|---|---|
| Active account | Until the customer deletes it |
| Condition photos | 24 months, then purged |
| Before/after on completed jobs | 24 months (dispute window), then purged unless consented to the gallery |
| Financial records | 7 years, anonymised after account deletion |
| Anonymised bookings (`anonymised_at`) | Kept with the financial record: no customer link, no street, coordinates, gate code, notes or vehicle. Deletion removes the profile row outright, so there is no separate tombstone |
| Photo files | Deleted from storage with the account, by the `delete-account` function |
