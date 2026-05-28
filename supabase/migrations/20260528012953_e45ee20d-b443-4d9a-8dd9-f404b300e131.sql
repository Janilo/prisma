
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Datasets
CREATE TABLE public.datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  n_rows INTEGER NOT NULL DEFAULT 0,
  n_cols INTEGER NOT NULL DEFAULT 0,
  columns_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  period_start TEXT,
  period_end TEXT,
  granularity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.datasets TO authenticated;
GRANT ALL ON public.datasets TO service_role;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "datasets_select_own" ON public.datasets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "datasets_insert_own" ON public.datasets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "datasets_update_own" ON public.datasets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "datasets_delete_own" ON public.datasets FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX datasets_user_idx ON public.datasets(user_id, created_at DESC);

-- Runs
CREATE TABLE public.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  dep_variable TEXT,
  indep_variables_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  params_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  contributions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  roi_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  decomposition_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  predicted_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runs TO authenticated;
GRANT ALL ON public.runs TO service_role;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs_select_own" ON public.runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "runs_insert_own" ON public.runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "runs_update_own" ON public.runs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "runs_delete_own" ON public.runs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX runs_user_idx ON public.runs(user_id, created_at DESC);
CREATE INDEX runs_dataset_idx ON public.runs(dataset_id);

-- Storage bucket privado
INSERT INTO storage.buckets (id, name, public) VALUES ('datasets', 'datasets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: dono lê/escreve por prefixo user_id/
CREATE POLICY "datasets_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'datasets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "datasets_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'datasets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "datasets_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'datasets' AND (storage.foldername(name))[1] = auth.uid()::text);
