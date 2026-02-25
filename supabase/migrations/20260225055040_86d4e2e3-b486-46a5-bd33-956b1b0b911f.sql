
-- ══════════════════════════════════════════════
-- 1. Profiles table (auto-created on signup)
-- ══════════════════════════════════════════════
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  credit_balance INTEGER NOT NULL DEFAULT 0,
  is_promo_customer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert profile on signup"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════
-- 2. Credit transactions
-- ══════════════════════════════════════════════
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'promo')),
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════
-- 3. Render logs (anonymous telemetry)
-- ══════════════════════════════════════════════
CREATE TABLE public.render_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  preset TEXT,
  steps INTEGER,
  cfg NUMERIC,
  sampler TEXT,
  scheduler TEXT,
  width INTEGER,
  height INTEGER,
  layers JSONB,
  ip_weight NUMERIC,
  pulid_weight NUMERIC,
  supir_strength NUMERIC,
  render_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.render_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert render logs"
  ON public.render_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own render logs"
  ON public.render_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════
-- 4. Promo tracker (first 50 customers)
-- ══════════════════════════════════════════════
CREATE TABLE public.promo_tracker (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_amount INTEGER NOT NULL DEFAULT 150,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own promo status"
  ON public.promo_tracker FOR SELECT
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════
-- 5. Helper: auto-create profile on signup
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════════
-- 6. Helper: update timestamps
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ══════════════════════════════════════════════
-- 7. Helper: count promo customers (for checking < 50)
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_promo_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.promo_tracker;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
