-- 0006_fk_indexes.sql
--
-- Covering indexes for the two foreign keys the performance advisor flagged
-- after 0005. Removing a vehicle sets these columns to null, and without an
-- index that is a sequential scan of bookings and photos per removal.

create index bookings_vehicle_idx on public.bookings (vehicle_id);
create index photos_vehicle_idx on public.photos (vehicle_id);
