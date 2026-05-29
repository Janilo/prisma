ALTER TABLE public.datasets
  ADD COLUMN parent_dataset_id uuid NULL,
  ADD COLUMN version integer NOT NULL DEFAULT 1;

CREATE INDEX idx_datasets_parent ON public.datasets(parent_dataset_id);
CREATE INDEX idx_datasets_user_parent ON public.datasets(user_id, parent_dataset_id);