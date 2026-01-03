-- Tabela para armazenar conversações/intenções
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para armazenar resultados do council (3 estágios)
CREATE TABLE public.council_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL CHECK (stage >= 1 AND stage <= 3),
  results JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_council_results_conversation ON public.council_results(conversation_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);

-- Habilitar RLS (mas permitir acesso público para MVP)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_results ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para MVP (sem autenticação)
CREATE POLICY "Allow public read conversations" 
ON public.conversations 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update conversations" 
ON public.conversations 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public read council_results" 
ON public.council_results 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert council_results" 
ON public.council_results 
FOR INSERT 
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();