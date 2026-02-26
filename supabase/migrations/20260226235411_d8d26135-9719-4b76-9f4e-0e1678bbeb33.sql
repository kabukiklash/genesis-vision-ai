-- Remove old overly permissive policies
DROP POLICY IF EXISTS "Allow public insert council_results" ON public.council_results;
DROP POLICY IF EXISTS "Allow public read council_results" ON public.council_results;
DROP POLICY IF EXISTS "Allow public insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public update conversations" ON public.conversations;