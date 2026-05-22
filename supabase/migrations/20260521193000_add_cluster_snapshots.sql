CREATE TABLE public.cluster_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'local',
  schema_version INTEGER NOT NULL DEFAULT 1,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  jobs JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cluster_snapshots_user_created_at
  ON public.cluster_snapshots(user_id, created_at DESC);

ALTER TABLE public.cluster_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cluster snapshots"
  ON public.cluster_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own cluster snapshots"
  ON public.cluster_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cluster snapshots"
  ON public.cluster_snapshots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cluster snapshots"
  ON public.cluster_snapshots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER cluster_snapshots_updated_at
  BEFORE UPDATE ON public.cluster_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
