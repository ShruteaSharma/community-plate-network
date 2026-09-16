
-- Roles
CREATE TYPE public.app_role AS ENUM ('donor', 'ngo', 'volunteer');
CREATE TYPE public.donation_status AS ENUM ('posted', 'claimed', 'picked_up', 'delivered', 'cancelled');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  org_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users claim own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, org_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.raw_user_meta_data->>'org_name')
  ON CONFLICT (id) DO NOTHING;

  IF NEW.raw_user_meta_data->>'role' IN ('donor','ngo','volunteer') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Donations
CREATE TABLE public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'units',
  storage_type text NOT NULL DEFAULT 'ambient',
  photo_url text,
  address text NOT NULL DEFAULT '',
  lat double precision,
  lng double precision,
  expires_at timestamptz NOT NULL,
  status public.donation_status NOT NULL DEFAULT 'posted',
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX donations_status_idx ON public.donations (status, expires_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Donations readable by authenticated" ON public.donations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Donors insert own donations" ON public.donations FOR INSERT TO authenticated WITH CHECK (auth.uid() = donor_id);
CREATE POLICY "Donor or claimer updates donation" ON public.donations FOR UPDATE TO authenticated
  USING (auth.uid() = donor_id OR auth.uid() = claimed_by OR (status = 'posted' AND claimed_by IS NULL))
  WITH CHECK (auth.uid() = donor_id OR auth.uid() = claimed_by);
CREATE POLICY "Donors delete own posted donations" ON public.donations FOR DELETE TO authenticated USING (auth.uid() = donor_id AND status = 'posted');

-- Status history
CREATE TABLE public.donation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  status public.donation_status NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.donation_events TO authenticated;
GRANT ALL ON public.donation_events TO service_role;
ALTER TABLE public.donation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events readable by authenticated" ON public.donation_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert events" ON public.donation_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);

-- Track status changes automatically
CREATE OR REPLACE FUNCTION public.log_donation_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.donation_events (donation_id, status, actor_id)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER donations_log_event
AFTER INSERT OR UPDATE ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.log_donation_event();

ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;
