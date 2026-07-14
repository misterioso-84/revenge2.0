
-- Settings singleton
CREATE TABLE public.conversion_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  max_dobloni_per_day NUMERIC NOT NULL DEFAULT 10000,
  max_eur_per_day NUMERIC NOT NULL DEFAULT 2000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = TRUE)
);
INSERT INTO public.conversion_settings (id) VALUES (TRUE);

GRANT SELECT ON public.conversion_settings TO authenticated;
GRANT ALL ON public.conversion_settings TO service_role;
ALTER TABLE public.conversion_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read settings" ON public.conversion_settings FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "admin update settings" ON public.conversion_settings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Conversion direction enum
CREATE TYPE public.conversion_direction AS ENUM ('cash_to_dobloni', 'dobloni_to_cash');

-- Conversions ledger
CREATE TABLE public.conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
  night_id UUID NOT NULL REFERENCES public.nights(id) ON DELETE CASCADE,
  direction public.conversion_direction NOT NULL,
  input_amount NUMERIC NOT NULL,   -- what user provided
  eur_amount NUMERIC NOT NULL,     -- euros involved
  dobloni_amount NUMERIC NOT NULL, -- dobloni involved
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX conversions_citizen_night_idx ON public.conversions(citizen_id, night_id);
GRANT SELECT, INSERT ON public.conversions TO authenticated;
GRANT ALL ON public.conversions TO service_role;
ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view conversions with perm" ON public.conversions FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'conversioni.storico'));
CREATE POLICY "insert conversions with perm" ON public.conversions FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'conversioni.esegui'));

-- Per-night reset by admin
CREATE TABLE public.conversion_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
  night_id UUID NOT NULL REFERENCES public.nights(id) ON DELETE CASCADE,
  direction public.conversion_direction NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (citizen_id, night_id, direction, reset_at)
);
GRANT SELECT, INSERT ON public.conversion_resets TO authenticated;
GRANT ALL ON public.conversion_resets TO service_role;
ALTER TABLE public.conversion_resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view resets" ON public.conversion_resets FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'conversioni.storico') OR public.is_admin(auth.uid()));
CREATE POLICY "admin insert resets" ON public.conversion_resets FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Usage helper: returns already-converted amount for citizen+night+direction AFTER the latest reset
CREATE OR REPLACE FUNCTION public.conversion_usage(_citizen UUID, _night UUID, _direction public.conversion_direction)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH last_reset AS (
    SELECT MAX(reset_at) AS ts FROM public.conversion_resets
    WHERE citizen_id = _citizen AND night_id = _night AND direction = _direction
  )
  SELECT COALESCE(SUM(
    CASE WHEN _direction = 'cash_to_dobloni' THEN dobloni_amount ELSE eur_amount END
  ), 0)
  FROM public.conversions, last_reset
  WHERE citizen_id = _citizen AND night_id = _night AND direction = _direction
    AND (last_reset.ts IS NULL OR created_at > last_reset.ts);
$$;

-- Perform conversion (atomic, checks permission + limit)
CREATE OR REPLACE FUNCTION public.perform_conversion(
  _citizen UUID, _night UUID, _direction public.conversion_direction, _input NUMERIC
) RETURNS public.conversions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _settings public.conversion_settings;
  _eur NUMERIC; _dob NUMERIC; _out NUMERIC;
  _used NUMERIC; _limit NUMERIC;
  _row public.conversions;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF NOT public.has_permission(_uid, 'conversioni.esegui') THEN
    RAISE EXCEPTION 'Permesso mancante: conversioni.esegui';
  END IF;
  IF _input IS NULL OR _input <= 0 THEN
    RAISE EXCEPTION 'Importo non valido';
  END IF;

  SELECT * INTO _settings FROM public.conversion_settings WHERE id = TRUE;

  IF _direction = 'cash_to_dobloni' THEN
    _eur := _input;
    _dob := _input * 10;
    _out := _dob;
    _limit := _settings.max_dobloni_per_day;
  ELSE
    _dob := _input;
    _eur := (_input / 10.0) * 0.5;
    _out := _eur;
    _limit := _settings.max_eur_per_day;
  END IF;

  _used := public.conversion_usage(_citizen, _night, _direction);
  IF (_used + _out) > _limit THEN
    RAISE EXCEPTION 'Limite giornaliero superato: rimasti % (richiesti %)', GREATEST(_limit - _used, 0), _out;
  END IF;

  INSERT INTO public.conversions(citizen_id, night_id, direction, input_amount, eur_amount, dobloni_amount, created_by)
  VALUES (_citizen, _night, _direction, _input, _eur, _dob, _uid)
  RETURNING * INTO _row;

  RETURN _row;
END; $$;

GRANT EXECUTE ON FUNCTION public.perform_conversion(UUID, UUID, public.conversion_direction, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.conversion_usage(UUID, UUID, public.conversion_direction) TO authenticated;

-- Trigger to keep settings updated_at
CREATE TRIGGER conversion_settings_touch BEFORE UPDATE ON public.conversion_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
