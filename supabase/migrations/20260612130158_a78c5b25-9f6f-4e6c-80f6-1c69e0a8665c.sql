
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TYPE public.membership_tier AS ENUM ('standard', 'exclusive', 'elite');

CREATE TYPE public.service_billing AS ENUM ('per_night', 'one_time', 'recurring');

-- =========================================================
-- PROFILES (panel users)
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- USER ROLES (built-in: admin/staff)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

-- =========================================================
-- CUSTOM ROLES (admin-defined with permission lists)
-- =========================================================
CREATE TABLE public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_roles TO authenticated;
GRANT ALL ON public.custom_roles TO service_role;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  UNIQUE (user_id, custom_role_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_custom_roles TO authenticated;
GRANT ALL ON public.user_custom_roles TO service_role;
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

-- Aggregated permissions function
CREATE OR REPLACE FUNCTION public.user_permissions(_user_id UUID)
RETURNS TEXT[]
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT p), '{}')
  FROM public.user_custom_roles ucr
  JOIN public.custom_roles cr ON cr.id = ucr.custom_role_id
  CROSS JOIN LATERAL UNNEST(cr.permissions) AS p
  WHERE ucr.user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _perm TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_admin(_user_id)
      OR EXISTS (
        SELECT 1 FROM public.user_custom_roles ucr
        JOIN public.custom_roles cr ON cr.id = ucr.custom_role_id
        WHERE ucr.user_id = _user_id AND _perm = ANY(cr.permissions)
      )
$$;

-- =========================================================
-- CITIZENS
-- =========================================================
CREATE TABLE public.citizens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  nickname TEXT,
  faction TEXT,
  membership public.membership_tier NOT NULL DEFAULT 'standard',
  membership_since DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.citizens TO authenticated;
GRANT ALL ON public.citizens TO service_role;
ALTER TABLE public.citizens ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- SERVICE CATALOG
-- =========================================================
CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
GRANT ALL ON public.service_categories TO service_role;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  billing public.service_billing NOT NULL DEFAULT 'per_night',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- NIGHTS (serate)
-- =========================================================
CREATE TABLE public.nights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
  night_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nights TO authenticated;
GRANT ALL ON public.nights TO service_role;
ALTER TABLE public.nights ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.night_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  night_id UUID NOT NULL REFERENCES public.nights(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  subtotal NUMERIC(12,2) NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.night_items TO authenticated;
GRANT ALL ON public.night_items TO service_role;
ALTER TABLE public.night_items ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- IPPODROMO
-- =========================================================
CREATE TABLE public.stables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_citizen_id UUID REFERENCES public.citizens(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stables TO authenticated;
GRANT ALL ON public.stables TO service_role;
ALTER TABLE public.stables ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.horses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_id UUID REFERENCES public.stables(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sponsor_citizen_id UUID REFERENCES public.citizens(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horses TO authenticated;
GRANT ALL ON public.horses TO service_role;
ALTER TABLE public.horses ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- SAFE BOXES
-- =========================================================
CREATE TABLE public.safe_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_number INT NOT NULL UNIQUE,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE SET NULL,
  activated_at DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safe_boxes TO authenticated;
GRANT ALL ON public.safe_boxes TO service_role;
ALTER TABLE public.safe_boxes ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES
-- =========================================================
-- profiles: everyone authenticated reads, admin writes, user updates own
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- user_roles: admin manages, authenticated read
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_admin" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- custom_roles: admin manages, authenticated read
CREATE POLICY "custom_roles_select" ON public.custom_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "custom_roles_admin" ON public.custom_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "ucr_select" ON public.user_custom_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "ucr_admin" ON public.user_custom_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- citizens: any authenticated user reads/writes (granular control via UI permissions)
CREATE POLICY "citizens_all_auth" ON public.citizens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- services & categories
CREATE POLICY "svc_cat_select" ON public.service_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "svc_cat_admin" ON public.service_categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "services_select" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "services_admin" ON public.services FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- nights / items
CREATE POLICY "nights_all_auth" ON public.nights FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "night_items_all_auth" ON public.night_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ippodromo
CREATE POLICY "stables_all_auth" ON public.stables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "horses_all_auth" ON public.horses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- safe boxes
CREATE POLICY "safes_all_auth" ON public.safe_boxes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- TRIGGERS
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_citizens_updated BEFORE UPDATE ON public.citizens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup using user_metadata.username
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recalculate night total when items change
CREATE OR REPLACE FUNCTION public.recalc_night_total() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _nid UUID;
BEGIN
  _nid := COALESCE(NEW.night_id, OLD.night_id);
  UPDATE public.nights SET total = COALESCE(
    (SELECT SUM(subtotal) FROM public.night_items WHERE night_id = _nid), 0
  ) WHERE id = _nid;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_night_items_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.night_items
  FOR EACH ROW EXECUTE FUNCTION public.recalc_night_total();
