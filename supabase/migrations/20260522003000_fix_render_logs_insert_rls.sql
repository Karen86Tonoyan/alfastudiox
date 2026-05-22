DROP POLICY IF EXISTS "Authenticated users can insert render logs" ON public.render_logs;

CREATE POLICY "Authenticated users can insert render logs"
  ON public.render_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
