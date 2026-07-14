
CREATE TABLE public.badge_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX badge_weeks_one_active ON public.badge_weeks (active) WHERE active = true;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badge_weeks TO authenticated;
GRANT ALL ON public.badge_weeks TO service_role;
ALTER TABLE public.badge_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read weeks" ON public.badge_weeks FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage weeks" ON public.badge_weeks FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(), 'badge.settimane'));
CREATE POLICY "update weeks" ON public.badge_weeks FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(), 'badge.settimane'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(), 'badge.settimane'));
CREATE POLICY "delete weeks" ON public.badge_weeks FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TABLE public.badge_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES public.badge_weeks(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX badge_sessions_user_week ON public.badge_sessions (user_id, week_id);
CREATE UNIQUE INDEX badge_sessions_one_open_per_user ON public.badge_sessions (user_id) WHERE ended_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badge_sessions TO authenticated;
GRANT ALL ON public.badge_sessions TO service_role;
ALTER TABLE public.badge_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sessions" ON public.badge_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own session" ON public.badge_sessions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(), 'badge.timbra'))
    AND EXISTS (SELECT 1 FROM public.badge_weeks w WHERE w.id = week_id AND w.active = true)
  );
CREATE POLICY "update own or manage sessions" ON public.badge_sessions FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'badge.gestisci')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'badge.gestisci')
  );
CREATE POLICY "delete sessions admin" ON public.badge_sessions FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
