-- 0005 part 7 — run by hand in the Supabase SQL editor (docs/PROGRESS.md item 5).
-- The Supabase MCP connector cannot run statements that delete rows
-- (DECISIONS.md#0023). Same logic as section 6 of 0005_bookings_photos.sql,
-- written to survive copy-paste: no indentation, `(old).id` instead of
-- `old.id` (chat apps turn "old.id" into a link), and `create or replace`
-- so running it twice is harmless.
create or replace function private.anonymise_bookings_on_profile_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
update public.bookings set client_id = null, vehicle_id = null, vehicle_label = 'Vehicle', address_line1 = null, address_line2 = null, gate_code = null, parking_notes = null, latitude = null, longitude = null, notes = null, anonymised_at = now() where client_id = (old).id and status in ('complete', 'paid');
delete from public.bookings where client_id = (old).id and status not in ('complete', 'paid');
return old;
end;
$$;
create or replace trigger profiles_anonymise_bookings before delete on public.profiles for each row execute function private.anonymise_bookings_on_profile_delete();
