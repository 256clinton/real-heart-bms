ALTER TABLE public.packs REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.authorized_chargers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.packs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.authorized_chargers;