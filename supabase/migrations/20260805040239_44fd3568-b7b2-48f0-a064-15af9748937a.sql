
REVOKE EXECUTE ON FUNCTION public.award_karma(uuid, integer, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.karma_on_like() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.karma_on_video_approved() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_views(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_views(uuid) TO anon, authenticated;
