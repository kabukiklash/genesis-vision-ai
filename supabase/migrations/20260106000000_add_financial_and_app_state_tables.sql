-- Tabela para armazenar dados financeiros por usuário (ou por instância de app)
CREATE TABLE IF NOT EXISTS public.financial_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Futuro: associar a um usuário autenticado
  user_id UUID NULL,
  -- Opcional: associar a uma conversa específica
  conversation_id UUID NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  income JSONB NOT NULL,
  expenses JSONB NOT NULL,
  cards JSONB NOT NULL,
  goals JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para armazenar snapshots de estado de apps gerados
CREATE TABLE IF NOT EXISTS public.app_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  conversation_id UUID NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  -- Estado serializado do app (itens, progresso, etc.)
  state_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_financial_data_conversation
  ON public.financial_data(conversation_id);

CREATE INDEX IF NOT EXISTS idx_app_states_conversation
  ON public.app_states(conversation_id);

-- Para MVP, manter acesso liberado (será endurecido na Fase 3 - Auth/RLS)
ALTER TABLE public.financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read financial_data"
ON public.financial_data
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert financial_data"
ON public.financial_data
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update financial_data"
ON public.financial_data
FOR UPDATE
USING (true);

CREATE POLICY "Allow public read app_states"
ON public.app_states
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert app_states"
ON public.app_states
FOR INSERT
WITH CHECK (true);


