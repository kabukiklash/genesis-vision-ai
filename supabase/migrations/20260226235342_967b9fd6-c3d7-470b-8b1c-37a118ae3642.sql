-- Add user_id column to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Add user_id column to council_results
ALTER TABLE public.council_results 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Enable RLS on both tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_results ENABLE ROW LEVEL SECURITY;

-- Conversations: users can only see their own
CREATE POLICY "conversations_select_own" ON public.conversations
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Conversations: users can insert their own
CREATE POLICY "conversations_insert_own" ON public.conversations
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Conversations: users can update their own
CREATE POLICY "conversations_update_own" ON public.conversations
  FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);

-- Council results: users can see results of their own conversations
CREATE POLICY "council_results_select_own" ON public.council_results
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid() OR user_id IS NULL)
  );

-- Council results: allow inserts for own conversations
CREATE POLICY "council_results_insert_own" ON public.council_results
  FOR INSERT WITH CHECK (
    conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid() OR user_id IS NULL)
  );