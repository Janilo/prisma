ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS summary_json jsonb;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS insights_json jsonb;