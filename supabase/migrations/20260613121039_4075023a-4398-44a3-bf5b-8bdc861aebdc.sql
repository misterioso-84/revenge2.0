
-- Restructure: a "serata" (night) is a global event with date and optional title.
-- Citizens are attached at the night_item level, so one night holds many citizens with many services.

ALTER TABLE public.night_items
  ADD COLUMN IF NOT EXISTS citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE;

-- Backfill citizen_id on existing items from parent night.
UPDATE public.night_items ni
SET citizen_id = n.citizen_id
FROM public.nights n
WHERE ni.night_id = n.id AND ni.citizen_id IS NULL;

ALTER TABLE public.night_items
  ALTER COLUMN citizen_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_night_items_citizen ON public.night_items(citizen_id);
CREATE INDEX IF NOT EXISTS idx_night_items_night_citizen ON public.night_items(night_id, citizen_id);

-- Remove per-night citizen and add optional title.
ALTER TABLE public.nights ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.nights DROP COLUMN IF EXISTS citizen_id;
