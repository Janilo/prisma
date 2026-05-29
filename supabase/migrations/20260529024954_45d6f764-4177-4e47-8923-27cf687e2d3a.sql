ALTER TABLE public.datasets
ADD COLUMN IF NOT EXISTS unit_costs_json jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.datasets.unit_costs_json IS
  'Mapping { executionUnitColumn: investmentColumn } para canais medidos em unidades de execução (ex.: GRP -> Investimento TV). Usado em explore (CPP) e model (ROI).';