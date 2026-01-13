-- Migration: Tabela para exemplos dinâmicos de intenções
-- Fase 4: Melhorias de UX

CREATE TABLE IF NOT EXISTS public.intent_examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  intent_text TEXT NOT NULL,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_intent_examples_category ON public.intent_examples(category);
CREATE INDEX IF NOT EXISTS idx_intent_examples_featured ON public.intent_examples(is_featured);
CREATE INDEX IF NOT EXISTS idx_intent_examples_usage ON public.intent_examples(usage_count DESC);

-- RLS
ALTER TABLE public.intent_examples ENABLE ROW LEVEL SECURITY;

-- Política: todos podem ler exemplos (são públicos)
CREATE POLICY "Anyone can view intent examples"
ON public.intent_examples
FOR SELECT
USING (true);

-- Política: apenas usuários autenticados podem criar/atualizar (para admin futuro)
CREATE POLICY "Authenticated users can manage intent examples"
ON public.intent_examples
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_intent_examples_updated_at
BEFORE UPDATE ON public.intent_examples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed com exemplos iniciais
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
ON CONFLICT DO NOTHING;

