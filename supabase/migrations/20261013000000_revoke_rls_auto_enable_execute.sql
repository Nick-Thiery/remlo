-- public.rls_auto_enable() is the function behind the ensure_rls event trigger
-- (it enables RLS on new public tables). Event-trigger functions cannot do
-- anything useful when called over /rest/v1/rpc, but the Supabase security
-- advisor flags it because anon and authenticated hold EXECUTE through PUBLIC.
-- Event triggers do not check EXECUTE when they fire, so revoking is safe.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
