
-- ============ roles ============
CREATE TYPE public.app_role AS ENUM ('admin', 'fleet_admin', 'operator');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- ============ packs ============
CREATE TABLE public.packs (
  id text PRIMARY KEY,
  rider text,
  chemistry text NOT NULL DEFAULT 'LFP 14S4P · 51.2V · 30Ah',
  pubkey text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','warn','danger','offline','locked')),
  soc numeric(5,2) NOT NULL DEFAULT 80,
  soh numeric(5,2) NOT NULL DEFAULT 96,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.packs TO authenticated;
GRANT ALL ON public.packs TO service_role;
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view packs"
  ON public.packs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage packs"
  ON public.packs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'fleet_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'fleet_admin'));

-- ============ events ============
CREATE TABLE public.events (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  pack_id text REFERENCES public.packs(id) ON DELETE SET NULL,
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','danger')),
  message text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX events_ts_idx ON public.events (ts DESC);
GRANT SELECT, INSERT ON public.events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.events_id_seq TO authenticated;
GRANT ALL ON public.events TO service_role;
GRANT ALL ON SEQUENCE public.events_id_seq TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view events"
  ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators can log events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'fleet_admin')
    OR public.has_role(auth.uid(),'operator')
  );

-- ============ authorized_chargers ============
CREATE TABLE public.authorized_chargers (
  id text PRIMARY KEY,
  pubkey text NOT NULL,
  label text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.authorized_chargers TO authenticated;
GRANT ALL ON public.authorized_chargers TO service_role;
ALTER TABLE public.authorized_chargers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view chargers"
  ON public.authorized_chargers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage chargers"
  ON public.authorized_chargers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'fleet_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'fleet_admin'));

-- ============ telemetry_frames (history, optional) ============
CREATE TABLE public.telemetry_frames (
  id bigserial PRIMARY KEY,
  pack_id text NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL DEFAULT now(),
  cells jsonb NOT NULL,
  current_a numeric(8,3),
  power_w numeric(10,2),
  rssi int,
  rtt_ms int,
  risk_score numeric(5,3)
);
CREATE INDEX telemetry_frames_pack_ts_idx ON public.telemetry_frames (pack_id, ts DESC);
GRANT SELECT ON public.telemetry_frames TO authenticated;
GRANT ALL ON public.telemetry_frames TO service_role;
ALTER TABLE public.telemetry_frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view telemetry"
  ON public.telemetry_frames FOR SELECT TO authenticated USING (true);

-- ============ seed 600 packs around Kampala ============
INSERT INTO public.packs (id, rider, lat, lng, status, soc, soh, last_seen)
SELECT
  'UG-KLA-' || lpad(n::text, 5, '0'),
  'RDR-' || lpad((10000 + n)::text, 5, '0') || ' · Rider ' || n,
  0.3476 + (random() - 0.5) * 0.18,
  32.5825 + (random() - 0.5) * 0.22,
  CASE
    WHEN random() < 0.04 THEN 'danger'
    WHEN random() < 0.14 THEN 'warn'
    WHEN random() < 0.20 THEN 'offline'
    ELSE 'ok'
  END,
  round((20 + random() * 80)::numeric, 1),
  round((88 + random() * 11)::numeric, 1),
  now() - (random() * interval '30 minutes')
FROM generate_series(1, 600) AS n;

-- ============ seed 20 authorized chargers ============
INSERT INTO public.authorized_chargers (id, pubkey, label, enabled)
SELECT
  'STN-KLA-' || lpad(n::text, 3, '0'),
  'ed25519:' || encode(gen_random_bytes(16), 'hex'),
  'Kampala swap station #' || n,
  true
FROM generate_series(1, 20) AS n;
