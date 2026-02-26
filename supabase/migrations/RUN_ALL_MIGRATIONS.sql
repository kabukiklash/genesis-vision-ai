-- ============================================
-- GENESIS VISION AI - Todas as migrations
-- Execute no Supabase: SQL Editor > New Query
-- Cole todo este arquivo e clique em Run
-- ============================================

-- Migration 1: Tabelas base (conversations, council_results)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.council_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL CHECK (stage >= 1 AND stage <= 3),
  results JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_council_results_conversation ON public.council_results(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public read council_results" ON public.council_results;
DROP POLICY IF EXISTS "Allow public insert council_results" ON public.council_results;

CREATE POLICY "Allow public read conversations" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Allow public insert conversations" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update conversations" ON public.conversations FOR UPDATE USING (true);
CREATE POLICY "Allow public read council_results" ON public.council_results FOR SELECT USING (true);
CREATE POLICY "Allow public insert council_results" ON public.council_results FOR INSERT WITH CHECK (true);

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration 2: financial_data e app_states
CREATE TABLE IF NOT EXISTS public.financial_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  conversation_id UUID NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  income JSONB NOT NULL,
  expenses JSONB NOT NULL,
  cards JSONB NOT NULL,
  goals JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  conversation_id UUID NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  state_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_data_conversation ON public.financial_data(conversation_id);
CREATE INDEX IF NOT EXISTS idx_app_states_conversation ON public.app_states(conversation_id);

ALTER TABLE public.financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read financial_data" ON public.financial_data;
DROP POLICY IF EXISTS "Allow public insert financial_data" ON public.financial_data;
DROP POLICY IF EXISTS "Allow public update financial_data" ON public.financial_data;
DROP POLICY IF EXISTS "Allow public read app_states" ON public.app_states;
DROP POLICY IF EXISTS "Allow public insert app_states" ON public.app_states;

CREATE POLICY "Allow public read financial_data" ON public.financial_data FOR SELECT USING (true);
CREATE POLICY "Allow public insert financial_data" ON public.financial_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update financial_data" ON public.financial_data FOR UPDATE USING (true);
CREATE POLICY "Allow public read app_states" ON public.app_states FOR SELECT USING (true);
CREATE POLICY "Allow public insert app_states" ON public.app_states FOR INSERT WITH CHECK (true);

-- Migration 3: user_id e RLS para Auth
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.council_results ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Allow public read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public read council_results" ON public.council_results;
DROP POLICY IF EXISTS "Allow public insert council_results" ON public.council_results;

CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own council_results" ON public.council_results FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = (SELECT user_id FROM public.conversations WHERE id = conversation_id)
);
CREATE POLICY "Users can create own council_results" ON public.council_results FOR INSERT WITH CHECK (
  auth.uid() = user_id AND auth.uid() = (SELECT user_id FROM public.conversations WHERE id = conversation_id)
);

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_data') THEN
    DROP POLICY IF EXISTS "Allow public read financial_data" ON public.financial_data;
    DROP POLICY IF EXISTS "Allow public insert financial_data" ON public.financial_data;
    DROP POLICY IF EXISTS "Allow public update financial_data" ON public.financial_data;
    CREATE POLICY "Users can view own financial_data" ON public.financial_data FOR SELECT USING (
      auth.uid() = user_id OR (user_id IS NULL AND conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid()))
    );
    CREATE POLICY "Users can create own financial_data" ON public.financial_data FOR INSERT WITH CHECK (
      auth.uid() = COALESCE(user_id, (SELECT user_id FROM public.conversations WHERE id = conversation_id))
    );
    CREATE POLICY "Users can update own financial_data" ON public.financial_data FOR UPDATE USING (
      auth.uid() = user_id OR (user_id IS NULL AND conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid()))
    ) WITH CHECK (auth.uid() = COALESCE(user_id, (SELECT user_id FROM public.conversations WHERE id = conversation_id)));
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_states') THEN
    DROP POLICY IF EXISTS "Allow public read app_states" ON public.app_states;
    DROP POLICY IF EXISTS "Allow public insert app_states" ON public.app_states;
    CREATE POLICY "Users can view own app_states" ON public.app_states FOR SELECT USING (
      auth.uid() = user_id OR (user_id IS NULL AND conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid()))
    );
    CREATE POLICY "Users can create own app_states" ON public.app_states FOR INSERT WITH CHECK (
      auth.uid() = COALESCE(user_id, (SELECT user_id FROM public.conversations WHERE id = conversation_id))
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_council_results_user_id ON public.council_results(user_id);

CREATE OR REPLACE FUNCTION public.set_conversation_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN NEW.user_id := auth.uid(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_conversation_user_id ON public.conversations;
CREATE TRIGGER trigger_set_conversation_user_id BEFORE INSERT ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_conversation_user_id();

CREATE OR REPLACE FUNCTION public.set_council_result_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id FROM public.conversations WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_council_result_user_id ON public.council_results;
CREATE TRIGGER trigger_set_council_result_user_id BEFORE INSERT ON public.council_results
FOR EACH ROW EXECUTE FUNCTION public.set_council_result_user_id();

-- Migration 4: intent_examples
CREATE TABLE IF NOT EXISTS public.intent_examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  intent_text TEXT NOT NULL,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intent_examples_category ON public.intent_examples(category);
CREATE INDEX IF NOT EXISTS idx_intent_examples_featured ON public.intent_examples(is_featured);
CREATE INDEX IF NOT EXISTS idx_intent_examples_usage ON public.intent_examples(usage_count DESC);

ALTER TABLE public.intent_examples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view intent examples" ON public.intent_examples;
DROP POLICY IF EXISTS "Authenticated users can manage intent examples" ON public.intent_examples;

CREATE POLICY "Anyone can view intent examples" ON public.intent_examples FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage intent examples" ON public.intent_examples FOR ALL
USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_intent_examples_updated_at ON public.intent_examples;
CREATE TRIGGER update_intent_examples_updated_at BEFORE UPDATE ON public.intent_examples
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.intent_examples (title, description, intent_text, category, is_featured) VALUES
('Sistema de Vendas', 'Gestão completa de vendas e estoque', 'Sistema de gestão de vendas com controle de estoque', 'business', true),
('Suporte Técnico', 'Plataforma para gerenciar tickets de suporte', 'Plataforma de suporte técnico com tickets', 'support', true),
('Dashboard IoT', 'Monitoramento de sensores em tempo real', 'Dashboard IoT para monitoramento de sensores', 'iot', true),
('Agendamento Médico', 'Sistema para agendar consultas', 'Sistema de agendamento de consultas médicas', 'healthcare', true),
('Workflow de Aprovação', 'Fluxo de aprovação de documentos', 'Workflow de aprovação de documentos', 'workflow', true),
('E-commerce', 'Loja virtual completa com carrinho', 'Sistema de e-commerce com carrinho de compras e checkout', 'ecommerce', false),
('Gestão de Projetos', 'Kanban board para gerenciar tarefas', 'Sistema de gestão de projetos com quadro Kanban', 'productivity', false),
('CRM', 'Gestão de relacionamento com clientes', 'Sistema CRM para gerenciar leads e clientes', 'business', false),
('Blog', 'Plataforma de blog com posts e comentários', 'Sistema de blog com criação de posts e comentários', 'content', false),
('Chat em Tempo Real', 'Aplicativo de mensagens instantâneas', 'Aplicativo de chat em tempo real com salas e mensagens', 'communication', false)
ON CONFLICT (title) DO NOTHING;

-- Função RPC para incrementar usage_count (usado ao clicar nos exemplos rápidos)
CREATE OR REPLACE FUNCTION public.increment_intent_example_usage(example_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.intent_examples
  SET usage_count = COALESCE(usage_count, 0) + 1,
      updated_at = now()
  WHERE id = example_id;
END;
$$;
