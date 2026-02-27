
-- Table to store user's custom LLM provider configurations
CREATE TABLE public.llm_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  model TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.llm_providers ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own providers
CREATE POLICY "llm_providers_select_own" ON public.llm_providers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "llm_providers_insert_own" ON public.llm_providers
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "llm_providers_update_own" ON public.llm_providers
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "llm_providers_delete_own" ON public.llm_providers
  FOR DELETE USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER update_llm_providers_updated_at
  BEFORE UPDATE ON public.llm_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
