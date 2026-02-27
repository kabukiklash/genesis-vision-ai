-- Tighten RLS: remove NULL user_id bypass, require authentication

-- Conversations policies
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
CREATE POLICY "conversations_select_own" ON public.conversations
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
CREATE POLICY "conversations_insert_own" ON public.conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
CREATE POLICY "conversations_update_own" ON public.conversations
  FOR UPDATE USING (user_id = auth.uid());

-- Council results policies
DROP POLICY IF EXISTS "council_results_select_own" ON public.council_results;
CREATE POLICY "council_results_select_own" ON public.council_results
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "council_results_insert_own" ON public.council_results;
CREATE POLICY "council_results_insert_own" ON public.council_results
  FOR INSERT WITH CHECK (
    conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid())
  );

-- Make user_id NOT NULL
ALTER TABLE public.conversations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.council_results ALTER COLUMN user_id SET NOT NULL;