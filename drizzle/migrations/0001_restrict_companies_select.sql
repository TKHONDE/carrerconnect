DROP POLICY IF EXISTS "Companies public" ON public.companies;
CREATE POLICY "Verified companies public" ON public.companies FOR SELECT TO anon, authenticated USING (verified = true);
CREATE POLICY "Owner or admin reads company" ON public.companies FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));