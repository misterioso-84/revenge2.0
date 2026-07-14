
ALTER TABLE public.citizens DROP COLUMN IF EXISTS faction;

ALTER TABLE public.horses DROP CONSTRAINT IF EXISTS horses_sponsor_citizen_id_fkey;
ALTER TABLE public.horses DROP COLUMN IF EXISTS sponsor_citizen_id;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS sponsor TEXT;

ALTER TABLE public.safe_boxes ADD COLUMN IF NOT EXISTS expires_at DATE;

UPDATE public.service_categories SET name = 'Corsa dei Cavalli', slug = 'corsa-cavalli' WHERE name = 'Ippodromo';
