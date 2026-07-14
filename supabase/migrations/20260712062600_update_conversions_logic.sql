-- Update conversion settings defaults if needed
UPDATE public.conversion_settings
SET max_dobloni_per_day = 10000,
    max_eur_per_day = 2000
WHERE id = TRUE;

-- Update conversion usage calculation to sum Euros for cash_to_dobloni and Dobloni for dobloni_to_cash
CREATE OR REPLACE FUNCTION public.conversion_usage(_citizen UUID, _night UUID, _direction public.conversion_direction)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH last_reset AS (
    SELECT MAX(reset_at) AS ts FROM public.conversion_resets
    WHERE citizen_id = _citizen AND night_id = _night AND direction = _direction
  )
  SELECT COALESCE(SUM(
    CASE WHEN _direction = 'cash_to_dobloni' THEN eur_amount ELSE dobloni_amount END
  ), 0)
  FROM public.conversions, last_reset
  WHERE citizen_id = _citizen AND night_id = _night AND direction = _direction
    AND (last_reset.ts IS NULL OR created_at > last_reset.ts);
$$;

-- Update perform_conversion with the new rules (75% rate, limit checks, min 40, multiple of 40)
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
    _out := _eur; -- Limit is checked against Euros
    _limit := _settings.max_eur_per_day; -- €2000
  ELSE
    _dob := _input;
    _eur := _input * 0.075; -- 75% rate (10 dobloni = 0.75€)
    _out := _dob; -- Limit is checked against Dobloni
    _limit := _settings.max_dobloni_per_day; -- 10000 ⛃

    -- Minimum of 40 dobloni check
    IF _dob < 40 THEN
      RAISE EXCEPTION 'Minimo 40 dobloni per la conversione';
    END IF;

    -- Multiple of 40 check
    IF (_dob % 40) != 0 THEN
      RAISE EXCEPTION 'L''importo deve essere un multiplo di 40 dobloni';
    END IF;
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
