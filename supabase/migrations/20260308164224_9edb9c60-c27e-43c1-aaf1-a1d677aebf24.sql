
-- Prompt memory table
CREATE TABLE public.prompt_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  improved_prompt TEXT,
  style TEXT,
  model TEXT,
  settings JSONB,
  result_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own prompts" ON public.prompt_memory
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- AI Actors table
CREATE TABLE public.ai_actors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  face_prompt TEXT,
  body_type TEXT,
  voice_style TEXT,
  default_style TEXT,
  thumbnail_url TEXT,
  is_preset BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view presets and own actors" ON public.ai_actors
  FOR SELECT TO authenticated
  USING (is_preset = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage own actors" ON public.ai_actors
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_preset = false);

CREATE POLICY "Users can update own actors" ON public.ai_actors
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND is_preset = false);

CREATE POLICY "Users can delete own actors" ON public.ai_actors
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND is_preset = false);

-- AI Locations table
CREATE TABLE public.ai_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  scene_prompt TEXT NOT NULL,
  time_of_day TEXT DEFAULT 'day',
  mood TEXT,
  thumbnail_url TEXT,
  is_preset BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view presets and own locations" ON public.ai_locations
  FOR SELECT TO authenticated
  USING (is_preset = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage own locations" ON public.ai_locations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_preset = false);

CREATE POLICY "Users can update own locations" ON public.ai_locations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND is_preset = false);

CREATE POLICY "Users can delete own locations" ON public.ai_locations
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND is_preset = false);

-- Storyboard projects table
CREATE TABLE public.storyboard_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  original_prompt TEXT NOT NULL,
  script JSONB,
  scenes JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  style TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.storyboard_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own storyboards" ON public.storyboard_projects
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
