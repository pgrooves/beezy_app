-- 0003_harden_platform_helper.sql
--
-- public.rls_auto_enable() is a Supabase-managed event-trigger function (fired
-- by the `ensure_rls` ddl_command_end trigger) that enables RLS on any new
-- table created in `public`. It is a useful backstop for our "RLS on every
-- table at creation time" rule, so we keep it.
--
-- The security linter flags it as RPC-callable by anon and authenticated.
-- In practice Postgres refuses to call an event-trigger function directly, so
-- this is not exploitable — but an advisor board with a permanent known
-- warning on it trains you to ignore the board, and the next finding will be
-- real. Revoking EXECUTE costs nothing: event triggers fire through the DDL
-- machinery, not through the calling role's EXECUTE privilege.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
