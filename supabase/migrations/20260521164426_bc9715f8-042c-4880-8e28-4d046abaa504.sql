-- Job Queue Persistence
CREATE TABLE public.controller_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  prompt TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  priority INTEGER NOT NULL DEFAULT 5,
  node_id TEXT,
  node_name TEXT,
  comfy_prompt_id TEXT,
  workflow JSONB,
  params JSONB,
  result_urls JSONB,
  error TEXT,
  progress NUMERIC NOT NULL DEFAULT 0,
  required_vram_gb NUMERIC,
  tags TEXT[],
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_controller_jobs_user_status ON public.controller_jobs(user_id, status);
CREATE INDEX idx_controller_jobs_queued_at ON public.controller_jobs(queued_at DESC);

ALTER TABLE public.controller_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON public.controller_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own jobs"
  ON public.controller_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON public.controller_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
  ON public.controller_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER controller_jobs_updated_at
  BEFORE UPDATE ON public.controller_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.controller_jobs;
ALTER TABLE public.controller_jobs REPLICA IDENTITY FULL;